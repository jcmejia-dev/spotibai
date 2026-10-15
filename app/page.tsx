"use client";
import {useState} from "react";
import {ArrowLeft, ArrowRight, Disc3, Heart, Home, Library, ListMusic, Menu, Music2, Plus, Search, X} from "lucide-react";
import YouTubeMusic from "./youtube/page";

type Screen="home"|"search"|"favorites"|"playlists";
export default function Page(){
 const [screen,setScreen]=useState<Screen>("home");
 const [query,setQuery]=useState("");
 const [submitted,setSubmitted]=useState("");
 const [drawer,setDrawer]=useState(false);
 const [newPlaylist,setNewPlaylist]=useState(0);
 const go=(screen:Screen)=>{setScreen(screen);setDrawer(false)};
 const find=(q:string)=>{setQuery(q);setSubmitted(q);go("search")};
 const heading=(name:string)=>{find(name)};
 return <div className="app spotibai-real">
 <aside className={"sidebar "+(drawer?"show":"")}>
  <div className="brand"><span className="brand-icon"><Music2 size={23}/></span><span>spotibai<span className="brand-dot">.</span></span><button className="mobile-close icon-button" onClick={()=>setDrawer(false)} aria-label="Close menu"><X size={20}/></button></div>
  <div className="sidebar-heading">MENU</div>
  <nav className="nav">
   <button className={screen==="home"?"selected":""} onClick={()=>go("home")}><Home size={19}/> Home</button>
   <button className={screen==="search"?"selected":""} onClick={()=>go("search")}><Search size={19}/> Search music</button>
   <button className={screen==="favorites"?"selected":""} onClick={()=>go("favorites")}><Heart size={19}/> Liked songs</button>
   <button className={screen==="playlists"?"selected":""} onClick={()=>go("playlists")}><ListMusic size={19}/> Playlists</button>
  </nav>
  <div className="sidebar-heading spaced">YOUR MUSIC</div>
  <nav className="nav"><button onClick={()=>{setNewPlaylist(v=>v+1);go("playlists")}}><Plus size={19}/> Create playlist</button></nav>
  <div className="sidebar-bottom"><div className="side-promo"><span className="promo-spark"><Disc3 size={21}/></span><strong>Make it yours.</strong><p>Find music on YouTube, favorite the songs you enjoy, and build playlists.</p><button onClick={()=>go("search")}>Explore music <ArrowRight size={15}/></button></div><span className="sidebar-foot">Spotibai · Your sound, your space</span></div>
 </aside>
 {drawer&&<div className="mobile-shade" onClick={()=>setDrawer(false)}/>}
 <main className="main">
  <header className="topbar">
   <div className="history"><button className="menu-toggle icon-button" onClick={()=>setDrawer(true)} aria-label="Open menu"><Menu size={21}/></button><button className="circle" onClick={()=>go("home")} aria-label="Go home"><ArrowLeft size={17}/></button><button className="circle" onClick={()=>go("search")} aria-label="Go to search"><ArrowRight size={17}/></button></div>
   <form className="searchbox" onSubmit={e=>{e.preventDefault();find(query.trim())}}><Search size={18}/><input aria-label="Search YouTube music" value={query} placeholder="Search for songs or artists..." onFocus={()=>go("search")} onChange={e=>setQuery(e.target.value)}/><button type="submit" className="top-search-submit" aria-label="Search"><Search size={16}/></button></form>
   <div className="top-actions"><a href="/audius" style={{color:"#d4b4ff",fontSize:12,fontWeight:800,textDecoration:"none",whiteSpace:"nowrap"}}>Audius Player ↗</a><div className="avatar" title="Spotibai">S</div></div>
  </header>
  <div className="scroll-content">
   {screen==="home"&&<div className="spotibai-home-enter">
    <section className="welcome"><span className="eyebrow"><span className="pulse"/> YOUR PERSONAL SOUNDTRACK</span><h1>Music sounds better<br/><em>in your world.</em></h1><p>Search real music videos, save favorites, and build playlists that feel like you.</p><div className="welcome-actions"><button className="primary-button" onClick={()=>go("search")}><Search size={17}/> Find music</button><button className="subtle-button" onClick={()=>find("trending music 2026")}>Explore what's new <ArrowRight size={16}/></button></div><div className="hero-orb one"/><div className="hero-orb two"/><div className="hero-vinyl"><div className="vinyl-center"><Music2 size={35}/></div></div></section>
    <div className="section-title"><div><span className="section-kicker">PICK YOUR VIBE</span><h2>Explore something you'll love <span>✦</span></h2></div></div>
    <div className="mood-grid">
    {[{name:"Late Night",subtitle:"Slow down & unwind",term:"late night chill songs",cover:"https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=700&q=85",tint:"purple"},{name:"Good Energy",subtitle:"Turn the volume up",term:"feel good pop songs",cover:"https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=700&q=85",tint:"amber"},{name:"Deep Focus",subtitle:"Stay in your zone",term:"lofi study music",cover:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=700&q=85",tint:"blue"},{name:"On Repeat",subtitle:"Discover popular tracks",term:"popular music 2026",cover:"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=700&q=85",tint:"rose"}].map(item=><button key={item.name} className={"mood-card "+item.tint} onClick={()=>heading(item.term)}><img src={item.cover} alt=""/><span className="mood-scrim"/><span className="mood-copy"><strong>{item.name}</strong><small>{item.subtitle}</small></span><span className="mood-arrow"><ArrowRight size={17}/></span></button>)}
    </div>
    <div className="section-title second"><div><span className="section-kicker">YOUR SPACE</span><h2>Your music, organized</h2></div></div>
    <div className="spotibai-library-cards"><button onClick={()=>go("favorites")}><Heart size={23}/><strong>Liked songs</strong><small>See all the songs you've favorited</small><ArrowRight size={17}/></button><button onClick={()=>go("playlists")}><ListMusic size={23}/><strong>Your playlists</strong><small>Pick up where you left off</small><ArrowRight size={17}/></button></div>
   </div>}
   {screen!=="home"&&<div className="search-view-enter"><YouTubeMusic embedded initialQuery={submitted} initialSection={screen==="favorites"?"favorites":screen==="playlists"?"playlists":"discover"} createPlaylistSignal={newPlaylist}/></div>}
  </div>
 </main>
 </div>
}
