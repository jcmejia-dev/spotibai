"use client";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {ArrowLeft, ArrowRight, Disc3, Heart, Home, Library, ListMusic, Menu, Music2, Plus, Search, X, Settings2, Check, Clock3, Radio, Headphones, CassetteTape, SlidersHorizontal} from "lucide-react";
import YouTubeMusic from "./youtube/page";
import AuthGate from "./components/AuthGate";
import {supabase} from "../lib/supabase";
import type {User} from "@supabase/supabase-js";

type Screen="home"|"search"|"favorites"|"playlists"|"profile";
export default function Page(){return <AuthGate>{user=><Spotibai key={user.id} user={user}/>}</AuthGate>}
function Spotibai({user}:{user:User}){
 const [screen,setScreen]=useState<Screen>("home");
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
 useEffect(()=>{try{setMode((user.user_metadata?.spotibai_mode as string)||localStorage.getItem(storageKey("mode"))||"dark");setAccent((user.user_metadata?.spotibai_accent as string)||localStorage.getItem(storageKey("accent"))||"#b28dff");setMotion((user.user_metadata?.spotibai_motion as boolean|undefined)??localStorage.getItem(storageKey("motion"))!=="false")}catch{}},[]);
 useEffect(()=>{try{setRecent(JSON.parse(localStorage.getItem(storageKey("recent-searches"))||"[]"))}catch{}},[]);
 useEffect(()=>{const onPointer=(event:PointerEvent)=>{if(searchBox.current&&!searchBox.current.contains(event.target as Node))setSuggestOpen(false)};document.addEventListener("pointerdown",onPointer);return()=>document.removeEventListener("pointerdown",onPointer)},[]);
 useEffect(()=>{const term=query.trim();if(!suggestOpen||term.length<3){setSuggestions([]);return}const key=term.toLowerCase();if(cache.current[key]){setSuggestions(cache.current[key]);return}if(lookupCount.current>=6){setSuggestions([]);return}const controller=new AbortController();const timer=setTimeout(async()=>{lookupCount.current++;setSuggestLoading(true);try{const response=await fetch("/api/youtube/search?q="+encodeURIComponent(term),{signal:controller.signal});if(!response.ok)throw Error("Search unavailable");const data=await response.json();const items=(data.items||[]).slice(0,6);cache.current[key]=items;setSuggestions(items)}catch(e){if(!controller.signal.aborted)setSuggestions([])}finally{if(!controller.signal.aborted)setSuggestLoading(false)}},1200);return()=>{clearTimeout(timer);controller.abort()}},[query,suggestOpen]);
 const applyAppearance=(change:()=>void)=>{const doc=document as Document&{startViewTransition?:(callback:()=>void)=>{ready:Promise<void>}};if(!motion||!doc.startViewTransition||matchMedia("(prefers-reduced-motion: reduce)").matches){change();return}const transition=doc.startViewTransition(change);void transition.ready.then(()=>{const radius=Math.hypot(innerWidth,innerHeight);document.documentElement.animate({clipPath:["circle(0px at 100% 0%)",`circle(${radius}px at 100% 0%)`]},{duration:700,easing:"cubic-bezier(.22,1,.36,1)",pseudoElement:"::view-transition-new(root)"})}).catch(()=>{})};
 const setTheme=(v:string)=>applyAppearance(()=>{setMode(v);localStorage.setItem(storageKey("mode"),v);void supabase?.auth.updateUser({data:{spotibai_mode:v}})});
 const setColor=(v:string)=>applyAppearance(()=>{setAccent(v);localStorage.setItem(storageKey("accent"),v);void supabase?.auth.updateUser({data:{spotibai_accent:v}})});
 const setAnimation=(v:boolean)=>{setMotion(v);localStorage.setItem(storageKey("motion"),String(v));void supabase?.auth.updateUser({data:{spotibai_motion:v}})};
 const go=(screen:Screen)=>{setScreen(screen);setNavigationSignal(v=>v+1);setDrawer(false);scrollArea.current?.scrollTo({top:0,behavior:"instant"})};
 const decodeText=(value:string)=>value.replace(/&(?:#(\d+)|#x([0-9a-f]+)|amp|quot|apos|lt|gt);/gi,(full,dec,hex)=>{if(dec||hex){const point=parseInt(dec||hex,hex?16:10);return point>0&&point<=0x10ffff?String.fromCodePoint(point):full}return ({ "&amp;":"&","&quot;":"\"","&apos;":"\u0027","&lt;":"<","&gt;":">"} as Record<string,string>)[full.toLowerCase()]||full});
 const playSuggestion=(song:{id:string;title:string;artist:string;thumbnail:string})=>{setSuggestOpen(false);setSelectedSuggestion(-1);setQuery(decodeText(song.title));setSuggestPlay({...song,title:decodeText(song.title),artist:decodeText(song.artist),nonce:Date.now()});go("search")};
 const find=(q:string)=>{if(!q.trim())return;const term=q.trim();setQuery(term);setSubmitted(term);setSuggestOpen(false);setSelectedSuggestion(-1);const updated=[term,...recent.filter(x=>x.toLowerCase()!==term.toLowerCase())].slice(0,6);setRecent(updated);localStorage.setItem(storageKey("recent-searches"),JSON.stringify(updated));go("search")};
 useLayoutEffect(()=>{if(scrollArea.current)scrollArea.current.scrollTop=0},[screen]);
 const heading=(name:string)=>{find(name)};
 return <div className={"app spotibai-real theme-"+mode+(motion?"":" no-motion")} style={{"--accent":accent} as React.CSSProperties}>
 <aside className={"sidebar "+(drawer?"show":"")}>
  <div className="brand"><img className="spotibai-logo-icon" src="/spotibai-icon.png" alt="Spotibai icon"/><span>spotibai<span className="brand-dot">.</span></span><button className="mobile-close icon-button" onClick={()=>setDrawer(false)} aria-label="Close menu"><X size={20}/></button></div>
  <div className="sidebar-heading">MENU</div>
  <nav className="nav">
   <button className={screen==="home"?"selected":""} onClick={()=>go("home")}><Home size={19}/> Home</button>
   <button className={screen==="search"?"selected":""} onClick={()=>go("search")}><Search size={19}/> Search music</button>
   <button className={screen==="favorites"?"selected":""} onClick={()=>go("favorites")}><Heart size={19}/> Liked songs</button>
   <button className={screen==="playlists"?"selected":""} onClick={()=>go("playlists")}><ListMusic size={19}/> Playlists</button>
   <button className={screen==="profile"?"selected":""} onClick={()=>go("profile")}><Settings2 size={19}/> Profile & Settings</button>
  </nav>
  <div className="sidebar-bottom"><div className="side-promo"><span className="promo-spark"><Disc3 size={21}/></span><strong>Make it yours.</strong><p>Find music on YouTube, favorite the songs you enjoy, and build playlists.</p><button onClick={()=>go("search")}>Explore music <ArrowRight size={15}/></button></div><span className="sidebar-foot">Spotibai · Your sound, your space</span></div>
 </aside>
 {drawer&&<div className="mobile-shade" onClick={()=>setDrawer(false)}/>}
 <main className="main">
  <header className="topbar">
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
   <div className="top-actions"><button className="avatar" title="Profile and settings" aria-label="Open settings" onClick={()=>go("profile")}>{(String(user.user_metadata?.display_name||user.email||"S"))[0].toUpperCase()}</button></div>
  </header>
  <div className="scroll-content" ref={scrollArea}>
   {screen==="home"&&<div className="spotibai-home-enter listening-room">
    <section className="room-stage">
      <div className="room-light"/>
      <div className="room-intro"><div className="room-kicker"><span className="room-led"/> SPOTIBAI / LISTENING ROOM <span className="room-issue">VOL. 001</span></div><h1>Your room.<br/><em>Your soundtrack.</em></h1><p>Drop the needle. Find your next favorite and keep a little music in the room.</p><div className="room-intro-actions"><button onClick={()=>go("search")}><Search size={17}/> Find a record <ArrowRight size={16}/></button><button onClick={()=>go("playlists")}><ListMusic size={17}/> Open your collection</button></div></div>
      <div className="room-console" aria-hidden="true"><div className="room-plinth"><div className="room-turntable"><div className="room-record"><div className="room-record-label"><Music2 size={27}/></div></div><div className="room-arm"><div className="room-arm-joint"/><div className="room-arm-stick"/><div className="room-cartridge"/></div><div className="room-control-knob"/></div><div className="room-console-footer"><span>SPOTIBAI HI-FI</span><span>33⅓ RPM • STEREO</span><div className="room-tiny-light"/></div></div></div>
      <div className="room-ground-line"/>
    </section>
    <div className="room-section-heading"><div><span className="room-overline">THE RECORD CRATE</span><h2>Pick a mood, press play.</h2></div><button onClick={()=>go("search")}>Browse music <ArrowRight size={16}/></button></div>
    <div className="room-crates">
      {[{name:"AFTER HOURS",subtitle:"Quiet streets, loud thoughts",term:"late night chill r&b music",color:"violet",symbol:"01"},{name:"LOUD & CLEAR",subtitle:"Turn the room up",term:"hip hop hits music",color:"orange",symbol:"02"},{name:"SLOW MOTION",subtitle:"A little breathing room",term:"lofi mellow chill music",color:"blue",symbol:"03"},{name:"ON REPEAT",subtitle:"The one you never skip",term:"popular songs playlist",color:"lime",symbol:"04"}].map(item=><button className={"room-crate "+item.color} key={item.name} onClick={()=>heading(item.term)}><span className="room-crate-top"><span>SPOTIBAI SELECTS</span><span>{item.symbol} / 04</span></span><span className="room-crate-groove"/><span className="room-crate-bottom"><strong>{item.name}</strong><small>{item.subtitle}</small><ArrowRight size={18}/></span></button>)}
    </div>
    <div className="room-section-heading"><div><span className="room-overline">YOUR OWN CORNER</span><h2>On your shelf.</h2></div></div>
    <div className="room-shelf">
      <button className="room-shelf-item" onClick={()=>go("favorites")}><span className="room-shelf-art heart"><Heart size={31}/></span><span><small>THE KEEPSAKES</small><strong>Liked records</strong><span>Everything worth keeping close.</span></span><ArrowRight size={19}/></button>
      <button className="room-shelf-item" onClick={()=>go("playlists")}><span className="room-shelf-art tapes"><CassetteTape size={35}/></span><span><small>THE MIXTAPES</small><strong>Your playlists</strong><span>Handpicked, side A to side B.</span></span><ArrowRight size={19}/></button>
    </div>
    <footer className="room-footer"><Headphones size={17}/><span>GOOD MUSIC. GOOD COMPANY. NO RUSH.</span><Radio size={17}/></footer>
   </div>}
   {screen==="profile"&&<section className="spot-settings studio-preferences search-view-enter">
 <div className="studio-settings-header"><div><span className="studio-eyebrow">SPOTIBAI / STUDIO SETTINGS</span><h1>Your space, your sound.</h1><p>Set the atmosphere of your listening room.</p></div><SlidersHorizontal size={27}/></div>
 <div className="studio-pref-row"><div className="studio-pref-label"><strong>Appearance</strong><span>Daylight or after dark</span></div><div className="studio-mode-switch"><button className={mode==="dark"?"active":""} onClick={()=>setTheme("dark")}>Night {mode==="dark"&&<Check size={14}/>}</button><button className={mode==="light"?"active":""} onClick={()=>setTheme("light")}>Daylight {mode==="light"&&<Check size={14}/>}</button></div></div>
 <div className="studio-pref-row"><div className="studio-pref-label"><strong>Room lighting</strong><span>Choose your signature color</span></div><div className="studio-swatches">{[["Violet","#b28dff"],["Coral","#f28ba8"],["Sage","#68c4ae"],["Sky","#7dabf4"],["Amber","#f3b86b"]].map(([name,value])=><button key={value} title={name} aria-label={name} aria-pressed={accent===value} className={accent===value?"active":""} onClick={()=>setColor(value)} style={{"--swatch":value} as React.CSSProperties}>{accent===value&&<Check size={15}/>}</button>)}<label className="studio-color-custom"><input type="color" aria-label="Custom room lighting color" value={accent} onChange={e=>setColor(e.target.value)}/></label></div></div>
 <div className="studio-pref-row"><div className="studio-pref-label"><strong>Motion</strong><span>Ambient movement and transitions</span></div><label className="studio-motion-toggle"><input type="checkbox" checked={motion} onChange={e=>setAnimation(e.target.checked)}/><span/></label></div>
 <button type="button" className="spot-signout" onClick={()=>void supabase?.auth.signOut()}>Sign out</button><div className="studio-settings-foot"><Music2 size={17}/> Appearance syncs with your account. Music collections are saved on this device.</div>
 </section>}
 <div className={"search-view-enter "+(screen==="home"||screen==="profile"?"spot-view-hidden":"") }><YouTubeMusic userId={user.id} embedded initialQuery={submitted} initialSection={screen==="favorites"?"favorites":screen==="playlists"?"playlists":"discover"} createPlaylistSignal={newPlaylist} navigationSignal={navigationSignal} suggestedTrack={suggestPlay}/></div>
  </div>
 </main>
 </div>
}
