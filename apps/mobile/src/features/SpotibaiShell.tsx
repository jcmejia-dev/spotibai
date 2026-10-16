import {useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,BackHandler,Image,Linking,Pressable,StatusBar,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebView,{WebViewNavigation} from 'react-native-webview';
import SpotibaiComplete from './SpotibaiComplete';

// The original Spotibai web UI is intentionally rendered rather than imitated.
// Native audio/offline remains an independent tab until storage and Neon syncing exist.
const STORAGE_KEY='spotibai-shell-domain-v1';
const DEFAULT_URL=(process.env.EXPO_PUBLIC_SPOTIBAI_API_URL||'https://spotibai-delta.vercel.app').replace(/\/+$/,'');
const icon=require('../../assets/images/spotibai-icon.png');
const validUrl=(v:string)=>/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(v)&&!v.includes('..');
type Mode='original'|'native';

export default function SpotibaiShell(){
 const [mode,setMode]=useState<Mode>('original');
 const [site,setSite]=useState(DEFAULT_URL);
 const [loading,setLoading]=useState(true);
 const [webError,setWebError]=useState('');
 const [canGoBack,setCanGoBack]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);
 const ref=useRef<WebView<{}>>(null);
 useEffect(()=>{
  // API domain can be changed in Native > Settings. Sync it when returning here.
  AsyncStorage.getItem('spotibai-native-v2').then(raw=>{
    if(!raw)return;
    const saved=JSON.parse(raw) as {api?:string};
    if(typeof saved.api==='string'&&validUrl(saved.api))setSite(saved.api.replace(/\/+$/,''));
  }).catch(()=>{});
 },[mode]);
 useEffect(()=>{
  const handler=BackHandler.addEventListener('hardwareBackPress',()=>{
   if(mode==='native'){setMode('original');return true;}
   if(canGoBack){ref.current?.goBack();return true;}
   return false;
  });
  return()=>handler.remove();
 },[mode,canGoBack]);
 const openOriginal=()=>{setMode('original');setWebError('')};
 const loadError=()=>{setLoading(false);setWebError('Spotibai could not load. Check that your production Vercel domain works and you are online.')};
 return <SafeAreaView style={{flex:1,backgroundColor:'#120d18'}} edges={['top','bottom']}>
  <StatusBar barStyle="light-content"/>
  {mode==='original'?<View style={{flex:1}}>
    {webError?<View style={{flex:1,alignItems:'center',justifyContent:'center',padding:25}}>
      <Image source={icon} style={{width:70,height:70,borderRadius:15}}/>
      <Text style={{fontSize:24,color:'#fff',fontWeight:'900',marginTop:20}}>Couldn't open Spotibai</Text>
      <Text style={{fontSize:13,color:'#baafc7',textAlign:'center',lineHeight:20,marginTop:12}}>{webError}</Text>
      <Pressable onPress={()=>{setWebError('');setLoading(true);setRefreshKey(k=>k+1)}} style={{backgroundColor:'#b28dff',padding:15,borderRadius:10,marginTop:25}}>
      <Text style={{fontWeight:'900',color:'#1d1026'}}>Try again</Text></Pressable>
      <Pressable onPress={()=>void Linking.openURL(site)} style={{padding:13,marginTop:12}}><Text style={{color:'#b28dff'}}>Open website in browser ↗</Text></Pressable>
    </View>:
    <WebView<{}>
      key={site+'-'+refreshKey}
      ref={ref}
      source={{uri:site+'/'}}
      style={{flex:1,backgroundColor:'#120d18'}}
      originWhitelist={['https://*']}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures
      startInLoadingState
      renderLoading={()=><View style={{flex:1,backgroundColor:'#120d18',alignItems:'center',justifyContent:'center'}}>
        <Image source={icon} style={{height:70,width:70,borderRadius:16}}/>
        <ActivityIndicator style={{marginTop:23}} color="#b28dff"/>
        <Text style={{color:'#c7afdc',fontSize:11,letterSpacing:1.5,marginTop:15}}>FINDING YOUR RHYTHM</Text>
      </View>}
      onNavigationStateChange={(s:WebViewNavigation)=>{setCanGoBack(s.canGoBack);if(!s.loading)setLoading(false)}}
      onError={loadError}
      onHttpError={e=>{if(e.nativeEvent.statusCode>=400&&e.nativeEvent.url.startsWith(site))loadError()}}
    />}
   </View>:<View style={{flex:1}}><SpotibaiComplete/></View>}
   {/* Minimal native mode switch, never fakes being part of the original website. */}
   <View style={{height:40,flexDirection:'row',backgroundColor:'#1d1424',borderTopWidth:1,borderColor:'#3c2b4b',paddingHorizontal:11,alignItems:'center',justifyContent:'space-between'}}>
    <Pressable accessibilityRole="button" accessibilityState={{selected:mode==='original'}} onPress={openOriginal} style={{paddingVertical:5,paddingHorizontal:12,backgroundColor:mode==='original'?'#38254a':'transparent',borderRadius:8}}>
     <Text style={{fontSize:11,fontWeight:'800',color:mode==='original'?'#dfc2ff':'#a597b4'}}>♫ Original Spotibai</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{selected:mode==='native'}} onPress={()=>setMode('native')} style={{paddingVertical:5,paddingHorizontal:12,backgroundColor:mode==='native'?'#38254a':'transparent',borderRadius:8}}>
     <Text style={{fontSize:11,fontWeight:'800',color:mode==='native'?'#dfc2ff':'#a597b4'}}>◉ Native audio & offline</Text>
    </Pressable>
   </View>
 </SafeAreaView>
}
