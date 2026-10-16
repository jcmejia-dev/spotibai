import {useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Animated,Image,Keyboard,Modal,Pressable,ScrollView,StatusBar,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAudioPlayer,useAudioPlayerStatus,setAudioModeAsync} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import {Directory,File,Paths} from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebView from 'react-native-webview';

type Screen='home'|'search'|'favorites'|'playlists'|'offline'|'profile'|'player'|'web';
type Source='youtube'|'audius'|'local';
type Track={key:string;id:string;source:Source;title:string;artist:string;art:string;duration?:number;genre?:string;downloadable?:boolean;uri?:string};
type Playlist={id:string;name:string;songs:Track[]};
type Theme='dark'|'light';
type Data={favorites:Track[];playlists:Playlist[];downloads:Track[];recent:string[];theme:Theme;accent:string;motion:boolean;api:string};
type Colors={bg:string;panel:string;sub:string;text:string;muted:string;border:string;accent:string;ink:string};
const DEFAULT_API='https://spotibai-delta.vercel.app';
const STORE='spotibai-native-v2';
const DEFAULTS:Data={favorites:[],playlists:[],downloads:[],recent:[],theme:'dark',accent:'#b28dff',motion:true,api:process.env.EXPO_PUBLIC_SPOTIBAI_API_URL||DEFAULT_API};
const MOODS=[{title:'AFTER DARK',desc:'Late-night listening',search:'late night r&b chill songs',bg:'#4a325b'},{title:'FULL VOLUME',desc:'Something with a pulse',search:'energetic hip hop songs',bg:'#754332'},{title:'SLOW DAYS',desc:'Easy does it',search:'acoustic mellow chill songs',bg:'#2b5360'},{title:'THE THROWBACK',desc:'Back in rotation',search:'90s 2000s hit music',bg:'#536144'}];
const navs:{screen:Screen;label:string;icon:string}[]=[{screen:'home',label:'Room',icon:'⌂'},{screen:'search',label:'Discover',icon:'⌕'},{screen:'favorites',label:'Liked',icon:'♡'},{screen:'playlists',label:'Mixtapes',icon:'≡'},{screen:'offline',label:'Offline',icon:'↓'}];
const logo=require('../../assets/images/spotibai-icon.png');
const p=(settings:Data):Colors=>{const l=settings.theme==='light';return{bg:l?'#f9f5fa':'#120d18',panel:l?'#ffffff':'#22182b',sub:l?'#f0e8f3':'#32233e',text:l?'#211429':'#f9f0ff',muted:l?'#79677e':'#b7a5c0',border:l?'#e0d5e4':'#473551',accent:settings.accent,ink:'#1c1021'}};
const time=(seconds=0)=>{if(!Number.isFinite(seconds))return'0:00';return Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0')};
const strip=(s:string)=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const unique=(list:Track[])=>list.filter((t,i)=>list.findIndex(x=>x.key===t.key)===i);
const normalizedApi=(value:string)=>value.trim().replace(/\/+$/,'');
const isHttp=(url:string)=>/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(url)&&!url.includes('..');
const tint=(c:Colors)=>({color:c.text});
const small=(c:Colors)=>({color:c.muted,fontSize:12,lineHeight:18});
const buttonText=(c:Colors)=>({color:c.ink,fontWeight:'900' as const,fontSize:13});
const gap={marginTop:15};

function Pill({label,onPress,c,active=false}:{label:string;onPress:()=>void;c:Colors;active?:boolean}){
return <Pressable accessibilityRole="button" onPress={onPress} style={{paddingHorizontal:14,paddingVertical:10,borderRadius:10,backgroundColor:active?c.accent:c.sub,borderWidth:1,borderColor:active?c.accent:c.border}}>
 <Text style={{color:active?c.ink:c.text,fontWeight:'800',fontSize:12}}>{label}</Text>
</Pressable>}
function Action({label,onPress,c,solid=false,disabled=false}:{label:string;onPress:()=>void;c:Colors;solid?:boolean;disabled?:boolean}){
return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{paddingVertical:12,paddingHorizontal:16,borderRadius:9,backgroundColor:solid?c.accent:c.sub,opacity:disabled?.45:1,alignItems:'center'}}>
<Text style={{color:solid?c.ink:c.text,fontSize:12,fontWeight:'900'}}>{label}</Text></Pressable>}
function Artwork({song,size=56,c}:{song:Track;size?:number;c:Colors}){
return song.art?<Image source={{uri:song.art}} style={{width:size,height:size,borderRadius:10,backgroundColor:c.sub}}/>:<View style={{width:size,height:size,borderRadius:10,backgroundColor:c.sub,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:size*.45,color:c.accent}}>♫</Text></View>}
function Heading({eyebrow,title,c}:{eyebrow:string;title:string;c:Colors}){
return <View style={{marginTop:25,marginBottom:18}}>
<Text style={{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:1.5}}>{eyebrow.toUpperCase()}</Text>
<Text style={{color:c.text,fontSize:28,lineHeight:35,fontWeight:'900',letterSpacing:-1,marginTop:7}}>{title}</Text>
</View>}

