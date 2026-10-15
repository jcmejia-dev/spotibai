"use client";
import {useEffect,useState} from "react";
import type {User} from "@supabase/supabase-js";
import {supabase} from "../../lib/supabase";
import "./auth.css";
export default function AuthGate({children}:{children:(user:User)=>React.ReactNode}){
 const [user,setUser]=useState<User|null>(null);
 const [ready,setReady]=useState(false);
 const [mode,setMode]=useState<"signin"|"signup">("signin");
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [name,setName]=useState("");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 const [intro,setIntro]=useState(false);
 useEffect(()=>{if(!supabase){setReady(true);return}void supabase.auth.getUser().then(({data})=>{setUser(data.user);setReady(true)}).catch(()=>setReady(true));
 const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);if(session?.user){setIntro(true)}else setIntro(false)});
 return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!intro)return;const timer=setTimeout(()=>setIntro(false),1050);return()=>clearTimeout(timer)},[intro]);
 async function submit(e:React.FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError("");setMessage("");
 try{if(mode==="signup"){const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name.trim()||email.split("@")[0]}}});if(error)throw error;if(!data.session)setMessage("Check your email to confirm your account, then sign in.");else setIntro(true)}
 else {const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;setIntro(true)}}
 catch(e){setError(e instanceof Error?e.message:"Authentication failed")}finally{setBusy(false)}}
 if(!ready||intro)return <div className="spot-auth-loading"><img src="/spotibai-icon.png" alt="Spotibai" className="spot-auth-spin"/><strong>spotibai<span>.</span></strong><small>Finding your rhythm</small></div>;
 if(!supabase)return <div className="spot-auth-bg"><div className="spot-auth-card"><img src="/spotibai-icon.png" alt="Spotibai"/><h1>Connect authentication</h1><p>Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart Spotibai.</p></div></div>;
 if(user)return <>{children(user)}</>;
 return <main className="spot-auth-bg"><div className="spot-auth-card"><header><img src="/spotibai-icon.png" alt=""/><strong>spotibai<span>.</span></strong></header><span className="spot-auth-kicker">YOUR MUSIC. YOUR SPACE.</span><h1>{mode==="signin"?"Welcome back.":"Your listening room starts here."}</h1><p>{mode==="signin"?"Pick up where you left off.":"Save your own preferences, favorites and playlists."}</p><form onSubmit={submit}>{mode==="signup"&&<label>Display name<input autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="What should we call you?"/></label>}<label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={6} autoComplete={mode==="signup"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>{error&&<p className="spot-auth-error" role="alert">{error}</p>}{message&&<p className="spot-auth-info" role="status">{message}</p>}<button type="submit" disabled={busy}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button></form><footer>{mode==="signin"?"New to Spotibai?":"Already have an account?"}<button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setMessage("")}}>{mode==="signin"?"Create an account":"Sign in"}</button></footer></div></main>
}
