import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Image,Keyboard,Pressable,ScrollView,StatusBar,Text,TextInput,View} from 'react-native';
import {useAudioPlayer,useAudioPlayerStatus,setAudioModeAsync} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import {Directory,File,Paths} from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Song={id:string;title:string;artist:string;art:string;duration:number;downloadable:boolean;uri?:string;local?:boolean};
const FILES='spotibai-native-audio-files';
const B='#120d18',P='#23192d',M='#ad9ab9',A='#b28dff',T='#fbf4ff';
const STYLES={backgroundColor:P,borderColor:'#473452',borderWidth:1,borderRadius:12};
function Small({children}:{children:string}){return <Text style={{fontSize:11,color:M,lineHeight:18}}>{children}</Text>}
function Btn({label,onPress,disabled=false,primary=false}:{label:string;onPress:()=>void;disabled?:boolean;primary?:boolean}){
 return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={{backgroundColor:primary?A:'#35263e',paddingVertical:10,paddingHorizontal:13,borderRadius:9,opacity:disabled?.4:1}}>
 <Text style={{color:primary?'#1d1226':T,fontWeight:'900',fontSize:12,textAlign:'center'}}>{label}</Text></Pressable>;
}
function Artwork({s,size=54}:{s:Song;size?:number}){
 return s.art?<Image source={{uri:s.art}} style={{width:size,height:size,borderRadius:10,backgroundColor:P}}/>:
 <View style={{width:size,height:size,borderRadius:10,backgroundColor:'#382747',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:size*.45,color:A}}>♫</Text></View>
}
function Row({s,onPlay,onDownload,onDelete,downloading}:{s:Song;onPlay:()=>void;onDownload:()=>void;onDelete?:()=>void;downloading:boolean}){
return <View style={{flexDirection:'row',gap:11,alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#35283f'}}>
 <Pressable onPress={onPlay}><Artwork s={s}/></Pressable>
 <Pressable onPress={onPlay} style={{flex:1}}><Text numberOfLines={2} style={{color:T,fontSize:13,fontWeight:'800'}}>{s.title}</Text>
  <Text numberOfLines={1} style={{color:M,fontSize:10,marginTop:5}}>{s.artist}</Text></Pressable>
 {s.local?<Pressable onPress={onDelete} style={{padding:9}}><Text style={{color:'#ffc0cb',fontSize:17}}>✕</Text></Pressable>:
 s.downloadable?<Pressable disabled={downloading} onPress={onDownload} style={{padding:9}}><Text style={{color:A,fontSize:19}}>{downloading?'…':'↓'}</Text></Pressable>:null}
 <Pressable onPress={onPlay} style={{padding:9}}><Text style={{color:A,fontSize:18}}>▶</Text></Pressable>
</View>;
}
const clock=(n=0)=>Number.isFinite(n)?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'0:00';
export default function NativeAudioPanel({visible,onClose,api,stopSignal}:{visible:boolean;onClose:()=>void;api:string;stopSignal:number}){
 const [query,setQuery]=useState('');
 const [results,setResults]=useState<Song[]>([]);
 const [saved,setSaved]=useState<Song[]>([]);
 const [active,setActive]=useState<Song|null>(null);
 const [queue,setQueue]=useState<Song[]>([]);
 const [tab,setTab]=useState<'discover'|'offline'>('discover');
 const [finding,setFinding]=useState(false);
 const [saving,setSaving]=useState('');
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const hydrated=useRef(false);
 const current=useRef<Song|null>(null);
 const audio=useAudioPlayer(null,{updateInterval:1000});
 const status=useAudioPlayerStatus(audio);
 const url=api.replace(/\/+$/,'');
 useEffect(()=>{
  AsyncStorage.getItem(FILES).then(v=>{
   if(v){let files=JSON.parse(v) as Song[];setSaved(files.filter(x=>x.uri&&new File(x.uri).exists))}
  }).catch(()=>{}).finally(()=>{hydrated.current=true});
 },[]);
 useEffect(()=>{if(hydrated.current)void AsyncStorage.setItem(FILES,JSON.stringify(saved)).catch(()=>{})},[saved]);
 useEffect(()=>{void setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:true,interruptionMode:'doNotMix'}).catch(()=>{})},[]);
 useEffect(()=>{if(stopSignal>0){audio.pause()}},[stopSignal]);
 function stop(){audio.pause();try{audio.setActiveForLockScreen(false)}catch{}setActive(null);current.current=null}
 async function play(song:Song,list=results){
  try{
   Keyboard.dismiss();
   await setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:true,interruptionMode:'doNotMix'});
   const path=song.local?song.uri:url+'/api/audius/stream/'+encodeURIComponent(song.id);
   if(!path)throw Error('Audio file no longer exists');
   if(song.local&&!new File(path).exists)throw Error('Saved file is missing; please import it again');
   current.current=song;setActive(song);setQueue(list.length?list:[song]);setMessage('');setError('');
   audio.replace(path);
   // Expo Go may not have the media foreground service. Playback should still be testable.
   try{audio.setActiveForLockScreen(true,{title:song.title,artist:song.artist,albumTitle:'Spotibai',artworkUrl:song.art||undefined},{showNextTrack:true,showPreviousTrack:true})}catch{}
   audio.play();
  }catch(e){setError(e instanceof Error?e.message:'Unable to play this track')}
 }
 function next(step=1){
  const list=queue.length?queue:active?[active]:[];
  if(!list.length||!current.current)return;
  const idx=list.findIndex(x=>x.id===current.current?.id);
  const chosen=list[(Math.max(idx,0)+step+list.length)%list.length];
  void play(chosen,list);
 }
 useEffect(()=>{if(status.didJustFinish&&current.current)next(1)},[status.didJustFinish]);
 async function search(text=query){
  setFinding(true);setError('');Keyboard.dismiss();
  try{
   const response=await fetch(url+'/api/audius/search?q='+encodeURIComponent(text.trim()));
   const json=await response.json();
   if(!response.ok)throw Error(json.error||'Music discovery unavailable');
   const items:Song[]=(json.tracks||[]).map((x:any)=>({id:String(x.id),title:String(x.title||'Untitled'),artist:String(x.artist||'Unknown'),art:String(x.art||''),duration:Number(x.duration||0),downloadable:Boolean(x.downloadable)}));
   setResults(items);
  }catch(e){setError(e instanceof Error?e.message:'Could not reach Audius. Check your Spotibai domain.')}
  finally{setFinding(false)}
 }
 useEffect(()=>{if(visible&&results.length===0&&!finding)void search('')},[visible]); // trending on first open
 async function download(song:Song){
  if(!song.downloadable||saving)return;
  setSaving(song.id);setMessage('');
  try{
   const folder=new Directory(Paths.document,'spotibai');folder.create({idempotent:true,intermediates:true});
   const name='audius-'+encodeURIComponent(song.id)+'.mp3';
   const file=await File.downloadFileAsync(url+'/api/audius/download/'+encodeURIComponent(song.id),new File(folder,name),{idempotent:true});
   if(!file.exists||!file.size||file.size>80*1024*1024){if(file.exists)file.delete();throw Error('Audio is empty or exceeds 80 MB')}
   const local:Song={...song,uri:file.uri,local:true};
   setSaved(old=>[local,...old.filter(x=>x.id!==song.id)]);setMessage('Saved offline: '+song.title);
  }catch(e){setError(e instanceof Error?e.message:'Artist has not allowed this download or network unavailable.')}
  finally{setSaving('')}
 }
 async function importFiles(){
  if(saving)return;
  setSaving('import');
  try{
   const selected=await DocumentPicker.getDocumentAsync({type:'audio/*',copyToCacheDirectory:true,multiple:true});
   if(selected.canceled)return;
   const folder=new Directory(Paths.document,'spotibai');folder.create({idempotent:true,intermediates:true});
   const imported:Song[]=[];
   for(const [i,asset] of selected.assets.entries()){
    const source=new File(asset.uri);
    if(source.size>80*1024*1024){setMessage(asset.name+' was too large (80 MB max).');continue}
    const ext=(asset.name.match(/\.[a-zA-Z0-9]{2,5}$/)?.[0]||'.mp3');
    const file=new File(folder,'user-'+Date.now()+'-'+i+ext);
    source.copy(file);
    imported.push({id:'user-'+Date.now()+'-'+i,title:asset.name.replace(/\.[^.]+$/,''),artist:'My audio',art:'',duration:0,downloadable:false,local:true,uri:file.uri});
   }
   setSaved(old=>[...imported,...old]);setMessage(imported.length+' owned audio file(s) saved');
  }catch(e){setError(e instanceof Error?e.message:'Unable to import music.')}finally{setSaving('')}
 }
 function remove(song:Song){
  Alert.alert('Delete saved audio?',song.title,[
   {text:'Cancel',style:'cancel'},
   {text:'Delete',style:'destructive',onPress:()=>{
    try{if(song.uri){const file=new File(song.uri);if(file.exists)file.delete()}}catch{}
    if(active?.uri===song.uri)stop();
    setSaved(old=>old.filter(x=>x.uri!==song.uri));
   }}
  ])
 }
 return <View pointerEvents={visible?'auto':'none'} style={{display:visible?'flex':'none',position:'absolute',top:0,right:0,bottom:0,left:0,backgroundColor:B}}>
  <StatusBar barStyle="light-content"/>
  <View style={{height:63,paddingHorizontal:19,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#3d2c47'}}>
   <View><Text style={{fontSize:10,color:A,letterSpacing:1.6,fontWeight:'900'}}>SPOTIBAI / BACKGROUND AUDIO</Text>
    <Text style={{color:T,fontSize:21,fontWeight:'900',letterSpacing:-.7,marginTop:5}}>Listen without video.</Text></View>
   <Btn label="Done ✕" onPress={onClose}/>
  </View>
  <ScrollView keyboardShouldPersistTaps="handled" style={{flex:1}} contentContainerStyle={{paddingHorizontal:19,paddingBottom:25}}>
   <Text style={{color:M,fontSize:12,lineHeight:19,marginTop:15}}>Play Audius music using native Android audio. Lock-screen controls require a standalone APK. YouTube videos remain foreground-only.</Text>
   <View style={{flexDirection:'row',gap:9,marginTop:18}}>
    <Btn label="Discover" primary={tab==='discover'} onPress={()=>setTab('discover')}/>
    <Btn label={'Offline ('+saved.length+')'} primary={tab==='offline'} onPress={()=>setTab('offline')}/>
   </View>
   {tab==='discover'?<>
    <View style={{backgroundColor:P,borderRadius:11,borderColor:'#483755',borderWidth:1,marginTop:16,padding:5,flexDirection:'row',alignItems:'center'}}>
    <TextInput value={query} onChangeText={setQuery} onSubmitEditing={()=>void search()} placeholder="Songs or artists on Audius..." placeholderTextColor={M} returnKeyType="search" autoCorrect={false}
     style={{color:T,flex:1,fontSize:13,padding:9}}/><Btn label="Search" primary onPress={()=>void search()}/></View>
    {finding?<ActivityIndicator color={A} style={{marginTop:26}}/>:null}
    {!finding&&<Text style={{fontSize:16,color:T,fontWeight:'900',marginTop:25}}>{query?'Music results':'Trending music'}</Text>}
    {results.map(s=><Row key={s.id} s={s} onPlay={()=>void play(s,results)} onDownload={()=>void download(s)} downloading={saving===s.id}/>)}
   </>:<>
    <View style={{marginTop:19}}><Btn label={saving==='import'?'Importing…':'+ Import my own audio files'} primary disabled={!!saving} onPress={()=>void importFiles()}/></View>
    <Text style={{color:M,fontSize:11,lineHeight:18,marginTop:13}}>Your own MP3/M4A files and artist-authorized Audius downloads stay on this device.</Text>
    {saved.map(s=><Row key={s.uri||s.id} s={s} onPlay={()=>void play(s,saved)} onDownload={()=>{}} onDelete={()=>remove(s)} downloading={false}/>)}
    {!saved.length?<View style={{...STYLES,padding:18,marginTop:25}}><Text style={{color:M}}>Nothing downloaded. Import your own files or find an artist-enabled Audius download.</Text></View>:null}
   </>}
   {Boolean(error)&&<Text style={{fontSize:12,color:'#ffadb8',lineHeight:19,marginTop:17}}>{error}</Text>}
   {Boolean(message)&&<Text style={{fontSize:12,color:A,lineHeight:19,marginTop:17}}>{message}</Text>}
  </ScrollView>
  {active?<View style={{backgroundColor:'#291d34',padding:14,borderTopWidth:1,borderColor:'#654970'}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Artwork s={active} size={43}/>
    <View style={{flex:1}}><Text numberOfLines={1} style={{color:T,fontWeight:'900',fontSize:13}}>{active.title}</Text>
     <Text numberOfLines={1} style={{color:M,fontSize:11,marginTop:4}}>{active.artist}</Text></View>
    <Btn label="⏮" onPress={()=>next(-1)}/>
    <Btn label={status.playing?'Ⅱ':'▶'} primary onPress={()=>status.playing?audio.pause():audio.play()}/>
    <Btn label="⏭" onPress={()=>next(1)}/>
   </View>
   <View style={{marginTop:11,height:4,borderRadius:3,backgroundColor:'#4c3a58'}}>
    <View style={{height:4,width:(status.duration>0?Math.min(100,status.currentTime/status.duration*100):0)+'%',backgroundColor:A,borderRadius:3}}/></View>
   <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:5}}>
    <Small>{clock(status.currentTime)}</Small><Small>{clock(status.duration||active.duration)}</Small>
   </View>
   {status.error?<Text style={{fontSize:10,color:'#ffbacb'}}>Playback error: {status.error}</Text>:null}
  </View>:null}
 </View>
}
