import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length > 120) return NextResponse.json({error:"Enter a valid search query."},{status:400});
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({error:"YouTube search is not configured. Add YOUTUBE_API_KEY to .env.local or your hosting environment."},{status:503});
  const params = new URLSearchParams({part:"snippet",type:"video",videoCategoryId:"10",maxResults:"18",q:query,key:apiKey,safeSearch:"moderate"});
  try {
    const res = await fetch("https://www.googleapis.com/youtube/v3/search?"+params.toString(),{next:{revalidate:180}});
    const json = await res.json();
    if(!res.ok) return NextResponse.json({error:json.error?.message||"YouTube search failed."},{status:res.status});
    const items = (json.items||[]).filter((item: {id?: {videoId?:string}})=>Boolean(item.id?.videoId)).map((item:{id:{videoId:string},snippet:{title:string,channelTitle:string,thumbnails?:{medium?:{url:string},high?:{url:string}}}})=>({
      id:item.id.videoId,title:item.snippet.title,artist:item.snippet.channelTitle,thumbnail:item.snippet.thumbnails?.high?.url||item.snippet.thumbnails?.medium?.url||""
    }));
    return NextResponse.json({items});
  }catch{return NextResponse.json({error:"Couldn't connect to YouTube right now."},{status:502})}
}
