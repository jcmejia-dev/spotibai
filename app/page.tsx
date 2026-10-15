"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Album, ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown, Disc3, Heart, Home, Library, ListMusic, Menu, Mic2, MoreHorizontal, Music2, Pause, Play, Plus, Repeat2, Search, Shuffle, SkipBack, SkipForward, SlidersHorizontal, Sparkles, Upload, Volume2, VolumeX, X } from "lucide-react";

type Track = { id:string; title:string; artist:string; album:string; duration:number; cover:string; src?:string; genre:string };
type View = "home" | "search" | "library" | "liked" | "playlist";
const covers = [
"https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=700&q=85",
"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=700&q=85",
"https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=700&q=85",
"https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=700&q=85",
"https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=700&q=85",
"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=700&q=85",
"https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=700&q=85",
"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=85"
];
const demos:Track[] = [
{id:"d1",title:"After the Rain",artist:"Midnight Bloom",album:"Violet Hours",duration:213,cover:covers[0],genre:"Chill"},
{id:"d2",title:"Electric Dreams",artist:"Neon Avenue",album:"After Dark",duration:246,cover:covers[1],genre:"Electronic"},
{id:"d3",title:"Golden",artist:"The Slow Motion",album:"Daylight",duration:191,cover:covers[2],genre:"Indie"},
{id:"d4",title:"Somewhere Else",artist:"Atlas Echo",album:"Wanderlust",duration:228,cover:covers[3],genre:"Alternative"},
{id:"d5",title:"City Lights",artist:"NOVA",album:"Night Drive",duration:201,cover:covers[4],genre:"Pop"},
{id:"d6",title:"Sunset Theory",artist:"Daydream Club",album:"Soft Focus",duration:237,cover:covers[5],genre:"Chill"},
{id:"d7",title:"Stay Awhile",artist:"Ocean Radio",album:"Blue",duration:184,cover:covers[6],genre:"Acoustic"},
{id:"d8",title:"Slow Dancing",artist:"Velvet Fields",album:"Open Skies",duration:252,cover:covers[7],genre:"Indie"}
];
const fmt=(n:number)=>[Math.floor(n/60),Math.floor(n%60).toString().padStart(2,"0")].join(":");
const uid=()=>Math.random().toString(36).slice(2);

