'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,Mic,Phone,Search,Send,Square,Trash2,X} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {errorMessage} from '@/lib/error-message';
import {ROLE_LABELS,type Role} from '@/lib/modules';
import {useRealtimeRefresh} from '@/lib/school-realtime';
import './support-chat.css';
type Contact={school_id:string|null;user_id:string;school_name:string;account_name:string;email:string;role:string;thread_id:string|null;unread:number;preview:string|null;last_message_at:string|null;registered_at:string;last_sign_in_at:string|null};
type Message={id:number;thread_id:string;sender_id:string;sender_is_admin:boolean;body:string|null;audio_path:string|null;audio_seconds:number|null;created_at:string;url?:string};
export default function SupportChat({schoolId,schoolName='Sekolah',userId='',admin=false,embedded=false}:{schoolId?:string;schoolName?:string;userId?:string;admin?:boolean;embedded?:boolean}){
 const db=useMemo(()=>browserDb(),[]);
 const [open,setOpen]=useState(embedded),[contacts,setContacts]=useState<Contact[]>([]),[selected,setSelected]=useState<Contact|null>(null),[thread,setThread]=useState(''),[messages,setMessages]=useState<Message[]>([]),[query,setQuery]=useState(''),[contactPage,setContactPage]=useState(0),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[hasMore,setHasMore]=useState(false),[connected,setConnected]=useState(false);
 const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[voice,setVoice]=useState<{blob:Blob;url:string;seconds:number}|null>(null);
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),recordTimer=useRef<ReturnType<typeof setInterval>|null>(null),aborted=useRef(false),started=useRef(0),mounted=useRef(true);
 const current=useRef({open,thread,admin});current.current={open,thread,admin};
 const scroll=useRef<HTMLDivElement>(null),nearBottom=useRef(true),dialog=useRef<HTMLDivElement>(null),request=useRef(0),audioUrls=useRef(new Map<string,{url:string;until:number}>());
 const micPending=useRef(false);
 const readUntil=useRef(''),choice=useRef(0),audioRetries=useRef(new Set<string>());
 async function loadContacts(){const {data,error}=await db.rpc('sc_support_contacts',{p_school:admin?null:schoolId||null});if(error)throw error;if(mounted.current)setContacts((data||[]) as Contact[]);}
 useRealtimeRefresh(admin?'*':schoolId||'',()=>loadContacts());
 useEffect(()=>{mounted.current=true;void loadContacts().catch(()=>{});return()=>{mounted.current=false;cancelRecording();};},[schoolId,admin]);
 function cancelRecording(){aborted.current=true;if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(recordTimer.current)clearInterval(recordTimer.current);recordTimer.current=null;setRecording(false);}
 function discardVoice(){setVoice(old=>{if(old)URL.revokeObjectURL(old.url);return null;});}
 useEffect(()=>()=>{if(voice)URL.revokeObjectURL(voice.url);},[voice]);
 async function resolveAudio(rows:Message[]){return Promise.all(rows.map(async m=>{if(!m.audio_path)return m;let signed=audioUrls.current.get(m.audio_path);if(!signed||signed.until<Date.now()){const {data,error}=await db.storage.from('sc-support-audio').createSignedUrl(m.audio_path,3600);if(error)throw error;signed={url:data.signedUrl,until:Date.now()+3300000};audioUrls.current.set(m.audio_path,signed);}return {...m,url:signed.url};}));}
 async function loadMessages(id:string,older=false){
  const seq=older?request.current:++request.current;
  let q=db.from('sc_support_messages').select('*').eq('thread_id',id).order('id',{ascending:false}).limit(50);
  if(older&&messages.length)q=q.lt('id',messages[0].id);
  const {data,error}=await q;if(error)throw error;const rows=await resolveAudio(((data||[]) as Message[]).reverse());
  if(!mounted.current||current.current.thread!==id||seq!==request.current)return;
  if(older){setHasMore(rows.length===50);setMessages(old=>[...rows,...old].filter((m,i,a)=>a.findIndex(x=>x.id===m.id)===i));}
  else{setMessages(old=>{const merged=[...old.filter(m=>!rows.length||m.id<rows[0].id),...rows];return merged.filter((m,i,a)=>a.findIndex(x=>x.id===m.id)===i);});setHasMore(old=>old||rows.length===50);}
  const incoming=rows.filter(m=>m.sender_is_admin!==admin).at(-1);
  if(incoming&&current.current.open&&document.visibilityState==='visible'&&readUntil.current!==incoming.created_at){readUntil.current=incoming.created_at;const {error}=await db.rpc('sc_support_read',{p_thread:id,p_until:incoming.created_at});if(error)readUntil.current='';else await loadContacts();}
 }
 async function choose(c:Contact){const chosen=++choice.current;setError('');setLoading(true);cancelRecording();discardVoice();setSelected(c);setThread('');current.current.thread='';setMessages([]);setText('');setHasMore(false);readUntil.current='';nearBottom.current=true;request.current++;
  try{const {data,error}=await db.rpc('sc_support_open',{p_school:c.school_id,p_user:c.user_id});if(error)throw error;if(chosen!==choice.current||!mounted.current)return;const id=String(data);current.current.thread=id;setThread(id);await loadMessages(id);await loadContacts();}catch(e){setError(errorMessage(e));}finally{if(chosen===choice.current)setLoading(false);}
 }
 useEffect(()=>{if(!open||admin||thread)return;let live=true;(async()=>{try{const {data,error}=await db.rpc('sc_support_contacts',{p_school:schoolId||null});if(error)throw error;const c=((data||[]) as Contact[]).find(c=>(!userId||c.user_id===userId)&&(schoolId?c.school_id===schoolId:c.school_id===null));if(live&&c)await choose(c);else if(live)setError('Pilih atau bergabung dengan sekolah untuk menghubungi dukungan.');}catch(e){if(live)setError(errorMessage(e));}})();return()=>{live=false};},[open,schoolId,admin]);
 useEffect(()=>{
  const channel=db.channel('support-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'sc_support_threads'},()=>void loadContacts().catch(()=>{})).on('postgres_changes',{event:'INSERT',schema:'public',table:'sc_support_messages'},p=>{void loadContacts().catch(()=>{});const m=p.new as Message;if(current.current.open&&m.thread_id===current.current.thread)void loadMessages(m.thread_id).catch(e=>setError(errorMessage(e)));}).subscribe(s=>setConnected(s==='SUBSCRIBED'));
  const timer=setInterval(()=>{if(document.visibilityState==='hidden')return;void loadContacts().catch(()=>{});if(current.current.open&&current.current.thread)void loadMessages(current.current.thread).catch(()=>{});},15000);
  const wake=()=>{void loadContacts().catch(()=>{});if(current.current.open&&current.current.thread)void loadMessages(current.current.thread).catch(()=>{});};window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);
  return()=>{clearInterval(timer);void db.removeChannel(channel);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);};
 },[schoolId,admin]);
 useEffect(()=>{if(open&&nearBottom.current)scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'instant'});},[messages,open,thread]);
 function close(){cancelRecording();discardVoice();setOpen(false);}
 useEffect(()=>{if(!open||embedded)return;const old=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLElement>('button')?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const els=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,audio')||[]).filter(e=>e.getClientRects().length);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);old?.focus({preventScroll:true});};
 },[open,embedded]);
 async function record(){if(micPending.current)return;micPending.current=true;const recordingThread=thread;setError('');discardVoice();try{
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Browser ini belum mendukung rekaman suara. Gunakan browser terbaru melalui HTTPS.');
  const audio=await navigator.mediaDevices.getUserMedia({audio:true});if(!mounted.current||!current.current.open||current.current.thread!==recordingThread){audio.getTracks().forEach(t=>t.stop());return;}
  stream.current=audio;const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime){audio.getTracks().forEach(t=>t.stop());throw Error('Format rekaman suara browser ini belum didukung.');}
  const rec=new MediaRecorder(audio,{mimeType:mime}),chunks:BlobPart[]=[];recorder.current=rec;aborted.current=false;started.current=Date.now();setSeconds(0);
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onerror=()=>{setError('Rekaman gagal. Coba rekam ulang.');cancelRecording();};
  rec.onstop=()=>{audio.getTracks().forEach(t=>t.stop());stream.current=null;if(recordTimer.current)clearInterval(recordTimer.current);recordTimer.current=null;setRecording(false);if(aborted.current||!mounted.current)return;const blob=new Blob(chunks,{type:mime.split(';')[0]}),duration=Math.min(120,Math.max(1,Math.ceil((Date.now()-started.current)/1000)));if(!blob.size||blob.size>5242880){setError('Rekaman kosong atau melebihi 5 MB. Rekam ulang.');return;}setVoice({blob,url:URL.createObjectURL(blob),seconds:duration});};
  rec.start(1000);setRecording(true);recordTimer.current=setInterval(()=>{const n=Math.floor((Date.now()-started.current)/1000);setSeconds(n);if(n>=120&&rec.state==='recording')rec.stop();},500);
 }catch(e){setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Izinkan mikrofon untuk merekam voice note.':errorMessage(e));}finally{micPending.current=false;}}
 async function send(){if(!thread||busy||recording||(!voice&&!text.trim()))return;setBusy(true);setError('');let path:string|undefined;try{
  if(voice){const {data:{user}}=await db.auth.getUser();if(!user)throw Error('Masuk kembali untuk mengirim pesan.');const extension=voice.blob.type==='audio/mp4'?'mp4':voice.blob.type==='audio/ogg'?'ogg':'webm';path=thread+'/'+user.id+'/'+crypto.randomUUID()+'.'+extension;const {error}=await db.storage.from('sc-support-audio').upload(path,voice.blob,{contentType:voice.blob.type,upsert:false});if(error)throw error;}
  const {error}=await db.rpc('sc_support_send',{p_thread:thread,p_body:voice?null:text.trim(),p_audio_path:path||null,p_audio_seconds:voice?.seconds||null});if(error)throw error;path=undefined;setText('');discardVoice();nearBottom.current=true;await loadMessages(thread);await loadContacts();
 }catch(e){if(path)await db.storage.from('sc-support-audio').remove([path]);setError(errorMessage(e));}finally{setBusy(false);}}
 const unread=contacts.reduce((n,c)=>n+Number(c.unread||0),0),visible=contacts.filter(c=>(c.school_name+' '+c.account_name+' '+c.email).toLowerCase().includes(query.toLowerCase()));
 const room=<div ref={dialog} className={'support-shell '+(admin?'support-admin ':'')+(thread?'support-room-active':'')} role={embedded?'region':'dialog'} aria-modal={embedded?undefined:true} aria-label={admin?'Pusat chat pelanggan':'Chat dukungan Super Admin'}>
  <header className="support-heading"><div><Phone size={19}/><span><b>{admin?'Chat pelanggan':'Dukungan School Control'}</b><small>{connected?'Terhubung • pesan langsung':'Menghubungkan • sinkronisasi otomatis'}</small></span></div>{!embedded&&<button aria-label="Tutup chat" onClick={close}><X size={20}/></button>}</header>
  <div className="support-content">
   {admin&&<aside className="support-contacts"><label><Search size={16}/><input aria-label="Cari kontak pelanggan" placeholder="Cari sekolah / pengguna" value={query} onChange={e=>{setQuery(e.target.value);setContactPage(0);}}/></label><small>{contacts.length} akun sekolah terdaftar</small><div>{visible.slice(contactPage*50,(contactPage+1)*50).map(c=><button key={(c.school_id||"account")+c.user_id} className={selected?.school_id===c.school_id&&selected?.user_id===c.user_id?'selected':''} onClick={()=>void choose(c)}><span className="support-avatar">{c.school_name.slice(0,2).toUpperCase()}</span><span><b>{c.school_name}</b><small>{c.account_name} · {ROLE_LABELS[c.role as Role]||'Belum bergabung'}</small><small>{c.preview||'Belum ada percakapan'}</small></span>{Number(c.unread)>0&&<em>{c.unread}</em>}</button>)}</div>{visible.length>50&&<div className="support-contact-pages"><button disabled={contactPage===0} onClick={()=>setContactPage(n=>n-1)}>Sebelumnya</button><small>{contactPage+1}/{Math.ceil(visible.length/50)}</small><button disabled={(contactPage+1)*50>=visible.length} onClick={()=>setContactPage(n=>n+1)}>Berikutnya</button></div>}{!visible.length&&<p>Belum ada kontak yang sesuai.</p>}</aside>}
   <section className="support-room">
    {(selected||!admin)&&<div className="support-room-heading">{admin&&<button className="support-back" aria-label="Kembali ke kontak" onClick={()=>{cancelRecording();discardVoice();choice.current++;current.current.thread='';setThread('');setSelected(null);setMessages([]);}}><ArrowLeft size={19}/></button>}<span className="support-avatar">{admin?(selected?.school_name||'SC').slice(0,2).toUpperCase():'SC'}</span><div><b>{admin?selected?.school_name:'Super Admin'}</b><small>{admin?selected?.account_name+' · '+selected?.email:schoolName+' · percakapan privat akun Anda'}</small></div></div>}
    {error&&<p className="support-error" role="alert">{error}</p>}
    <div className="support-messages" ref={scroll} onScroll={()=>{const e=scroll.current;if(e)nearBottom.current=e.scrollHeight-e.scrollTop-e.clientHeight<90;}} aria-live="polite" aria-relevant="additions">
     {loading&&<p role="status">Memuat percakapan…</p>}{!thread&&!loading&&<div className="support-empty"><Phone size={36}/><b>{admin?'Pilih kontak pelanggan':'Keluhan dan saran'}</b><p>{admin?'Semua akun sekolah dapat dihubungi dari daftar kontak.':'Pesan dan voice note Anda diterima langsung oleh super admin.'}</p></div>}
     {hasMore&&thread&&<button className="support-older" onClick={()=>void loadMessages(thread,true).catch(e=>setError(errorMessage(e)))}>Muat pesan sebelumnya</button>}
     {thread&&!messages.length&&!loading&&<div className="support-empty"><b>Mulai percakapan</b><p>Sampaikan keluhan, pertanyaan, atau saran melalui teks atau voice note.</p></div>}
     {messages.map(m=><article key={m.id} className={'support-bubble '+(m.sender_is_admin===admin?'mine':'theirs')}><small>{m.sender_is_admin?'Super Admin':selected?.account_name||schoolName}</small>{m.body&&<p>{m.body}</p>}{m.audio_path&&<><audio controls preload="none" src={m.url} aria-label={'Voice note '+m.audio_seconds+' detik'} onError={()=>{if(!audioRetries.current.has(m.audio_path!)){audioRetries.current.add(m.audio_path!);audioUrls.current.delete(m.audio_path!);void loadMessages(thread).catch(()=>{});}else setError('Voice note belum dapat diputar. Periksa koneksi Anda.');}}/><span className="support-duration">Voice note · {m.audio_seconds} detik</span></>}<time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'})}</time></article>)}
    </div>
    {thread&&<footer className="support-compose">{recording?<div className="support-recording"><span>● Merekam {seconds}/120 detik</span><button aria-label="Batalkan rekaman" onClick={cancelRecording}><Trash2 size={19}/></button><button aria-label="Selesai merekam" onClick={()=>recorder.current?.stop()}><Square size={18}/></button></div>:voice?<div className="support-voice-preview"><audio controls src={voice.url}/><button aria-label="Hapus rekaman" disabled={busy} onClick={discardVoice}><Trash2 size={19}/></button><button aria-label="Kirim voice note" disabled={busy} onClick={()=>void send()}><Send size={19}/></button></div>:<><textarea aria-label="Pesan dukungan" placeholder="Tulis pesan…" maxLength={4000} rows={1} value={text} disabled={busy} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/><button aria-label="Rekam voice note" disabled={busy} onClick={()=>void record()}><Mic size={20}/></button><button aria-label="Kirim pesan" disabled={busy||!text.trim()} onClick={()=>void send()}><Send size={20}/></button></>}<small>Chat privat dengan tim platform · Voice note maks. 2 menit</small></footer>}
   </section>
  </div>
 </div>;
 if(embedded)return room;
 return <><button className="iconbutton support-trigger" aria-label="Hubungi Super Admin" title="Chat dukungan" onClick={()=>{setOpen(true);if(thread)void loadMessages(thread).catch(e=>setError(errorMessage(e)));}}><Phone size={18}/>{unread>0&&<span>{unread>99?'99+':unread}</span>}</button>{open&&typeof document!=='undefined'&&createPortal(<div className="support-overlay" onClick={e=>{if(e.target===e.currentTarget)close();}}>{room}</div>,document.body)}</>;
}
