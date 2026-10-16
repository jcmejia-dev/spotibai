import { NextRequest, NextResponse } from "next/server";

// YouTube search results are a catalog, not an unrestricted download source.
// Similar-track queries are deliberately limited to the selected performer.
type RawHit={id?:{videoId?:string};snippet?:{title?:string;channelTitle?:string;description?:string;thumbnails?:{medium?:{url:string};high?:{url:string}}}};
type Track={id:string;title:string;artist:string;thumbnail:string};
const noise=/\b(reaction|reacts? to|interview|podcast|explained|tutorial|prank|challenge|gameplay|walkthrough|unboxing|review|shorts|meme compilation|funny moments|fan edit|ai cover|karaoke)\b/i;
const official=/\b(official (audio|music video|video|visualizer|lyric video)|provided to youtube|topic|audio|lyrics|vevo)\b/i;
const normalize=(s:string)=>s.toLowerCase().replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
const tokens=(s:string)=>normalize(s).split(" ").filter(word=>word.length>=2&&!new Set(["feat","ft","the","and","official","audio","music","video","lyrics","song","songs"]).has(word));
function score(item:Track,query:string):number{
 const title=normalize(item.title),channel=normalize(item.artist),words=tokens(query);
 const matched=words.filter(w=>title.includes(w)||channel.includes(w)).length;
 const matchRatio=words.length?matched/words.length:0;
 return 10*matchRatio+2*(title.includes(normalize(query))?1:0)+(official.test(item.title+" "+item.artist)?1.4:0)-(noise.test(item.title)?9:0);
}

export async function GET(request:NextRequest){
 const query=request.nextUrl.searchParams.get("q")?.trim();
 if(!query||query.length>120)return NextResponse.json({error:"Enter a valid search query."},{status:400});
 const apiKey=process.env.YOUTUBE_API_KEY;
 if(!apiKey)return NextResponse.json({error:"YouTube search is not configured."},{status:503});
 const mode=request.nextUrl.searchParams.get("mode")==="artist"?"artist":"search";
 const token=request.nextUrl.searchParams.get("pageToken")||"";
 if(token&&(token.length>400||!/^[A-Za-z0-9_\-]+$/.test(token)))return NextResponse.json({error:"Invalid search page token."},{status:400});
 const requested=Number(request.nextUrl.searchParams.get("limit"));
 const limit=Number.isFinite(requested)&&requested>=1?Math.min(50,Math.floor(requested)):50;
 const params=new URLSearchParams({part:"snippet",type:"video",videoCategoryId:"10",videoEmbeddable:"true",maxResults:String(limit),q:mode==="artist"?query+" songs official audio":query,key:apiKey,safeSearch:"moderate",order:"relevance"});
 if(token)params.set("pageToken",token);
 try{
  const response=await fetch("https://www.googleapis.com/youtube/v3/search?"+params.toString(),{next:{revalidate:180}});
  const json=await response.json();
  if(!response.ok)return NextResponse.json({error:json.error?.message||"Music search failed."},{status:response.status});
  const input=(Array.isArray(json.items)?json.items:[]) as RawHit[];
  const tracks:Track[]=input.filter(x=>Boolean(x.id?.videoId&&x.snippet?.title)).map(x=>({id:x.id!.videoId!,title:x.snippet!.title!,artist:x.snippet!.channelTitle||"Unknown artist",thumbnail:x.snippet!.thumbnails?.high?.url||x.snippet!.thumbnails?.medium?.url||""}));
  const seen=new Set<string>();
  const unique=tracks.filter(track=>{if(seen.has(track.id))return false;seen.add(track.id);return true});
  const ordered=unique.map((track,index)=>({track,index,rank:score(track,query)})).sort((a,b)=>b.rank-a.rank||a.index-b.index);
  // An artist station must not include unrelated videos even if YouTube categorizes them as music.
  // Use a conservative performer match; returning fewer songs beats a nonsensical queue.
  const filtered=mode==="artist"?ordered.filter(({track})=>{
    const target=tokens(query).filter(w=>w!=="x");
    const text=normalize(track.title+" "+track.artist);
    return !noise.test(track.title)&&target.length>0&&target.some(word=>text.includes(word));
  }):ordered;
  return NextResponse.json({items:filtered.map(x=>x.track),nextPageToken:json.nextPageToken||null,mode});
 }catch{
  return NextResponse.json({error:"Couldn't connect to the music catalog right now."},{status:502});
 }
}
