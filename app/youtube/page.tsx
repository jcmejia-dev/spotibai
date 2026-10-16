"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowLeft,Heart, ListMusic, Music2, Play, Plus, Search, Trash2, X, Youtube, CheckCircle2, Download, Disc3, ListOrdered, ChevronDown, Maximize2} from "lucide-react";
import "./youtube.css";

type Song={id:string;title:string;artist:string;thumbnail:string};
const FAVORITES="favorites-v1";
const PLAYLISTS="playlists-v1";
function load<T>(key:string,fallback:T):T {try{const value=localStorage.getItem(key);return value?JSON.parse(value) as T:fallback}catch{return fallback}}
function decode(s:string){if(typeof document==="undefined")return s;const el=document.createElement("textarea");el.innerHTML=s;return el.value}
export default function YouTubeMusic({embedded=false,initialQuery="",initialSection="discover",createPlaylistSignal=0,navigationSignal=0,restorePlayerSignal=0,suggestedTrack=null,userId="",onOpenOffline,onTrackChange,allowCompactPlayer=true}:{allowCompactPlayer?:boolean;onTrackChange?:(track:{id:string;title:string;artist:string}|null)=>void;onOpenOffline?:()=>void;userId?:string;embedded?:boolean;initialQuery?:string;initialSection?:string;createPlaylistSignal?:number;navigationSignal?:number;restorePlayerSignal?:number;suggestedTrack?:({id:string;title:string;artist:string;thumbnail:string;nonce:number}|null)}){
 const storageKey=(key:string)=>"spotibai-user-"+userId+"-"+key;
 const [q,setQ]=useState("");const [term,setTerm]=useState("");
 const [results,setResults]=useState<Song[]>([]);
 const [nextPageToken,setNextPageToken]=useState<string|null>(null);
 const [loadingMore,setLoadingMore]=useState(false);
 const [findingRelated,setFindingRelated]=useState(false);
 const searchGeneration=useRef(0);
 const stationGeneration=useRef(0);
 const [favorites,setFavorites]=useState<Song[]>([]);
 const [playlists,setPlaylists]=useState<Record<string,Song[]>>({});
 const [section,setSection]=useState("discover");
 const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 const [playing,setPlaying]=useState<Song|null>(null);
 useEffect(()=>{onTrackChange?.(playing?{id:playing.id,title:decode(playing.title),artist:decode(playing.artist)}:null)},[playing?.id,playing?.title,playing?.artist]);
 const [watchOpen,setWatchOpen]=useState(false);
 const [playQueue,setPlayQueue]=useState<Song[]>([]);
 const [queueName,setQueueName]=useState("Search results");
 const [menu,setMenu]=useState<string|null>(null);
 const [playlistDialog,setPlaylistDialog]=useState(false);
 const [playlistDraft,setPlaylistDraft]=useState("");
 const [pendingSong,setPendingSong]=useState<Song|null>(null);
 const [toast,setToast]=useState("");
 const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const notify=(message:string)=>{if(toastTimer.current)clearTimeout(toastTimer.current);setToast(message);toastTimer.current=setTimeout(()=>setToast(""),3200)};
 useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current)},[]);
 useEffect(()=>{setWatchOpen(false);setMenu(null);setPlaylistDialog(false)},[navigationSignal]);
 useEffect(()=>{if(restorePlayerSignal>0&&playing)setWatchOpen(true)},[restorePlayerSignal]);
 useEffect(()=>{setFavorites(load(storageKey(FAVORITES),[]));setPlaylists(load(storageKey(PLAYLISTS),{}));setResults(load(storageKey("last-results"),[]));setTerm(load(storageKey("last-query"),""));setNextPageToken(load(storageKey("next-page-token"),null))},[userId]);
 useEffect(()=>{if(initialQuery.trim()){setQ(initialQuery);search(initialQuery)}},[initialQuery]);
 useEffect(()=>{if(initialSection==="favorites")setSection("favorites");else if(initialSection==="playlists"){const list=Object.keys(load<Record<string,Song[]>>(storageKey(PLAYLISTS),{}));setSection(list[0]||"playlists")}else setSection("discover")},[initialSection]);
 useEffect(()=>{if(createPlaylistSignal>0)create()},[createPlaylistSignal]);
 const saveFav=(next:Song[])=>{setFavorites(next);localStorage.setItem(storageKey(FAVORITES),JSON.stringify(next))};
 const saveLists=(next:Record<string,Song[]>)=>{setPlaylists(next);localStorage.setItem(storageKey(PLAYLISTS),JSON.stringify(next))};
 const favorite=(song:Song)=>saveFav(favorites.some(s=>s.id===song.id)?favorites.filter(s=>s.id!==song.id):[song,...favorites]);
 const add=(name:string,song:Song)=>{const existing=playlists[name]||[];const duplicate=existing.some(s=>s.id===song.id);saveLists({...playlists,[name]:duplicate?existing:[...existing,song]});setMenu(null);notify(duplicate?"Already in “"+name+"”":"Added to “"+name+"”")};
 const create=()=>{setPlaylistDraft("");setPendingSong(null);setPlaylistDialog(true)};
 const confirmCreate=()=>{const trimmed=playlistDraft.trim().slice(0,60);if(!trimmed)return;const exists=Object.hasOwn(playlists,trimmed);if(pendingSong){const songs=playlists[trimmed]||[];saveLists({...playlists,[trimmed]:[...songs.filter(x=>x.id!==pendingSong.id),pendingSong]})}else if(!exists)saveLists({...playlists,[trimmed]:[]});setPlaylistDialog(false);setPendingSong(null);setMenu(null);setSection(trimmed);notify(exists?(pendingSong?"Song added to “"+trimmed+"”":"Opened “"+trimmed+"”"):(pendingSong?"Created “"+trimmed+"” and added song":"Playlist “"+trimmed+"” created"))};
 const persistResults=(items:Song[],query:string,token:string|null)=>{try{localStorage.setItem(storageKey("last-results"),JSON.stringify(items.slice(0,180)));localStorage.setItem(storageKey("last-query"),JSON.stringify(query));localStorage.setItem(storageKey("next-page-token"),JSON.stringify(token))}catch{}};
 const search=async(query:string)=>{
  const phrase=query.trim();if(!phrase)return;
  const id=++searchGeneration.current;setTerm(phrase);setLoading(true);setLoadingMore(false);setNextPageToken(null);setError("");setSection("discover");
  if(!navigator.onLine){setError("You are offline. Showing saved search results. You can still browse favorites and offline audio.");setLoading(false);return}
  try{
   const res=await fetch("/api/youtube/search?limit=50&q="+encodeURIComponent(phrase));
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Search failed");
   if(id!==searchGeneration.current)return;
   const items=(data.items||[]) as Song[],token=data.nextPageToken||null;
   setResults(items);setNextPageToken(token);persistResults(items,phrase,token);
  }catch(e){if(id===searchGeneration.current)setError(e instanceof Error?e.message:"Search failed")}
  finally{if(id===searchGeneration.current)setLoading(false)}
 };
 const loadMore=async()=>{
  if(!nextPageToken||loading||loadingMore||!navigator.onLine)return;
  const id=searchGeneration.current;const token=nextPageToken;
  setLoadingMore(true);setError("");
  try{
   const url="/api/youtube/search?limit=50&q="+encodeURIComponent(term)+"&pageToken="+encodeURIComponent(token);
   const res=await fetch(url);const data=await res.json();
   if(!res.ok)throw Error(data.error||"Couldn't load more music.");
   if(id!==searchGeneration.current)return;
   const seen=new Set(results.map(x=>x.id));
   const additions=((data.items||[]) as Song[]).filter(item=>{if(seen.has(item.id))return false;seen.add(item.id);return true});
   const next=[...results,...additions],nextToken=(data.nextPageToken&&data.nextPageToken!==token)?data.nextPageToken:null;
   setResults(next);setNextPageToken(nextToken);persistResults(next,term,nextToken);
  }catch(e){if(id===searchGeneration.current)setError(e instanceof Error?e.message:"Couldn't load more songs")}
  finally{if(id===searchGeneration.current)setLoadingMore(false)}
 };

 const shown=section==="favorites"?favorites:section==="discover"?results:playlists[section]||[];
 const performer=(song:Song)=>{
  const title=decode(song.title).replace(/\[[^\]]*(official|audio|lyrics|video)[^\]]*\]/gi,"").trim();
  const fromTitle=title.split(/\s[-–—]\s/)[0]?.trim();
  const channel=decode(song.artist).replace(/\s*(- Topic|VEVO|Official)$/i,"").trim();
  if(fromTitle&&fromTitle.length<=64&&fromTitle.length>=2&&fromTitle!==title)return fromTitle;
  return channel||"music";
 };
 const samePerformer=(song:Song,artist:string)=>{
  const clean=(value:string)=>value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
  const singer=clean(artist);
  return singer.length>=3&&(clean(song.title).includes(singer)||clean(song.artist).includes(singer));
 };
 const startArtistStation=async(song:Song)=>{
  const id=++stationGeneration.current;
  const artist=performer(song);
  setQueueName("More from "+artist);
  setFindingRelated(true);
  // Keep only clearly relevant entries while new recommendations are loading.
  setPlayQueue([song]);
  try{
   const res=await fetch("/api/youtube/search?mode=artist&limit=50&q="+encodeURIComponent(artist));
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Unable to fetch related songs");
   if(id!==stationGeneration.current)return;
   const next=((data.items||[]) as Song[]).filter(track=>track.id!==song.id&&samePerformer(track,artist));
   const seen=new Set([song.id]);const unique=next.filter(track=>{if(seen.has(track.id))return false;seen.add(track.id);return true});
   setPlayQueue([song,...unique]);
  }catch{if(id===stationGeneration.current)setPlayQueue([song])}
  finally{if(id===stationGeneration.current)setFindingRelated(false)}
 };
 const beginPlayback=(song:Song,source:Song[],name:string)=>{
  setPlaying(song);setWatchOpen(true);
  if(name==="Search results"||name==="Suggested songs"){
   void startArtistStation(song);
  }else{
   ++stationGeneration.current;setFindingRelated(false);
   setPlayQueue([...source]);setQueueName(name);
  }
 };
 useEffect(()=>{
  if(!suggestedTrack?.id)return;
  const song={id:suggestedTrack.id,title:suggestedTrack.title,artist:suggestedTrack.artist,thumbnail:suggestedTrack.thumbnail};
  beginPlayback(song,[song],"Suggested songs");
 },[suggestedTrack?.nonce]);
 const stopPlayback=()=>{++stationGeneration.current;setFindingRelated(false);setPlayQueue([]);setPlaying(null);setWatchOpen(false);notify("Playback stopped")};
 const nextInQueue=()=>{if(!playing||playQueue.length<2)return;const at=playQueue.findIndex(song=>song.id===playing.id);if(at<0)return;const current=playQueue[at];const remaining=[...playQueue.slice(at+1),...playQueue.slice(0,at)];const following=remaining[0];setPlayQueue([...remaining,current]);setPlaying(following);notify("Up next: "+decode(following.title))};
 const removePlaylist=()=>{if(!window.confirm("Delete this playlist?"))return;const next={...playlists};delete next[section];saveLists(next);setSection("discover");notify("Playlist deleted")};
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
    <div className="yt-content">
    {playing&&<div className={"yt-watch-page yt-player-room "+(watchOpen?"":allowCompactPlayer?"yt-watch-docked":"yt-player-paused-hidden")}>
      {!watchOpen&&<div className="spot-player-dock-head"><span className="spot-player-dock-live" aria-hidden="true"/><div className="spot-player-dock-song"><strong title={decode(playing.title)}>{decode(playing.title)}</strong><small>{decode(playing.artist)}</small></div><button type="button" title="Expand music player" aria-label="Expand music player" onClick={()=>setWatchOpen(true)}><Maximize2 size={17}/></button><button type="button" title="Stop playback" aria-label="Stop playback" onClick={stopPlayback}><X size={17}/></button></div>}
      <div className="yt-player-head">
       <button className="yt-watch-back" onClick={()=>setWatchOpen(false)} title="Return to your collection" aria-label="Back to music collection"><ArrowLeft size={21}/><span>Back to your music</span></button>
       <div className="yt-player-now"><span className="yt-player-onair"><span/> ON AIR / SPOTIBAI</span><strong title={decode(playing.title)}>{decode(playing.title)}</strong></div>
       <button className="yt-player-collection" onClick={()=>{setWatchOpen(false);setSection("favorites")}} title="Open saved tracks"><Heart size={17}/><span>Your collection</span></button>
      </div>
      <div className="yt-watch-layout">
        <div className="yt-watch-main">
          <div className="yt-frame"><YouTubeVideo videoId={playing.id} title={decode(playing.title)} active={watchOpen||allowCompactPlayer} onEnded={nextInQueue}/></div>
          <div className="yt-player-track-meta">
           <div className="yt-track-disc"><Disc3 size={20}/></div>
           <div><span className="yt-player-meta-label">CURRENTLY SPINNING</span><h1>{decode(playing.title)}</h1><p>{decode(playing.artist)}</p></div>
          </div>
          <div className="yt-watch-actions">
            <button onClick={()=>{const liked=!favorites.some(s=>s.id===playing.id);favorite(playing);notify(liked?"Added to favorites":"Removed from favorites")}}><Heart size={17} fill={favorites.some(f=>f.id===playing.id)?"currentColor":"none"}/>{favorites.some(f=>f.id===playing.id)?"Liked":"Like track"}</button>
            <button onClick={()=>setMenu(menu===playing.id?null:playing.id)} aria-expanded={menu===playing.id}><Plus size={17}/> Add to mixtape</button>
            <button onClick={()=>{if(onOpenOffline)onOpenOffline();else notify("Open Spotibai's Offline collection to download files you own.")}} title="Download your own audio files from the offline collection"><Download size={17}/> My downloads <span className="yt-own-only">Own audio only</span></button>
            {menu===playing.id&&<div className="yt-watch-list-menu"><strong>Save to a mixtape</strong>{Object.keys(playlists).map(name=><button key={name} onClick={()=>add(name,playing)}>{name}</button>)}<button onClick={()=>{setPendingSong(playing);setPlaylistDraft("");setPlaylistDialog(true);setMenu(null)}}><Plus size={14}/> New mixtape</button></div>}
          </div>
          <div className="yt-player-footnote"><span>PLAYED USING YOUTUBE'S OFFICIAL PLAYER</span><span>Downloads are available for files you own, not YouTube videos.</span></div>
        </div>
        <aside className="yt-watch-next">
         <div className="yt-queue-header"><div><span className="yt-queue-kicker"><ListOrdered size={14}/> UP NEXT</span><h2>{queueName}</h2></div><span className="yt-queue-length">{Math.max(0,playQueue.length-1)} TRACKS</span></div>
         {[...playQueue.slice(playQueue.findIndex(x=>x.id===playing.id)+1),...playQueue.slice(0,playQueue.findIndex(x=>x.id===playing.id))].map((song,i)=><button className="yt-queue-track" key={song.id} onClick={()=>beginPlayback(song,playQueue,queueName)} aria-label={"Play "+decode(song.title)}><span className="yt-queue-index">{String(i+1).padStart(2,"0")}</span><img src={song.thumbnail} alt=""/><span><strong>{decode(song.title)}</strong><small>{decode(song.artist)}</small></span><Play size={14} className="yt-queue-play"/></button>)}
         {findingRelated&&<p className="yt-queue-empty" role="status">Finding more music from this artist…</p>}
         {!findingRelated&&playQueue.length<=1&&<p className="yt-queue-empty">No other closely matching songs found yet. Search for more music or start a mixtape.</p>}
        </aside>
      </div>
    </div>}
    {!watchOpen&&<>
    {embedded&&<div className="yt-embedded-tabs"><button className={section==="discover"?"active":""} onClick={()=>setSection("discover")}><Search size={16}/> Search</button><button className={section==="favorites"?"active":""} onClick={()=>setSection("favorites")}><Heart size={16}/> Favorites ({favorites.length})</button>{Object.keys(playlists).map(name=><button className={section===name?"active":""} key={name} onClick={()=>setSection(name)}><ListMusic size={16}/>{name}</button>)}<button onClick={create}><Plus size={16}/> New playlist</button></div>}
    <div className="yt-heading yt-editorial-heading"><div><p>THE LISTENING DESK / SPOTIBAI</p><h1>{section==="discover"?"Find the sound. Keep the feeling.":section==="favorites"?"The songs you keep.":section==="playlists"?"Your mixtape shelf.":section}</h1><span>{section==="discover"?"Search across YouTube music videos, then organize what belongs on your shelf.":section==="favorites"?"Your handpicked favorites, ready whenever you return.":section==="playlists"?"Create and name your own mixtapes.":"Your collection, arranged your way."}</span></div>{section!=="discover"&&section!=="favorites"&&section!=="playlists"&&<button className="yt-delete" onClick={removePlaylist}><Trash2 size={17}/> Delete playlist</button>}</div>
    {!embedded&&<form className="yt-search-form" onSubmit={e=>{e.preventDefault();search(q)}}><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search for songs, artists, or music videos..." aria-label="Search YouTube music"/><button type="submit" disabled={loading}>{loading?"Searching...":"Search"}</button></form>}
    {error&&<div className="yt-error">{error}</div>}
    <div className="yt-section yt-list-section"><div><small className="yt-list-kicker">{section==="discover"?"DISCOVERY / TRACK INDEX":"THE COLLECTION / TRACK INDEX"}</small><h2>{section==="discover"?(term?"Found for “"+decode(term)+"”":"Turn up something new"):section==="favorites"?"The favorites":"On this mixtape"}</h2></div><span>{shown.length} tracks</span></div>
    {!shown.length&&!loading&&<div className="yt-empty"><Music2 size={38}/><h3>{section==="discover"?"Discover music on YouTube":"No songs here yet"}</h3><p>{section==="discover"?"Search above to explore official music videos and other YouTube results.":"Search for a song, then use the heart or plus buttons to save it."}</p></div>}
    <div className={"yt-grid "+(section==="discover"?"yt-discovery-grid":"yt-library-grid")}>{shown.map((song,index)=><article className={"yt-card "+(menu===song.id?"yt-card-menu-open":"")} key={song.id}><span className="yt-row-number">{String(index+1).padStart(2,"0")}</span><button className="yt-art" onClick={()=>beginPlayback(song,shown,section==="discover"?"Search results":section==="favorites"?"Liked songs":section)} aria-label={"Play "+decode(song.title)}><img src={song.thumbnail} alt=""/><span><Play size={23} fill="currentColor"/></span></button><div className="yt-song-info"><div><strong title={decode(song.title)}>{decode(song.title)}</strong><small>{decode(song.artist)}</small></div><button className={"yt-icon "+(favorites.some(f=>f.id===song.id)?"yt-liked":"")} onClick={()=>favorite(song)} aria-label="Like video"><Heart size={19} fill={favorites.some(f=>f.id===song.id)?"currentColor":"none"}/></button><div className="yt-add-wrap"><button className="yt-icon" onClick={()=>setMenu(menu===song.id?null:song.id)} aria-label="Add to playlist"><Plus size={19}/></button>{menu===song.id&&<div className="yt-menu"><strong>Add to playlist</strong>{Object.keys(playlists).map(name=><button key={name} onClick={()=>add(name,song)}>{name}</button>)}<button onClick={()=>{setPendingSong(song);setPlaylistDraft("");setPlaylistDialog(true);setMenu(null)}}><Plus size={14}/> Create new</button></div>}</div></div></article>)}</div>
    {section==="discover"&&!loading&&<div className="yt-page-footer"><span>Showing {results.length} music results{nextPageToken?" · more available":""}</span>{nextPageToken&&<button type="button" onClick={()=>void loadMore()} disabled={loadingMore}>{loadingMore?"Loading more music…":"Load more music"} <ChevronDown size={17}/></button>}</div>}
    </>}
    </div>
  </main>

  {toast&&<div className="spotibai-toast" role="status" aria-live="polite"><CheckCircle2 size={19}/><span>{toast}</span><button onClick={()=>setToast("")} aria-label="Dismiss confirmation"><X size={15}/></button></div>}
  {playlistDialog&&<div className="spotibai-dialog-backdrop" onClick={()=>setPlaylistDialog(false)}><form className="spotibai-dialog" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();confirmCreate()}}><div className="spotibai-dialog-icon"><ListMusic size={23}/></div><button type="button" className="spotibai-dialog-close" onClick={()=>setPlaylistDialog(false)} aria-label="Close"><X size={20}/></button><h2>Create a playlist</h2><p>Give your collection a name. You can add more songs anytime.</p><label htmlFor="spotibai-playlist-name">Playlist name</label><input id="spotibai-playlist-name" autoFocus maxLength={60} value={playlistDraft} onChange={e=>setPlaylistDraft(e.target.value)} placeholder="e.g. Late night favorites" required/><div className="spotibai-dialog-actions"><button type="button" onClick={()=>setPlaylistDialog(false)}>Cancel</button><button type="submit" disabled={!playlistDraft.trim()}>Create playlist</button></div></form></div>}
 </div>
}

