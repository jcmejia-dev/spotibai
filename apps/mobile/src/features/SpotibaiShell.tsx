import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,BackHandler,Image,Linking,Pressable,StatusBar,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebView,{WebViewNavigation} from 'react-native-webview';
import NativeAudioPanel from './NativeAudioPanel';

const DEFAULT_URL=(process.env.EXPO_PUBLIC_SPOTIBAI_API_URL||'https://spotibai-delta.vercel.app').replace(/\/+$/,'');
const icon=require('../../assets/images/spotibai-icon.png');
const validUrl=(v:string)=>/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(v)&&!v.includes('..');
const JAVASCRIPT=String.raw"(function() {\n  try {\n    window.__SPOTIBAI_NATIVE_APP__=true;\n    function ready(){\n      try {\n        if(!document.head||!document.body)return;\n        if(!document.getElementById('spotibai-app-shell-styles')){\n          var style=document.createElement('style');\n          style.id='spotibai-app-shell-styles';\n          style.textContent='.spot-install-trigger,.spot-install-overlay,.spot-install-installed{display:none!important}.spot-native-audio-button{width:35px;height:35px;min-width:35px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;background:var(--spot-surface-2,#32243c);border:1px solid var(--spot-border,#584463);color:var(--accent,#b28dff);font-size:22px;line-height:1;cursor:pointer;margin:0 6px 0 0}';\n          document.head.appendChild(style);\n        }\n        var actions=document.querySelector('.top-actions');\n        if(actions && !actions.querySelector('.spot-native-audio-button')){\n          var button=document.createElement('button');\n          button.type='button';\n          button.className='spot-native-audio-button';\n          button.textContent='♫';\n          button.title='Background audio (Audius)';\n          button.setAttribute('aria-label','Open background music player');\n          button.onclick=function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'spotibai:open-audio'}));};\n          actions.insertBefore(button,actions.firstChild);\n        }\n      }catch(e){}\n    }\n    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});\n    ready();\n    new MutationObserver(function(){ready();}).observe(document.documentElement,{childList:true,subtree:true});\n    document.addEventListener('click',function(event){\n      var el=event.target;\n      if(el && el.closest && el.closest('.yt-art,.yt-queue-track,.yt-watch-page .yt-watch-next button')){\n        window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'spotibai:youtube-start'}));\n      }\n    },true);\n  }catch(e){}\n})();true;";
type WebMessage={type:string};
export default function SpotibaiShell(){
 const [site,setSite]=useState(DEFAULT_URL);
 const [panelOpen,setPanelOpen]=useState(false);
 const [stopSignal,setStopSignal]=useState(0);
 const [webError,setWebError]=useState('');
 const [canGoBack,setCanGoBack]=useState(false);
 const [reload,setReload]=useState(0);
 const web=useRef<WebView<{}>>(null);
 useEffect(()=>{
  AsyncStorage.getItem('spotibai-native-v2').then(raw=>{
   if(raw){const old=JSON.parse(raw) as {api?:string};if(old.api&&validUrl(old.api))setSite(old.api.replace(//+$/,''));}
  }).catch(()=>{});
 },[]);
 useEffect(()=>{
  const listener=BackHandler.addEventListener('hardwareBackPress',()=>{
   if(panelOpen){setPanelOpen(false);return true;}
   if(canGoBack){web.current?.goBack();return true;}
   return false;
  });
  return()=>listener.remove();
 },[canGoBack,panelOpen]);
 function handleMessage(payload:string){
  try{const message=JSON.parse(payload) as WebMessage;
   if(message.type==='spotibai:open-audio')setPanelOpen(true);
   if(message.type==='spotibai:youtube-start')setStopSignal(x=>x+1);
  }catch{}
 }
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
  onError={()=>setWebError('Check your connection and confirm the Spotibai production domain in Vercel is connected.')}
  startInLoadingState
  renderLoading={()=><View style={{flex:1,backgroundColor:'#120d18',alignItems:'center',justifyContent:'center'}}>
   <Image source={icon} style={{width:70,height:70,borderRadius:16}}/>
   <ActivityIndicator color="#b28dff" style={{marginTop:25}}/>
   <Text style={{marginTop:14,fontSize:11,color:'#c5a9da',letterSpacing:1.5}}>FINDING YOUR RHYTHM</Text>
  </View>}
  style={{flex:1,backgroundColor:'#120d18'}}
 />}
 {/* The Audius player stays mounted when its sheet closes: audio can continue in the APK. */}
 <NativeAudioPanel visible={panelOpen} onClose={()=>setPanelOpen(false)} api={site} stopSignal={stopSignal}/>
 </SafeAreaView>;
}
