import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
const API="https://api.audius.co/v1";
export async function GET(request:NextRequest){
 const q=request.nextUrl.searchParams.get("q")?.trim()||"";
 if(q.length>100)return NextResponse.json({error:"Search is too long."},{status:400});
 const token=process.env.AUDIUS_BEARER_TOKEN;
 const key=process.env.AUDIUS_API_KEY;
 const endpoint=q?"/tracks/search?query="+encodeURIComponent(q)+"&limit=20":"/tracks/trending?limit=20";
 try{
 const res=await fetch(API+endpoint,{headers:token?{Authorization:"Bearer "+token}:key?{"x-api-key":key}:{},next:{revalidate:90}});
 const body=await res.json();
 if(!res.ok)return NextResponse.json({error:body?.message||body?.error||"Audius search failed"},{status:res.status});
 const tracks=(Array.isArray(body.data)?body.data:[]).filter((t:any)=>t.id&&!t.is_delete&&!t.is_unlisted&&t.is_streamable!==false&&t.access?.streamable!==false).map((t:any)=>({id:String(t.id),title:String(t.title||"Untitled"),artist:String(t.user?.name||"Unknown artist"),art:t.artwork?.["480x480"]||t.artwork?.["150x150"]||"",duration:Number(t.duration||0),genre:String(t.genre||"Music")}));
 return NextResponse.json({tracks});
 }catch{return NextResponse.json({error:"Could not connect to Audius."},{status:502})}
}