type YTPlayer={
 destroy:()=>void;
 pauseVideo:()=>void;
 playVideo:()=>void;
 loadVideoById:(videoId:string)=>void;
};
type YTNamespace={Player:new (element:HTMLElement,options:{
 videoId:string;
 playerVars:Record<string,number>;
 events:{
  onReady?:(event:unknown)=>void;
  onStateChange:(event:{data:number})=>void;
  onAutoplayBlocked?:()=>void;
  onError:(event:{data:number})=>void;
 };
})=>YTPlayer};
declare global{interface Window{YT?:YTNamespace;onYouTubeIframeAPIReady?:()=>void}}
let youtubeReady:Promise<YTNamespace>|undefined;
function getYouTubeAPI():Promise<YTNamespace>{
 if(typeof window==="undefined")return Promise.reject(new Error("Browser required"));
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(!youtubeReady)youtubeReady=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{previous?.();if(window.YT?.Player)resolve(window.YT);else reject(new Error("YouTube API unavailable"))};
  if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){
   const script=document.createElement("script");
   script.src="https://www.youtube.com/iframe_api";
   script.async=true;
   script.onerror=()=>{youtubeReady=undefined;reject(new Error("Unable to load YouTube player"))};
   document.head.appendChild(script);
  }
 });
 return youtubeReady;
}

