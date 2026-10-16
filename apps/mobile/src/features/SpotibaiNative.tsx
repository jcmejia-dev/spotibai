import {useEffect,useRef,useState} from 'react';
import {
 ActivityIndicator, Animated, Image, Keyboard, Pressable, ScrollView,
 StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

type Tab='room'|'discover'|'liked'|'offline'|'settings';
type Track={id:string;title:string;artist:string;art:string;duration:number;genre:string};
type Accent='violet'|'rose'|'aqua';
type Theme='dark'|'light';
type Palette={bg:string;card:string;cardAlt:string;text:string;muted:string;border:string;accent:string;accentText:string;hero:string};

const API=(process.env.EXPO_PUBLIC_SPOTIBAI_API_URL||'https://spotibai-delta.vercel.app').replace(/\/+$/,'');
const ACCENTS:Record<Accent,string>={violet:'#b88bff',rose:'#f28cb6',aqua:'#73dacb'};
const TABS:{id:Tab;label:string;symbol:string}[]=[
 {id:'room',label:'Room',symbol:'⌂'},{id:'discover',label:'Discover',symbol:'⌕'},
 {id:'liked',label:'Liked',symbol:'♡'},{id:'offline',label:'Offline',symbol:'↓'},
 {id:'settings',label:'Settings',symbol:'⚙'}
];
const MOODS=[
 {num:'01',title:'AFTER DARK',sub:'For the late hours',query:'late night chill',tone:'#4a325b'},
 {num:'02',title:'FULL VOLUME',sub:'Turn the room up',query:'hip hop',tone:'#754332'},
 {num:'03',title:'SLOW DAYS',sub:'Take your time',query:'lofi',tone:'#2b5360'},
 {num:'04',title:'ON REPEAT',sub:'One more time',query:'indie pop',tone:'#536144'}
];

function palette(mode:Theme,accent:Accent):Palette{
 const light=mode==='light';
 return {
  bg:light?'#f6f2f7':'#110d17',
  card:light?'#ffffff':'#1e1626',
  cardAlt:light?'#eee6f1':'#2c2035',
  text:light?'#261c32':'#f7f0fc',
  muted:light?'#817489':'#a99ab7',
  border:light?'#ded1e4':'#493752',
  accent:ACCENTS[accent],
  accentText:'#1d1028',
  hero:light?'#e6dced':'#24172f'
 };
}
const brand=require('../../assets/images/spotibai-icon.png');

function Label({children,color}:{children:string;color:string}){
 return <Text style={{color,fontSize:10,fontWeight:'800',letterSpacing:1.8}}>{children}</Text>;
}
function SectionHeading({kicker,title,c}:{kicker:string;title:string;c:Palette}){
 return <View style={{marginTop:32,marginBottom:15}}>
  <Label color={c.accent}>{kicker}</Label>
  <Text style={{fontSize:28,fontWeight:'900',letterSpacing:-1,color:c.text,marginTop:6}}>{title}</Text>
 </View>;
}
function RecordArt({color,size=52}:{color:string;size?:number}){
 return <View style={{width:size,height:size,borderRadius:size/2,borderWidth:2,borderColor:'#ffffff33',
  backgroundColor:color,alignItems:'center',justifyContent:'center'}}>
  <View style={{width:size*.74,height:size*.74,borderRadius:size*.4,borderWidth:1,
   borderColor:'#ffffff55',alignItems:'center',justifyContent:'center'}}>
   <View style={{width:size*.28,height:size*.28,borderRadius:size*.2,backgroundColor:'#100c17',
    alignItems:'center',justifyContent:'center'}}>
    <View style={{width:5,height:5,borderRadius:5,backgroundColor:'#f0dbff'}}/>
   </View>
  </View>
 </View>;
}
function Cassette({c}:{c:Palette}){
 return <View style={{height:204,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
  <View style={{width:287,height:174,backgroundColor:'#362b40',
   borderRadius:18,borderColor:'#84718c',borderWidth:3,padding:13,transform:[{rotate:'-7deg'}]}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:8}}>
    <Text style={{fontSize:10,letterSpacing:1.6,fontWeight:'900',color:'#f1e6fa'}}>SPOTIBAI</Text>
    <Text style={{fontSize:8,letterSpacing:1.2,fontWeight:'800',color:'#c8b8d0'}}>STEREO / 001</Text>
   </View>
   <View style={{backgroundColor:'#f1dfbd',borderRadius:6,flex:1,padding:11}}>
    <Text style={{color:'#32273b',fontWeight:'800',fontSize:8,letterSpacing:1.3}}>THE SOUNDTRACK</Text>
    <Text style={{color:'#32273b',fontWeight:'900',fontSize:15,letterSpacing:-.3,marginTop:3}}>TO YOUR WORLD.</Text>
    <View style={{height:51,borderRadius:29,backgroundColor:'#272029',
     borderColor:'#776480',borderWidth:4,marginTop:10,flexDirection:'row',
     alignItems:'center',justifyContent:'space-around'}}>
     <RecordArt color="#66536d" size={40}/><View style={{width:25,height:7,borderRadius:4,backgroundColor:'#85798a'}}/>
     <RecordArt color="#66536d" size={40}/>
    </View>
   </View>
  </View>
 </View>;
}
function TrackRow({track,c,liked,onToggle}:{track:Track;c:Palette;liked:boolean;onToggle:()=>void}){
 return <View style={{paddingVertical:10,flexDirection:'row',alignItems:'center',gap:12,
  borderBottomColor:c.border,borderBottomWidth:StyleSheet.hairlineWidth}}>
  {track.art?
   <Image source={{uri:track.art}} style={{width:54,height:54,borderRadius:8,backgroundColor:c.cardAlt}}/>:
   <View style={{width:54,height:54,borderRadius:8,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'}}>
    <Text style={{fontSize:23,color:c.accent}}>♫</Text>
   </View>}
  <View style={{flex:1,minWidth:0}}>
   <Text numberOfLines={1} style={{color:c.text,fontSize:13,fontWeight:'800'}}>{track.title}</Text>
   <Text numberOfLines={1} style={{color:c.muted,fontSize:11,marginTop:4}}>{track.artist}</Text>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel={liked?'Remove favorite':'Add to favorites'}
   onPress={onToggle} style={({pressed})=>[{padding:11,opacity:pressed?.55:1}]}>
    <Text style={{fontSize:25,color:liked?c.accent:c.muted}}>{liked?'♥':'♡'}</Text>
  </Pressable>
 </View>;
}

export default function SpotibaiNative(){
 const [tab,setTab]=useState<Tab>('room');
 const [mode,setMode]=useState<Theme>('dark');
 const [accent,setAccent]=useState<Accent>('violet');
 const [query,setQuery]=useState('');
 const [searching,setSearching]=useState(false);
 const [searched,setSearched]=useState(false);
 const [results,setResults]=useState<Track[]>([]);
 const [error,setError]=useState('');
 const [favorites,setFavorites]=useState<Record<string,Track>>({});
 const [lastSaved,setLastSaved]=useState('');
 const fade=useRef(new Animated.Value(1)).current;
 const request=useRef(0);
 const c=palette(mode,accent);
 const saved=Object.values(favorites);

 function navigate(next:Tab){
  Keyboard.dismiss();
  if(next===tab)return;
  fade.setValue(0);
  setTab(next);
  Animated.timing(fade,{toValue:1,duration:260,useNativeDriver:true}).start();
 }

 async function searchFor(text:string){
  const term=text.trim();
  if(!term)return;
  const current=++request.current;
  setQuery(term);setTab('discover');setSearched(true);setSearching(true);setError('');
  Keyboard.dismiss();
  try{
   // Only public search data is requested; server-side credentials never ship in this app.
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),15000);
   let response:Response;
   try{response=await fetch(API+'/api/audius/search?q='+encodeURIComponent(term),{signal:controller.signal})}
   finally{clearTimeout(timeout)}
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||'Music search unavailable.');
   if(current!==request.current)return;
   setResults(Array.isArray(body.tracks)?body.tracks:[]);
  }catch(e){
   if(current===request.current){
    setResults([]);
    setError('Could not reach Spotibai music search. Check the production domain and your connection.');
   }
  }finally{if(current===request.current)setSearching(false)}
 }

 function toggle(track:Track){
  setFavorites(previous=>{
   const next={...previous};
   if(next[track.id]){delete next[track.id];setLastSaved('Removed from favorites')}
   else{next[track.id]=track;setLastSaved('Saved to your listening shelf')}
   return next;
  });
 }

 const Top=()=> <View style={{paddingHorizontal:22,paddingTop:11,paddingBottom:15,
  flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
  <Pressable onPress={()=>navigate('room')} style={{flexDirection:'row',alignItems:'center',gap:9}}>
   <Image source={brand} style={{width:35,height:35,borderRadius:9}} resizeMode="contain"/>
   <Text style={{color:c.text,fontSize:23,fontWeight:'900',letterSpacing:-1.4}}>spotibai<Text style={{color:c.accent}}>.</Text></Text>
  </Pressable>
  <Pressable onPress={()=>navigate('settings')} style={{width:36,height:36,borderRadius:18,
   backgroundColor:c.accent,alignItems:'center',justifyContent:'center'}}>
   <Text style={{fontSize:15,fontWeight:'900',color:c.accentText}}>S</Text>
  </Pressable>
 </View>;

 function home(){
  return <>
   <View style={{marginTop:9,marginBottom:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Label color={c.accent}>THE SPOTIBAI LISTENING CLUB</Label>
    <Text style={{fontSize:10,color:c.muted}}>VOL. 01</Text>
   </View>
   <View style={{backgroundColor:c.hero,borderColor:c.border,borderWidth:1,borderRadius:16,overflow:'hidden'}}>
    <View style={{paddingHorizontal:22,paddingTop:27}}>
     <Label color={c.accent}>PUT YOUR WORLD ON PLAY</Label>
     <Text style={{fontSize:40,lineHeight:44,fontWeight:'900',letterSpacing:-1.7,color:c.text,marginTop:15}}>
      Music for the{'\n'}<Text style={{color:c.accent}}>in-between.</Text>
     </Text>
     <Text style={{fontSize:13,lineHeight:21,color:c.muted,marginTop:13,maxWidth:290}}>
      For the ride home, late nights and every song you want to hear again.
     </Text>
     <Pressable onPress={()=>navigate('discover')} style={{backgroundColor:c.accent,padding:14,
      alignSelf:'flex-start',borderRadius:9,marginTop:23,flexDirection:'row',gap:14,alignItems:'center'}}>
      <Text style={{color:c.accentText,fontSize:13,fontWeight:'900'}}>Find your sound</Text>
      <Text style={{color:c.accentText,fontSize:18}}>→</Text>
     </Pressable>
    </View>
    <Cassette c={c}/>
    <Text style={{color:c.muted,fontSize:8,letterSpacing:1.2,alignSelf:'flex-end',marginRight:18,marginBottom:16}}>
     YOUR ROOM. YOUR SOUND.
    </Text>
   </View>
   <SectionHeading kicker="01 / SELECT A FREQUENCY" title="What’s the mood?" c={c}/>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
    {MOODS.map(m=><Pressable key={m.num} onPress={()=>void searchFor(m.query)}
      style={{backgroundColor:m.tone,width:'48%',minHeight:143,borderRadius:13,padding:14,justifyContent:'space-between',flexGrow:1}}>
      <Text style={{fontSize:10,fontWeight:'800',color:'#e9deef99',letterSpacing:1}}>{m.num} / 04</Text>
      <Text style={{fontSize:25,color:'#ffffff50',alignSelf:'flex-end'}}>〰</Text>
      <View><Text style={{color:'#fff',fontSize:16,fontWeight:'900'}}>{m.title}</Text>
       <Text style={{color:'#ffffffae',fontSize:10,marginTop:5}}>{m.sub}</Text></View>
     </Pressable>)}
   </View>
   <SectionHeading kicker="02 / YOUR PERSONAL SHELF" title="Kept close." c={c}/>
   <Pressable onPress={()=>navigate('liked')} style={{backgroundColor:c.card,padding:16,borderRadius:11,
    borderWidth:1,borderColor:c.border,flexDirection:'row',alignItems:'center',gap:13}}>
    <Text style={{fontSize:30,color:c.accent}}>♡</Text>
    <View style={{flex:1}}><Text style={{fontSize:15,color:c.text,fontWeight:'800'}}>Liked songs</Text>
    <Text style={{fontSize:11,color:c.muted,marginTop:5}}>{saved.length} saved this session</Text></View>
    <Text style={{color:c.accent,fontSize:19}}>→</Text>
   </Pressable>
  </>;
 }

 function discover(){
  return <>
   <SectionHeading kicker="YOUR SOUND, YOUR WAY" title="Find your next favorite." c={c}/>
   <Text style={{fontSize:12,color:c.muted,lineHeight:18,marginBottom:20}}>
    Search Audius tracks through Spotibai's existing music API.
   </Text>
   <View style={{borderWidth:1,borderColor:c.border,backgroundColor:c.card,borderRadius:11,
     paddingHorizontal:12,flexDirection:'row',alignItems:'center'}}>
    <Text style={{color:c.accent,fontSize:22,marginRight:7}}>⌕</Text>
    <TextInput value={query} onChangeText={setQuery} onSubmitEditing={()=>void searchFor(query)}
     returnKeyType="search" autoCorrect={false} placeholder="Songs or artists..." placeholderTextColor={c.muted}
     style={{flex:1,color:c.text,fontSize:14,paddingVertical:14}}/>
    <Pressable accessibilityRole="button" onPress={()=>void searchFor(query)}
     style={{paddingHorizontal:12,paddingVertical:10,backgroundColor:c.accent,borderRadius:8}}>
     <Text style={{color:c.accentText,fontWeight:'800',fontSize:12}}>Search</Text>
    </Pressable>
   </View>
   {searching?<View style={{alignItems:'center',padding:55}}>
     <ActivityIndicator size="large" color={c.accent}/>
     <Text style={{color:c.muted,marginTop:16}}>Finding your next sound…</Text>
    </View>:
    error?<View style={{backgroundColor:c.card,borderColor:c.border,borderWidth:1,padding:20,borderRadius:11,marginTop:22}}>
     <Text style={{fontSize:13,color:c.text,fontWeight:'800'}}>Music search unavailable</Text>
     <Text style={{color:c.muted,lineHeight:20,fontSize:12,marginTop:8}}>{error}</Text>
     <Pressable onPress={()=>void searchFor(query)} style={{marginTop:15}}><Text style={{color:c.accent,fontWeight:'800'}}>Try again →</Text></Pressable>
    </View>:
    searched?<View>
     <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:24}}>
      <Text style={{fontSize:17,fontWeight:'900',color:c.text}}>Results for “{query}”</Text>
      <Text style={{fontSize:11,color:c.muted}}>{results.length} tracks</Text>
     </View>
     {results.length===0?
      <Text style={{color:c.muted,marginTop:24,lineHeight:20,fontSize:12}}>No music found. Try another search.</Text>:
      results.map(t=><TrackRow key={t.id} track={t} c={c} liked={Boolean(favorites[t.id])} onToggle={()=>toggle(t)}/>)}
     <Text style={{color:c.muted,fontSize:11,lineHeight:17,marginTop:19}}>Native audio playback is the next milestone. Favorites are currently stored for this app session.</Text>
    </View>:
    <View style={{paddingVertical:70,alignItems:'center'}}>
     <Text style={{fontSize:40,color:c.accent}}>♫</Text>
     <Text style={{fontSize:16,fontWeight:'800',color:c.text,marginTop:14}}>Your next track starts here.</Text>
     <Text style={{color:c.muted,fontSize:12,textAlign:'center',marginTop:9,lineHeight:18}}>Search a song, artist or mood to explore music.</Text>
    </View>}
  </>;
 }
 function liked(){
  return <>
   <SectionHeading kicker="YOUR PERSONAL SHELF" title="Liked songs." c={c}/>
   <Text style={{color:c.muted,fontSize:12,marginBottom:14}}>{saved.length} songs in your current session.</Text>
   {saved.length?
     saved.map(t=><TrackRow key={t.id} track={t} c={c} liked onToggle={()=>toggle(t)}/>):
     <View style={{alignItems:'center',padding:35,backgroundColor:c.card,borderRadius:13,borderColor:c.border,borderWidth:1,marginTop:15}}>
      <Text style={{fontSize:41,color:c.accent}}>♡</Text>
      <Text style={{color:c.text,fontSize:18,fontWeight:'800',marginTop:10}}>Nothing on the shelf yet.</Text>
      <Text style={{color:c.muted,fontSize:12,textAlign:'center',lineHeight:19,marginTop:7}}>Search for music and tap the heart to keep it close.</Text>
      <Pressable onPress={()=>navigate('discover')} style={{marginTop:18,padding:12}}>
       <Text style={{color:c.accent,fontWeight:'800'}}>Find music →</Text>
      </Pressable>
     </View>}
  </>;
 }
 function offline(){
  return <>
   <SectionHeading kicker="YOUR OFFLINE SHELF" title="Take it with you." c={c}/>
   <View style={{backgroundColor:c.card,borderColor:c.border,borderWidth:1,borderRadius:14,padding:24,marginTop:7}}>
    <Text style={{color:c.accent,fontSize:34}}>↓</Text>
    <Text style={{color:c.text,fontWeight:'900',fontSize:19,marginTop:13}}>Offline audio is the next build.</Text>
    <Text style={{color:c.muted,fontSize:12,lineHeight:20,marginTop:10}}>
     The native player will support audio files you own and artist-authorized downloads. Saving a YouTube video to a playlist does not download it.
    </Text>
   </View>
  </>;
 }
 function settings(){
  return <>
   <SectionHeading kicker="MAKE IT YOURS" title="Your listening space." c={c}/>
   <Text style={{color:c.muted,fontSize:12,lineHeight:19,marginBottom:22}}>
    Choose how the native app looks. These settings apply immediately.
   </Text>
   <View style={{backgroundColor:c.card,borderColor:c.border,borderWidth:1,borderRadius:13,padding:19,marginBottom:14}}>
    <Text style={{color:c.text,fontWeight:'900',fontSize:15}}>Appearance</Text>
    <View style={{flexDirection:'row',gap:10,marginTop:17}}>
     {(['dark','light'] as Theme[]).map(m=><Pressable key={m} onPress={()=>setMode(m)} style={{
      borderColor:mode===m?c.accent:c.border,borderWidth:1.5,borderRadius:9,
      backgroundColor:mode===m?c.cardAlt:c.card,paddingVertical:11,paddingHorizontal:17
     }}><Text style={{color:mode===m?c.accent:c.text,fontWeight:'800'}}>{m==='dark'?'☾  Dark':'☀  Light'}</Text></Pressable>)}
    </View>
   </View>
   <View style={{backgroundColor:c.card,borderColor:c.border,borderWidth:1,borderRadius:13,padding:19,marginBottom:14}}>
    <Text style={{color:c.text,fontWeight:'900',fontSize:15}}>Accent color</Text>
    <View style={{flexDirection:'row',gap:17,marginTop:17}}>
     {(['violet','rose','aqua'] as Accent[]).map(a=><Pressable key={a} accessibilityRole="button"
      accessibilityLabel={'Use '+a+' theme'} onPress={()=>setAccent(a)}
      style={{width:44,height:44,borderRadius:22,backgroundColor:ACCENTS[a],
       borderWidth:accent===a?3:0,borderColor:mode==='dark'?'#fff':'#3e2b45',
       alignItems:'center',justifyContent:'center'}}>
      {accent===a&&<Text style={{color:'#231529',fontWeight:'900',fontSize:20}}>✓</Text>}
     </Pressable>)}
    </View>
   </View>
   <Text style={{color:c.muted,fontSize:11,lineHeight:18,marginTop:9}}>
    Guest mode for this first native UI. Neon sign-in, preferences sync and Android background audio are next.
   </Text>
  </>;
 }

 return <SafeAreaView edges={['top','bottom']} style={{flex:1,backgroundColor:c.bg}}>
  <StatusBar backgroundColor={c.bg} barStyle={mode==='dark'?'light-content':'dark-content'}/>
  <Top/>
  <View style={{flex:1}}>
   <Animated.View style={{flex:1,opacity:fade}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:22,paddingBottom:38}} style={{flex:1}}>
     {tab==='room'?home():tab==='discover'?discover():tab==='liked'?liked():tab==='offline'?offline():settings()}
    </ScrollView>
   </Animated.View>
  </View>
  {Boolean(lastSaved)&&<Text accessibilityLiveRegion="polite" numberOfLines={1}
   style={{color:c.muted,fontSize:10,textAlign:'center',marginBottom:4}}>{lastSaved}</Text>}
  <View style={{height:65,backgroundColor:c.card,borderTopColor:c.border,borderTopWidth:1,
   flexDirection:'row',paddingHorizontal:6,paddingTop:7}}>
   {TABS.map(t=><Pressable key={t.id} accessibilityRole="tab" accessibilityState={{selected:tab===t.id}}
    onPress={()=>navigate(t.id)} style={{flex:1,alignItems:'center',justifyContent:'center',
     backgroundColor:tab===t.id?c.cardAlt:'transparent',borderRadius:10,marginHorizontal:2,paddingBottom:5}}>
    <Text style={{color:tab===t.id?c.accent:c.muted,fontSize:23,fontWeight:'700'}}>{t.symbol}</Text>
    <Text numberOfLines={1} style={{color:tab===t.id?c.accent:c.muted,fontSize:9,fontWeight:tab===t.id?'900':'600',marginTop:1}}>{t.label}</Text>
   </Pressable>)}
  </View>
 </SafeAreaView>;
}
