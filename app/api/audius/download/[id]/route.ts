import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
const API="https://api.audius.co/v1/tracks/";
const MAX_BYTES=80*1024*1024;
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[a-zA-Z0-9_-]{2,80}$/.test(id)){
  return NextResponse.json({error:"Invalid track identifier."},{status:400});
 }
 const token=process.env.AUDIUS_BEARER_TOKEN;
 const apiKey=process.env.AUDIUS_API_KEY;
 const headers:Record<string,string>={};
 if(token)headers.Authorization="Bearer "+token;
 else if(apiKey)headers["x-api-key"]=apiKey;
 try{
  // Metadata is retrieved again server-side. A browser may not grant itself download rights.
  const metadata=await fetch(API+encodeURIComponent(id),{headers,cache:"no-store"});
  if(!metadata.ok)return NextResponse.json({error:"Couldn't verify the track's download permission."},{status:502});
  const envelope=await metadata.json();
  const track=envelope?.data;
  const permitted=(track?.is_downloadable===true||track?.downloadable===true)
   &&track?.access?.downloadable!==false
   &&(!track?.download_conditions||Object.keys(track.download_conditions).length===0)
   &&track?.is_unlisted!==true;
  if(!permitted)return NextResponse.json({error:"The artist has not enabled public downloads for this track."},{status:403});
  const upstream=await fetch(API+encodeURIComponent(id)+"/download",{
   headers,cache:"no-store",redirect:"follow"
  });
  if(!upstream.ok||!upstream.body){
   return NextResponse.json({error:upstream.status===403?"This track requires additional download permissions.":"Audius did not provide a download for this song."},{status:upstream.status===403?403:502});
  }
  const length=Number(upstream.headers.get("content-length")||0);
  if(length>MAX_BYTES){
   await upstream.body.cancel();
   return NextResponse.json({error:"This download exceeds the 80 MB device-save limit."},{status:413});
  }
  const contentType=upstream.headers.get("content-type")||"application/octet-stream";
  if(!/^audio\//i.test(contentType)&&!/^application\/(?:octet-stream|binary)/i.test(contentType)){
   await upstream.body.cancel();
   return NextResponse.json({error:"Audius returned a format that cannot be saved as audio."},{status:502});
  }
  const responseHeaders=new Headers({
   "Content-Type":contentType,
   "Content-Disposition":"attachment",
   "Cache-Control":"private, no-store",
   "X-Content-Type-Options":"nosniff"
  });
  if(length)responseHeaders.set("Content-Length",String(length));
  return new Response(upstream.body,{status:200,headers:responseHeaders});
 }catch{
  return NextResponse.json({error:"Could not verify or retrieve the artist-enabled download."},{status:502});
 }
}
