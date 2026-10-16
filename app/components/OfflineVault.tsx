"use client";
import {useEffect,useRef,useState} from "react";
import {Disc3,UploadCloud,Play,Pause,Trash2,SkipForward,HardDriveDownload,Music2, Download, Search, ShieldCheck, LoaderCircle} from "lucide-react";
import "./offline.css";
type OfflineTrack={id:string;userId:string;name:string;blob:Blob;addedAt:number};
type AudiusResult={id:string;title:string;artist:string;art:string;downloadable:boolean};
const DB_NAME="spotibai-offline-v1";
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{if(!("indexedDB" in window)){reject(new Error("Offline storage is not supported in this browser"));return}const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("tracks"))request.result.createObjectStore("tracks",{keyPath:"id"})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function allTracks(userId:string):Promise<OfflineTrack[]>{const db=await database();try{return await new Promise((resolve,reject)=>{const request=db.transaction("tracks","readonly").objectStore("tracks").getAll();request.onsuccess=()=>resolve((request.result as OfflineTrack[]).filter(x=>x.userId===userId).sort((a,b)=>b.addedAt-a.addedAt));request.onerror=()=>reject(request.error)})}finally{db.close()}}
async function putFiles(userId:string,files:File[]){const db=await database();try{await new Promise<void>((resolve,reject)=>{const transaction=db.transaction("tracks","readwrite");const store=transaction.objectStore("tracks");for(const file of files)store.put({id:crypto.randomUUID(),userId,name:file.name.replace(/\.[^.]+$/,""),blob:file,addedAt:Date.now()});transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error)})}finally{db.close()}}
async function putAudiusTrack(userId:string,track:AudiusResult,blob:Blob){
 const db=await database();
 try{await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction("tracks","readwrite");
  tx.objectStore("tracks").put({id:userId+":audius:"+track.id,userId,name:track.title+" — "+track.artist,blob,addedAt:Date.now()});
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}finally{db.close()}
}
async function removeFile(id:string){const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("tracks","readwrite");tx.objectStore("tracks").delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}finally{db.close()}}
export default function OfflineVault({userId}:{userId:string}){
 const [tracks,setTracks]=useState<OfflineTrack[]>([]),[current,setCurrent]=useState<string|null>(null),[playing,setPlaying]=useState(false),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [findQuery,setFindQuery]=useState("");
 const [audiusHits,setAudiusHits]=useState<AudiusResult[]>([]);
 const [finding,setFinding]=useState(false);
 const [savingId,setSavingId]=useState<string|null>(null);
 const [findError,setFindError]=useState("");
 const [hasSearched,setHasSearched]=useState(false);
 const audioRef=useRef<HTMLAudioElement>(null),urlRef=useRef<string|null>(null);
 const refresh=async()=>{try{setTracks(await allTracks(userId))}catch(e){setMessage(e instanceof Error?e.message:"Storage unavailable")}};
 useEffect(()=>{void refresh();return()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current)}},[userId]);
 useEffect(()=>{const selected=tracks.find(t=>t.id===current);if(!selected||!audioRef.current)return;const audio=audioRef.current;if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current=null}const url=URL.createObjectURL(selected.blob);urlRef.current=url;audio.src=url;audio.load();void audio.play().catch(()=>{setPlaying(false);setMessage("Tap Play if your browser blocked autoplay, or try a supported audio format.")});return()=>{audio.pause();if(urlRef.current===url){URL.revokeObjectURL(url);urlRef.current=null}}},[current]);
 async function importFiles(list:FileList|null){if(!list?.length)return;const accepted=Array.from(list).filter(f=>f.type.startsWith("audio/")||/\.(mp3|m4a|aac|ogg|wav|flac|opus)$/i.test(f.name));if(!accepted.length){setMessage("Choose audio files such as MP3, M4A, or OGG.");return}setBusy(true);setMessage("");try{await putFiles(userId,accepted);await refresh();setMessage(accepted.length+" file(s) saved on this device.")}catch(e){setMessage(e instanceof Error?e.message:"Couldn't save these files. Check available device storage.")}finally{setBusy(false)}}
 async function discover(q:string){
  if(!q.trim())return;
  if(!navigator.onLine){setFindError("Connect to the internet to search Audius. Saved audio still plays offline.");return}
  setFinding(true);setHasSearched(true);setFindError("");setAudiusHits([]);
  try{
   const response=await fetch("/api/audius/search?downloadable=1&q="+encodeURIComponent(q.trim()));
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Audius search is unavailable.");
   setAudiusHits((data.tracks||[]) as AudiusResult[]);
  }catch(e){setFindError(e instanceof Error?e.message:"Could not find downloadable music.")}
  finally{setFinding(false)}
 }
 async function saveAudius(song:AudiusResult){
  if(savingId)return;
  setSavingId(song.id);setMessage("");
  try{
   if(!navigator.onLine)throw Error("Connect to the internet to save a new song.");
   const res=await fetch("/api/audius/download/"+encodeURIComponent(song.id),{cache:"no-store"});
   if(!res.ok){
    const detail=await res.json().catch(()=>({error:"Download failed."}));
    throw Error(detail.error||"The track isn't available for download.");
   }
   const size=Number(res.headers.get("content-length")||0);
   if(size>80*1024*1024)throw Error("Track exceeds the 80 MB offline size limit.");
   const blob=await res.blob();
   if(blob.size===0||blob.size>80*1024*1024)throw Error("The audio file is empty or too large.");
   if(!blob.type.startsWith("audio/")&&blob.type!=="application/octet-stream")throw Error("Audius returned an unsupported audio format.");
   await putAudiusTrack(userId,song,blob);
   await refresh();
   setMessage("Saved offline: "+song.title+". It now plays without internet on this device.");
  }catch(e){setMessage(e instanceof Error?e.message:"Could not save this song offline.")}
  finally{setSavingId(null)}
 }
 const downloadOwned=(track:OfflineTrack)=>{const link=document.createElement("a");const url=URL.createObjectURL(track.blob);const extension=(track.blob instanceof File&&track.blob.name.includes("."))?track.blob.name.slice(track.blob.name.lastIndexOf(".")):(track.blob.type.includes("mpeg")?".mp3":track.blob.type.includes("mp4")?".m4a":track.blob.type.includes("ogg")?".ogg":".audio");link.href=url;link.download=track.name+extension;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);setMessage("Downloading your own file: "+track.name)};
 const start=(id:string)=>{if(id===current&&audioRef.current){if(audioRef.current.paused)void audioRef.current.play().catch(()=>setMessage("This format may not play on your device."));else audioRef.current.pause();return}setCurrent(id)};
 const next=()=>{if(!tracks.length)return;const i=tracks.findIndex(x=>x.id===current);setCurrent(tracks[(i+1+tracks.length)%tracks.length].id)};
 async function remove(id:string){try{await removeFile(id);if(current===id){setCurrent(null);audioRef.current?.pause()}await refresh()}catch{setMessage("Couldn't remove that file.")}}
 return <section className="spot-offline-vault"><div className="spot-offline-head"><div><span className="studio-eyebrow">SPOTIBAI / YOUR LOCAL CASSETTES</span><h1>Offline room.</h1><p>Music files you own, saved in this browser. No subscription and no connection required after saving.</p></div><Disc3 size={46}/></div>
 <div className="spot-offline-disclosure"><HardDriveDownload size={19}/><div><strong>What works without internet?</strong><p>Imported files and artist-enabled Audius downloads play offline on this device. YouTube playlists and likes only save links, not playable audio. Spotibai cannot download YouTube videos for offline use.</p></div></div>
 <label className="spot-offline-upload"><UploadCloud size={23}/><span><strong>{busy?"Saving music…":"Add your own audio files"}</strong><small>MP3, M4A, OGG, WAV — stored on this device, not uploaded to our servers</small></span><input aria-label="Import audio files for offline playback" type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac,.opus" multiple disabled={busy} onChange={e=>{void importFiles(e.target.files);e.target.value=""}}/></label>
 {message&&<p className="spot-offline-message" role="status">{message}</p>}
 <div className="spot-offline-discover">
 <div className="spot-offline-discover-heading"><ShieldCheck size={24}/><div><span className="studio-eyebrow">ARTIST-AUTHORIZED MUSIC</span><h2>Find downloadable songs</h2><p>Search Audius music that artists allow you to download. Save those files on this device for offline listening.</p></div></div>
 <form className="spot-offline-search" onSubmit={e=>{e.preventDefault();void discover(findQuery)}}>
  <Search size={17}/><input value={findQuery} onChange={e=>setFindQuery(e.target.value)} placeholder="Song or artist on Audius..." aria-label="Find downloadable Audius tracks"/>
  <button type="submit" disabled={finding||!findQuery.trim()}>{finding?<LoaderCircle className="spot-offline-spinner" size={17}/>:"Find songs"}</button>
 </form>
 {findError&&<p className="spot-offline-search-error" role="alert">{findError}</p>}
 {audiusHits.length>0&&<div className="spot-offline-audius-results">{audiusHits.map(song=><article key={song.id} className="spot-offline-audius-card">
  {song.art?<img src={song.art} alt=""/>:<span className="spot-offline-art"><Music2 size={21}/></span>}
  <div><strong>{song.title}</strong><small>{song.artist} · Audius</small></div>
  <button type="button" onClick={()=>void saveAudius(song)} disabled={savingId!==null}><Download size={16}/><span>{savingId===song.id?"Saving…":tracks.some(t=>t.id===userId+":audius:"+song.id)?"Save again":"Save offline"}</span></button>
 </article>)}</div>}
 {hasSearched&&!finding&&!audiusHits.length&&!findError&&<p className="spot-offline-note">No public downloads found for that search. Try a different artist or song.</p>}
 </div>
 <div className="spot-offline-list-title"><h2>Saved to this device</h2><span>{tracks.length} {tracks.length===1?"track":"tracks"}</span></div>
 {tracks.length===0?<div className="spot-offline-empty"><Music2 size={28}/><strong>Your offline shelf is empty.</strong><span>Add audio that you own to listen without a connection.</span></div>:<div className="spot-offline-tracks">{tracks.map((track,i)=><div className={"spot-offline-track "+(current===track.id?"active":"")} key={track.id}><span className="spot-offline-index">{String(i+1).padStart(2,"0")}</span><button onClick={()=>start(track.id)} aria-label={"Play "+track.name}>{current===track.id&&playing?<Pause size={17}/>:<Play size={17}/>}</button><span className="spot-offline-name">{track.name}</span><span className="spot-offline-size">{(track.blob.size/1048576).toFixed(1)} MB</span><button onClick={()=>downloadOwned(track)} aria-label={"Download "+track.name} title="Download your own audio file"><Download size={16}/></button><button onClick={()=>void remove(track.id)} aria-label={"Delete "+track.name}><Trash2 size={16}/></button></div>)}</div>}
 {current&&<div className="spot-offline-controls"><div><span className="spot-offline-current">NOW PLAYING</span><strong>{tracks.find(x=>x.id===current)?.name||"Offline track"}</strong></div><button aria-label={playing?"Pause":"Resume"} onClick={()=>start(current)}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><button aria-label="Next track" onClick={next}><SkipForward size={18}/></button></div>}
 <audio ref={audioRef} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={next} controls={Boolean(current)} className="spot-offline-audio"/>
 </section>
}
