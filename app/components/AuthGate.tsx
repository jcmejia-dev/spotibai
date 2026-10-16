"use client";
import {useEffect,useState} from "react";
import {authClient} from "../../lib/auth/client";
type User={id:string;name:string;email:string;isGuest?:boolean};
import "./auth.css";
import InstallApp from "./InstallApp";
export default function AuthGate({children}:{children:(user:User,exitGuest:()=>void)=>React.ReactNode}){
 const {data:session,isPending}=authClient.useSession();
 const [guest,setGuest]=useState(false);
 const [hydrated,setHydrated]=useState(false);
 useEffect(()=>{try{setGuest(localStorage.getItem("spotibai-guest-mode")==="yes")}catch{}setHydrated(true)},[]);
 const enterGuest=()=>{localStorage.setItem("spotibai-guest-mode","yes");localStorage.setItem("spotibai-active-offline-user","guest");setGuest(true)};
 const exitGuest=()=>{localStorage.removeItem("spotibai-guest-mode");localStorage.removeItem("spotibai-active-offline-user");setGuest(false)};
 const [mode,setMode]=useState<"signin"|"signup">("signin");
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [name,setName]=useState("");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 const [intro,setIntro]=useState(false);
 useEffect(()=>{if(!session?.user)return;setIntro(true);const t=setTimeout(()=>setIntro(false),1050);return()=>clearTimeout(t)},[session?.user?.id]);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");
 try{
 if(mode==="signup"){
 const {data,error}=await authClient.signUp.email({email,password,name:name.trim()||email.split("@")[0]});
 if(error)throw Error(error.message||"Sign-up failed");
 if(data)setMessage("Account created. If verification is required, check your email before signing in.");
 }else{
 const {error}=await authClient.signIn.email({email,password});
 if(error)throw Error(error.message||"Sign-in failed");
 }
 }catch(e){setError(e instanceof Error?e.message:"Authentication failed")}finally{setBusy(false)}}
 if(!hydrated||((isPending||intro)&&!guest))return <div className="spot-auth-loading"><img src="/spotibai-icon.png" alt="Spotibai" className="spot-auth-spin"/><strong>spotibai<span>.</span></strong><small>Finding your rhythm</small></div>;
 const user=session?.user?{id:session.user.id,name:session.user.name,email:session.user.email}:null;
 if(user&&!guest)return <>{children(user,exitGuest)}</>;
 if(guest)return <>{children({id:"guest",name:"Guest",email:"",isGuest:true},exitGuest)}</>;
 return <main className="spot-auth-bg"><div className="spot-auth-card"><header><img src="/spotibai-icon.png" alt=""/><strong>spotibai<span>.</span></strong></header><span className="spot-auth-kicker">YOUR MUSIC. YOUR SPACE.</span><h1>{mode==="signin"?"Welcome back.":"Your listening room starts here."}</h1><p>{mode==="signin"?"Pick up where you left off.":"Save your own preferences, favorites and playlists."}</p><form onSubmit={submit}>{mode==="signup"&&<label>Display name<input autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="What should we call you?"/></label>}<label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={6} autoComplete={mode==="signup"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>{error&&<p className="spot-auth-error" role="alert">{error}</p>}{message&&<p className="spot-auth-info" role="status">{message}</p>}<button type="submit" disabled={busy}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button></form><InstallApp placement="login"/><button className="spot-guest-button" type="button" onClick={enterGuest}><span>Explore as a guest</span><span aria-hidden="true">→</span></button><p className="spot-guest-hint">No account needed. Your favorites and playlists stay on this device.</p><footer>{mode==="signin"?"New to Spotibai?":"Already have an account?"}<button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setMessage("")}}>{mode==="signin"?"Create an account":"Sign in"}</button></footer></div></main>
}
