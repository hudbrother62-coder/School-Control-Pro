"use client";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import SearchableSelect from "@/components/SearchableSelect";
import {errorMessage} from "@/lib/error-message";
import {useEffect,useMemo,useState} from "react";
import {CalendarDays,ChevronLeft,ChevronRight,Clock3,Download,MapPin,Plus,Upload,Users} from "lucide-react";
import DataEntryModal from "@/components/DataEntryModal";
import SmartSelect from "@/components/SmartSelect";
import {browserDb} from "@/lib/supabase";
import {isAdmin,type Role} from "@/lib/modules";
import {downloadExcel,readExcel,type SheetRows} from "@/lib/excel";

type EventRow={id:string;title:string;event_date:string;category:string;notes:string|null;created_by:string;scope:string;start_time:string|null;end_time:string|null;location:string|null;owner_user_id:string|null;audience_type:string;audience_grade:string|null;audience_class_id:string|null;attendance_required:boolean;attendance_location_id:string|null;checkin_open_minutes:number;checkin_close_minutes:number};
type Participant={event_id:string;user_id:string};
type Attendance={event_id:string;user_id:string;check_in_at:string|null;check_out_at:string|null;status:string};
type Person={user_id:string;staff_name:string|null;email:string|null;role:string|null};
type SchoolClass={id:string;name:string;grade:string|null;academic_year:string};
type AttendanceLocation={id:string;name:string;address:string|null;radius_meters:number;latitude:number|null;longitude:number|null};
const pad=(n:number)=>String(n).padStart(2,"0");
const ymd=(d:Date)=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const monthStart=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),1);
const addMonths=(d:Date,n:number)=>new Date(d.getFullYear(),d.getMonth()+n,1);
const monthKey=(d:Date)=>d.getFullYear()+"-"+pad(d.getMonth()+1);
const same=(a:Date,b:string)=>ymd(a)===b;
const human=(s:string)=>new Date(s+"T00:00:00").toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

