"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,Heart, ListMusic, Music2, Play, Plus, Search, Trash2, X, Youtube} from "lucide-react";
import "./youtube.css";

type Song={id:string;title:string;artist:string;thumbnail:string};
const FAVORITES="spotibai-youtube-favorites-v1";
const PLAYLISTS="spotibai-youtube-playlists-v1";
function load<T>(key:string,fallback:T):T {try{const value=localStorage.getItem(key);return value?JSON.parse(value) as T:fallback}catch{return fallback}}
function decode(s:string){if(typeof document==="undefined")return s;const el=document.createElement("textarea");el.innerHTML=s;return el.value}
export default function YouTubeMusic({embedded=false,initialQuery=""}:{embedded?:boolean;initialQuery?:string}){
 const [q,setQ]=useState("");const [term,setTerm]=useState("");
 const [results,setResults]=useState<Song[]>([]);
 const [favorites,setFavorites]=useState<Song[]>([]);
 const [playlists,setPlaylists]=useState<Record<string,Song[]>>({});
 const [section,setSection]=useState("discover");
 const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 const [playing,setPlaying]=useState<Song|null>(null);
 const [menu,setMenu]=useState<string|null>(null);
 useEffect(()=>{setFavorites(load(FAVORITES,[]));setPlaylists(load(PLAYLISTS,{}))},[]);
 useEffect(()=>{if(initialQuery.trim()){setQ(initialQuery);search(initialQuery)}},[initialQuery]);
 const saveFav=(next:Song[])=>{setFavorites(next);localStorage.setItem(FAVORITES,JSON.stringify(next))};
 const saveLists=(next:Record<string,Song[]>)=>{setPlaylists(next);localStorage.setItem(PLAYLISTS,JSON.stringify(next))};
 const favorite=(song:Song)=>saveFav(favorites.some(s=>s.id===song.id)?favorites.filter(s=>s.id!==song.id):[song,...favorites]);
 const add=(name:string,song:Song)=>{saveLists({...playlists,[name]:[...playlists[name].filter(s=>s.id!==song.id),song]});setMenu(null)};
 const create=()=>{const name=window.prompt("Playlist name");if(!name?.trim())return;const trimmed=name.trim().slice(0,60);if(Object.hasOwn(playlists,trimmed)){setSection(trimmed);return}saveLists({...playlists,[trimmed]:[]});setSection(trimmed)};
 const search=async(query:string)=>{if(!query.trim())return;setTerm(query.trim());setLoading(true);setError("");setSection("discover");try{const res=await fetch("/api/youtube/search?q="+encodeURIComponent(query.trim()));const data=await res.json();if(!res.ok)throw Error(data.error||"Search failed");setResults(data.items||[])}catch(e){setError(e instanceof Error?e.message:"Search failed");setResults([])}finally{setLoading(false)}};
 const shown=section==="favorites"?favorites:section==="discover"?results:playlists[section]||[];
 const removePlaylist=()=>{if(!window.confirm("Delete this playlist?"))return;const next={...playlists};delete next[section];saveLists(next);setSection("discover")};
 return <div className={"yt-app "+(embedded?"yt-embedded":"")}>
  <aside className="yt-sidebar"><a className="yt-logo" href="/"><span>♪</span> spotibai.</a><a className="yt-back" href="/"><ArrowLeft size={17}/> Back to Spotibai</a><div className="yt-side-label">YOUTUBE DISCOVERY</div>
    <button className={section==="discover"?"yt-on":""} onClick={()=>setSection("discover")}><Search size={17}/> Search music</button>
    <button className={section==="favorites"?"yt-on":""} onClick={()=>setSection("favorites")}><Heart size={17}/> Liked videos <small>{favorites.length}</small></button>
    <div className="yt-side-label yt-offset">YOUR PLAYLISTS</div>
    <button onClick={create}><Plus size={17}/> New playlist</button>
    {Object.keys(playlists).map(name=><button key={name} className={section===name?"yt-on":""} onClick={()=>setSection(name)}><ListMusic size={17}/><span className="yt-truncate">{name}</span><small>{playlists[name].length}</small></button>)}
    <p className="yt-disclaimer">YouTube playback uses the official embedded player. Favorite and playlist data stay in this browser.</p>
  </aside>
  <main className="yt-main">
    <header className="yt-top"><a href="/" className="yt-mobile-back"><ArrowLeft size={20}/></a><span className="yt-tag"><Youtube size={17}/> YouTube Music Discovery</span><a href="/" className="yt-top-home">Spotibai home ↗</a></header>
    <div className="yt-content">{embedded&&<div className="yt-embedded-tabs"><button className={section==="discover"?"active":""} onClick={()=>setSection("discover")}><Search size={16}/> Search</button><button className={section==="favorites"?"active":""} onClick={()=>setSection("favorites")}><Heart size={16}/> Favorites ({favorites.length})</button>{Object.keys(playlists).map(name=><button className={section===name?"active":""} key={name} onClick={()=>setSection(name)}><ListMusic size={16}/>{name}</button>)}<button onClick={create}><Plus size={16}/> New playlist</button></div>}
    <div className="yt-heading"><div><p>YOUR SOUND, YOUR WAY</p><h1>{section==="discover"?"Find your next favorite.":section==="favorites"?"Your favorites.":section}</h1><span>{section==="discover"?"Search for music videos, save your favorites, and build personal playlists.":section==="favorites"?"The videos you love, all in one place.":"Your handpicked music collection."}</span></div>{section!=="discover"&&section!=="favorites"&&<button className="yt-delete" onClick={removePlaylist}><Trash2 size={17}/> Delete playlist</button>}</div>
    {!embedded&&<form className="yt-search-form" onSubmit={e=>{e.preventDefault();search(q)}}><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search for songs, artists, or music videos..." aria-label="Search YouTube music"/><button type="submit" disabled={loading}>{loading?"Searching...":"Search"}</button></form>}
    {error&&<div className="yt-error">{error}</div>}
    <div className="yt-section"><h2>{section==="discover"?(term?"Results for “"+term+"”":"Start exploring"):section==="favorites"?"Liked music":"Playlist tracks"}</h2><span>{shown.length} videos</span></div>
    {!shown.length&&!loading&&<div className="yt-empty"><Music2 size={38}/><h3>{section==="discover"?"Discover music on YouTube":"No songs here yet"}</h3><p>{section==="discover"?"Search above to explore official music videos and other YouTube results.":"Search for a song, then use the heart or plus buttons to save it."}</p></div>}
    <div className="yt-grid">{shown.map(song=><article className={"yt-card "+(menu===song.id?"yt-card-menu-open":"")} key={song.id}><button className="yt-art" onClick={()=>setPlaying(song)} aria-label={"Play "+decode(song.title)}><img src={song.thumbnail} alt=""/><span><Play size={23} fill="currentColor"/></span></button><div className="yt-song-info"><div><strong title={decode(song.title)}>{decode(song.title)}</strong><small>{decode(song.artist)}</small></div><button className={"yt-icon "+(favorites.some(f=>f.id===song.id)?"yt-liked":"")} onClick={()=>favorite(song)} aria-label="Like video"><Heart size={19} fill={favorites.some(f=>f.id===song.id)?"currentColor":"none"}/></button><div className="yt-add-wrap"><button className="yt-icon" onClick={()=>setMenu(menu===song.id?null:song.id)} aria-label="Add to playlist"><Plus size={19}/></button>{menu===song.id&&<div className="yt-menu"><strong>Add to playlist</strong>{Object.keys(playlists).map(name=><button key={name} onClick={()=>add(name,song)}>{name}</button>)}<button onClick={()=>{const name=window.prompt("New playlist name");if(!name?.trim())return;const n=name.trim().slice(0,60);add(n,song)}}><Plus size={14}/> Create new</button></div>}</div></div></article>)}</div>
    </div>
  </main>
  {playing&&<div className="yt-modal-bg" onClick={()=>setPlaying(null)}><div className="yt-modal" onClick={e=>e.stopPropagation()}><div className="yt-modal-head"><div><strong>{decode(playing.title)}</strong><small>{decode(playing.artist)}</small></div><button onClick={()=>setPlaying(null)} aria-label="Close player"><X size={21}/></button></div><div className="yt-frame"><iframe src={"https://www.youtube.com/embed/"+encodeURIComponent(playing.id)+"?autoplay=1"} title={decode(playing.title)} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div><p>YouTube controls playback and availability. Some videos may disallow embedding.</p></div></div>}
 </div>
}
