import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,AppState,BackHandler,Image,Linking,Modal,Pressable,StatusBar,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebView,{WebViewNavigation} from 'react-native-webview';
import NativeAudioPanel from './NativeAudioPanel';

const DEFAULT_URL=(process.env.EXPO_PUBLIC_SPOTIBAI_API_URL||'https://spotibai-delta.vercel.app').replace(/\/+$/,'');
const TIMER_STORAGE='spotibai-native-sleep-timer-v1';
const icon=require('../../assets/images/spotibai-icon.png');
const validUrl=(v:string)=>/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(v)&&!v.includes('..');
const JAVASCRIPT="\n(function(){\n  try {\n    window.__SPOTIBAI_NATIVE_APP__ = true;\n    if (window.__SPOTIBAI_SHELL_SCRIPT__) return true;\n    window.__SPOTIBAI_SHELL_SCRIPT__ = true;\n    function fmt(ms) {\n      var left = Math.max(0, Math.ceil(ms/1000));\n      var hours=Math.floor(left/3600), mins=Math.floor((left%3600)/60), secs=left%60;\n      return (hours?hours+':'+String(mins).padStart(2,'0'):String(mins))+':'+String(secs).padStart(2,'0');\n    }\n    function send(type){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:type}))}catch(e){}}\n    function ready(){\n      if(!document.head||!document.body) return;\n      if(!document.getElementById('spotibai-native-hide-install')){\n        var style=document.createElement('style');\n        style.id='spotibai-native-hide-install';\n        style.textContent='.spot-install-trigger,.spot-install-overlay,.spot-install-installed{display:none!important}.spot-native-action{height:34px;min-width:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:9px;border:1px solid var(--spot-border,#584463);background:var(--spot-surface-2,#32243c);color:var(--accent,#b28dff);font-size:16px;font-weight:800;cursor:pointer;padding:0 9px}.spot-native-action-running{border-color:var(--accent,#b28dff)}';\n        document.head.appendChild(style);\n      }\n      var actions=document.querySelector('.top-actions');\n      if(actions){\n        if(!actions.querySelector('.spot-native-audio-button')){\n          var audio=document.createElement('button');audio.type='button';audio.className='spot-native-action spot-native-audio-button';\n          audio.textContent='♫';audio.title='Audius background audio';audio.setAttribute('aria-label','Open background audio');\n          audio.onclick=function(){send('spotibai:open-audio')};\n          actions.insertBefore(audio,actions.firstChild);\n        }\n        if(!actions.querySelector('.spot-native-sleep-button')){\n          var timer=document.createElement('button');timer.type='button';timer.className='spot-native-action spot-native-sleep-button';\n          timer.title='Set music sleep timer';timer.setAttribute('aria-label','Set sleep timer');\n          timer.onclick=function(){send('spotibai:open-sleep-timer')};\n          actions.insertBefore(timer,actions.firstChild);\n        }\n        var timer=actions.querySelector('.spot-native-sleep-button');\n        if(timer){\n          var until=Number(window.__spotibaiSleepUntil||0), remaining=until-Date.now();\n          var label=until&&remaining>0?'⏲ '+fmt(remaining):'⏲';if(timer.textContent!==label)timer.textContent=label;\n          timer.classList.toggle('spot-native-action-running',until>0&&remaining>0);\n        }\n      }\n    }\n    function boot(){try{ready();new MutationObserver(function(){ready()}).observe(document.documentElement,{childList:true,subtree:true});setInterval(ready,1000)}catch(e){}}\n    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});\n    else boot();\n    document.addEventListener('click',function(evt){\n      var el=evt.target;\n      if(el&&el.closest&&el.closest('.yt-art,.yt-queue-track,.yt-watch-page .yt-watch-next button'))send('spotibai:youtube-start');\n    },true);\n  } catch(e) {}\n})();\ntrue;\n";
const minsLabel=(ms:number)=>{const sec=Math.max(0,Math.ceil(ms/1000));const h=Math.floor(sec/3600);const m=Math.floor(sec%3600/60);const s=sec%60;return h?String(h)+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'):String(m)+':'+String(s).padStart(2,'0')};
const PRESETS=[5,15,30,45,60,90];

type WebMessage={type:string};
export default function SpotibaiShell(){
 const [site,setSite]=useState(DEFAULT_URL);
 const [panelOpen,setPanelOpen]=useState(false);
 const [sleepOpen,setSleepOpen]=useState(false);
 const [custom,setCustom]=useState('');
 const [expiresAt,setExpiresAt]=useState<number|null>(null);
 const [now,setNow]=useState(Date.now());
 const [stopSignal,setStopSignal]=useState(0);
 const [notice,setNotice]=useState('');
 const [webError,setWebError]=useState('');
 const [canGoBack,setCanGoBack]=useState(false);
 const [reload,setReload]=useState(0);
 const web=useRef<WebView<{}>>(null);
 const expiresRef=useRef<number|null>(null);
 const stoppedRef=useRef(false);

 function updateWebTimer(value:number|null){
  web.current?.injectJavaScript('window.__spotibaiSleepUntil='+Number(value||0)+';true;');
 }
 function setDeadline(value:number|null){
  expiresRef.current=value;
  stoppedRef.current=false;
  setExpiresAt(value);setNow(Date.now());
  updateWebTimer(value);
  if(value){void AsyncStorage.setItem(TIMER_STORAGE,String(value)).catch(()=>{});}
  else{void AsyncStorage.removeItem(TIMER_STORAGE).catch(()=>{});}
 }
 function finish(){
  if(stoppedRef.current||!expiresRef.current||Date.now()<expiresRef.current)return;
  stoppedRef.current=true;
  expiresRef.current=null;
  setExpiresAt(null);setNow(Date.now());setSleepOpen(false);
  void AsyncStorage.removeItem(TIMER_STORAGE).catch(()=>{});
  // Pause native audio; reload the original WebView to definitively terminate
  // website HTML audio and YouTube iframe playback, even when direct iframe
  // postMessage controls are blocked by cross-origin policies.
  setStopSignal(n=>n+1);
  web.current?.injectJavaScript('document.querySelectorAll("audio,video").forEach(function(el){try{el.pause()}catch(e){}});true;');
  web.current?.reload();
  setNotice('Sleep timer ended — music stopped');
 }
 useEffect(()=>{
  let mounted=true;
  AsyncStorage.getItem('spotibai-native-v2').then(raw=>{
   if(!raw||!mounted)return;
   const old=JSON.parse(raw) as {api?:string};
   if(old.api&&validUrl(old.api))setSite(old.api.endsWith('/')?old.api.slice(0,-1):old.api);
  }).catch(()=>{});
  AsyncStorage.getItem(TIMER_STORAGE).then(raw=>{
   if(!mounted||!raw)return;
   const until=Number(raw);
   if(Number.isFinite(until)&&until>Date.now()){
    expiresRef.current=until;setExpiresAt(until);setNow(Date.now());
   }else void AsyncStorage.removeItem(TIMER_STORAGE).catch(()=>{});
  }).catch(()=>{});
  return()=>{mounted=false};
 },[]);
 useEffect(()=>{
  const ticker=setInterval(()=>{setNow(Date.now());finish()},1000);
  const state=AppState.addEventListener('change',s=>{if(s==='active'){setNow(Date.now());finish()}});
  return()=>{clearInterval(ticker);state.remove()};
 },[]);
 useEffect(()=>{
  const listener=BackHandler.addEventListener('hardwareBackPress',()=>{
   if(sleepOpen){setSleepOpen(false);return true;}
   if(panelOpen){setPanelOpen(false);return true;}
   if(canGoBack){web.current?.goBack();return true;}
   return false;
  });
  return()=>listener.remove();
 },[canGoBack,panelOpen,sleepOpen]);
 function handleMessage(payload:string){
  try{const message=JSON.parse(payload) as WebMessage;
   if(message.type==='spotibai:open-audio')setPanelOpen(true);
   if(message.type==='spotibai:open-sleep-timer')setSleepOpen(true);
   if(message.type==='spotibai:youtube-start')setStopSignal(x=>x+1);
  }catch{}
 }
 function start(minutes:number){
  if(!Number.isInteger(minutes)||minutes<1||minutes>480){setNotice('Choose a duration from 1 to 480 minutes');return}
  setDeadline(Date.now()+minutes*60000);
  setSleepOpen(false);
  setNotice('Sleep timer started: '+minutes+' minutes');
 }
 function cancel(){setDeadline(null);setSleepOpen(false);setNotice('Sleep timer cancelled')}
 const remaining=expiresAt?Math.max(0,expiresAt-now):0;
 return <SafeAreaView style={{flex:1,backgroundColor:'#120d18'}} edges={['top','bottom']}>
 <StatusBar barStyle="light-content"/>
 {webError?<View style={{flex:1,alignItems:'center',justifyContent:'center',padding:28}}>
  <Image source={icon} style={{width:72,height:72,borderRadius:15}}/>
  <Text style={{fontSize:23,fontWeight:'900',color:'#fff',marginTop:20}}>Spotibai couldn't load</Text>
  <Text style={{textAlign:'center',color:'#c9b9d3',fontSize:12,lineHeight:21,marginTop:12}}>{webError}</Text>
  <Pressable style={{backgroundColor:'#b28dff',padding:13,borderRadius:10,marginTop:22}} onPress={()=>{setWebError('');setReload(x=>x+1)}}>
   <Text style={{color:'#1b1024',fontWeight:'900'}}>Try again</Text>
  </Pressable>
  <Pressable onPress={()=>void Linking.openURL(site).catch(()=>{})} style={{marginTop:15,padding:12}}>
   <Text style={{color:'#b28dff'}}>Open in browser ↗</Text>
  </Pressable>
 </View>:
 <WebView<{}>
  key={site+'-'+reload}
  ref={web}
  source={{uri:site+'/'}}
  originWhitelist={['https://*']}
  javaScriptEnabled
  domStorageEnabled
  sharedCookiesEnabled
  thirdPartyCookiesEnabled
  allowsFullscreenVideo
  allowsInlineMediaPlayback
  mediaPlaybackRequiresUserAction={false}
  setSupportMultipleWindows={false}
  injectedJavaScriptBeforeContentLoaded={JAVASCRIPT}
  injectedJavaScript={JAVASCRIPT}
  onMessage={event=>handleMessage(event.nativeEvent.data)}
  onNavigationStateChange={(s:WebViewNavigation)=>{setCanGoBack(s.canGoBack)}}
  onLoadEnd={()=>updateWebTimer(expiresRef.current)}
  onError={()=>setWebError('Check your connection and confirm the Spotibai production domain in Vercel is connected.')}
  startInLoadingState
  renderLoading={()=><View style={{flex:1,backgroundColor:'#120d18',alignItems:'center',justifyContent:'center'}}>
   <Image source={icon} style={{width:70,height:70,borderRadius:16}}/>
   <ActivityIndicator color="#b28dff" style={{marginTop:25}}/>
   <Text style={{marginTop:14,fontSize:11,color:'#c5a9da',letterSpacing:1.5}}>FINDING YOUR RHYTHM</Text>
  </View>}
  style={{flex:1,backgroundColor:'#120d18'}}
 />}
 <NativeAudioPanel visible={panelOpen} onClose={()=>setPanelOpen(false)} api={site} stopSignal={stopSignal} onOpenSleepTimer={()=>setSleepOpen(true)} sleepRemainingMs={remaining}/>
 {Boolean(notice)&&!panelOpen&&!sleepOpen&&<Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={()=>setNotice('')} style={{position:'absolute',bottom:12,alignSelf:'center',backgroundColor:'#31213a',borderColor:'#63487c',borderWidth:1,borderRadius:10,paddingVertical:10,paddingHorizontal:16,maxWidth:'90%'}}>
  <Text style={{color:'#d6b7f1',fontSize:12,textAlign:'center'}}>{notice}</Text>
 </Pressable>}
 <Modal visible={sleepOpen} transparent animationType="fade" onRequestClose={()=>setSleepOpen(false)}>
  <View style={{flex:1,backgroundColor:'#060409ce',justifyContent:'center',padding:22}}>
   <View style={{borderRadius:18,padding:23,backgroundColor:'#24192f',borderWidth:1,borderColor:'#654c79'}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
     <Text style={{fontSize:12,letterSpacing:1.3,color:'#b28dff',fontWeight:'900'}}>SPOTIBAI / SLEEP TIMER</Text>
     <Pressable onPress={()=>setSleepOpen(false)} accessibilityLabel="Close timer" style={{padding:7}}><Text style={{fontSize:20,color:'#d9cae4'}}>✕</Text></Pressable>
    </View>
    <Text style={{color:'#fbf4ff',fontSize:27,fontWeight:'900',marginTop:12}}>Drift off to music.</Text>
    <Text style={{color:'#b9a5c5',fontSize:12,lineHeight:19,marginTop:8}}>Set how long music should play before Spotibai stops it automatically.</Text>
    {expiresAt&&remaining>0?<View style={{borderRadius:13,backgroundColor:'#352642',alignItems:'center',padding:18,marginTop:19}}>
      <Text style={{color:'#d5b7f7',fontSize:10,letterSpacing:1.4,fontWeight:'800'}}>MUSIC STOPS IN</Text>
      <Text style={{color:'#fff',fontSize:40,fontWeight:'900',fontVariant:['tabular-nums'],marginTop:6}}>{minsLabel(remaining)}</Text>
      <Pressable accessibilityRole="button" onPress={cancel} style={{paddingHorizontal:21,paddingVertical:12,borderRadius:10,borderColor:'#7c5d98',borderWidth:1,marginTop:12}}>
       <Text style={{color:'#eacfff',fontWeight:'800'}}>Cancel sleep timer</Text>
      </Pressable>
     </View>:null}
    <Text style={{color:'#c2b2cf',fontSize:11,fontWeight:'800',marginTop:22,marginBottom:11}}>STOP AFTER</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>{PRESETS.map(m=><Pressable key={m} onPress={()=>start(m)} style={{width:'30%',flexGrow:1,alignItems:'center',backgroundColor:'#3b2a49',borderWidth:1,borderColor:'#624777',borderRadius:10,paddingVertical:13}}>
     <Text style={{color:'#f3e4ff',fontSize:13,fontWeight:'800'}}>{m} min</Text>
    </Pressable>)}</View>
    <View style={{marginTop:18,flexDirection:'row',alignItems:'center',gap:9}}>
     <TextInput value={custom} keyboardType="number-pad" maxLength={3} onChangeText={setCustom} placeholder="Custom minutes (1–480)" placeholderTextColor="#9b88a6" style={{flex:1,color:'#fff',backgroundColor:'#382940',paddingHorizontal:12,height:44,borderRadius:9,borderWidth:1,borderColor:'#614772'}}/>
     <Pressable accessibilityRole="button" onPress={()=>start(Number(custom))} style={{backgroundColor:'#b28dff',borderRadius:9,paddingVertical:13,paddingHorizontal:19}}>
      <Text style={{color:'#1b0e26',fontWeight:'900'}}>Set</Text>
     </Pressable>
    </View>
    <Text style={{color:'#9585a0',fontSize:10,lineHeight:16,marginTop:17}}>Android may delay stopping audio if the app is fully suspended while locked. A device test is required to verify timing.</Text>
   </View>
  </View>
 </Modal>
 </SafeAreaView>;
}