export default function SchoolCalendar({schoolId,userId,role,compact=false,focus}:{schoolId:string;userId:string;role:Role;compact?:boolean;focus?:string}){
 const db=useMemo(()=>browserDb(),[]),manager=isAdmin(role);
 const [cursor,setCursor]=useState(()=>monthStart(new Date())),[rows,setRows]=useState<EventRow[]>([]),[participants,setParticipants]=useState<Participant[]>([]),[attendance,setAttendance]=useState<Attendance[]>([]),[people,setPeople]=useState<Person[]>([]),[classes,setClasses]=useState<SchoolClass[]>([]),[locations,setLocations]=useState<AttendanceLocation[]>([]);
 const [targetUser,setTargetUser]=useState(userId),[modal,setModal]=useState(false),[editing,setEditing]=useState<EventRow|null>(null),[selectedDay,setSelectedDay]=useState(ymd(new Date()));
 const [title,setTitle]=useState(""),[day,setDay]=useState(ymd(new Date())),[start,setStart]=useState("07:00"),[end,setEnd]=useState(""),[category,setCategory]=useState("school"),[notes,setNotes]=useState(""),[location,setLocation]=useState(""),[scope,setScope]=useState<"school"|"personal">("school"),[selected,setSelected]=useState<string[]>([]);
 const [audienceType,setAudienceType]=useState("school"),[audienceGrade,setAudienceGrade]=useState(""),[audienceClass,setAudienceClass]=useState("");
 const [attendanceRequired,setAttendanceRequired]=useState(false),[attendanceLocation,setAttendanceLocation]=useState(""),[checkinOpen,setCheckinOpen]=useState(30),[checkinClose,setCheckinClose]=useState(60);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState(""),[importRows,setImportRows]=useState<SheetRows>([]),[importFile,setImportFile]=useState("");
 const focusText=(focus||"").toLowerCase();
 const mode=focusText.includes("pribadi")?"personal":focusText.includes("pengguna")?"users":focusText.includes("kehadiran")?"attendance":focusText.includes("rekap")?"recap":focusText.includes("mengajar")?"teaching":"school";
 const canWrite=role!=="viewer";

 useRealtimeRefresh(schoolId,()=>load());
 async function load(){
  if(!db)return;
  const from=ymd(new Date(cursor.getFullYear(),cursor.getMonth()-1,1)),to=ymd(new Date(cursor.getFullYear(),cursor.getMonth()+2,0));
  const [ev,cl,loc]=await Promise.all([
   db.from("sc_calendar_events").select("id,title,event_date,category,notes,created_by,scope,start_time,end_time,location,owner_user_id,audience_type,audience_grade,audience_class_id,attendance_required,attendance_location_id,checkin_open_minutes,checkin_close_minutes").eq("school_id",schoolId).gte("event_date",from).lte("event_date",to).order("event_date"),
   db.from("sc_classes").select("id,name,grade,academic_year").eq("school_id",schoolId).order("name"),
   db.from("sc_hr_locations").select("id,name,address,radius_meters,latitude,longitude").eq("school_id",schoolId).eq("active",true).order("name")
  ]);
  if(ev.error){setError(ev.error.message);return}
  const list=(ev.data||[]) as EventRow[];setRows(list);setClasses((cl.data||[]) as SchoolClass[]);setLocations((loc.data||[]) as AttendanceLocation[]);
  const ids=list.map(x=>x.id);
  if(ids.length){
   const [p,a]=await Promise.all([
    db.from("sc_calendar_participants").select("event_id,user_id").eq("school_id",schoolId).in("event_id",ids),
    db.from("sc_event_attendance").select("event_id,user_id,check_in_at,check_out_at,status").eq("school_id",schoolId).in("event_id",ids)
   ]);
   setParticipants((p.data||[]) as Participant[]);setAttendance((a.data||[]) as Attendance[]);
  }else{setParticipants([]);setAttendance([])}
  const staff=await db.from("sc_staff").select("user_id,name,position").eq("school_id",schoolId).not("user_id","is",null).order("name");
  setPeople((staff.data||[]).map(x=>({user_id:x.user_id as string,staff_name:x.name,email:null,role:x.position||null})));
  if(manager){const dir=await db.rpc("sc_team_directory",{p_school:schoolId});if(!dir.error&&dir.data)setPeople((dir.data as Person[]).map(x=>({...x,staff_name:x.staff_name||x.email||"Pengguna"})))}
 }
 useEffect(()=>{void load()},[db,schoolId,cursor,manager]);
 useEffect(()=>{if(!targetUser)setTargetUser(userId)},[userId,targetUser]);

 function resetForm(nextDay=ymd(new Date()),nextScope:"school"|"personal"=mode==="personal"?"personal":"school"){
  setEditing(null);setTitle("");setDay(nextDay);setStart("07:00");setEnd("");setCategory(nextScope==="personal"?"personal":mode==="teaching"?"teaching":"school");setNotes("");setLocation("");setScope(nextScope);setSelected([]);
  setAudienceType(nextScope==="personal"?"personal":"school");setAudienceGrade("");setAudienceClass("");setAttendanceRequired(false);setAttendanceLocation("");setCheckinOpen(30);setCheckinClose(60);
 }
 function openNew(nextDay?:string){const target=nextDay||selectedDay;setSelectedDay(target);resetForm(target,mode==="personal"?"personal":"school");setModal(true)}
 function openEdit(x:EventRow){setSelectedDay(x.event_date);setEditing(x);setTitle(x.title);setDay(x.event_date);setStart((x.start_time||"").slice(0,5)||"07:00");setEnd((x.end_time||"").slice(0,5));setCategory(x.category);setNotes(x.notes||"");setLocation(x.location||"");setScope(x.scope==="personal"?"personal":"school");setSelected(participants.filter(p=>p.event_id===x.id).map(p=>p.user_id));setAudienceType(x.audience_type||x.scope||"school");setAudienceGrade(x.audience_grade||"");setAudienceClass(x.audience_class_id||"");setAttendanceRequired(!!x.attendance_required);setAttendanceLocation(x.attendance_location_id||"");setCheckinOpen(x.checkin_open_minutes??30);setCheckinClose(x.checkin_close_minutes??60);setModal(true)}
 async function run(fn:()=>Promise<void>){setBusy(true);setError("");setOk("");try{await fn();await load()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 async function save(){if(!db)return;await run(async()=>{const {error}=await db.rpc("sc_save_calendar_event_v3",{p_school:schoolId,p_event:editing?.id||null,p_title:title.trim(),p_date:day,p_start:start||null,p_end:end||null,p_category:category,p_notes:notes,p_location:location,p_scope:scope,p_participants:scope==="school"?selected:[],p_audience_type:scope==="personal"?"personal":audienceType,p_audience_grade:audienceType==="grade"?audienceGrade:null,p_audience_class:audienceType==="class"?audienceClass||null:null,p_attendance_required:scope==="school"&&attendanceRequired,p_attendance_location:scope==="school"&&attendanceRequired&&attendanceLocation?attendanceLocation:null,p_checkin_open_minutes:checkinOpen,p_checkin_close_minutes:checkinClose});if(error)throw error;setModal(false);setOk(editing?"Agenda diperbarui.":"Agenda ditambahkan.")})}
 async function remove(x:EventRow){if(!db||!confirm("Hapus agenda ini?"))return;await run(async()=>{const {error}=await db.rpc("sc_delete_calendar_event",{p_school:schoolId,p_event:x.id});if(error)throw error;setOk("Agenda dihapus.")})}
 function position():Promise<{lat:number|null;lng:number|null;accuracy:number|null}>{return new Promise(resolve=>{if(!navigator.geolocation){resolve({lat:null,lng:null,accuracy:null});return}navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),()=>resolve({lat:null,lng:null,accuracy:null}),{enableHighAccuracy:true,timeout:7000,maximumAge:30000})})}
 async function clock(x:EventRow,action:"in"|"out"){if(!db)return;await run(async()=>{const p=await position();const fn=action==="in"?"sc_event_check_in":"sc_event_check_out";const {error}=await db.rpc(fn,{p_school:schoolId,p_event:x.id,p_lat:p.lat,p_lng:p.lng,p_accuracy:p.accuracy});if(error)throw error;setOk(action==="in"?"Kehadiran agenda tercatat.":"Check-out agenda tercatat.")})}
 async function agendaTemplate(){await downloadExcel("template-agenda-sekolah.xlsx",[
  {name:"AGENDA",rows:[{Judul:"Rapat Koordinasi",Tanggal:ymd(new Date()),Jam_Mulai:"08:00",Jam_Selesai:"09:30",Kategori:"meeting",Sasaran:"school",Tingkat:"",Kelas:"",Lokasi_Agenda:"Ruang Rapat",Wajib_Presensi:"ya",Lokasi_Presensi:"Kampus Utama",Buka_Checkin_Menit:30,Tutup_Checkin_Menit:60,Keterangan:"Hapus baris contoh sebelum import"}]},
  {name:"Panduan",rows:[
   {Kolom:"Kategori",Ketentuan:"school, teaching, meeting, training, program, other"},
   {Kolom:"Sasaran",Ketentuan:"school, grade, class. Agenda pengguna tertentu dibuat lewat form agar akun peserta tidak salah."},
   {Kolom:"Tingkat/Kelas",Ketentuan:"Wajib bila Sasaran grade/class; nama kelas harus sama dengan Data Induk."},
   {Kolom:"Presensi",Ketentuan:"Wajib_Presensi ya/tidak. Lokasi_Presensi harus sama dengan Lokasi Presensi aktif; kosongkan untuk validasi waktu saja."}
  ]}
 ])}
 async function readAgendaImport(file?:File){if(!file)return;setError("");try{if(file.size>8_000_000)throw Error("File maksimal 8 MB.");const rr=await readExcel(file);if(rr.length>2000)throw Error("Maksimal 2.000 agenda per import.");setImportRows(rr);setImportFile(file.name);setOk(file.name+" siap diimport · "+rr.length+" baris.")}catch(e){setError(errorMessage(e));setImportRows([]);setImportFile("")}}
 async function commitAgendaImport(){if(!db||!canWrite||!importRows.length)return;await run(async()=>{let imported=0,skipped=0;for(const raw of importRows){
  const t=String(raw.Judul||raw.Agenda||"").trim(),d=String(raw.Tanggal||"").slice(0,10),s=String(raw.Jam_Mulai||"").trim(),en=String(raw.Jam_Selesai||"").trim(),cat=String(raw.Kategori||"school").trim().toLowerCase(),aud=String(raw.Sasaran||"school").trim().toLowerCase(),grade=String(raw.Tingkat||"").trim(),classText=String(raw.Kelas||"").trim(),locText=String(raw.Lokasi_Agenda||"").trim(),att=["ya","yes","true","1"].includes(String(raw.Wajib_Presensi||"").trim().toLowerCase()),attLocText=String(raw.Lokasi_Presensi||"").trim(),open=Number(raw.Buka_Checkin_Menit??30),close=Number(raw.Tutup_Checkin_Menit??60);
  const klass=aud==="class"?classes.find(x=>x.name.trim().toLowerCase()===classText.toLowerCase()):undefined,attLoc=attLocText?locations.find(x=>x.name.trim().toLowerCase()===attLocText.toLowerCase()):undefined;
  const validTime=(v:string)=>!v||/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  if(t.length<3||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!validTime(s)||!validTime(en)||(s&&en&&en<s)||!["school","teaching","meeting","training","program","other"].includes(cat)||!["school","grade","class"].includes(aud)||(aud==="grade"&&!grade)||(aud==="class"&&!klass)||(att&&!s)||(attLocText&&!attLoc)||!Number.isInteger(open)||open<0||open>720||!Number.isInteger(close)||close<0||close>1440){skipped++;continue}
  const {error:e}=await db.rpc("sc_save_calendar_event_v3",{p_school:schoolId,p_event:null,p_title:t,p_date:d,p_start:s||null,p_end:en||null,p_category:cat,p_notes:String(raw.Keterangan||raw.Catatan||"").trim(),p_location:locText,p_scope:"school",p_participants:[],p_audience_type:aud,p_audience_grade:aud==="grade"?grade:null,p_audience_class:aud==="class"?klass?.id||null:null,p_attendance_required:att,p_attendance_location:att&&attLoc?attLoc.id:null,p_checkin_open_minutes:open,p_checkin_close_minutes:close});if(e){skipped++;continue}imported++;
 }
 await db.from("sc_import_history").insert({school_id:schoolId,module_key:"calendar",import_kind:"school_agenda",file_name:importFile||"import.xlsx",row_count:importRows.length,imported_count:imported,skipped_count:skipped,details:{target:"sc_calendar_events"}});
 setImportRows([]);setImportFile("");setOk("Import agenda selesai: "+imported+" masuk, "+skipped+" dilewati karena format/master data tidak cocok.")})}
 async function exportAgenda(){await downloadExcel("agenda-sekolah-"+monthKey(cursor)+".xlsx",[{name:"AGENDA",rows:currentMonth.map(x=>({Judul:x.title,Tanggal:x.event_date,Jam_Mulai:(x.start_time||"").slice(0,5),Jam_Selesai:(x.end_time||"").slice(0,5),Kategori:x.category,Sasaran:x.audience_type,Tingkat:x.audience_grade||"",Kelas:className(x.audience_class_id),Lokasi_Agenda:x.location||"",Wajib_Presensi:x.attendance_required?"ya":"tidak",Lokasi_Presensi:locations.find(l=>l.id===x.attendance_location_id)?.name||"",Buka_Checkin_Menit:x.checkin_open_minutes,Tutup_Checkin_Menit:x.checkin_close_minutes,Keterangan:x.notes||""}))}])}

 const ownedBy=(x:EventRow,uid:string)=>x.owner_user_id===uid||x.audience_type==="school"||participants.some(p=>p.event_id===x.id&&p.user_id===uid);
 const visible=rows.filter(x=>mode==="teaching"?x.category==="teaching"&&(manager||x.owner_user_id===userId||participants.some(p=>p.event_id===x.id&&p.user_id===userId)):mode==="personal"?x.owner_user_id===userId:mode==="users"?ownedBy(x,targetUser):mode==="attendance"?ownedBy(x,userId):x.scope==="school");
 const selectedRows=visible.filter(x=>x.event_date===selectedDay);
 const currentMonth=visible.filter(x=>x.event_date.startsWith(monthKey(cursor)));
 const levels=[...new Set(classes.map(c=>c.grade).filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b,"id",{numeric:true}));
 const className=(id:string|null)=>classes.find(c=>c.id===id)?.name||"";
 const groupOf=(x:EventRow)=>{
  if(x.scope==="personal"||x.audience_type==="personal")return "Pribadi";
  if(x.audience_type==="grade")return x.audience_grade||"Tingkat Lain";
  if(x.audience_type==="class"){const c=classes.find(k=>k.id===x.audience_class_id);return c?.grade||c?.name||"Kelas Lain";}
  if(x.audience_type==="users")return "Pengguna Terpilih";
  return "Umum Sekolah";
 };
 const groups=[...new Set(currentMonth.map(groupOf))];
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
 const nextMonthStart=addMonths(monthStart(new Date()),1),nextMonthEnd=new Date(nextMonthStart.getFullYear(),nextMonthStart.getMonth()+1,0);
 const tomorrowRows=rows.filter(x=>x.scope==="school"&&same(tomorrow,x.event_date)),nextMonthRows=rows.filter(x=>{const d=new Date(x.event_date+"T00:00:00");return x.scope==="school"&&d>=nextMonthStart&&d<=nextMonthEnd});
 if(compact)return <section className="panel"><div className="sectionhead"><div><h2>Agenda Terdekat</h2><p className="muted">Agenda sekolah yang akan datang.</p></div></div><div className="grid"><div className="card"><label>Besok</label><strong>{tomorrowRows.length}</strong><small>{tomorrowRows.slice(0,2).map(x=>x.title).join(" · ")||"Tidak ada agenda"}</small></div><div className="card"><label>Bulan depan</label><strong>{nextMonthRows.length}</strong><small>{nextMonthRows.slice(0,2).map(x=>x.title).join(" · ")||"Belum ada agenda"}</small></div></div></section>;

 const first=monthStart(cursor),offset=(first.getDay()+6)%7,cells=Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),i-offset+1));
 const canEditSelected=!editing||manager||editing.owner_user_id===userId;
 const audienceOptions=[{value:"school",label:"Seluruh sekolah",subtitle:"Agenda umum untuk semua tingkat"},{value:"grade",label:"Tingkat / jenjang tertentu",subtitle:"Rekap dipisah per tingkat"},{value:"class",label:"Kelas tertentu",subtitle:"Hanya satu kelas"},{value:"users",label:"Pengguna tertentu",subtitle:"Pilih guru / staf yang terlibat"}];
 return <>
  {mode!=="attendance"&&canWrite&&mode!=="users"&&<section className="panel excel-toolbar"><h2>Import, Template & Agenda</h2>{canWrite&&<div className="flow"><button className="button secondary" onClick={()=>void agendaTemplate()}><Download size={14}/> Template Excel</button><label className="button secondary"><Upload size={14}/> Import Excel<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>void readAgendaImport(e.target.files?.[0])}/></label><button className="button secondary" onClick={()=>void exportAgenda()}><Download size={14}/> Export Bulan</button><button className="button" onClick={()=>openNew(selectedDay)}><Plus size={15}/> Tambah Agenda</button></div>}{importRows.length>0&&<div className="banner"><strong>{importFile} · {importRows.length} baris siap</strong><div className="flow" style={{marginTop:8}}><button className="button" disabled={busy} onClick={()=>void commitAgendaImport()}>Proses Import</button><button className="button secondary" onClick={()=>{setImportRows([]);setImportFile("")}}>Batal</button></div></div>}</section>}
  {mode==="users"&&manager&&<section className="panel page-control"><div><h2>Agenda Pengguna</h2><p className="muted">Pilih guru/staf untuk melihat agenda yang melibatkannya.</p></div><label className="field">Pengguna<SearchableSelect label="Pengguna" value={targetUser} onChange={e=>setTargetUser(e.target.value)}><option value={userId}>Saya</option>{people.filter(p=>p.user_id!==userId).map(p=><option key={p.user_id} value={p.user_id}>{p.staff_name||p.email||p.user_id.slice(0,8)}</option>)}</SearchableSelect></label></section>}

  {mode!=="attendance"&&<div className="agenda-layout">
   <section className="panel mini-calendar-panel">
    <div className="calendar-head"><button className="iconbutton" onClick={()=>setCursor(addMonths(cursor,-1))} aria-label="Bulan sebelumnya"><ChevronLeft size={17}/></button><h2>{cursor.toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</h2><button className="iconbutton" onClick={()=>setCursor(addMonths(cursor,1))} aria-label="Bulan berikutnya"><ChevronRight size={17}/></button></div>
    <div className="calendar-week">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=><span key={x}>{x}</span>)}</div>
    <div className="agenda-mini-grid">{cells.map(d=>{const key=ymd(d),count=visible.filter(x=>x.event_date===key).length;return <button type="button" key={key} className={(d.getMonth()===cursor.getMonth()?"":"outside ") +(same(new Date(),key)?"today ":"")+(selectedDay===key?"selected":"")} onClick={()=>{setSelectedDay(key);setDay(key)}}>
      <b>{d.getDate()}</b>{count>0&&<i aria-label={count+" agenda"} title={count+" agenda"}/>}
     </button>})}</div>
    <div className="agenda-calendar-legend"><span><i/> Ada agenda</span><span>Tanggal tanpa tanda = kosong</span></div>
    <label className="field">Pilih bulan<input type="month" value={monthKey(cursor)} onChange={e=>{const [y,m]=e.target.value.split("-").map(Number);setCursor(new Date(y,m-1,1))}}/></label>
   </section>

   <div className="agenda-workspace">
    {mode!=="recap"&&<section className="panel">
     <div className="sectionhead"><div><span className="eyebrow">AGENDA HARI TERPILIH</span><h2>{human(selectedDay)}</h2><p className="muted">{selectedRows.length?selectedRows.length+" agenda pada tanggal ini.":"Belum ada agenda pada tanggal ini."}</p></div></div>
     <div className="agenda-day-list">{selectedRows.map(x=><article className="agenda-card" key={x.id} onClick={()=>openEdit(x)}><div className="agenda-time"><b>{x.start_time?x.start_time.slice(0,5):"—"}</b><small>{x.end_time?x.end_time.slice(0,5):""}</small></div><div><strong>{x.title}</strong><small>{groupOf(x)} · {x.category}</small>{x.location&&<small><MapPin size={11}/> {x.location}</small>}{x.attendance_required&&<small><Clock3 size={11}/> Presensi agenda aktif</small>}</div><span className="pill">{participants.filter(p=>p.event_id===x.id).length} peserta</span></article>)}{!selectedRows.length&&<div className="empty">Tanggal ini masih kosong. Tidak ada tanda pada kalender sampai agenda ditambahkan.</div>}</div>
    </section>}

    <section className="panel agenda-recap">
     <div className="sectionhead"><div><span className="eyebrow">REKAP BULANAN</span><h2>Rekap Agenda · {cursor.toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</h2><p className="muted">Agenda tidak digabung menjadi satu. Setiap tingkat/kelompok tampil pada bagian terpisah.</p></div><CalendarDays size={20}/></div>
     {groups.map(group=><div className="agenda-grade-group" key={group}><div className="agenda-grade-head"><strong>{group}</strong><span>{currentMonth.filter(x=>groupOf(x)===group).length} agenda</span></div>{currentMonth.filter(x=>groupOf(x)===group).sort((a,b)=>a.event_date.localeCompare(b.event_date)||(a.start_time||"").localeCompare(b.start_time||"")).map(x=><div className="agenda-recap-row" key={x.id}><time><b>{new Date(x.event_date+"T00:00:00").getDate()}</b><small>{new Date(x.event_date+"T00:00:00").toLocaleDateString("id-ID",{month:"short"})}</small></time><div><strong>{x.title}</strong><small>{x.start_time?x.start_time.slice(0,5):"Tanpa jam"}{x.location?" · "+x.location:""}{x.audience_type==="class"&&x.audience_class_id?" · "+className(x.audience_class_id):""}</small></div><span className="pill">{x.category}</span></div>)}</div>)}
     {!groups.length&&<div className="empty">Belum ada agenda pada bulan ini.</div>}
    </section>
   </div>
  </div>}

  {mode==="attendance"&&<section className="panel"><div className="sectionhead"><div><h2>Kehadiran Agenda</h2><p className="muted">Check-in hanya diterima pada jendela waktu agenda. Jika lokasi presensi ditetapkan, GPS juga wajib berada di dalam radius.</p></div><Clock3 size={20}/></div>
   {visible.map(x=>{const a=attendance.find(z=>z.event_id===x.id&&z.user_id===userId);return <div className="entry" key={x.id}><div><strong>{x.title}</strong><small>{x.event_date}{x.start_time?" · "+x.start_time.slice(0,5):""} · {x.location||"Lokasi belum ditentukan"}</small><small>Status: {a?.status||"Belum check-in"} {a?.check_in_at?"· Masuk "+new Date(a.check_in_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):""}</small></div><div className="flow"><button className="button" disabled={busy||!!a?.check_in_at} onClick={()=>void clock(x,"in")}>Check-in</button><button className="button secondary" disabled={busy||!a?.check_in_at||!!a?.check_out_at} onClick={()=>void clock(x,"out")}>Check-out</button></div></div>})}
   {!visible.length&&<div className="empty">Belum ada agenda yang membutuhkan kehadiran Anda.</div>}
  </section>}

  <DataEntryModal open={modal} onClose={()=>setModal(false)} title={editing?(canEditSelected?"Edit Agenda":"Detail Agenda"):"Tambah Agenda"} subtitle={editing&&!canEditSelected?"Agenda ini dapat dilihat, tetapi hanya pembuat atau manajemen yang dapat mengubahnya.":"Atur sasaran, waktu, lokasi, dan pengguna yang terlibat."} wide>
   <div className="fields">
    <label className="field full">Nama agenda<input value={title} onChange={e=>setTitle(e.target.value)} autoFocus disabled={!canEditSelected}/></label>
    <label className="field">Tanggal<input type="date" value={day} onChange={e=>{setDay(e.target.value);setSelectedDay(e.target.value)}} disabled={!canEditSelected}/></label>
    <label className="field">Jenis<SearchableSelect label="Jenis" value={scope} onChange={e=>{const v=e.target.value as "school"|"personal";setScope(v);if(v==="personal")setAudienceType("personal")}} disabled={!canEditSelected}><option value="school">Agenda Sekolah</option><option value="personal">Agenda Pribadi</option></SearchableSelect></label>
    <label className="field">Mulai<input type="time" value={start} onChange={e=>setStart(e.target.value)} disabled={!canEditSelected}/></label>
    <label className="field">Selesai<input type="time" value={end} onChange={e=>setEnd(e.target.value)} disabled={!canEditSelected}/></label>
    <label className="field">Kategori<SearchableSelect label="Kategori" value={category} onChange={e=>setCategory(e.target.value)} disabled={!canEditSelected}><option value="school">Sekolah</option><option value="teaching">Pembelajaran</option><option value="meeting">Rapat</option><option value="training">Pelatihan</option><option value="program">Program</option><option value="other">Lainnya</option><option value="personal">Pribadi</option></SearchableSelect></label>
    {scope==="school"&&<div className="field full"><SmartSelect label="Sasaran agenda" value={audienceType} options={audienceOptions} onChange={v=>{setAudienceType(v);setAudienceGrade("");setAudienceClass("")}} disabled={!canEditSelected}/></div>}
    {scope==="school"&&audienceType==="grade"&&<div className="field full"><SmartSelect label="Tingkat / jenjang" value={audienceGrade} options={levels.map(x=>({value:x,label:x}))} onChange={setAudienceGrade} allowCustom customLabel="Gunakan tingkat ini" disabled={!canEditSelected}/></div>}
    {scope==="school"&&audienceType==="class"&&<div className="field full"><SmartSelect label="Kelas sasaran" value={audienceClass} options={classes.map(x=>({value:x.id,label:x.name,subtitle:x.grade||x.academic_year}))} onChange={setAudienceClass} disabled={!canEditSelected}/></div>}
    <label className="field full">Lokasi agenda<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Ruang rapat / kelas / aula / online" disabled={!canEditSelected}/></label>
    {scope==="school"&&<label className="field full"><span>Presensi guru/staf pada agenda</span><span className="flow"><input type="checkbox" checked={attendanceRequired} onChange={e=>setAttendanceRequired(e.target.checked)} disabled={!canEditSelected}/> Wajib check-in sesuai jam dan lokasi</span></label>}
    {scope==="school"&&attendanceRequired&&<>
     <label className="field full">Titik lokasi presensi<SearchableSelect label="Titik lokasi presensi" value={attendanceLocation} onChange={e=>setAttendanceLocation(e.target.value)} disabled={!canEditSelected}><option value="">Tanpa geofence (validasi waktu saja)</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name} · radius {l.radius_meters} m</option>)}</SearchableSelect><small className="hint">Titik dan radius diatur pada SDM & Payroll → Lokasi Kerja.</small></label>
     <label className="field">Buka check-in (menit sebelum mulai)<input type="number" min={0} max={720} value={checkinOpen} onChange={e=>setCheckinOpen(Math.max(0,Number(e.target.value)||0))} disabled={!canEditSelected}/></label>
     <label className="field">Tutup check-in (menit setelah mulai)<input type="number" min={0} max={1440} value={checkinClose} onChange={e=>setCheckinClose(Math.max(0,Number(e.target.value)||0))} disabled={!canEditSelected}/></label>
    </>}
    <label className="field full">Keterangan<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} disabled={!canEditSelected}/></label>
   </div>
   {scope==="school"&&(audienceType==="users"||selected.length>0)&&<div className="participant-picker"><b>Guru / staf yang terlibat</b><p className="muted">Boleh dipakai juga untuk menambahkan PIC/peserta pada agenda tingkat atau kelas.</p><div className="check-grid">{people.filter(p=>p.user_id!==userId).map(p=><label key={p.user_id}><input type="checkbox" checked={selected.includes(p.user_id)} disabled={!canEditSelected} onChange={e=>setSelected(s=>e.target.checked?[...s,p.user_id]:s.filter(id=>id!==p.user_id))}/><span>{p.staff_name||p.email||p.user_id.slice(0,8)}</span></label>)}</div></div>}
   {scope==="school"&&audienceType!=="users"&&canEditSelected&&<details className="optional-participants"><summary>Tambahkan guru/staf tertentu (opsional)</summary><div className="check-grid">{people.filter(p=>p.user_id!==userId).map(p=><label key={p.user_id}><input type="checkbox" checked={selected.includes(p.user_id)} onChange={e=>setSelected(s=>e.target.checked?[...s,p.user_id]:s.filter(id=>id!==p.user_id))}/><span>{p.staff_name||p.email||p.user_id.slice(0,8)}</span></label>)}</div></details>}
   <div className="modal-actions"><button className="button secondary" onClick={()=>setModal(false)}>{canEditSelected?"Batal":"Tutup"}</button>{editing&&canEditSelected&&<button className="button danger" onClick={()=>void remove(editing)}>Hapus</button>}{canEditSelected&&<button className="button" disabled={busy||title.trim().length<3||!day||(scope==="school"&&audienceType==="grade"&&!audienceGrade)||(scope==="school"&&audienceType==="class"&&!audienceClass)||(attendanceRequired&&!start)} onClick={()=>void save()}>{busy?"Menyimpan…":"Simpan Agenda"}</button>}</div>
  </DataEntryModal>
  {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </>;
}