export default function Page(){
 const [view,setView]=useState<View>("home");
 const [tracks,setTracks]=useState<Track[]>(demos);
 const [favorites,setFavorites]=useState<string[]>([]);
 const [search,setSearch]=useState("");
 const [current,setCurrent]=useState<string|null>(null);
 const [playing,setPlaying]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [volume,setVolume]=useState(0.75);
 const [shuffle,setShuffle]=useState(false);
 const [repeat,setRepeat]=useState(false);
 const [toast,setToast]=useState("");
 const [sideOpen,setSideOpen]=useState(false);
 const [queueOpen,setQueueOpen]=useState(false);
 const [playlist,setPlaylist]=useState<string[]>([]);
 const [playlistName,setPlaylistName]=useState("My playlist");
 const audio=useRef<HTMLAudioElement|null>(null);
 const picker=useRef<HTMLInputElement|null>(null);
 const urls=useRef<string[]>([]);
 const active=tracks.find(t=>t.id===current);
 const imported=tracks.filter(t=>!!t.src);
 const filtered=tracks.filter(t=>[t.title,t.artist,t.album,t.genre].join(" ").toLowerCase().includes(search.toLowerCase()));
 const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),3200)};
 useEffect(()=>{try{const value=window.localStorage.getItem("spotibai-likes");if(value)setFavorites(JSON.parse(value))}catch{}},[]);
 useEffect(()=>{window.localStorage.setItem("spotibai-likes",JSON.stringify(favorites))},[favorites]);
 useEffect(()=>()=>{urls.current.forEach(u=>URL.revokeObjectURL(u))},[]);
 useEffect(()=>{if(!audio.current)return;audio.current.volume=volume},[volume]);
 useEffect(()=>{if(!audio.current)return; if(playing&&active?.src){audio.current.play().catch(()=>setPlaying(false))}else audio.current.pause()},[playing,current,active?.src]);
 const playTrack=(t:Track)=>{if(!t.src){notify("Preview artwork only. Import your own audio to start listening.");return}if(t.id===current){setPlaying(p=>!p)}else{setCurrent(t.id);setElapsed(0);setPlaying(true)}};
 const nextTrack=()=>{const playable=tracks.filter(t=>t.src);if(!playable.length)return;const index=playable.findIndex(t=>t.id===current);const next=shuffle?Math.floor(Math.random()*playable.length):(index+1)%playable.length;setCurrent(playable[next].id);setElapsed(0);setPlaying(true)};
 const previousTrack=()=>{if(elapsed>3&&audio.current){audio.current.currentTime=0;return}const playable=tracks.filter(t=>t.src);if(!playable.length)return;const index=playable.findIndex(t=>t.id===current);setCurrent(playable[(index-1+playable.length)%playable.length].id);setElapsed(0);setPlaying(true)};
 const importFiles=(list:FileList|null)=>{if(!list)return;const candidates=Array.from(list).filter(f=>f.type.startsWith("audio/")||/\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(f.name));const added=candidates.map((f,i)=>{const url=URL.createObjectURL(f);urls.current.push(url);return{id:uid(),title:f.name.replace(/\.[^.]+$/,"").replace(/[_-]/g," "),artist:"Your collection",album:"Local uploads",duration:0,cover:covers[(tracks.length+i)%covers.length],genre:"Your music",src:url}});setTracks(old=>[...added,...old]);if(added.length){setView("library");notify(added.length+" audio file(s) ready to play")}else notify("Choose an audio file to import")};
 const toggleLike=(id:string)=>setFavorites(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id]);
 const playList=(items:Track[])=>{const t=items.find(t=>t.src);if(t)playTrack(t);else notify("Import music to play this collection.")};
 const changeView=(v:View)=>{setView(v);setSideOpen(false);setQueueOpen(false)};
 const songs=view==="liked"?tracks.filter(t=>favorites.includes(t.id)):view==="playlist"?tracks.filter(t=>playlist.includes(t.id)):view==="library"?imported:filtered;
 const headline=view==="liked"?"Liked songs":view==="library"?"Your music":view==="playlist"?playlistName:"Search music";
 const topArtists=useMemo(()=>[...new Set(demos.map(t=>t.artist))].slice(0,5),[]);
 return <div className="app">
 <input ref={picker} type="file" multiple accept="audio/*,.mp3,.flac,.m4a,.ogg,.wav" className="hidden" onChange={e=>{importFiles(e.target.files);e.target.value=""}}/>
 <audio ref={audio} src={active?.src} onTimeUpdate={e=>setElapsed(e.currentTarget.currentTime)} onLoadedMetadata={e=>{setTracks(old=>old.map(t=>t.id===current?{...t,duration:e.currentTarget.duration||0}:t))}} onEnded={()=>repeat&&audio.current?(audio.current.currentTime=0,audio.current.play()):nextTrack()}/>
 <aside className={"sidebar "+(sideOpen?"show":"")}>
 <div className="brand"><div className="brand-icon"><Music2 size={23} strokeWidth={2.7}/></div><span>spotibai<span className="brand-dot">.</span></span><button className="mobile-close icon-button" onClick={()=>setSideOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
 <div className="sidebar-heading">MENU</div>
 <nav className="nav">
 <button className={view==="home"?"selected":""} onClick={()=>changeView("home")}><Home size={19}/> Home</button>
 <button className={view==="search"?"selected":""} onClick={()=>changeView("search")}><Search size={19}/> Search</button>
 <button className={view==="library"?"selected":""} onClick={()=>changeView("library")}><Library size={19}/> Your Library</button>
 </nav>
 <div className="sidebar-heading spaced">YOUR MUSIC</div>
 <nav className="nav">
 <button className={view==="liked"?"selected":""} onClick={()=>changeView("liked")}><Heart size={19}/> Liked Songs <span className="nav-count">{favorites.length||""}</span></button>
 <button className={view==="playlist"?"selected":""} onClick={()=>changeView("playlist")}><ListMusic size={19}/> My Playlist</button>
 <button onClick={()=>{const name=window.prompt("Name your playlist",playlistName);if(name?.trim()){setPlaylistName(name.trim());changeView("playlist");notify("Playlist ready. Add songs using the + buttons.")}}}><Plus size={19}/> Create Playlist</button>
 </nav>
 <div className="sidebar-heading spaced">COLLECTIONS</div>
 <div className="collection-list"><button onClick={()=>changeView("library")}><span className="collection-art violet"><Disc3 size={19}/></span><span><strong>Local uploads</strong><small>{imported.length} songs</small></span></button><button onClick={()=>changeView("liked")}><span className="collection-art pink"><Heart size={18} fill="currentColor"/></span><span><strong>Favorites</strong><small>Made by you</small></span></button></div>
 <div className="sidebar-bottom"><div className="side-promo"><span className="promo-spark"><Sparkles size={21}/></span><strong>Make it yours.</strong><p>Add the tracks you love and turn this into your own little universe.</p><button onClick={()=>picker.current?.click()}>Import music <ArrowRight size={15}/></button></div><span className="sidebar-foot">© 2026 Spotibai • Your sound, your space.</span></div>
 </aside>
 {sideOpen&&<div className="mobile-shade" onClick={()=>setSideOpen(false)}/>}
 <main className="main">
 <header className="topbar"><div className="history"><button className="menu-toggle icon-button" onClick={()=>setSideOpen(true)} aria-label="Open menu"><Menu size={21}/></button><button className="circle" onClick={()=>changeView("home")} aria-label="Home"><ArrowLeft size={17}/></button><button className="circle" onClick={()=>changeView("library")} aria-label="Library"><ArrowRight size={17}/></button></div><label className="searchbox"><Search size={18}/><input placeholder="What do you want to listen to?" value={search} onFocus={()=>setView("search")} onChange={e=>{setSearch(e.target.value);setView("search")}}/><span className="shortcut">⌘ K</span></label><div className="top-actions"><button className="import-button" onClick={()=>picker.current?.click()}><Upload size={16}/> <span>Import music</span></button><button className="avatar" title="Your profile">S</button></div></header>
 <div className="scroll-content">
 {view==="home"?<>
 <div className="welcome"><span className="eyebrow"><span className="pulse"/> YOUR PERSONAL SOUNDTRACK</span><h1>Music sounds better<br/><em>in your world.</em></h1><p>Discover new favorites, revisit old ones, and keep the good vibes playing.</p><div className="welcome-actions"><button className="primary-button" onClick={()=>picker.current?.click()}><Upload size={17}/> Add your music</button><button className="subtle-button" onClick={()=>changeView("search")}>Explore music <ArrowRight size={16}/></button></div><div className="hero-orb one"/><div className="hero-orb two"/><div className="hero-vinyl"><div className="vinyl-center"><Music2 size={35}/></div></div><span className="floating-note n1">♪</span><span className="floating-note n2">♫</span></div>
 <div className="section-title"><div><span className="section-kicker">CURATED FOR YOU</span><h2>Made for your mood <span>✦</span></h2></div><button className="text-link" onClick={()=>changeView("search")}>See all <ArrowRight size={15}/></button></div>
 <div className="mood-grid">
 {[{name:"Late Night",subtitle:"For the after hours",cover:covers[0],tint:"purple"},{name:"Good Energy",subtitle:"Feel it all",cover:covers[2],tint:"amber"},{name:"Deep Focus",subtitle:"Get in your zone",cover:covers[5],tint:"blue"},{name:"On Repeat",subtitle:"Your kind of vibe",cover:covers[1],tint:"rose"}].map((m,i)=><button className={"mood-card "+m.tint} key={m.name} onClick={()=>{setSearch(i===0?"Chill":i===1?"Indie":i===2?"Alternative":"");changeView("search")}}><img src={m.cover} alt=""/><span className="mood-scrim"/><span className="mood-copy"><strong>{m.name}</strong><small>{m.subtitle}</small></span><span className="mood-arrow"><ArrowRight size={17}/></span></button>)}
 </div>
 <div className="section-title second"><div><span className="section-kicker">FRESH FINDS</span><h2>Discover something new</h2></div><button className="text-link" onClick={()=>changeView("search")}>Explore all <ArrowRight size={15}/></button></div>
 <div className="album-grid">{demos.slice(0,6).map(t=><div className="album-card" key={t.id}><button className="cover-button" onClick={()=>playTrack(t)}><img src={t.cover} alt={t.album}/><span className="cover-play"><Play size={20} fill="currentColor"/></span></button><strong>{t.album}</strong><span>{t.artist}</span></div>)}</div>
 <div className="section-title second"><div><span className="section-kicker">QUICK LISTEN</span><h2>Recently on your radar</h2></div></div>
 <div className="track-table">{demos.slice(0,5).map((t,i)=><SongRow key={t.id} track={t} index={i+1} active={current===t.id} playing={playing} liked={favorites.includes(t.id)} inPlaylist={playlist.includes(t.id)} onPlay={()=>playTrack(t)} onLike={()=>toggleLike(t.id)} onAdd={()=>{setPlaylist(p=>p.includes(t.id)?p.filter(x=>x!==t.id):[...p,t.id]);notify(playlist.includes(t.id)?"Removed from playlist":"Added to playlist")}}/>)}</div>
 </>:<>
 <div className="inner-heading"><span className="section-kicker">{view==="search"?"FIND YOUR SOUND":view==="library"?"YOUR COLLECTION":"YOUR SPACE"}</span><h1>{headline}</h1><p>{view==="library"?"Your imported audio lives here for this browser session.":view==="liked"?"Every track you've given a little love.":view==="playlist"?"Songs you've added to your playlist.":"Find something that feels like you."}</p></div>
 {view==="search"&&<><div className="filter-row"><span><SlidersHorizontal size={16}/> Explore genres</span>{["All","Chill","Indie","Pop","Electronic","Alternative"].map(g=><button key={g} className={search===g||(g==="All"&&!search)?"filter-active":""} onClick={()=>setSearch(g==="All"?"":g)}>{g}</button>)}</div><div className="section-title"><h2>{search?"Search results":"Explore tracks"}</h2><span className="result-count">{filtered.length} tracks</span></div></>}
 {view==="library"&&<div className="library-banner"><div><strong>Bring your music in.</strong><p>Choose audio files from your device and start listening instantly.</p></div><button className="primary-button" onClick={()=>picker.current?.click()}><Plus size={17}/> Add songs</button></div>}
 {view==="playlist"&&<div className="playlist-banner"><span className="playlist-big-icon"><ListMusic size={55}/></span><div><span>PERSONAL PLAYLIST</span><h2>{playlistName}</h2><p>{songs.length} songs • Curated by you</p></div><button className="primary-button" onClick={()=>playList(songs)}><Play size={16} fill="currentColor"/> Play</button></div>}
 <div className="track-table full">{songs.length?songs.map((t,i)=><SongRow key={t.id} track={t} index={i+1} active={current===t.id} playing={playing} liked={favorites.includes(t.id)} inPlaylist={playlist.includes(t.id)} onPlay={()=>playTrack(t)} onLike={()=>toggleLike(t.id)} onAdd={()=>{setPlaylist(p=>p.includes(t.id)?p.filter(x=>x!==t.id):[...p,t.id]);notify(playlist.includes(t.id)?"Removed from playlist":"Added to playlist")}}/>):<div className="empty"><Music2 size={34}/><h3>Nothing here yet</h3><p>Find tracks you love or upload some music to get started.</p><button className="primary-button" onClick={()=>picker.current?.click()}>Import music</button></div>}</div>
 {view==="search"&&!search&&<div className="artist-section"><div className="section-title"><h2>Artists to discover</h2></div><div className="artist-grid">{topArtists.map((artist,i)=><button onClick={()=>setSearch(artist)} key={artist}><img src={covers[i+1]} alt=""/><strong>{artist}</strong><small>Artist</small></button>)}</div></div>}
 </>}
 <footer className="content-footer">Spotibai is your personal music space. Demo tracks are visual placeholders; upload audio to listen. <span>Made with ♡ for music.</span></footer>
 </div>
 </main>
 <div className="player"><div className="now-playing">{active?<><img src={active.cover} alt=""/><div className="track-info"><strong>{active.title}</strong><span>{active.artist}</span></div><button className={"icon-button like-button "+(favorites.includes(active.id)?"liked":"")} onClick={()=>toggleLike(active.id)} title="Like song"><Heart size={19} fill={favorites.includes(active.id)?"currentColor":"none"}/></button></>:<><span className="no-song"><Music2 size={21}/></span><div className="track-info"><strong>Nothing playing</strong><span>Import some music to begin</span></div></>}</div>
 <div className="player-center"><div className="player-controls"><button className={"icon-button minor "+(shuffle?"control-on":"")} onClick={()=>setShuffle(v=>!v)} title="Shuffle"><Shuffle size={17}/></button><button className="icon-button" onClick={previousTrack} title="Previous"><SkipBack size={19} fill="currentColor"/></button><button className="play-main" onClick={()=>active?playTrack(active):picker.current?.click()} aria-label={playing?"Pause":"Play"}>{playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button><button className="icon-button" onClick={nextTrack} title="Next"><SkipForward size={19} fill="currentColor"/></button><button className={"icon-button minor "+(repeat?"control-on":"")} onClick={()=>setRepeat(v=>!v)} title="Repeat"><Repeat2 size={17}/></button></div><div className="progress"><span>{fmt(elapsed)}</span><input type="range" min={0} max={active?.duration||1} step={0.1} value={Math.min(elapsed,active?.duration||1)} onChange={e=>{if(audio.current)audio.current.currentTime=Number(e.target.value)}} style={{background:"linear-gradient(to right, #b28dff "+(active?.duration?elapsed/active.duration*100:0)+"%, #4b4755 0)"}} aria-label="Seek"/><span>{fmt(active?.duration||0)}</span></div></div>
 <div className="player-right"><button className={"icon-button "+(queueOpen?"control-on":"")} title="Queue" onClick={()=>setQueueOpen(v=>!v)}><ListMusic size={19}/></button><button className="icon-button" onClick={()=>setVolume(v=>v?0:0.75)} title="Toggle mute">{volume?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><input aria-label="Volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div></div>
 {queueOpen&&<div className="queue-panel"><div><strong>Up next</strong><button className="icon-button" onClick={()=>setQueueOpen(false)}><X size={18}/></button></div>{tracks.filter(t=>t.src).length?tracks.filter(t=>t.src).map(t=><button key={t.id} onClick={()=>playTrack(t)}><img src={t.cover} alt=""/><span>{t.title}<small>{t.artist}</small></span>{current===t.id&&<Music2 size={16}/>}</button>):<p>Import some music and it will appear here.</p>}</div>}
 {toast&&<div className="toast"><Sparkles size={16}/>{toast}</div>}
 </div>
}
function SongRow({track:t,index,active,playing,liked,inPlaylist,onPlay,onLike,onAdd}:{track:Track;index:number;active:boolean;playing:boolean;liked:boolean;inPlaylist:boolean;onPlay:()=>void;onLike:()=>void;onAdd:()=>void}){return <div className={"song-row "+(active?"is-active":"")}><button className="row-play" onClick={onPlay} aria-label={"Play "+t.title}><span>{index}</span>{active&&playing?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor"/>}</button><button className="song-name" onClick={onPlay}><img src={t.cover} alt=""/><span><strong>{t.title}</strong><small>{t.artist}</small></span></button><span className="song-album">{t.album}</span><span className="song-genre">{t.genre}</span><button className={"icon-button row-extra "+(liked?"liked":"")} onClick={onLike} aria-label="Favorite"><Heart size={17} fill={liked?"currentColor":"none"}/></button><button className={"icon-button row-extra "+(inPlaylist?"control-on":"")} onClick={onAdd} aria-label="Add to playlist">{inPlaylist?<Check size={17}/>:<Plus size={17}/>}</button><span className="song-duration">{fmt(t.duration)}</span></div>}
