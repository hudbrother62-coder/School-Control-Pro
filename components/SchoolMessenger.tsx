'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ContactRound,Mic,Search,Send,Square,Trash2,Users} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {errorMessage} from '@/lib/error-message';
import {ROLE_LABELS,type Role} from '@/lib/modules';
import './school-messenger.css';

type Contact={user_id:string;account_name:string;email:string;role:string;room_id:string|null;preview:string|null;last_message_at:string|null;unread:number};
type Directory={is_principal:boolean;group:{room_id:string|null;preview:string|null;unread:number;last_message_at:string|null}|null;contacts:Contact[]};
type ChatMessage={id:number;room_id:string;sender_id:string;body:string|null;audio_path:string|null;audio_seconds:number|null;created_at:string;url?:string};
type Choice={kind:'school'|'principal';member_id?:string;title:string};
const initial:Directory={is_principal:false,group:null,contacts:[]};
export default function SchoolMessenger({schoolId,schoolName,userId,onUnreadChange}:{schoolId:string;schoolName:string;userId:string;onUnreadChange?:(value:number)=>void}){
 const db=useMemo(()=>browserDb(),[]);
 const [directory,setDirectory]=useState<Directory>(initial),[choice,setChoice]=useState<Choice>({kind:'school',title:'Grup Semua Anggota'}),[room,setRoom]=useState(''),[messages,setMessages]=useState<ChatMessage[]>([]),[search,setSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[connected,setConnected]=useState(false),[showDirectory,setShowDirectory]=useState(false),[older,setOlder]=useState(false),[draft,setDraft]=useState('');
 const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[voice,setVoice]=useState<{blob:Blob;url:string;seconds:number}|null>(null);
 const roomRef=useRef(''),request=useRef(0),listRef=useRef<HTMLDivElement>(null),nearBottom=useRef(true),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),started=useRef(0),abort=useRef(false),micPending=useRef(false),signedUrls=useRef(new Map<string,{url:string;expires:number}>());
 const mounted=useRef(true),reading=useRef('');
 const loadDirectory=useCallback(async()=>{
  const {data,error:e}=await db.rpc('sc_school_chat_directory',{p_school:schoolId});
  if(e)throw e;
  if(mounted.current){const next=(data||initial) as Directory;setDirectory(next);onUnreadChange?.(Number(next.group?.unread||0)+next.contacts.reduce((n,c)=>n+Number(c.unread||0),0));}
 },[db,schoolId,onUnreadChange]);
 const resolveAudio=useCallback(async(rows:ChatMessage[])=>Promise.all(rows.map(async m=>{
  if(!m.audio_path)return m;
  let cached=signedUrls.current.get(m.audio_path);
  if(!cached||cached.expires<Date.now()){
   const {data,error:e}=await db.storage.from('sc-school-chat-audio').createSignedUrl(m.audio_path,3600);
   if(e)throw e;
   cached={url:data.signedUrl,expires:Date.now()+3300000};signedUrls.current.set(m.audio_path,cached);
  }
  return {...m,url:cached.url};
 })),[db]);
 const loadMessages=useCallback(async(id:string,before?:number)=>{
  const seq=request.current;
  let q=db.from('sc_school_chat_messages').select('id,room_id,sender_id,body,audio_path,audio_seconds,created_at').eq('room_id',id).order('id',{ascending:false}).limit(50);
  if(before)q=q.lt('id',before);
  const {data,error:e}=await q;if(e)throw e;
  const rows=await resolveAudio(((data||[]) as ChatMessage[]).reverse());
  if(!mounted.current||roomRef.current!==id||seq!==request.current)return;
  if(before){setMessages(old=>[...rows,...old].filter((m,i,a)=>a.findIndex(x=>x.id===m.id)===i));}
  else{setMessages(old=>[...old.filter(m=>!rows.length||m.id<rows[0].id),...rows].filter((m,i,a)=>a.findIndex(x=>x.id===m.id)===i));}
  setOlder(rows.length===50);
  const last=rows.at(-1);
  if(last&&document.visibilityState==='visible'&&reading.current!==last.created_at){
   reading.current=last.created_at;
   const {error:readError}=await db.rpc('sc_school_chat_read',{p_room:id,p_until:last.created_at});
   if(readError)reading.current='';else await loadDirectory();
  }
 },[db,resolveAudio,loadDirectory]);
 function cancelRecord(){
  abort.current=true;
  if(recorder.current?.state==='recording')recorder.current.stop();
  stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
  if(timer.current)clearInterval(timer.current);timer.current=null;setRecording(false);
 }
 function discard(){setVoice(old=>{if(old)URL.revokeObjectURL(old.url);return null;});}
 async function open(choiceNext:Choice){
  setChoice(choiceNext);setShowDirectory(false);setError('');setLoading(true);request.current++;roomRef.current='';setRoom('');setMessages([]);setOlder(false);setDraft('');reading.current='';nearBottom.current=true;cancelRecord();discard();
  try{
   const seq=request.current;
   const {data,error:e}=await db.rpc('sc_school_chat_open',{p_school:schoolId,p_member:choiceNext.kind==='principal'?choiceNext.member_id:null});
   if(e)throw e;
   if(!mounted.current||seq!==request.current)return;
   roomRef.current=String(data);setRoom(String(data));
   await loadMessages(String(data));await loadDirectory();
  }catch(e){if(mounted.current)setError(errorMessage(e));}
  finally{if(mounted.current)setLoading(false);}
 }
 useEffect(()=>{mounted.current=true;void loadDirectory().catch(e=>setError(errorMessage(e)));void open({kind:'school',title:'Grup Semua Anggota'});return()=>{mounted.current=false;request.current++;cancelRecord();};},[schoolId]);
 useEffect(()=>{
  const channel=db.channel('school-messenger-'+crypto.randomUUID()).on('postgres_changes',{event:'INSERT',schema:'public',table:'sc_school_chat_messages'},p=>{
   const m=p.new as ChatMessage;void loadDirectory().catch(()=>{});
   if(roomRef.current===m.room_id)void loadMessages(m.room_id).catch(e=>setError(errorMessage(e)));
  }).subscribe(s=>setConnected(s==='SUBSCRIBED'));
  const tick=()=>{if(document.visibilityState==='hidden')return;void loadDirectory().catch(()=>{});if(roomRef.current)void loadMessages(roomRef.current).catch(()=>{});};
  const interval=setInterval(tick,12000),wake=()=>tick();
  window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);
  return()=>{clearInterval(interval);void db.removeChannel(channel);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
 },[db,schoolId,loadDirectory,loadMessages]);
 useEffect(()=>{if(nearBottom.current)listRef.current?.scrollTo({top:listRef.current.scrollHeight,behavior:'instant'});},[messages,room]);
 useEffect(()=>()=>{if(voice)URL.revokeObjectURL(voice.url);},[voice]);
 const names=useMemo(()=>new Map(directory.contacts.map(c=>[c.user_id,c.account_name])),[directory.contacts]);
 const myself=directory.contacts.find(c=>c.user_id===userId);
 const regular=!directory.is_principal;
 const available=directory.contacts.filter(c=>(c.account_name+' '+c.email+' '+c.role).toLowerCase().includes(search.toLowerCase()));
 const privateUnread=regular?Number(myself?.unread||0):directory.contacts.reduce((n,c)=>n+Number(c.unread||0),0);
 async function record(){
  if(micPending.current||!room)return;micPending.current=true;setError('');discard();const forRoom=room;
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Browser tidak mendukung rekaman. Buka SekolaPro melalui HTTPS.');
   const audio=await navigator.mediaDevices.getUserMedia({audio:true});
   if(roomRef.current!==forRoom||!mounted.current){audio.getTracks().forEach(t=>t.stop());return;}
   stream.current=audio;
   const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
   if(!mime){audio.getTracks().forEach(t=>t.stop());throw Error('Format suara tidak didukung browser ini.');}
   const rec=new MediaRecorder(audio,{mimeType:mime}),chunks:BlobPart[]=[];
   abort.current=false;recorder.current=rec;started.current=Date.now();setSeconds(0);
   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   rec.onstop=()=>{audio.getTracks().forEach(t=>t.stop());stream.current=null;if(timer.current)clearInterval(timer.current);timer.current=null;setRecording(false);
    if(abort.current||!mounted.current||roomRef.current!==forRoom)return;
    const blob=new Blob(chunks,{type:mime.split(';')[0]}),duration=Math.min(120,Math.max(1,Math.ceil((Date.now()-started.current)/1000)));
    if(!blob.size||blob.size>5242880){setError('Voice note melebihi 5 MB atau kosong.');return;}
    setVoice({blob,url:URL.createObjectURL(blob),seconds:duration});
   };
   rec.onerror=()=>{setError('Rekaman gagal, coba lagi.');cancelRecord();};
   rec.start(1000);setRecording(true);
   timer.current=setInterval(()=>{const n=Math.floor((Date.now()-started.current)/1000);setSeconds(n);if(n>=120&&rec.state==='recording')rec.stop();},500);
  }catch(e){setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Izinkan akses mikrofon pada browser.':errorMessage(e));}
  finally{micPending.current=false;}
 }
 async function send(){
  if(!room||busy||recording||(!voice&&!draft.trim()))return;
  const target=room;setBusy(true);setError('');let audioPath:string|undefined;
  try{
   if(voice){
    const ext=voice.blob.type==='audio/mp4'?'mp4':voice.blob.type==='audio/ogg'?'ogg':'webm';
    audioPath=target+'/'+userId+'/'+crypto.randomUUID()+'.'+ext;
    const {error:e}=await db.storage.from('sc-school-chat-audio').upload(audioPath,voice.blob,{contentType:voice.blob.type,upsert:false});if(e)throw e;
   }
   const {error:e}=await db.rpc('sc_school_chat_send',{p_room:target,p_body:voice?null:draft.trim(),p_audio_path:audioPath||null,p_audio_seconds:voice?.seconds||null});if(e)throw e;
   audioPath=undefined;setDraft('');discard();nearBottom.current=true;
   await loadMessages(target);await loadDirectory();
  }catch(e){if(audioPath)await db.storage.from('sc-school-chat-audio').remove([audioPath]);setError(errorMessage(e));}
  finally{setBusy(false);}
 }
 return <div className={'school-chat '+(showDirectory?'school-chat-show-directory':'')} aria-label="Pusat komunikasi internal sekolah">
  <aside className="school-chat-sidebar">
   <div className="school-chat-sidebar-head"><strong>Komunikasi sekolah</strong><small>{connected?'Terhubung langsung':'Sinkronisasi otomatis'}</small></div>
   <button className={'school-chat-entry '+(choice.kind==='school'?'active':'')} onClick={()=>void open({kind:'school',title:'Grup Semua Anggota'})}><span className="school-chat-avatar"><Users size={20}/></span><span><b>Grup Semua Anggota</b><small>{schoolName} · seluruh akses</small><small>{directory.group?.preview||'Tempat pengumuman dan diskusi sekolah'}</small></span>{Number(directory.group?.unread||0)>0&&<em>{directory.group?.unread}</em>}</button>
   {regular&&<button className={'school-chat-entry '+(choice.kind==='principal'?'active':'')} onClick={()=>void open({kind:'principal',member_id:userId,title:'Chat Kepala Sekolah'})}><span className="school-chat-avatar"><ContactRound size={20}/></span><span><b>Chat Kepala Sekolah</b><small>Privat · hanya Anda dan kepala sekolah</small><small>{myself?.preview||'Sampaikan pesan kepada kepala sekolah'}</small></span>{privateUnread>0&&<em>{privateUnread}</em>}</button>}
   <label className="school-chat-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama atau peran" aria-label="Cari kontak sekolah"/></label>
   <div className="school-chat-contact-title">Direktori sekolah · {available.length} akun</div>
   <div className="school-chat-contacts">
    {available.map(c=><button key={c.user_id} className={'school-chat-entry '+(choice.kind==='principal'&&choice.member_id===c.user_id?'active':'')} onClick={()=>{if(directory.is_principal)void open({kind:'principal',member_id:c.user_id,title:c.account_name});else if(c.user_id===userId||c.role==='principal')void open({kind:'principal',member_id:userId,title:'Chat Kepala Sekolah'});else setError('Pesan privat hanya tersedia antara masing-masing anggota dan kepala sekolah. Gunakan grup sekolah untuk menghubungi rekan kerja.');}}>
     <span className="school-chat-avatar">{c.account_name.slice(0,2).toUpperCase()}</span><span><b>{c.account_name}{c.user_id===userId?' (Anda)':''}</b><small>{ROLE_LABELS[c.role as Role]||c.role} · {c.email}</small>{directory.is_principal&&<small>{c.preview||'Belum ada chat privat'}</small>}</span>{Number(c.unread)>0&&<em>{c.unread}</em>}
    </button>)}
    {!available.length&&<p className="school-chat-hint">Tidak ada kontak yang sesuai.</p>}
   </div>
  </aside>
  <section className="school-chat-room">
   <header className="school-chat-room-head">
    <button className="school-chat-back" aria-label="Kembali ke kontak" onClick={()=>setShowDirectory(true)}><ArrowLeft size={20}/></button>
    <span className="school-chat-avatar">{choice.kind==='school'?<Users size={19}/>:<ContactRound size={19}/>}</span>
    <span><strong>{choice.title}</strong><small>{choice.kind==='school'?'Semua akun aktif di sekolah':'Percakapan privat dengan kepala sekolah'}</small></span>
   </header>
   {error&&<p className="school-chat-error" role="alert">{error}</p>}
   <div className="school-chat-messages" ref={listRef} aria-live="polite" aria-relevant="additions" onScroll={()=>{const e=listRef.current;if(e)nearBottom.current=e.scrollHeight-e.scrollTop-e.clientHeight<110;}}>
    {loading&&<p className="school-chat-hint">Membuka percakapan…</p>}
    {room&&older&&messages.length>0&&<button className="school-chat-older" onClick={()=>void loadMessages(room,messages[0].id).catch(e=>setError(errorMessage(e)))}>Muat pesan sebelumnya</button>}
    {room&&!messages.length&&!loading&&<div className="school-chat-empty"><Users size={34}/><b>Mulai percakapan</b><p>{choice.kind==='school'?'Grup ini otomatis tersedia untuk seluruh akun sekolah yang aktif.':'Pesan di sini hanya dapat dibaca anggota terkait dan akun kepala sekolah.'}</p></div>}
    {messages.map(m=><article key={m.id} className={'school-chat-bubble '+(m.sender_id===userId?'mine':'theirs')}><small>{m.sender_id===userId?'Anda':names.get(m.sender_id)||'Anggota sekolah'}</small>{m.body&&<p>{m.body}</p>}{m.audio_path&&<><audio controls preload="none" src={m.url} aria-label={'Voice note '+m.audio_seconds+' detik'}/><span className="school-chat-duration">Voice note · {m.audio_seconds} detik</span></>}<time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'})}</time></article>)}
   </div>
   {room&&<footer className="school-chat-compose">
    {recording?<div className="school-chat-recording"><span>● Merekam {seconds}/120 detik</span><button onClick={cancelRecord} aria-label="Batalkan rekaman"><Trash2 size={19}/></button><button onClick={()=>recorder.current?.stop()} aria-label="Selesai merekam"><Square size={19}/></button></div>:voice?<div className="school-chat-voice"><audio controls src={voice.url}/><button onClick={discard} disabled={busy} aria-label="Hapus rekaman"><Trash2 size={19}/></button><button onClick={()=>void send()} disabled={busy} aria-label="Kirim suara"><Send size={19}/></button></div>:<div className="school-chat-input"><textarea aria-label="Pesan sekolah" rows={1} maxLength={4000} placeholder="Tulis pesan sekolah…" value={draft} onChange={e=>setDraft(e.target.value)} disabled={busy} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/><button onClick={()=>void record()} disabled={busy} aria-label="Rekam voice note"><Mic size={19}/></button><button onClick={()=>void send()} disabled={busy||!draft.trim()} aria-label="Kirim pesan"><Send size={19}/></button></div>}
    <small>Pesan tersimpan otomatis · Voice note maksimal 2 menit</small>
   </footer>}
  </section>
 </div>;
}
