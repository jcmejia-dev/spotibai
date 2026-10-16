"use client";
import {ArrowRight,Disc3,Search,Radio,Music2} from "lucide-react";

type Screen="home"|"search"|"favorites"|"playlists"|"offline"|"profile";
type Props={onNavigate:(screen:Screen)=>void;onSearch:(term:string)=>void;currentTrack?:{id:string;title:string;artist:string}|null};
const presets=[
 {index:"01",label:"AFTER DARK",detail:"Late-night listening",query:"late night r&b chill songs",kind:"dusk"},
 {index:"02",label:"FULL VOLUME",detail:"Something with a pulse",query:"energetic hip hop songs",kind:"heat"},
 {index:"03",label:"SLOW DAYS",detail:"Easy does it",query:"acoustic mellow chill songs",kind:"calm"},
 {index:"04",label:"THE THROWBACK",detail:"Back in rotation",query:"90s 2000s hit music",kind:"retro"}
];
export default function ListeningRoomHome({onNavigate,onSearch,currentTrack}:Props){
 return <div className="mixtape-room">
  <div className="mx-masthead"><span><span className="mx-status"/> THE SPOTIBAI LISTENING CLUB</span><span>INDEPENDENT FREQUENCY / VOL. 01</span></div>
  <section className="mx-hero">
   <div className="mx-hero-copy">
    <span className="mx-issue">PUT YOUR WORLD ON PLAY</span>
    <h1>Music for<br/>the <em>in-between.</em></h1>
    <p>For the ride home, the late nights and everything you want to hear again. This is your space.</p>
    <div className="mx-hero-actions">
     <button className="mx-primary" onClick={()=>onNavigate("search")}><Search size={17}/> Find your sound <ArrowRight size={17}/></button>
     <button className="mx-secondary" onClick={()=>onNavigate("playlists")}>Your mixtapes <ArrowRight size={16}/></button>
    </div>
    <div className="mx-hero-footer"><span>NO SUBSCRIPTION TO EXPLORE</span><span>MAKE IT YOURS</span></div>
   </div>
   <div className="mx-tape-scene" aria-hidden="true">
    <div className="mx-scene-rays"/>
    <div className="mx-cassette">
      <div className="mx-cassette-top"><span>SPOTIBAI</span><span>90 MIN / STEREO</span></div>
      <div className="mx-tape-sticker">
       <div className="mx-tape-label">{currentTrack?"CURRENTLY SPINNING":"THE SOUNDTRACK"}<strong title={currentTrack?.title||"Pick a song."}>{currentTrack?.title||"PICK A SONG."}</strong></div>
       <div className="mx-tape-window"><div className="mx-reel"><span/></div><div className="mx-window-stripe"/><div className="mx-reel"><span/></div></div>
       <div className="mx-tape-bottom"><span title={currentTrack?.artist||"SIDE A"}>{currentTrack?.artist||"SIDE A"}</span><span>SB / 001</span></div>
      </div>
      <div className="mx-tape-holes"><span/><span/><span/></div>
    </div>
    <div className="mx-scene-caption">RECORDED FOR YOU — PLAY IT YOUR WAY</div>
   </div>
  </section>
  <div className="mx-ticker"><span><Radio size={16}/> A PLACE TO PLAY</span><i/> <span>GOOD MUSIC, NO PRESSURE</span><i/> <span><Music2 size={16}/> FOLLOW YOUR OWN RHYTHM</span></div>
  <section className="mx-frequency-section">
   <div className="mx-section-head"><div><span className="mx-section-id">01 / PICK A FREQUENCY</span><h2>What's the mood?</h2></div><button onClick={()=>onNavigate("search")}>See all sounds <ArrowRight size={17}/></button></div>
   <div className="mx-frequencies">{presets.map(p=><button key={p.index} className={"mx-frequency mx-frequency-"+p.kind} onClick={()=>onSearch(p.query)}><span className="mx-frequency-top"><span>{p.index} / 04</span><Disc3 size={17}/></span><span className="mx-frequency-waves" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></span><span className="mx-frequency-caption"><strong>{p.label}</strong><small>{p.detail}</small></span><ArrowRight className="mx-frequency-arrow" size={19}/></button>)}</div>
  </section>

 </div>;
}