export default function SpotibaiComplete(){
const [data,setData]=useState<Data>(DEFAULTS);
const [hydrated,setHydrated]=useState(false);
const [screen,setScreen]=useState<Screen>('home');
const [q,setQ]=useState('');
const [term,setTerm]=useState('');
const [source,setSource]=useState<'youtube'|'audius'>('youtube');
const [results,setResults]=useState<Track[]>([]);
const [nextToken,setNextToken]=useState<string|null>(null);
const [busy,setBusy]=useState(false);
const [busyMore,setBusyMore]=useState(false);
const [saving,setSaving]=useState('');
const [error,setError]=useState('');
const [message,setMessage]=useState('');
const [playing,setPlaying]=useState<Track|null>(null);
const [queue,setQueue]=useState<Track[]>([]);
const [queueTitle,setQueueTitle]=useState('Now playing');
const [expanded,setExpanded]=useState(false);
const [ytOpen,setYtOpen]=useState(false);
const [dialog,setDialog]=useState<'none'|'add'|'create'|'rename'>('none');
const [selected,setSelected]=useState<Track|null>(null);
const [playlistId,setPlaylistId]=useState('');
const [nameDraft,setNameDraft]=useState('');
const [shuffled,setShuffled]=useState(false);
const [repeat,setRepeat]=useState(false);
const [apiDraft,setApiDraft]=useState('');
const fade=useRef(new Animated.Value(1)).current;
const searchId=useRef(0);
const messageTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
const c=p(data);
const audio=useAudioPlayer(null,{updateInterval:750});
const audioStatus=useAudioPlayerStatus(audio);
const api=normalizedApi(data.api);
const {favorites,playlists,downloads}=data;
const isLiked=(track:Track)=>favorites.some(x=>x.key===track.key);
const isSaved=(track:Track)=>downloads.some(x=>x.key===track.key);
const currentPlaylist=playlists.find(x=>x.id===playlistId)||null;
const activeIsAudio=playing?.source==='audius'||playing?.source==='local';

useEffect(()=>{let mounted=true;AsyncStorage.getItem(STORE).then(raw=>{
 if(raw&&mounted){try{const saved=JSON.parse(raw) as Partial<Data>;setData(old=>({...old,...saved,api:typeof saved.api==='string'&&saved.api? saved.api:old.api}));}catch{}}
}).finally(()=>{if(mounted)setHydrated(true)});return()=>{mounted=false};},[]);
useEffect(()=>{if(hydrated)void AsyncStorage.setItem(STORE,JSON.stringify(data)).catch(()=>setMessage('Could not save device preferences.'));},[data,hydrated]);
useEffect(()=>{void setAudioModeAsync({playsInSilentMode:true,interruptionMode:'doNotMix',shouldPlayInBackground:true}).catch(()=>{});return()=>{if(messageTimer.current)clearTimeout(messageTimer.current)}},[]);

const notify=(s:string)=>{setMessage(s);if(messageTimer.current)clearTimeout(messageTimer.current);messageTimer.current=setTimeout(()=>setMessage(''),3600)};
function update(patch:Partial<Data>){setData(old=>({...old,...patch}))}
function go(to:Screen){Keyboard.dismiss();if(to===screen)return; if(data.motion){fade.setValue(0);Animated.timing(fade,{toValue:1,duration:240,useNativeDriver:true}).start()}setScreen(to)}
function like(track:Track){update({favorites:isLiked(track)?favorites.filter(x=>x.key!==track.key):[track,...favorites]});notify(isLiked(track)?'Removed from liked songs':'Added to liked songs')}
function makePlaylist(){const name=nameDraft.trim().slice(0,60);if(!name){notify('Name your mixtape first');return}
if(dialog==='rename'&&playlistId){update({playlists:playlists.map(x=>x.id===playlistId?{...x,name}:x)})}
else{const id='pl-'+Date.now();update({playlists:[...playlists,{id,name,songs:selected?[selected]:[]}]});setPlaylistId(id)}
setSelected(null);setDialog('none');setNameDraft('');notify('Mixtape saved')}
function addToPlaylist(id:string){if(!selected)return;update({playlists:playlists.map(x=>x.id===id?{...x,songs:unique([...x.songs,selected!])}:x)});setDialog('none');setSelected(null);notify('Added to mixtape')}
function deletePlaylist(id:string){Alert.alert('Delete mixtape?','Songs will remain in liked songs and offline downloads.',[
{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{update({playlists:playlists.filter(x=>x.id!==id)});setPlaylistId('');notify('Mixtape deleted')}}])}
function removeFromPlaylist(track:Track){if(!currentPlaylist)return;update({playlists:playlists.map(x=>x.id===playlistId?{...x,songs:x.songs.filter(t=>t.key!==track.key)}:x)})}
function openAdd(track:Track){setSelected(track);setDialog('add')}
function play(track:Track,list:Track[]=[],title='Selected tracks'){
 setQueue(list.length?unique(list):[track]);setQueueTitle(title);setPlaying(track);
 setExpanded(true);setYtOpen(track.source==='youtube');
 if(track.source==='youtube'){audio.pause();return}
 if(!track.uri&&track.source==='local'){notify('Local file is no longer available');return}
 // Native player is used only for Audius streams or authorized locally stored audio.
 const url=track.source==='local'?track.uri!:api+'/api/audius/stream/'+encodeURIComponent(track.id);
 audio.replace(url);audio.play();
 try{audio.setActiveForLockScreen(true,{title:strip(track.title),artist:strip(track.artist),albumTitle:'Spotibai',artworkUrl:track.art||undefined},{showNextTrack:true,showPreviousTrack:true})}catch{}
}
function playNext(direction=1){
 if(!playing)return;
 const current=queue.findIndex(x=>x.key===playing.key);
 if(!queue.length){return}
 if(direction===1&&repeat&&current===queue.length-1){if(playing.source!=='youtube'){void audio.seekTo(0);audio.play()}return}
 const at=current===-1?0:(current+direction+queue.length)%queue.length;
 play(queue[at],queue,queueTitle);
}
useEffect(()=>{if(audioStatus.didJustFinish&&playing?.source!=='youtube')playNext(1)},[audioStatus.didJustFinish]);
function pauseOrResume(){if(!playing)return;if(playing.source==='youtube'){setExpanded(true);setYtOpen(true);return}if(audioStatus.playing)audio.pause();else audio.play()}
function closePlayer(){audio.pause();try{audio.clearLockScreenControls()}catch{}setPlaying(null);setQueue([]);setYtOpen(false);setExpanded(false)}
function stopYouTube(){setYtOpen(false);if(playing?.source==='youtube'){setPlaying(null);setExpanded(false)}}
function chooseSource(v:'youtube'|'audius'){setSource(v);setResults([]);setTerm('');setNextToken(null);setError('')}
async function search(query:string=q,provider:'youtube'|'audius'=source,token?:string){
 const text=query.trim();if(!text)return;
 const id=++searchId.current;setTerm(text);setQ(text);setError('');setSource(provider);go('search');
 if(token)setBusyMore(true);else{setBusy(true);setResults([]);setNextToken(null);update({recent:[text,...data.recent.filter(x=>x.toLowerCase()!==text.toLowerCase())].slice(0,8)})}
 try{
 const path=provider==='youtube'?'/api/youtube/search?limit=50&q='+encodeURIComponent(text)+(token?'&pageToken='+encodeURIComponent(token):''):'/api/audius/search?q='+encodeURIComponent(text);
 const response=await fetch(api+path);const payload=await response.json();
 if(!response.ok)throw Error(payload.error||'Search failed');
 if(id!==searchId.current)return;
 const mapped:Track[]=provider==='youtube'
 ?(payload.items||[]).map((s:any)=>({key:'youtube:'+String(s.id),id:String(s.id),title:strip(String(s.title||'Untitled')),artist:strip(String(s.artist||'Unknown artist')),art:String(s.thumbnail||''),source:'youtube' as const}))
 :(payload.tracks||[]).map((s:any)=>({key:'audius:'+String(s.id),id:String(s.id),title:String(s.title||'Untitled'),artist:String(s.artist||'Unknown artist'),art:String(s.art||''),duration:Number(s.duration||0),genre:String(s.genre||'Music'),downloadable:Boolean(s.downloadable),source:'audius' as const}));
 setResults(prev=>token?unique([...prev,...mapped]):mapped);setNextToken(payload.nextPageToken||null);
 }catch(e){if(id===searchId.current)setError(e instanceof Error?e.message:'Search failed. Check your API domain in Settings.')}
 finally{if(id===searchId.current){setBusy(false);setBusyMore(false)}}
}
async function artistStation(song:Track){const singer=song.artist.replace(/\s*(- Topic|VEVO|Official)$/i,'').trim();
 const artist=singer||song.title.split(' - ')[0];
 setPlaying(song);setQueue([song]);setQueueTitle('More from '+artist);setExpanded(true);setYtOpen(true);audio.pause();
 try{
  const response=await fetch(api+'/api/youtube/search?limit=50&mode=artist&q='+encodeURIComponent(artist));
  const json=await response.json();
  if(!response.ok)return;
  const matches:Track[]=(json.items||[]).map((s:any)=>({key:'youtube:'+s.id,id:s.id,title:strip(s.title),artist:strip(s.artist),art:s.thumbnail||'',source:'youtube' as const}));
  setQueue(unique([song,...matches]));
 }catch{}
}
async function download(track:Track){
 if(track.source!=='audius'||!track.downloadable){notify('Only artist-authorized Audius downloads can be saved.');return}
 if(saving)return;setSaving(track.key);
 try{
  const directory=new Directory(Paths.document,'spotibai');directory.create({idempotent:true,intermediates:true});
  const dest=new File(directory,encodeURIComponent(track.id)+'.mp3');
  const file=await File.downloadFileAsync(api+'/api/audius/download/'+encodeURIComponent(track.id),dest,{idempotent:true});
  if(file.size===0||file.size>80*1024*1024){file.delete();throw Error('File is empty or exceeds 80 MB.')}
  const offline:Track={...track,source:'local',key:'offline:audius:'+track.id,uri:file.uri};
  update({downloads:unique([offline,...downloads])});notify('Saved offline: '+track.title);
 }catch(e){notify(e instanceof Error?e.message:'Could not save song. Check artist permissions.')}
 finally{setSaving('')}
}
async function importOwned(){
 if(saving)return;
 try{
 const selected=await DocumentPicker.getDocumentAsync({type:'audio/*',copyToCacheDirectory:true,multiple:true});
 if(selected.canceled)return;setSaving('import');
 const folder=new Directory(Paths.document,'spotibai');folder.create({idempotent:true,intermediates:true});
 const added:Track[]=[];
 for(const [i,item]of selected.assets.entries()){
  const ext=(item.name.match(/\.[a-z0-9]{2,5}$/i)?.[0]||'.mp3').toLowerCase();
  const chosen=new File(item.uri);if(chosen.size>80*1024*1024){notify(item.name+' exceeds 80 MB');continue}
  const uid='import-'+Date.now()+'-'+i;
  const newFile=new File(folder,uid+ext);chosen.copy(newFile);
  added.push({key:'offline:'+uid,id:uid,title:item.name.replace(/\.[^.]+$/,''),artist:'My own audio',art:'',source:'local',uri:newFile.uri});
 }
 update({downloads:unique([...added,...downloads])});notify(added.length+' file(s) added to offline library');
 }catch(e){notify(e instanceof Error?e.message:'Could not import your audio.')}finally{setSaving('')}
}
function removeDownload(track:Track){Alert.alert('Remove offline file?',track.title,[
 {text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{
  try{if(track.uri){const f=new File(track.uri);if(f.exists)f.delete()}}catch{}
  update({downloads:downloads.filter(x=>x.key!==track.key)});
  if(playing?.key===track.key)closePlayer();notify('Offline file removed')
 }}])}

function songRow(track:Track,list:Track[],title:string,index:number,showRemove=false){
 const active=playing?.key===track.key;
 return <View key={track.key} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:9,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.border}}>
  <Pressable onPress={()=>track.source==='youtube'?artistStation(track):play(track,list,title)} style={{position:'relative'}}>
   <Artwork song={track} c={c} size={53}/>
   <View style={{position:'absolute',bottom:2,right:2,backgroundColor:c.accent,borderRadius:12,width:21,height:21,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.ink,fontSize:12}}>{active?'♫':'▶'}</Text></View>
  </Pressable>
  <Pressable onPress={()=>track.source==='youtube'?artistStation(track):play(track,list,title)} style={{flex:1}}>
   <Text style={{color:active?c.accent:c.text,fontWeight:'800',fontSize:13}} numberOfLines={2}>{track.title}</Text>
   <Text numberOfLines={1} style={{color:c.muted,fontSize:10,marginTop:4}}>{track.artist} · {track.source==='youtube'?'YouTube':track.source==='local'?'Offline':'Audius'}</Text>
  </Pressable>
  <Pressable onPress={()=>like(track)} hitSlop={6} accessibilityLabel="Toggle favorite" style={{padding:7}}><Text style={{color:isLiked(track)?c.accent:c.muted,fontSize:24}}>{isLiked(track)?'♥':'♡'}</Text></Pressable>
  <Pressable onPress={()=>showRemove?removeFromPlaylist(track):openAdd(track)} accessibilityLabel="Add to mixtape" style={{padding:7}}><Text style={{color:c.text,fontSize:22}}>{showRemove?'−':'+'}</Text></Pressable>
  {track.source==='audius'&&track.downloadable&&<Pressable disabled={Boolean(saving)} onPress={()=>download(track)} style={{padding:7}}><Text style={{color:isSaved({...track,key:'offline:audius:'+track.id})?c.accent:c.muted,fontSize:20}}>↓</Text></Pressable>}
  {showRemove&&track.source==='local'&&<Pressable onPress={()=>removeDownload(track)} style={{padding:7}}><Text style={{color:c.muted}}>✕</Text></Pressable>}
 </View>
}
function box(children:React.ReactNode){return <View style={{padding:18,backgroundColor:c.panel,borderRadius:13,borderColor:c.border,borderWidth:1,marginTop:12}}>{children}</View>}
function cassette(){return <View style={{height:200,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
<View style={{width:283,height:173,transform:[{rotate:'-7deg'}],backgroundColor:'#372a44',borderColor:'#7f6989',borderWidth:3,borderRadius:16,padding:13}}>
<View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:7}}><Text style={{color:'#fff',fontWeight:'900',fontSize:11,letterSpacing:1.4}}>SPOTIBAI</Text><Text style={{color:'#b9a4c3',fontWeight:'800',fontSize:9}}>90 MIN / STEREO</Text></View>
<View style={{backgroundColor:'#f1e1ba',padding:11,borderRadius:7,flex:1}}>
<Text style={{color:'#3d3050',fontWeight:'900',fontSize:10}}>CURRENTLY SPINNING</Text>
<Text numberOfLines={1} style={{color:'#302038',fontWeight:'900',fontSize:13,marginTop:3}}>{playing?.title||'PICK A SONG.'}</Text>
<View style={{backgroundColor:'#26212c',borderRadius:25,borderWidth:3,borderColor:'#63546d',height:51,flexDirection:'row',alignItems:'center',justifyContent:'space-around',marginTop:8}}>
{[0,1].map(i=><View key={i} style={{width:36,height:36,borderWidth:6,borderColor:'#9e8f9f',backgroundColor:'#3b3040',borderRadius:30,alignItems:'center',justifyContent:'center'}}><View style={{width:9,height:9,backgroundColor:'#cfc3d1',borderRadius:5}}/></View>)}
</View></View></View></View>}
function home(){return <>
<View style={{flexDirection:'row',justifyContent:'space-between',marginTop:19}}><Text style={{color:c.accent,fontSize:10,letterSpacing:1.4,fontWeight:'900'}}>THE SPOTIBAI LISTENING CLUB</Text><Text style={small(c)}>VOL. 01</Text></View>
<View style={{backgroundColor:data.theme==='dark'?'#271a35':'#e8ddee',borderWidth:1,borderColor:c.border,borderRadius:17,overflow:'hidden',marginTop:15}}>
<View style={{paddingHorizontal:22,paddingTop:26}}><Text style={{color:c.accent,fontSize:10,fontWeight:'900',letterSpacing:1.3}}>PUT YOUR WORLD ON PLAY</Text>
<Text style={{color:c.text,fontSize:38,lineHeight:43,fontWeight:'900',letterSpacing:-1.6,marginTop:11}}>Music for the{'\n'}<Text style={{color:c.accent}}>in-between.</Text></Text>
<Text style={{color:c.muted,fontSize:12,lineHeight:20,marginTop:13}}>For the ride home, late nights and everything you want to hear again. This is your space.</Text>
<View style={{alignSelf:'flex-start',marginTop:18}}><Action label="Find your sound  →" onPress={()=>go('search')} c={c} solid/></View>
</View>{cassette()}</View>
<Heading eyebrow="01 / Pick a frequency" title="What's the mood?" c={c}/>
<View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{MOODS.map((m,i)=><Pressable key={m.title} onPress={()=>search(m.search,'youtube')} style={{width:'48%',flexGrow:1,height:139,borderRadius:12,padding:14,justifyContent:'space-between',backgroundColor:m.bg}}>
<Text style={{color:'#ffffffaa',fontSize:10,fontWeight:'800'}}>0{i+1} / 04</Text><Text style={{color:'#ffffff60',fontSize:24,textAlign:'right'}}>〰</Text><View><Text style={{color:'#fff',fontSize:15,fontWeight:'900'}}>{m.title}</Text><Text style={{color:'#ffffffac',fontSize:10,marginTop:5}}>{m.desc}</Text></View></Pressable>)}</View>
<Heading eyebrow="02 / Build your collection" title="Your mixtape shelf." c={c}/>
{box(<><Text style={{color:c.text,fontWeight:'900',fontSize:15}}>{playlists.length} mixtapes · {favorites.length} liked tracks</Text><Text style={{...small(c),marginVertical:10}}>Build playlists across YouTube discovery and Audius tracks.</Text><Action label="Open mixtapes  →" onPress={()=>go('playlists')} c={c}/></>)}
<Heading eyebrow="03 / Real audio" title="Listen without video." c={c}/>
{box(<><Text style={small(c)}>Stream Audius songs with the native player, or play your owned audio offline.</Text><View style={{marginTop:14}}><Action label="Discover Audius audio  →" c={c} solid onPress={()=>{chooseSource('audius');go('search')}}/></View></>)}
</>}
function searchScreen(){return <>
<Heading eyebrow="Spotibai / music discovery" title="Find the sound. Keep the feeling." c={c}/>
<View style={{flexDirection:'row',gap:10,marginBottom:14}}><Pill label="▶  YouTube" c={c} active={source==='youtube'} onPress={()=>chooseSource('youtube')}/><Pill label="♫  Audius audio" c={c} active={source==='audius'} onPress={()=>chooseSource('audius')}/></View>
<View style={{borderRadius:11,borderColor:c.border,borderWidth:1,backgroundColor:c.panel,flexDirection:'row',alignItems:'center',paddingLeft:13}}>
<Text style={{fontSize:22,color:c.accent,marginRight:8}}>⌕</Text>
<TextInput placeholder="Song, artist, album..." placeholderTextColor={c.muted} autoCorrect={false} returnKeyType="search" onSubmitEditing={()=>void search()} style={{flex:1,color:c.text,fontSize:13,paddingVertical:13}} value={q} onChangeText={setQ}/>
<Pressable onPress={()=>void search()} style={{backgroundColor:c.accent,padding:12,borderRadius:8,marginRight:4}}><Text style={buttonText(c)}>Search</Text></Pressable></View>
{!term&&data.recent.length>0&&<View style={{marginTop:17}}><Text style={{color:c.muted,fontSize:11,marginBottom:9}}>RECENT SEARCHES</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{data.recent.map(x=><Pill key={x} label={x} c={c} onPress={()=>search(x)}/>)}</View></View>}
{error?box(<><Text style={{color:'#f7a6b9',fontSize:12,lineHeight:19}}>{error}</Text><Text style={{...small(c),marginTop:8}}>If you changed the Vercel domain, set the correct address in Profile & Settings.</Text><Action label="Retry" c={c} onPress={()=>search(term)}/></>):null}
{busy?<ActivityIndicator size="large" style={{marginTop:46}} color={c.accent}/>:null}
{term&&<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:26,marginBottom:8}}>
<Text style={{color:c.text,fontSize:17,fontWeight:'900',flex:1}} numberOfLines={1}>Results for “{term}”</Text><Text style={small(c)}>{results.length} tracks</Text></View>}
{!busy&&term&&results.length===0&&!error?box(<Text style={small(c)}>No songs matched. Try another artist or title.</Text>):null}
{results.map((t,i)=>songRow(t,results,'Search results',i))}
{nextToken&&source==='youtube'&&<View style={{marginTop:17}}><Action label={busyMore?'Loading…':'Load more results'} disabled={busyMore} c={c} solid onPress={()=>search(term,source,nextToken)}/></View>}
<Text style={{...small(c),marginTop:22}}>{source==='youtube'?'YouTube videos play in the official visible embedded player. Videos are not offline-downloadable.':'Audius streams play with the native audio player. Artist-authorized tracks can be downloaded.'}</Text>
</>}
function favoritesScreen(){return <>
<Heading eyebrow="Your collection" title="The songs you keep." c={c}/>
<Text style={small(c)}>{favorites.length} liked tracks — saved on this phone</Text>
{!favorites.length?box(<><Text style={{fontSize:35,color:c.accent}}>♡</Text><Text style={{color:c.text,fontWeight:'900',marginTop:10}}>Nothing on your shelf yet.</Text><Text style={{...small(c),marginTop:9,marginBottom:15}}>Heart a song to keep it here.</Text><Action label="Discover music" c={c} onPress={()=>go('search')}/></>):favorites.map((t,i)=>songRow(t,favorites,'Liked songs',i))}
</>}
function playlistsScreen(){return <>
<Heading eyebrow="Mixtape shelf" title={currentPlaylist?currentPlaylist.name:'Your mixtapes.'} c={c}/>
{currentPlaylist?<><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:15}}>
<Pill label="← All mixtapes" c={c} onPress={()=>setPlaylistId('')}/>
<Pill label="▶ Play all" c={c} onPress={()=>currentPlaylist.songs[0]&&play(currentPlaylist.songs[0],currentPlaylist.songs,currentPlaylist.name)}/>
<Pill label="Rename" c={c} onPress={()=>{setNameDraft(currentPlaylist.name);setDialog('rename')}}/>
<Pill label="Delete" c={c} onPress={()=>deletePlaylist(currentPlaylist.id)}/>
</View><Text style={small(c)}>{currentPlaylist.songs.length} tracks · Tap minus to remove a song</Text>
{currentPlaylist.songs.map((t,i)=>songRow(t,currentPlaylist.songs,currentPlaylist.name,i,true))}
{!currentPlaylist.songs.length?box(<Text style={small(c)}>Search for a song, press +, and add it to this mixtape.</Text>):null}</>:
<>
<View style={{alignSelf:'flex-start',marginBottom:12}}><Action label="+ New mixtape" c={c} solid onPress={()=>{setNameDraft('');setSelected(null);setDialog('create')}}/></View>
{playlists.map(pl=><Pressable key={pl.id} onPress={()=>setPlaylistId(pl.id)} style={{flexDirection:'row',alignItems:'center',gap:13,padding:14,borderWidth:1,borderColor:c.border,borderRadius:12,backgroundColor:c.panel,marginBottom:10}}>
<View style={{width:49,height:49,backgroundColor:c.sub,borderRadius:9,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.accent,fontSize:24}}>♫</Text></View>
<View style={{flex:1}}><Text style={{color:c.text,fontSize:15,fontWeight:'900'}} numberOfLines={1}>{pl.name}</Text><Text style={{...small(c),marginTop:6}}>{pl.songs.length} tracks</Text></View><Text style={{color:c.accent,fontSize:23}}>→</Text>
</Pressable>)}
{!playlists.length?box(<><Text style={{color:c.text,fontWeight:'900'}}>Make your first mixtape.</Text><Text style={{...small(c),marginTop:8}}>Create a playlist, then add songs from search or your favorites.</Text></>):null}
</>}</>}
function offlineScreen(){const [/* unused */]=[];return <>
<Heading eyebrow="My local cassettes" title="Offline room." c={c}/>
{box(<><Text style={{color:c.text,fontWeight:'900',fontSize:16}}>Your own music. Your device.</Text><Text style={{...small(c),marginTop:10}}>Import MP3, M4A and other supported audio formats, or download Audius tracks whose artists permit it. Saved files play without internet. YouTube videos cannot be downloaded here.</Text>
<View style={{marginTop:15}}><Action label={saving?'Saving…':'+ Add my own audio files'} onPress={importOwned} c={c} solid disabled={!!saving}/></View>
</>)}
<View style={{marginTop:17}}><Action label="Find downloadable music on Audius  →" c={c} onPress={()=>{chooseSource('audius');go('search')}}/></View>
<Heading eyebrow="Stored on this phone" title={downloads.length+' offline tracks'} c={c}/>
{downloads.map((t,i)=><View key={t.key} style={{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:c.border,paddingVertical:8,gap:10}}>
<Pressable onPress={()=>play(t,downloads,'Offline collection')}><Artwork song={t} c={c}/></Pressable>
<Pressable onPress={()=>play(t,downloads,'Offline collection')} style={{flex:1}}><Text style={{color:c.text,fontWeight:'800',fontSize:13}} numberOfLines={1}>{t.title}</Text><Text style={small(c)}>{t.artist}</Text></Pressable>
<Pressable onPress={()=>openAdd(t)} style={{padding:7}}><Text style={{color:c.text,fontSize:20}}>+</Text></Pressable>
<Pressable onPress={()=>removeDownload(t)} style={{padding:7}}><Text style={{color:'#f2a1ab',fontSize:18}}>✕</Text></Pressable>
</View>)}
{!downloads.length?box(<Text style={small(c)}>No offline songs saved yet. Import audio you own or find an artist-downloadable Audius track.</Text>):null}
</>}
function profile(){return <>
<Heading eyebrow="Studio settings" title="Your space, your sound." c={c}/>
{box(<><Text style={{color:c.text,fontSize:15,fontWeight:'900'}}>Appearance</Text><View style={{flexDirection:'row',gap:9,marginTop:13}}>
<Pill label="☾ Night" c={c} active={data.theme==='dark'} onPress={()=>update({theme:'dark'})}/>
<Pill label="☀ Daylight" c={c} active={data.theme==='light'} onPress={()=>update({theme:'light'})}/></View>
<Text style={{color:c.text,fontSize:15,fontWeight:'900',marginTop:22,marginBottom:14}}>Room lighting</Text>
<View style={{flexDirection:'row',gap:15}}>{['#b28dff','#f28ba8','#68c4ae','#7dabf4','#f3b86b'].map(col=><Pressable key={col} onPress={()=>update({accent:col})} style={{width:36,height:36,backgroundColor:col,borderRadius:18,borderWidth:data.accent===col?3:0,borderColor:c.text,alignItems:'center',justifyContent:'center'}}>{data.accent===col?<Text style={{color:c.ink}}>✓</Text>:null}</Pressable>)}</View>
<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:25}}><Text style={{color:c.text,fontWeight:'800'}}>Motion & transitions</Text><Pill label={data.motion?'On':'Off'} c={c} onPress={()=>update({motion:!data.motion})}/></View></>)}
{box(<><Text style={{color:c.text,fontWeight:'900',fontSize:15}}>Spotibai API address</Text><Text style={{...small(c),marginTop:7}}>If your Vercel domain changed, enter the new production URL here. No API keys or Neon secrets.</Text>
<TextInput value={apiDraft||data.api} onChangeText={setApiDraft} autoCapitalize="none" autoCorrect={false} style={{color:c.text,backgroundColor:c.bg,padding:10,borderRadius:8,marginTop:13,fontSize:12}}/>
<View style={{marginTop:11}}><Action label="Save API address" c={c} onPress={()=>{const next=normalizedApi(apiDraft||data.api);if(!isHttp(next)){notify('Enter an HTTPS domain without a path');return}update({api:next});setApiDraft('');notify('API domain updated')}}/></View></>)}
{box(<><Text style={{color:c.text,fontWeight:'900',fontSize:15}}>Account & complete web library</Text><Text style={{...small(c),marginTop:9}}>The existing website still provides Neon sign-in/sign-up, YouTube playlists and its browser offline library. Open it here while native account sync is developed.</Text>
<View style={{marginTop:15}}><Action label="Open full Spotibai website  ↗" c={c} solid onPress={()=>go('web')}/></View></>)}
<Text style={{...small(c),marginTop:21}}>Native likes, mixtapes and downloads persist on this phone. They are separate from the website's browser-local data until account synchronization is implemented.</Text>
</>}
function youtubePlayer(){if(!playing||playing.source!=='youtube')return null;return <>
<Heading eyebrow="YouTube / official embedded player" title="Currently spinning." c={c}/>
<Text style={{...small(c),marginBottom:12}}>Keep the video visible to listen. Audio stops when you close this video or leave the player.</Text>
<View style={{height:215,backgroundColor:'#000',borderRadius:14,overflow:'hidden'}}>
{ytOpen?<WebView key={playing.id} source={{uri:'https://www.youtube-nocookie.com/embed/'+encodeURIComponent(playing.id)+'?playsinline=1&rel=0'}}
 javaScriptEnabled allowsFullscreenVideo allowsInlineMediaPlayback mediaPlaybackRequiresUserAction
 onError={()=>notify('YouTube embed unavailable. Try another music video.')}
 style={{flex:1,backgroundColor:'#000'}}/>:<Action label="Open video" c={c} solid onPress={()=>setYtOpen(true)}/>}
</View><View style={{marginTop:17}}><Text style={{color:c.text,fontSize:18,fontWeight:'900'}}>{playing.title}</Text><Text style={{...small(c),marginTop:5}}>{playing.artist}</Text></View>
<View style={{flexDirection:'row',alignItems:'center',gap:11,marginTop:20}}>
<Pill label="♡ Like" c={c} onPress={()=>like(playing)}/>
<Pill label="+ Mixtape" c={c} onPress={()=>openAdd(playing)}/>
<Pill label="Next →" c={c} onPress={()=>playNext(1)}/>
</View>
<Heading eyebrow={'Up next / '+queueTitle} title="Keep listening." c={c}/>
{queue.filter(t=>t.key!==playing.key).map((t,i)=>songRow(t,queue,queueTitle,i))}
<View style={{marginTop:20}}><Action label="Stop video & close" c={c} onPress={stopYouTube}/></View>
</>}
function audioPlayer(){if(!playing||!activeIsAudio)return null;const dur=audioStatus.duration||playing.duration||0;return <>
<Heading eyebrow="Spotibai / native audio" title="Now playing." c={c}/>
<View style={{alignItems:'center',marginTop:12}}>
<Artwork song={playing} c={c} size={228}/>
<Text style={{fontSize:20,color:c.text,fontWeight:'900',textAlign:'center',marginTop:23}}>{playing.title}</Text>
<Text style={{...small(c),marginTop:8}}>{playing.artist}</Text>
</View>
<View style={{height:5,backgroundColor:c.sub,borderRadius:5,marginTop:25,overflow:'hidden'}}><View style={{height:5,width:(dur>0?Math.min(100,(audioStatus.currentTime/dur)*100):0)+'%',backgroundColor:c.accent}}/></View>
<View style={{flexDirection:'row',justifyContent:'space-between',marginTop:7}}><Text style={small(c)}>{time(audioStatus.currentTime)}</Text><Text style={small(c)}>{time(dur)}</Text></View>
<View style={{flexDirection:'row',justifyContent:'space-around',alignItems:'center',marginTop:20}}>
<Pressable onPress={()=>playNext(-1)}><Text style={{fontSize:27,color:c.text}}>⏮</Text></Pressable>
<Pressable onPress={()=>void audio.seekTo(Math.max(0,audioStatus.currentTime-10))}><Text style={{fontSize:19,color:c.muted}}>↶10</Text></Pressable>
<Pressable onPress={pauseOrResume} style={{height:65,width:65,borderRadius:33,backgroundColor:c.accent,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:26,color:c.ink}}>{audioStatus.playing?'Ⅱ':'▶'}</Text></Pressable>
<Pressable onPress={()=>void audio.seekTo(Math.min(dur||Infinity,audioStatus.currentTime+10))}><Text style={{fontSize:19,color:c.muted}}>10↷</Text></Pressable>
<Pressable onPress={()=>playNext(1)}><Text style={{fontSize:27,color:c.text}}>⏭</Text></Pressable>
</View>
{audioStatus.error?<Text style={{color:'#ffb4c7',marginTop:15,fontSize:12}}>Audio error: {audioStatus.error}</Text>:null}
<View style={{flexDirection:'row',justifyContent:'center',gap:10,marginTop:18}}>
<Pill label={repeat?'Repeat ✓':'Repeat'} c={c} active={repeat} onPress={()=>setRepeat(!repeat)}/>
<Pill label={isLiked(playing)?'♥ Liked':'♡ Like'} c={c} onPress={()=>like(playing)}/>
<Pill label="+ Mixtape" c={c} onPress={()=>openAdd(playing)}/>
</View>
<Heading eyebrow={'Playing from / '+queueTitle} title="Up next." c={c}/>
{queue.map((t,i)=>songRow(t,queue,queueTitle,i))}
</>}
function playerScreen(){return playing?.source==='youtube'?youtubePlayer():audioPlayer()}
function fullWeb(){return <View style={{flex:1}}>
<View style={{padding:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:c.panel}}>
<Text style={{color:c.text,fontWeight:'800',fontSize:12}}>Full website · Account & web collection</Text><Pill label="Back to app" c={c} onPress={()=>go('home')}/></View>
<WebView source={{uri:api}} originWhitelist={['https://*']} javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled
 allowsFullscreenVideo allowsInlineMediaPlayback
 mediaPlaybackRequiresUserAction onError={()=>notify('Website unavailable. Check domain in Settings.')}
 style={{flex:1}}/>
</View>}
const current=screen==='player'?'player':screen;
if(!hydrated)return <SafeAreaView style={{flex:1,backgroundColor:c.bg,alignItems:'center',justifyContent:'center'}}><Image source={logo} style={{width:75,height:75}}/><ActivityIndicator style={{marginTop:25}} color={c.accent}/></SafeAreaView>;
return <SafeAreaView edges={['top','bottom']} style={{flex:1,backgroundColor:c.bg}}>
<StatusBar backgroundColor={c.bg} barStyle={data.theme==='dark'?'light-content':'dark-content'}/>
<View style={{paddingHorizontal:19,paddingVertical:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
<Pressable onPress={()=>go('home')} style={{flexDirection:'row',alignItems:'center',gap:9}}><Image source={logo} style={{height:33,width:33,borderRadius:8}}/><Text style={{fontSize:23,fontWeight:'900',letterSpacing:-1.4,color:c.text}}>spotibai<Text style={{color:c.accent}}>.</Text></Text></Pressable>
<View style={{flexDirection:'row',alignItems:'center',gap:10}}>
{playing&&<Pressable onPress={()=>{setExpanded(true);go('player');if(playing.source==='youtube')setYtOpen(true)}} style={{padding:7}}><Text style={{color:c.accent,fontSize:23}}>♫</Text></Pressable>}
<Pressable onPress={()=>go('profile')} style={{width:34,height:34,backgroundColor:c.accent,borderRadius:18,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.ink,fontSize:14,fontWeight:'900'}}>S</Text></Pressable>
</View></View>
{screen==='web'?fullWeb():<Animated.View style={{flex:1,opacity:fade}}>
<ScrollView keyboardShouldPersistTaps="handled" style={{flex:1}} contentContainerStyle={{paddingHorizontal:20,paddingBottom:30}}>
{current==='home'?home():current==='search'?searchScreen():current==='favorites'?favoritesScreen():current==='playlists'?playlistsScreen():current==='offline'?offlineScreen():current==='profile'?profile():playerScreen()}
</ScrollView></Animated.View>}
{Boolean(message)&&screen!=='web'&&<Text accessibilityLiveRegion="polite" numberOfLines={2} style={{paddingHorizontal:20,paddingBottom:4,color:c.accent,fontSize:10,textAlign:'center'}}>{message}</Text>}
{playing&&screen!=='web'&&screen!=='player'&&playing.source!=='youtube'&&<Pressable onPress={()=>go('player')} style={{backgroundColor:c.sub,borderTopColor:c.border,borderTopWidth:1,paddingHorizontal:14,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:10}}>
<Artwork song={playing} c={c} size={37}/><View style={{flex:1}}><Text style={{color:c.text,fontWeight:'800',fontSize:12}} numberOfLines={1}>{playing.title}</Text><Text style={{...small(c),fontSize:10}} numberOfLines={1}>{playing.artist}</Text></View>
<Pressable onPress={e=>{e.stopPropagation();pauseOrResume()}} style={{padding:7}}><Text style={{color:c.accent,fontSize:22}}>{audioStatus.playing?'Ⅱ':'▶'}</Text></Pressable>
<Pressable onPress={e=>{e.stopPropagation();playNext(1)}} style={{padding:7}}><Text style={{color:c.text,fontSize:22}}>⏭</Text></Pressable>
</Pressable>}
{screen!=='web'&&<View style={{height:65,flexDirection:'row',backgroundColor:c.panel,paddingTop:5,borderTopWidth:1,borderColor:c.border}}>
{navs.map(n=><Pressable accessibilityRole="tab" accessibilityState={{selected:screen===n.screen}} key={n.screen} onPress={()=>{if(playing?.source==='youtube'&&screen==='player')stopYouTube();go(n.screen)}} style={{flex:1,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:screen===n.screen?c.sub:'transparent',marginHorizontal:3}}>
<Text style={{color:screen===n.screen?c.accent:c.muted,fontSize:23}}>{n.icon}</Text><Text style={{color:screen===n.screen?c.accent:c.muted,fontSize:10,fontWeight:'800'}}>{n.label}</Text></Pressable>)}</View>}
<Modal transparent visible={dialog!=='none'} animationType="slide" onRequestClose={()=>setDialog('none')}>
<View style={{flex:1,backgroundColor:'#0008',justifyContent:'flex-end'}}><View style={{backgroundColor:c.panel,borderTopLeftRadius:20,borderTopRightRadius:20,padding:23,maxHeight:'75%'}}>
<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:19}}><Text style={{color:c.text,fontSize:20,fontWeight:'900'}}>{dialog==='add'?'Add to mixtape':dialog==='rename'?'Rename mixtape':'New mixtape'}</Text><Pill label="Close" c={c} onPress={()=>setDialog('none')}/></View>
{dialog==='add'?<ScrollView>{playlists.map(pl=><Pressable key={pl.id} onPress={()=>addToPlaylist(pl.id)} style={{padding:15,borderBottomColor:c.border,borderBottomWidth:1}}><Text style={{color:c.text,fontWeight:'800'}}>{pl.name} · {pl.songs.length} songs</Text></Pressable>)}
<View style={{marginTop:13}}><Action label="+ Create mixtape with this song" c={c} solid onPress={()=>{setNameDraft('');setDialog('create')}}/></View></ScrollView>:
<><TextInput autoFocus maxLength={60} value={nameDraft} onChangeText={setNameDraft} placeholder="Give this mixtape a name…" placeholderTextColor={c.muted} style={{color:c.text,borderColor:c.border,borderWidth:1,borderRadius:10,padding:14,marginBottom:16}}/><Action label={dialog==='rename'?'Save name':'Create mixtape'} c={c} solid onPress={makePlaylist}/></>}
</View></View></Modal>
</SafeAreaView>
}
