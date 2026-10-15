"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Heart,Music2,Pause,Play,Search,SkipBack,SkipForward,Volume2,Disc3} from "lucide-react";
import "./player.css";
type Song={id:string;title:string;artist:string;art:string;duration:number;genre:string};
const STORAGE="spotibai-audius-likes";
export default function AudiusPlayer(){
 const [q,setQ]=useState("");const [tracks,setTracks]=useState<Song[]>([]);
 const [favorites,setFavorites]=useState<string[]>([]);const [onlyLikes,setOnlyLikes]=useState(false);
 const [active,setActive]=useState<Song|null>(null);const [playing,setPlaying]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const [time,setTime]=useState(0);const [duration,setDuration]=useState(0);const [volume,setVolume]=useState(.8);
 const audio=useRef<HTMLAudioElement>(null);
 useEffect(()=>{try{setFavorites(JSON.parse(localStorage.getItem(STORAGE)||"[]"))}catch{};void run("")},[]);
 async function run(query:string){setLoading(true);setError("");setOnlyLikes(false);try{const r=await fetch("/api/audius/search?q="+encodeURIComponent(query));const data=await r.json();if(!r.ok)throw Error(data.error||"Search failed");setTracks(data.tracks||[])}catch(e){setError(e instanceof Error?e.message:"Search failed")}finally{setLoading(false)}}
 function choose(song:Song){if(active?.id===song.id){if(audio.current){audio.current.paused?void audio.current.play().catch(()=>setError("Unable to play track")):audio.current.pause()}return}setActive(song);setTime(0);setDuration(song.duration);setPlaying(true)}
 function toggle(id:string){setFavorites(old=>{const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];localStorage.setItem(STORAGE,JSON.stringify(next));return next})}
 function skip(step:number){const list=onlyLikes?tracks.filter(t=>favorites.includes(t.id)):tracks;const idx=list.findIndex(t=>t.id===active?.id);if(!list.length)return;choose(list[(idx+step+list.length)%list.length])}
 useEffect(()=>{if(!audio.current||!active)return;audio.current.load();void audio.current.play().catch(()=>{setPlaying(false);setError("Playback was blocked or the stream could not load. Tap Play to retry.")})},[active?.id]);
 useEffect(()=>{if(audio.current)audio.current.volume=volume},[volume]);
 useEffect(()=>{if(!active||!("mediaSession" in navigator))return;navigator.mediaSession.metadata=new MediaMetadata({title:active.title,artist:active.artist,album:"Audius",artwork:active.art?[{src:active.art,sizes:"480x480"}]:[]});const a=audio.current;for(const [action,fn] of Object.entries({play:()=>a?.play(),pause:()=>a?.pause(),previoustrack:()=>skip(-1),nexttrack:()=>skip(1)})){try{navigator.mediaSession.setActionHandler(action as MediaSessionAction,fn)}catch{}}return()=>{for(const action of ["play","pause","previoustrack","nexttrack"])try{navigator.mediaSession.setActionHandler(action as MediaSessionAction,null)}catch{}}},[active?.id,tracks,onlyLikes,favorites]);
 const shown=onlyLikes?tracks.filter(t=>favorites.includes(t.id)):tracks;
 return <div className="aud-app">
 <header className="aud-header"><Link href="/"><ArrowLeft size={18}/> Spotibai</Link><span><Disc3 size={20}/> Audius Music</span><span className="aud-live">REAL AUDIO</span></header>
 <main className="aud-body"><section className="aud-intro"><div className="aud-eyebrow">YOUR MUSIC, WITHOUT THE VIDEO</div><h1>Listen your way.</h1><p>Discover and stream tracks from Audius. Try the screen-off playback test on your phone.</p></section>
 <form className="aud-search" onSubmit={e=>{e.preventDefault();void run(q)}}><Search size={19}/><input placeholder="Find artists and songs on Audius..." value={q} onChange={e=>setQ(e.target.value)}/><button type="submit">Search</button></form>
 <div className="aud-tabs"><button className={!onlyLikes?"chosen":""} onClick={()=>setOnlyLikes(false)}>Discover</button><button className={onlyLikes?"chosen":""} onClick={()=>setOnlyLikes(true)}>♥ Favorites</button></div>
 {error&&<p className="aud-error" role="alert">{error}</p>}
 <div className="aud-heading"><h2>{onlyLikes?"Your liked tracks":q?"Music discovery":"Trending on Audius"}</h2><span>{loading?"Loading...":shown.length+" tracks"}</span></div>
 <div className="aud-grid">{shown.map(song=><article className={"aud-track "+(active?.id===song.id?"is-current":"")} key={song.id}><button className="aud-art" onClick={()=>choose(song)} aria-label={"Play "+song.title}>{song.art?<img src={song.art} alt=""/>:<Music2 size={36}/>}<span><Play size={20} fill="currentColor"/></span></button><div className="aud-track-info"><div><strong>{song.title}</strong><small>{song.artist}</small></div><button className={favorites.includes(song.id)?"hearted":""} onClick={()=>toggle(song.id)} aria-label="Favorite"><Heart fill={favorites.includes(song.id)?"currentColor":"none"} size={19}/></button></div></article>)}</div>
 {!loading&&!shown.length&&<div className="aud-empty">{error?"Try another search.":"No tracks here yet. Search for a song or add a favorite."}</div>}
 </main>
 {active&&<div className="aud-player"><div className="aud-playing">{active.art?<img src={active.art} alt=""/>:<Music2/>}<div><strong>{active.title}</strong><small>{active.artist}</small></div></div><div className="aud-controls"><div className="aud-buttons"><button onClick={()=>skip(-1)} aria-label="Previous"><SkipBack size={19}/></button><button className="aud-play" onClick={()=>audio.current?.paused?void audio.current.play().catch(()=>setError("Stream unavailable")):audio.current?.pause()} aria-label={playing?"Pause":"Play"}>{playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button><button onClick={()=>skip(1)} aria-label="Next"><SkipForward size={19}/></button></div><div className="aud-progress"><span>{Math.floor(time/60)}:{String(Math.floor(time%60)).padStart(2,"0")}</span><input type="range" value={time} min={0} max={duration||1} step={1} onChange={e=>{if(audio.current)audio.current.currentTime=Number(e.target.value)}}/><span>{Math.floor(duration/60)}:{String(Math.floor(duration%60)).padStart(2,"0")}</span></div></div><div className="aud-volume"><Volume2 size={18}/><input type="range" min={0} max={1} step={.01} value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div></div>}
 <audio ref={audio} preload="none" src={active?"/api/audius/stream/"+encodeURIComponent(active.id):undefined} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onDurationChange={e=>setDuration(e.currentTarget.duration||active?.duration||0)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{if(active)setError("The selected Audius stream failed. Try a different track.")}} onEnded={()=>skip(1)}/>
 </div>
}
