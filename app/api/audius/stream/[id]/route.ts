import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[a-zA-Z0-9_-]{2,80}$/.test(id))return NextResponse.json({error:"Invalid track ID"},{status:400});
 const token=process.env.AUDIUS_BEARER_TOKEN,key=process.env.AUDIUS_API_KEY;
 try{
 const headers:Record<string,string>={};
 if(token)headers.Authorization="Bearer "+token;
 else if(key)headers["x-api-key"]=key;
 const range=request.headers.get("range");
 if(range&&/^bytes=\d*-\d*$/.test(range))headers.Range=range;
 const upstream=await fetch("https://api.audius.co/v1/tracks/"+encodeURIComponent(id)+"/stream",{headers,cache:"no-store",redirect:"follow"});
 if(!upstream.ok||!upstream.body)return NextResponse.json({error:"Track stream unavailable",status:upstream.status},{status:upstream.status===403?403:502});
 const responseHeaders=new Headers({"Content-Type":upstream.headers.get("content-type")||"audio/mpeg","Cache-Control":"private, no-store","Accept-Ranges":upstream.headers.get("accept-ranges")||"bytes"});
 for(const name of ["content-length","content-range"])if(upstream.headers.has(name))responseHeaders.set(name,upstream.headers.get(name)!);
 return new Response(upstream.body,{status:upstream.status===206?206:200,headers:responseHeaders});
 }catch{return NextResponse.json({error:"Unable to stream this track"},{status:502})}
}