/** One official YouTube iframe per listening session.
 * Do not destroy/recreate it between songs: loadVideoById advances the queue.
 */
function YouTubeVideo({videoId,title,active,onEnded}:{
 videoId:string;title:string;active:boolean;onEnded:()=>void
}){
 const host=useRef<HTMLDivElement>(null);
 const ended=useRef(onEnded);
 const playerRef=useRef<YTPlayer|null>(null);
 const readyRef=useRef(false);
 const desiredIdRef=useRef(videoId);
 const loadedIdRef=useRef(videoId);
 const activeRef=useRef(active);
 const [autoplayBlocked,setAutoplayBlocked]=useState(false);
 const [playerError,setPlayerError]=useState("");

 useEffect(()=>{ended.current=onEnded},[onEnded]);

 // Playlist playback intentionally pauses when the full player is closed.
 useEffect(()=>{
  activeRef.current=active;
  if(!readyRef.current)return;
  try{
   if(active)playerRef.current?.playVideo();
   else playerRef.current?.pauseVideo();
  }catch{}
 },[active]);

 // When the next song starts, keep the same YouTube iframe alive.
 useEffect(()=>{
  desiredIdRef.current=videoId;
  setAutoplayBlocked(false);setPlayerError("");
  if(!readyRef.current||!playerRef.current||loadedIdRef.current===videoId)return;
  loadedIdRef.current=videoId;
  try{
   playerRef.current.loadVideoById(videoId);
   if(!activeRef.current)playerRef.current.pauseVideo();
  }catch{setAutoplayBlocked(true)}
 },[videoId]);

 useEffect(()=>{
  let disposed=false;
  getYouTubeAPI().then(YT=>{
   if(disposed||!host.current)return;
   const el=document.createElement("div");
   host.current.replaceChildren(el);
   const initialId=desiredIdRef.current;
   const player=new YT.Player(el,{
    videoId:initialId,
    playerVars:{autoplay:1,playsinline:1,rel:0},
    events:{
     onReady:()=>{
      if(disposed)return;
      readyRef.current=true;
      if(desiredIdRef.current!==initialId){
       loadedIdRef.current=desiredIdRef.current;
       try{player.loadVideoById(desiredIdRef.current)}catch{setAutoplayBlocked(true)}
      }
      try{if(activeRef.current)player.playVideo();else player.pauseVideo()}catch{setAutoplayBlocked(true)}
     },
     onStateChange:event=>{
      if(disposed)return;
      if(event.data===1){setAutoplayBlocked(false);setPlayerError("")}
      if(event.data===0&&activeRef.current)ended.current();
     },
     onAutoplayBlocked:()=>{if(!disposed&&activeRef.current)setAutoplayBlocked(true)},
     onError:event=>{
      if(disposed)return;
      setPlayerError(event.data===100||event.data===101||event.data===150
       ?"This video is unavailable for embedded playback. Choose another from Up Next."
       :"Unable to play this video right now.");
     }
    }
   });
   playerRef.current=player;
   loadedIdRef.current=initialId;
  }).catch(()=>{if(!disposed)setPlayerError("YouTube player could not load. Check your connection and retry.")});

  return()=>{
   disposed=true;
   readyRef.current=false;
   const player=playerRef.current;
   playerRef.current=null;
   try{player?.destroy()}catch{}
  };
 },[]);

 return <div className="yt-video-shell">
  <div className="spot-yt-host" ref={host} aria-label={title}/>
  {active&&(autoplayBlocked||playerError)&&<div className="yt-video-continue" role="status">
   <span>{playerError||"Your browser paused automatic playback. Tap to continue."}</span>
   <button type="button" onClick={()=>{setAutoplayBlocked(false);setPlayerError("");try{playerRef.current?.playVideo()}catch{setAutoplayBlocked(true)}}}>Play music</button>
  </div>}
 </div>;
}
