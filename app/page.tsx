"use client";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {ArrowLeft, ArrowRight, Disc3, Heart, Home, Library, ListMusic, Menu, Music2, Plus, Search, X, Settings2, Check, Clock3, Radio, Headphones, CassetteTape, SlidersHorizontal, WifiOff, Wifi, Download, LogIn} from "lucide-react";
import YouTubeMusic from "./youtube/page";
import AuthGate from "./components/AuthGate";
import {authClient} from "../lib/auth/client";
import OfflineVault from "./components/OfflineVault";
import ListeningRoomHome from "./components/ListeningRoomHome";
type User={id:string;name:string;email:string;isGuest?:boolean};

type Screen="home"|"search"|"favorites"|"playlists"|"offline"|"profile";
export default function Page(){return <AuthGate>{(user,exitGuest)=><Spotibai key={user.id} user={user} exitGuest={exitGuest}/>}</AuthGate>}
function Spotibai({user,exitGuest}:{user:User;exitGuest:()=>void}){
 const [screen,setScreen]=useState<Screen>("home");
 const [online,setOnline]=useState(true);
 useEffect(()=>{const sync=()=>setOnline(navigator.onLine);sync();window.addEventListener("online",sync);window.addEventListener("offline",sync);return()=>{window.removeEventListener("online",sync);window.removeEventListener("offline",sync)}},[]);
 useEffect(()=>{localStorage.setItem("spotibai-active-offline-user",user.id)},[user.id]);
 const [query,setQuery]=useState("");
 const [suggestions,setSuggestions]=useState<{id:string;title:string;artist:string;thumbnail:string}[]>([]);
 const [recent,setRecent]=useState<string[]>([]);
 const [suggestOpen,setSuggestOpen]=useState(false);
 const [suggestLoading,setSuggestLoading]=useState(false);
 const [selectedSuggestion,setSelectedSuggestion]=useState(-1);
 const lookupCount=useRef(0);
 const cache=useRef<Record<string,{id:string;title:string;artist:string;thumbnail:string}[]>>({});
 const searchBox=useRef<HTMLDivElement>(null);
 const scrollArea=useRef<HTMLDivElement>(null);

 const [submitted,setSubmitted]=useState("");
 const [suggestPlay,setSuggestPlay]=useState<{id:string;title:string;artist:string;thumbnail:string;nonce:number}|null>(null);
 const [drawer,setDrawer]=useState(false);
 const [newPlaylist,setNewPlaylist]=useState(0);
 const [navigationSignal,setNavigationSignal]=useState(0);
 const storageKey=(key:string)=>"spotibai-user-"+user.id+"-"+key;
 const [mode,setMode]=useState("dark");
 const [accent,setAccent]=useState("#b28dff");
 const [motion,setMotion]=useState(true);
 useEffect(()=>{try{setMode(localStorage.getItem(storageKey("mode"))||"dark");setAccent(localStorage.getItem(storageKey("accent"))||"#b28dff");setMotion(localStorage.getItem(storageKey("motion"))!=="false")}catch{}},[]);
 useEffect(()=>{try{setRecent(JSON.parse(localStorage.getItem(storageKey("recent-searches"))||"[]"))}catch{}},[]);
 useEffect(()=>{const onPointer=(event:PointerEvent)=>{if(searchBox.current&&!searchBox.current.contains(event.target as Node))setSuggestOpen(false)};document.addEventListener("pointerdown",onPointer);return()=>document.removeEventListener("pointerdown",onPointer)},[]);
 useEffect(()=>{const term=query.trim();if(!suggestOpen||term.length<3){setSuggestions([]);return}const key=term.toLowerCase();if(cache.current[key]){setSuggestions(cache.current[key]);return}if(lookupCount.current>=6){setSuggestions([]);return}const controller=new AbortController();const timer=setTimeout(async()=>{lookupCount.current++;setSuggestLoading(true);try{const response=await fetch("/api/youtube/search?limit=10&q="+encodeURIComponent(term),{signal:controller.signal});if(!response.ok)throw Error("Search unavailable");const data=await response.json();const items=(data.items||[]).slice(0,6);cache.current[key]=items;setSuggestions(items)}catch(e){if(!controller.signal.aborted)setSuggestions([])}finally{if(!controller.signal.aborted)setSuggestLoading(false)}},1200);return()=>{clearTimeout(timer);controller.abort()}},[query,suggestOpen]);
 const applyAppearance=(change:()=>void)=>{const doc=document as Document&{startViewTransition?:(callback:()=>void)=>{ready:Promise<void>}};if(!motion||!doc.startViewTransition||matchMedia("(prefers-reduced-motion: reduce)").matches){change();return}const transition=doc.startViewTransition(change);void transition.ready.then(()=>{const radius=Math.hypot(innerWidth,innerHeight);document.documentElement.animate({clipPath:["circle(0px at 100% 0%)",`circle(${radius}px at 100% 0%)`]},{duration:700,easing:"cubic-bezier(.22,1,.36,1)",pseudoElement:"::view-transition-new(root)"})}).catch(()=>{})};
 const setTheme=(v:string)=>applyAppearance(()=>{setMode(v);localStorage.setItem(storageKey("mode"),v)});
 const setColor=(v:string)=>applyAppearance(()=>{setAccent(v);localStorage.setItem(storageKey("accent"),v)});
 const setAnimation=(v:boolean)=>{setMotion(v);localStorage.setItem(storageKey("motion"),String(v))};
 const go=(screen:Screen)=>{setScreen(screen);setNavigationSignal(v=>v+1);setDrawer(false);scrollArea.current?.scrollTo({top:0,behavior:"instant"})};
 const decodeText=(value:string)=>value.replace(/&(?:#(\d+)|#x([0-9a-f]+)|amp|quot|apos|lt|gt);/gi,(full,dec,hex)=>{if(dec||hex){const point=parseInt(dec||hex,hex?16:10);return point>0&&point<=0x10ffff?String.fromCodePoint(point):full}return ({ "&amp;":"&","&quot;":"\"","&apos;":"\u0027","&lt;":"<","&gt;":">"} as Record<string,string>)[full.toLowerCase()]||full});
 const playSuggestion=(song:{id:string;title:string;artist:string;thumbnail:string})=>{setSuggestOpen(false);setSelectedSuggestion(-1);setQuery(decodeText(song.title));setSuggestPlay({...song,title:decodeText(song.title),artist:decodeText(song.artist),nonce:Date.now()});go("search")};
 const find=(q:string)=>{if(!q.trim())return;const term=q.trim();setQuery(term);setSubmitted(term);setSuggestOpen(false);setSelectedSuggestion(-1);const updated=[term,...recent.filter(x=>x.toLowerCase()!==term.toLowerCase())].slice(0,6);setRecent(updated);localStorage.setItem(storageKey("recent-searches"),JSON.stringify(updated));go("search")};
 useLayoutEffect(()=>{if(scrollArea.current)scrollArea.current.scrollTop=0},[screen]);
 const heading=(name:string)=>{find(name)};
 return <div className={"app spotibai-real theme-"+mode+(motion?"":" no-motion")} style={{"--accent":accent} as React.CSSProperties}>
 <aside className="sidebar">
  <div className="brand"><img className="spotibai-logo-icon" src="/spotibai-icon.png" alt="Spotibai icon"/><span>spotibai<span className="brand-dot">.</span></span><button className="mobile-close icon-button" onClick={()=>setDrawer(false)} aria-label="Close menu"><X size={20}/></button></div>
  <div className="sidebar-heading">MENU</div>
  <nav className="nav">
   <button className={screen==="home"?"selected":""} onClick={()=>go("home")}><Home size={19}/> Home</button>
   <button className={screen==="search"?"selected":""} onClick={()=>go("search")}><Search size={19}/> Search music</button>
   <button className={screen==="favorites"?"selected":""} onClick={()=>go("favorites")}><Heart size={19}/> Liked songs</button>
   <button className={screen==="playlists"?"selected":""} onClick={()=>go("playlists")}><ListMusic size={19}/> Playlists</button>
   <button className={screen==="offline"?"selected":""} onClick={()=>go("offline")}><Download size={19}/> Offline collection</button>
   <button className={screen==="profile"?"selected":""} onClick={()=>go("profile")}><Settings2 size={19}/> Profile & Settings</button>
  </nav>
  <div className="sidebar-bottom"><div className="side-promo"><span className="promo-spark"><Disc3 size={21}/></span><strong>Make it yours.</strong><p>Find music on YouTube, favorite the songs you enjoy, and build playlists.</p><button onClick={()=>go("search")}>Explore music <ArrowRight size={15}/></button></div><span className="sidebar-foot">Spotibai · Your sound, your space</span></div>
 </aside>

 <main className="main">
  <header className="topbar">
   <button className="mobile-wordmark" onClick={()=>go("home")} aria-label="Spotibai Home"><img src="/spotibai-icon.png" alt=""/><span>spotibai<span className="brand-dot">.</span></span><small>YOUR LISTENING ROOM</small></button>
   <div className="history"><button className="menu-toggle icon-button" onClick={()=>setDrawer(true)} aria-label="Open menu"><Menu size={21}/></button><button className="circle" onClick={()=>go("home")} aria-label="Go home"><ArrowLeft size={17}/></button><button className="circle" onClick={()=>go("search")} aria-label="Go to search"><ArrowRight size={17}/></button></div>
   <div className="spot-search-wrap" ref={searchBox}>
    <form className="searchbox" onSubmit={e=>{e.preventDefault();find(selectedSuggestion>=0&&suggestions[selectedSuggestion]?suggestions[selectedSuggestion].title:query)}}><Search size={18}/><input aria-label="Search YouTube music" value={query} placeholder="Search for songs or artists..." autoComplete="off" onFocus={()=>{setSuggestOpen(true);setSelectedSuggestion(-1);go("search")}} onChange={e=>{setQuery(e.target.value);setSelectedSuggestion(-1);setSuggestOpen(true)}} onKeyDown={e=>{if(e.key==="Escape"){setSuggestOpen(false);e.currentTarget.blur()}else if(e.key==="ArrowDown"){e.preventDefault();setSelectedSuggestion(v=>Math.min(v+1,suggestions.length-1))}else if(e.key==="ArrowUp"){e.preventDefault();setSelectedSuggestion(v=>Math.max(v-1,-1))}}}/><button type="submit" className="top-search-submit" aria-label="Search"><Search size={16}/></button></form>
    {suggestOpen&&(query.trim()||recent.length>0)&&<div className="spot-suggestions" role="listbox" aria-label="Music search suggestions">
     {query.trim().length>=3&&<div className="spot-suggest-heading">{suggestLoading?"Finding songs...":suggestions.length?"Suggested songs":lookupCount.current>=6?"Live suggestions limit reached — press Enter to search":"Search suggestions"}</div>}
     {suggestions.map((song,i)=><button key={song.id} role="option" aria-selected={selectedSuggestion===i} className={selectedSuggestion===i?"highlight":""} onMouseDown={e=>e.preventDefault()} onClick={()=>playSuggestion(song)}>{song.thumbnail?<img src={song.thumbnail} alt=""/>:<Music2 size={18}/>}<span><strong>{decodeText(song.title)}</strong><small>{decodeText(song.artist)}</small></span><Search size={15}/></button>)}
     {!query.trim()&&recent.length>0&&<><div className="spot-suggest-heading">Recent searches</div>{recent.map(item=><button key={item} onMouseDown={e=>e.preventDefault()} onClick={()=>find(item)}><Clock3 size={17}/><span><strong>{item}</strong></span><Search size={15}/></button>)}</>}
     {query.trim()&&<button className="spot-suggest-all" onMouseDown={e=>e.preventDefault()} onClick={()=>find(query)}>Search for “{query.trim()}” <Search size={16}/></button>}
    </div>}
   </div>
   <div className="top-actions"><button className="avatar" title="Profile and settings" aria-label="Open settings" onClick={()=>go("profile")}>{(String(user.name||user.email||"S"))[0].toUpperCase()}</button></div>
  </header>
  <div className="scroll-content" ref={scrollArea}>
   {!online&&<div className="spot-connection-notice" role="status"><WifiOff size={16}/> Offline now — your saved collection and on-device audio remain available. Streaming and search need an internet connection. <button onClick={()=>go("offline")}>Open offline library →</button></div>}
   {screen==="home"&&<ListeningRoomHome onNavigate={go} onSearch={heading} />}
   {screen==="offline"&&<OfflineVault userId={user.id}/>}
   {screen==="profile"&&<section className="spot-settings studio-preferences search-view-enter">
 <div className="studio-settings-header"><div><span className="studio-eyebrow">SPOTIBAI / STUDIO SETTINGS</span><h1>Your space, your sound.</h1><p>Set the atmosphere of your listening room.</p></div><SlidersHorizontal size={27}/></div>
 <div className="studio-pref-row"><div className="studio-pref-label"><strong>Appearance</strong><span>Daylight or after dark</span></div><div className="studio-mode-switch"><button className={mode==="dark"?"active":""} onClick={()=>setTheme("dark")}>Night {mode==="dark"&&<Check size={14}/>}</button><button className={mode==="light"?"active":""} onClick={()=>setTheme("light")}>Daylight {mode==="light"&&<Check size={14}/>}</button></div></div>
 <div className="studio-pref-row"><div className="studio-pref-label"><strong>Room lighting</strong><span>Choose your signature color</span></div><div className="studio-swatches">{[["Violet","#b28dff"],["Coral","#f28ba8"],["Sage","#68c4ae"],["Sky","#7dabf4"],["Amber","#f3b86b"]].map(([name,value])=><button key={value} title={name} aria-label={name} aria-pressed={accent===value} className={accent===value?"active":""} onClick={()=>setColor(value)} style={{"--swatch":value} as React.CSSProperties}>{accent===value&&<Check size={15}/>}</button>)}<label className="studio-color-custom"><input type="color" aria-label="Custom room lighting color" value={accent} onChange={e=>setColor(e.target.value)}/></label></div></div>
 <div className="studio-pref-row"><div className="studio-pref-label"><strong>Motion</strong><span>Ambient movement and transitions</span></div><label className="studio-motion-toggle"><input type="checkbox" checked={motion} onChange={e=>setAnimation(e.target.checked)}/><span/></label></div>
 <div className="spot-identity-bar"><span>{user.isGuest?"Browsing as Guest":`Signed in as ${user.name||user.email}`}</span><span>{online?"● Online":"○ Offline"}</span></div>
 <button type="button" className="spot-signout" onClick={()=>user.isGuest?exitGuest():void authClient.signOut()}>{user.isGuest?"Sign in / Create account":"Sign out"}</button><div className="studio-settings-foot"><Music2 size={17}/> Preferences and music collections are saved on this device. Guest data stays separate from account data.</div>
 </section>}
 <div className={"search-view-enter "+(screen==="home"||screen==="profile"||screen==="offline"?"spot-view-hidden":"") }><YouTubeMusic userId={user.id} onOpenOffline={()=>go("offline")} embedded initialQuery={submitted} initialSection={screen==="favorites"?"favorites":screen==="playlists"?"playlists":"discover"} createPlaylistSignal={newPlaylist} navigationSignal={navigationSignal} suggestedTrack={suggestPlay}/></div>
  </div>
 </main>
 <nav className="spot-mobile-tabs" aria-label="Primary navigation">
  <button aria-current={screen==="home"?"page":undefined} onClick={()=>go("home")}><Home size={21}/><span>Room</span></button>
  <button aria-current={screen==="search"?"page":undefined} onClick={()=>go("search")}><Search size={21}/><span>Discover</span></button>
  <button aria-current={screen==="favorites"?"page":undefined} onClick={()=>go("favorites")}><Heart size={21}/><span>Liked</span></button>
  <button aria-current={screen==="playlists"?"page":undefined} onClick={()=>go("playlists")}><ListMusic size={21}/><span>Mixtapes</span></button>
  <button aria-current={screen==="offline"?"page":undefined} onClick={()=>go("offline")}><Download size={21}/><span>Offline</span></button>
 </nav>
 </div>
}
