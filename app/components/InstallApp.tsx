"use client";
import {useEffect,useRef,useState} from "react";
import {CheckCircle2, Download, ExternalLink, MonitorDown, Share2, Smartphone, X} from "lucide-react";
import "./install-app.css";

type BeforeInstallPromptEvent=Event&{
 prompt:()=>Promise<void>;
 userChoice:Promise<{outcome:"accepted"|"dismissed";platform:string}>;
};
type Props={placement?:"header"|"login"};
function isStandalone(){
 if(typeof window==="undefined")return false;
 const ios=window.navigator as Navigator&{standalone?:boolean};
 return window.matchMedia("(display-mode: standalone)").matches||ios.standalone===true;
}
export default function InstallApp({placement="header"}:Props){
 const deferredPrompt=useRef<BeforeInstallPromptEvent|null>(null);
 const [supported,setSupported]=useState(false);
 const [installed,setInstalled]=useState(false);
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [platform,setPlatform]=useState<"android"|"ios"|"desktop">("desktop");
 const [feedback,setFeedback]=useState("");
 useEffect(()=>{
  setInstalled(isStandalone());
  const agent=navigator.userAgent;
  setPlatform(/iPad|iPhone|iPod/i.test(agent)?"ios":/Android/i.test(agent)?"android":"desktop");
  const offered=(event:Event)=>{
   event.preventDefault();
   deferredPrompt.current=event as BeforeInstallPromptEvent;
   setSupported(true);
  };
  const successful=()=>{
   setInstalled(true);
   setOpen(false);
   deferredPrompt.current=null;
   setSupported(false);
  };
  window.addEventListener("beforeinstallprompt",offered);
  window.addEventListener("appinstalled",successful);
  return()=>{
   window.removeEventListener("beforeinstallprompt",offered);
   window.removeEventListener("appinstalled",successful);
  };
 },[]);
 async function install(){
  setFeedback("");
  const prompt=deferredPrompt.current;
  if(!prompt){setOpen(true);return}
  setBusy(true);
  try{
   await prompt.prompt();
   const choice=await prompt.userChoice;
   deferredPrompt.current=null;
   setSupported(false);
   if(choice.outcome==="accepted"){
    setFeedback("Spotibai was added to your installation queue. Follow any browser prompts.");
    setOpen(false);
   }else{
    setOpen(true);
    setFeedback("Installation dismissed. You can still install Spotibai from your browser menu.");
   }
  }catch{
   setOpen(true);
   setFeedback("The installation prompt wasn't available. Use your browser's installation option.");
  }finally{setBusy(false)}
 }
 if(installed)return placement==="login"?<div className="spot-install-installed"><CheckCircle2 size={15}/> Spotibai is installed on this device</div>:null;
 return <>
  <button type="button" className={"spot-install-trigger spot-install-"+placement} disabled={busy} title="Install Spotibai" aria-label="Install Spotibai app" onClick={()=>void install()}>
   <Download size={placement==="login"?18:16}/><span>{busy?"Opening…":"Install App"}</span>
  </button>
  {open&&<div className="spot-install-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <section className="spot-install-dialog" role="dialog" aria-modal="true" aria-labelledby="spot-install-title">
    <button className="spot-install-close" aria-label="Close installation instructions" type="button" onClick={()=>setOpen(false)}><X size={20}/></button>
    <img className="spot-install-logo" src="/spotibai-icon.png" alt=""/>
    <span className="spot-install-eyebrow">YOUR MUSIC / YOUR SPACE</span>
    <h2 id="spot-install-title">Take Spotibai with you.</h2>
    <p className="spot-install-lead">Install the free web app on your home screen. It opens like an app, while online music streaming still needs internet.</p>
    <div className="spot-install-choice">
     <div className="spot-install-choice-icon"><MonitorDown size={21}/></div>
     <div><strong>Spotibai web app</strong><small>Available now · no APK required</small></div>
     <span className="spot-install-ready">Ready</span>
    </div>
    <div className="spot-install-guide">
     <strong>{platform==="ios"?"Install on iPhone / iPad":platform==="android"?"Install on Android":"Install on your computer"}</strong>
     {platform==="ios"?<p>Open this site in Safari, tap <Share2 size={14} aria-label="Share" className="spot-install-inline-icon"/> Share, then choose <b>Add to Home Screen</b> and confirm.</p>:platform==="android"?<p>In Chrome, open the <b>⋮</b> menu and select <b>Install app</b> or <b>Add to Home screen</b>. Then confirm.</p>:<p>In Chrome or Edge, use the <b>Install</b> icon in the address bar, or open the browser menu and select <b>Install Spotibai</b>.</p>}
    </div>
    {feedback&&<p className="spot-install-feedback" role="status">{feedback}</p>}
    {supported&&<button type="button" className="spot-install-primary" onClick={()=>void install()}><Download size={16}/> Install now</button>}
    <div className="spot-install-native"><Smartphone size={19}/><div><strong>React Native Android app</strong><small>Coming next. An APK download will be added after the native app is built and tested.</small></div></div>
    <button type="button" className="spot-install-done" onClick={()=>setOpen(false)}>Got it <ExternalLink size={15}/></button>
   </section>
  </div>}
 </>;
}
