import {ImageResponse} from "next/og";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{size:string}>}){
 const {size}=await params;
 if(size!=="192"&&size!=="512")return new Response("Icon not found",{status:404});
 const pixels=Number(size);
 const bytes=await readFile(join(process.cwd(),"public","spotibai-icon.png"));
 const src="data:image/png;base64,"+bytes.toString("base64");
 return new ImageResponse(
  <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#100c16"}}>
   {/* Image comes from the existing Spotibai brand icon, not a new placeholder. */}
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={src} alt="" width={pixels} height={pixels} style={{objectFit:"contain"}}/>
  </div>,
  {width:pixels,height:pixels,headers:{"Cache-Control":"public, max-age=3600, s-maxage=86400"}}
 );
}
