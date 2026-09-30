"use client";
import {useEffect,useMemo,useState} from "react";
import {CalendarDays,ChevronLeft,ChevronRight,Clock3,MapPin,Plus,Users} from "lucide-react";
import DataEntryModal from "@/components/DataEntryModal";
import {browserDb} from "@/lib/supabase";
import {isAdmin,type Role} from "@/lib/modules";

type EventRow={id:string;title:string;event_date:string;category:string;notes:string|null;created_by:string;scope:string;start_time:string|null;end_time:string|null;location:string|null;owner_user_id:string|null};
type Participant={event_id:string;user_id:string};
type Attendance={event_id:string;user_id:string;check_in_at:string|null;check_out_at:string|null;status:string};
type Person={user_id:string;staff_name:string|null;email:string|null;role:string|null};
const pad=(n:number)=>String(n).padStart(2,"0");
const ymd=(d:Date)=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const monthStart=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),1);
const addMonths=(d:Date,n:number)=>new Date(d.getFullYear(),d.getMonth()+n,1);
const same=(a:Date,b:string)=>ymd(a)===b;

export default function SchoolCalendar({schoolId,userId,role,compact=false,focus}:{schoolId:string;userId:string;role:Role;compact?:boolean;focus?:string}){
 const db=useMemo(()=>browserDb(),[]),manager=isAdmin(role);
 const [cursor,setCursor]=useState(()=>monthStart(new Date())),[rows,setRows]=useState<EventRow[]>([]),[participants,setParticipants]=useState<Participant[]>([]),[attendance,setAttendance]=useState<Attendance[]>([]),[people,setPeople]=useState<Person[]>([]);
 const [targetUser,setTargetUser]=useState(userId),[modal,setModal]=useState(false),[editing,setEditing]=useState<EventRow|null>(null),[selectedDay,setSelectedDay]=useState(ymd(new Date()));
 const [title,setTitle]=useState(""),[day,setDay]=useState(ymd(new Date())),[start,setStart]=useState("07:00"),[end,setEnd]=useState(""),[category,setCategory]=useState("school"),[notes,setNotes]=useState(""),[location,setLocation]=useState(""),[scope,setScope]=useState<"school"|"personal">("school"),[selected,setSelected]=useState<string[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState("");
 const focusText=(focus||"").toLowerCase();
 const mode=focusText.includes("pribadi")?"personal":focusText.includes("pengguna")?"users":focusText.includes("kehadiran")?"attendance":"school";
 const canWrite=role!=="viewer";
 async function load(){
  if(!db)return;
  const from=ymd(new Date(cursor.getFullYear(),cursor.getMonth()-1,1)),to=ymd(new Date(cursor.getFullYear(),cursor.getMonth()+2,0));
  const ev=await db.from("sc_calendar_events").select("id,title,event_date,category,notes,created_by,scope,start_time,end_time,location,owner_user_id").eq("school_id",schoolId).gte("event_date",from).lte("event_date",to).order("event_date");
  if(ev.error){setError(ev.error.message);return}
  const list=(ev.data||[]) as EventRow[];setRows(list);
  const ids=list.map(x=>x.id);
  if(ids.length){
   const [p,a]=await Promise.all([
    db.from("sc_calendar_participants").select("event_id,user_id").eq("school_id",schoolId).in("event_id",ids),
    db.from("sc_event_attendance").select("event_id,user_id,check_in_at,check_out_at,status").eq("school_id",schoolId).in("event_id",ids)
   ]);
   setParticipants((p.data||[]) as Participant[]);setAttendance((a.data||[]) as Attendance[]);
  }else{setParticipants([]);setAttendance([])}
  const staff=await db.from("sc_staff").select("user_id,name,position").eq("school_id",schoolId).not("user_id","is",null).order("name");
  const mapped=(staff.data||[]).map(x=>({user_id:x.user_id as string,staff_name:x.name,email:null,role:x.position||null}));
  setPeople(mapped);
  if(manager){
   const dir=await db.rpc("sc_team_directory",{p_school:schoolId});
   if(!dir.error&&dir.data)setPeople((dir.data as Person[]).map(x=>({...x,staff_name:x.staff_name||x.email||"Pengguna"})));
  }
 }
 useEffect(()=>{void load()},[db,schoolId,cursor,manager]);
 useEffect(()=>{if(!targetUser)setTargetUser(userId)},[userId,targetUser]);
 function resetForm(nextDay=ymd(new Date()),nextScope: "school"|"personal"=mode==="personal"?"personal":"school"){setEditing(null);setTitle("");setDay(nextDay);setStart("07:00");setEnd("");setCategory(nextScope==="personal"?"personal":"school");setNotes("");setLocation("");setScope(nextScope);setSelected([])}
 function openNew(nextDay?:string){const target=nextDay||day;setSelectedDay(target);resetForm(target,mode==="personal"?"personal":"school");setModal(true)}
 function openEdit(x:EventRow){setSelectedDay(x.event_date);setEditing(x);setTitle(x.title);setDay(x.event_date);setStart((x.start_time||"").slice(0,5)||"07:00");setEnd((x.end_time||"").slice(0,5));setCategory(x.category);setNotes(x.notes||"");setLocation(x.location||"");setScope(x.scope==="personal"?"personal":"school");setSelected(participants.filter(p=>p.event_id===x.id).map(p=>p.user_id));setModal(true)}
 async function run(fn:()=>Promise<void>){setBusy(true);setError("");setOk("");try{await fn();await load()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function save(){if(!db)return;await run(async()=>{const {error}=await db.rpc("sc_save_calendar_event",{p_school:schoolId,p_event:editing?.id||null,p_title:title.trim(),p_date:day,p_start:start||null,p_end:end||null,p_category:category,p_notes:notes,p_location:location,p_scope:scope,p_participants:scope==="school"?selected:[]});if(error)throw error;setModal(false);setOk(editing?"Agenda diperbarui.":"Agenda ditambahkan.")})}
 async function remove(x:EventRow){if(!db||!confirm("Hapus agenda ini?"))return;await run(async()=>{const {error}=await db.rpc("sc_delete_calendar_event",{p_school:schoolId,p_event:x.id});if(error)throw error;setOk("Agenda dihapus.")})}
 function position():Promise<{lat:number|null;lng:number|null;accuracy:number|null}>{
  return new Promise(resolve=>{if(!navigator.geolocation){resolve({lat:null,lng:null,accuracy:null});return}navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),()=>resolve({lat:null,lng:null,accuracy:null}),{enableHighAccuracy:true,timeout:7000,maximumAge:30000})})
 }
 async function clock(x:EventRow,action:"in"|"out"){if(!db)return;await run(async()=>{const p=await position();const fn=action==="in"?"sc_event_check_in":"sc_event_check_out";const {error}=await db.rpc(fn,{p_school:schoolId,p_event:x.id,p_lat:p.lat,p_lng:p.lng,p_accuracy:p.accuracy});if(error)throw error;setOk(action==="in"?"Kehadiran agenda tercatat.":"Check-out agenda tercatat.")})}
 const ownedBy=(x:EventRow,uid:string)=>x.owner_user_id===uid||participants.some(p=>p.event_id===x.id&&p.user_id===uid);
 const visible=rows.filter(x=>mode==="school"?x.scope==="school":mode==="personal"?x.owner_user_id===userId:mode==="users"?ownedBy(x,targetUser):ownedBy(x,userId));
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
 const nextMonthStart=addMonths(monthStart(new Date()),1),nextMonthEnd=new Date(nextMonthStart.getFullYear(),nextMonthStart.getMonth()+1,0);
 const tomorrowRows=rows.filter(x=>x.scope==="school"&&same(tomorrow,x.event_date)),nextMonthRows=rows.filter(x=>{const d=new Date(x.event_date+"T00:00:00");return x.scope==="school"&&d>=nextMonthStart&&d<=nextMonthEnd});
 if(compact)return <section className="panel"><div className="sectionhead"><div><h2>Agenda Terdekat</h2><p className="muted">Agenda sekolah yang akan datang.</p></div></div><div className="grid"><div className="card"><label>Besok</label><strong>{tomorrowRows.length}</strong><small>{tomorrowRows.slice(0,2).map(x=>x.title).join(" · ")||"Tidak ada agenda"}</small></div><div className="card"><label>Bulan depan</label><strong>{nextMonthRows.length}</strong><small>{nextMonthRows.slice(0,2).map(x=>x.title).join(" · ")||"Belum ada agenda"}</small></div></div></section>;
 const first=monthStart(cursor),offset=(first.getDay()+6)%7,cells=Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),i-offset+1));
 return <>
  {mode==="users"&&manager&&<section className="panel page-control"><div><h2>Agenda Pengguna</h2><p className="muted">Pilih guru/staf untuk melihat agenda sekolah yang melibatkannya dan agenda pribadi yang dapat dilihat manajemen.</p></div><label className="field">Pengguna<select value={targetUser} onChange={e=>setTargetUser(e.target.value)}><option value={userId}>Saya</option>{people.filter(p=>p.user_id!==userId).map(p=><option key={p.user_id} value={p.user_id}>{p.staff_name||p.email||p.user_id.slice(0,8)}</option>)}</select></label></section>}
  {mode!=="attendance"&&<section className="panel"><div className="sectionhead"><div><h2>{mode==="personal"?"Agenda Pribadi":mode==="users"?"Kalender Pengguna":"Kalender Sekolah"}</h2><p className="muted">{mode==="personal"?"Hanya agenda milik akun ini.":mode==="users"?"Agenda yang terkait dengan pengguna terpilih.":"Kegiatan sekolah, rapat, pembelajaran dan program bersama."}</p></div>{canWrite&&mode!=="users"&&<button className="button" onClick={()=>openNew()}><Plus size={15}/> Tambah Agenda</button>}</div>
   <div className="calendar-head"><button className="iconbutton" onClick={()=>setCursor(addMonths(cursor,-1))}><ChevronLeft size={17}/></button><h2>{cursor.toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</h2><button className="iconbutton" onClick={()=>setCursor(addMonths(cursor,1))}><ChevronRight size={17}/></button></div>
   <div className="calendar-week">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=><span key={x}>{x}</span>)}</div>
   <div className="calendar-grid">{cells.map(d=>{const key=ymd(d),ev=visible.filter(x=>x.event_date===key);return <div key={key} className={"calendar-cell "+(d.getMonth()===cursor.getMonth()?"":"muted-month")+" "+(same(new Date(),key)?"today ":"")+(selectedDay===key?"selected":"")}>
    <button type="button" className="calendar-date-button" aria-label={"Pilih "+key} onClick={()=>{setSelectedDay(key);setDay(key);if(canWrite&&mode!=="users")openNew(key)}}><b>{d.getDate()}</b><span>{ev.length?ev.length+" agenda":""}</span></button>
    <div className="calendar-events">{ev.slice(0,3).map(x=><button type="button" className="calendar-event-chip" key={x.id} title={x.title} onClick={e=>{e.stopPropagation();setSelectedDay(key);if(manager||x.owner_user_id===userId)openEdit(x)}}>{x.start_time?x.start_time.slice(0,5)+" ":""}{x.title}</button>)}{ev.length>3&&<small>+{ev.length-3} lagi</small>}</div>
   </div>})}</div>
   <div className="calendar-selected-summary"><div><span>TANGGAL TERPILIH</span><strong>{new Date(selectedDay+"T00:00:00").toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</strong><small>{visible.filter(x=>x.event_date===selectedDay).length} agenda pada tanggal ini</small></div>{canWrite&&mode!=="users"&&<button className="button" onClick={()=>openNew(selectedDay)}><Plus size={15}/> Tambah Agenda</button>}</div>
  </section>}
  {mode!=="attendance"&&<section className="panel"><h2>Daftar Agenda</h2>{visible.map(x=><div className="entry agenda-entry" key={x.id}><div><strong>{x.title}</strong><small>{x.event_date}{x.start_time?" · "+x.start_time.slice(0,5):""}{x.end_time?"–"+x.end_time.slice(0,5):""} · {x.category}</small><small>{x.location&&<><MapPin size={11}/> {x.location} · </>}{x.notes||""}</small><small><Users size={11}/> {participants.filter(p=>p.event_id===x.id).length} pengguna terlibat</small></div>{(manager||x.owner_user_id===userId)&&<div className="flow"><button className="button secondary" onClick={()=>openEdit(x)}>Edit</button><button className="button danger" onClick={()=>void remove(x)}>Hapus</button></div>}</div>)}{!visible.length&&<div className="empty">Belum ada agenda pada periode ini.</div>}</section>}
  {mode==="attendance"&&<section className="panel"><div className="sectionhead"><div><h2>Kehadiran Agenda</h2><p className="muted">Agenda yang melibatkan akun Anda. Check-in memakai waktu server dan mencoba mengambil lokasi perangkat.</p></div><Clock3 size={20}/></div>
   {visible.map(x=>{const a=attendance.find(z=>z.event_id===x.id&&z.user_id===userId);return <div className="entry" key={x.id}><div><strong>{x.title}</strong><small>{x.event_date}{x.start_time?" · "+x.start_time.slice(0,5):""} · {x.location||"Lokasi belum ditentukan"}</small><small>Status: {a?.status||"Belum check-in"} {a?.check_in_at?"· Masuk "+new Date(a.check_in_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):""}</small></div><div className="flow"><button className="button" disabled={busy||!!a?.check_in_at} onClick={()=>void clock(x,"in")}>Check-in</button><button className="button secondary" disabled={busy||!a?.check_in_at||!!a?.check_out_at} onClick={()=>void clock(x,"out")}>Check-out</button></div></div>})}
   {!visible.length&&<div className="empty">Belum ada agenda yang membutuhkan kehadiran Anda.</div>}
  </section>}
  <DataEntryModal open={modal} onClose={()=>setModal(false)} title={editing?"Edit Agenda":"Tambah Agenda"} subtitle="Atur waktu, lokasi, jenis agenda, dan pengguna yang terlibat." wide>
   <div className="fields"><label className="field full">Nama agenda<input value={title} onChange={e=>setTitle(e.target.value)} autoFocus/></label><label className="field">Tanggal<input type="date" value={day} onChange={e=>{setDay(e.target.value);setSelectedDay(e.target.value)}}/></label><label className="field">Jenis<select value={scope} onChange={e=>setScope(e.target.value as "school"|"personal")}><option value="school">Agenda Sekolah</option><option value="personal">Agenda Pribadi</option></select></label><label className="field">Mulai<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label className="field">Selesai<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label><label className="field">Kategori<select value={category} onChange={e=>setCategory(e.target.value)}><option value="school">Sekolah</option><option value="teaching">Pembelajaran</option><option value="meeting">Rapat</option><option value="training">Pelatihan</option><option value="program">Program</option><option value="other">Lainnya</option><option value="personal">Pribadi</option></select></label><label className="field full">Lokasi<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Ruang rapat / kelas / aula / online"/></label><label className="field full">Keterangan<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4}/></label></div>
   {scope==="school"&&<div className="participant-picker"><b>Guru / staf yang terlibat</b><p className="muted">Pengguna terpilih akan melihat agenda ini dan dapat melakukan presensi agenda.</p><div className="check-grid">{people.filter(p=>p.user_id!==userId).map(p=><label key={p.user_id}><input type="checkbox" checked={selected.includes(p.user_id)} onChange={e=>setSelected(s=>e.target.checked?[...s,p.user_id]:s.filter(id=>id!==p.user_id))}/><span>{p.staff_name||p.email||p.user_id.slice(0,8)}</span></label>)}</div></div>}
   <div className="modal-actions"><button className="button secondary" onClick={()=>setModal(false)}>Batal</button><button className="button" disabled={busy||title.trim().length<3||!day} onClick={()=>void save()}>{busy?"Menyimpan…":"Simpan Agenda"}</button></div>
  </DataEntryModal>
  {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </>;
}
