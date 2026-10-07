"use client";

import {useEffect,useMemo,useState} from "react";
import {ArrowRight,BookOpen,CalendarDays,CheckCircle2,ClipboardCheck,Clock3,GraduationCap,ListChecks,RefreshCw,School2,Sparkles,Users,AlertCircle} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {readAllRows} from "@/lib/read-all-rows";
import {useSchoolRevision} from "@/lib/school-realtime";
import {errorMessage} from "@/lib/error-message";
import type {ModuleKey} from "@/lib/modules";
import "./teacher-dashboard.css";

type Assignment={id:string;class_id:string;subject_id:string|null;mode:string};
type ClassRow={id:string;name:string};
type Student={id:string;class_id:string|null;status:string};
type Mark={class_id:string;student_id:string;attendance_date:string;mark:string};
type Schedule={id:string;assignment_id:string;weekday:number;starts_at:string;ends_at:string;room:string|null};
type Subject={id:string;name:string};
type Task={id:string;title:string;status:string;due_at:string|null};
type Event={id:string;title:string;event_date:string;start_time:string|null};
type PersonalAttendance={status:string;check_in_at:string|null;check_out_at:string|null};
type Snapshot={
 name:string;assignments:Assignment[];classes:ClassRow[];students:Student[];marks:Mark[];
 schedules:Schedule[];subjects:Subject[];tasks:Task[];events:Event[];
 attendance:PersonalAttendance|null;teachingJournals:number;workJournals:number;
};

const schoolDate=(value:Date)=>{const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value);const read=(key:string)=>parts.find(p=>p.type===key)?.value||"";return read("year")+"-"+read("month")+"-"+read("day")};
const formatDate=(s:string)=>new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",day:"numeric",month:"short"}).format(new Date(s+"T12:00:00+07:00"));
const timeLabel=(s:string)=>s.slice(0,5);
const weekday=()=>{const days:Record<string,number>={Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6,Sunday:7};return days[new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Jakarta",weekday:"long"}).format(new Date())]||1};
const incomplete=(status:string)=>!["done","completed","verified"].includes(status);
const attendanceName=(status:string)=>({present:"Hadir",late:"Terlambat",sick:"Sakit",leave:"Izin",absent:"Tidak hadir"} as Record<string,string>)[status]||status;
const dayStart=(today:string,offset:number)=>{const d=new Date(today+"T12:00:00+07:00");d.setUTCDate(d.getUTCDate()+offset);return schoolDate(d)};

export default function TeacherDashboard({schoolId,userId,onRoute}:{schoolId:string;userId:string;onRoute?:(module:ModuleKey,feature?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]);
 const revision=useSchoolRevision(schoolId);
 const [reload,setReload]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[classId,setClassId]=useState("");
 const today=schoolDate(new Date()),weekStart=dayStart(today,-6),through=dayStart(today,14);

 useEffect(()=>{
  if(!db)return;
  let active=true;
  setLoading(true);setError("");
  (async()=>{
   try{
    // The teacher's dashboard only reads their assigned classes and personal records.
    const [a,me,ownAttendance,ownTasks,agenda,teaching,work]=await Promise.all([
     readAllRows(db.from("sc_teacher_assignments").select("id,class_id,subject_id,mode").eq("school_id",schoolId).eq("teacher_id",userId).order("id")),
     db.from("sc_staff").select("name").eq("school_id",schoolId).eq("user_id",userId).limit(1),
     db.from("sc_attendance").select("status,check_in_at,check_out_at").eq("school_id",schoolId).eq("user_id",userId).eq("duty_date",today).order("id",{ascending:false}).limit(1),
     readAllRows(db.from("sc_program_tasks").select("id,title,status,due_at").eq("school_id",schoolId).eq("pic_id",userId).is("archived_at",null).order("id")),
     readAllRows(db.from("sc_calendar_events").select("id,title,event_date,start_time").eq("school_id",schoolId).gte("event_date",today).lte("event_date",through).or("scope.eq.school,owner_user_id.eq."+userId).order("event_date").order("id")),
     db.from("sc_teacher_journals").select("id",{count:"exact",head:true}).eq("school_id",schoolId).eq("teacher_id",userId).eq("lesson_date",today),
     db.from("sc_work_journals").select("id",{count:"exact",head:true}).eq("school_id",schoolId).eq("author_id",userId).eq("journal_date",today).is("archived_at",null)
    ]);
    const first=[a,me,ownAttendance,ownTasks,agenda,teaching,work].find(x=>x.error);
    if(first?.error)throw first.error;
    const assignments=(a.data||[]) as Assignment[];
    const classIds=[...new Set(assignments.map(x=>x.class_id))];
    const assignmentIds=assignments.map(x=>x.id);
    const subjectIds=[...new Set(assignments.map(x=>x.subject_id).filter((id):id is string=>!!id))];
    let classes:ClassRow[]=[],students:Student[]=[],marks:Mark[]=[],schedules:Schedule[]=[],subjects:Subject[]=[];
    if(classIds.length){
     const [c,s,m,sc,su]=await Promise.all([
      readAllRows(db.from("sc_classes").select("id,name").eq("school_id",schoolId).in("id",classIds).order("name").order("id")),
      readAllRows(db.from("sc_students").select("id,class_id,status").eq("school_id",schoolId).in("class_id",classIds).order("id")),
      readAllRows(db.from("sc_student_attendance").select("class_id,student_id,attendance_date,mark").eq("school_id",schoolId).in("class_id",classIds).eq("lesson_key","Harian").gte("attendance_date",weekStart).lte("attendance_date",today).order("attendance_date").order("id")),
      readAllRows(db.from("sc_teacher_schedules").select("id,assignment_id,weekday,starts_at,ends_at,room").eq("school_id",schoolId).in("assignment_id",assignmentIds).eq("active",true).order("weekday").order("starts_at")),
      subjectIds.length?readAllRows(db.from("sc_subjects").select("id,name").eq("school_id",schoolId).in("id",subjectIds).order("name")):Promise.resolve({data:[] as Subject[],error:null})
     ]);
     const invalid=[c,s,m,sc,su].find(x=>x.error);
     if(invalid?.error)throw invalid.error;
     classes=(c.data||[]) as ClassRow[];
     students=(s.data||[]) as Student[];
     marks=(m.data||[]) as Mark[];
     schedules=(sc.data||[]) as Schedule[];
     subjects=(su.data||[]) as Subject[];
    }
    if(!active)return;
    setSnapshot({
     name:me.data?.[0]?.name?.trim()||"Guru",assignments,classes,students,marks,schedules,subjects,
     tasks:((ownTasks.data||[]) as Task[]).filter(t=>incomplete(t.status)),
     events:(agenda.data||[]) as Event[],
     attendance:(ownAttendance.data?.[0] as PersonalAttendance|undefined)||null,
     teachingJournals:teaching.count||0,workJournals:work.count||0
    });
    setClassId(prev=>classes.some(x=>x.id===prev)?prev:(classes[0]?.id||""));
   }catch(e){
    if(active){setSnapshot(null);setError(errorMessage(e))}
   }finally{if(active)setLoading(false)}
  })();
  return()=>{active=false};
 },[db,schoolId,userId,revision,reload,today,weekStart,through]);

 const classes=snapshot?.classes||[];
 const selected=classes.find(x=>x.id===classId)||classes[0];
 const roster=(snapshot?.students||[]).filter(s=>s.status==="active"&&s.class_id===selected?.id);
 const rosterIds=new Set(roster.map(x=>x.id));
 const todayMarks=(snapshot?.marks||[]).filter(x=>x.class_id===selected?.id&&x.attendance_date===today&&rosterIds.has(x.student_id));
 const marked=new Set(todayMarks.map(x=>x.student_id)).size;
 const present=new Set(todayMarks.filter(x=>x.mark==="present").map(x=>x.student_id)).size;
 const unmarked=Math.max(0,roster.length-marked);
 const allStudents=(snapshot?.students||[]).filter(s=>s.status==="active");
 const tasks=snapshot?.tasks||[];
 const overdue=tasks.filter(t=>t.due_at&&new Date(t.due_at).getTime()<Date.now()).length;
 const agenda=snapshot?.events||[];
 const todaysSchedule=(snapshot?.schedules||[]).filter(s=>s.weekday===weekday()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
 const getAssignment=(id:string)=>snapshot?.assignments.find(a=>a.id===id);
 const getClass=(id:string)=>classes.find(c=>c.id===id)?.name||"Kelas";
 const getSubject=(id:string|null|undefined)=>id?snapshot?.subjects.find(s=>s.id===id)?.name||"Mata pelajaran":"Wali kelas";
 const dates=Array.from({length:7},(_,i)=>dayStart(today,i-6));
 const weekdayShort=(date:string)=>new Intl.DateTimeFormat("id-ID",{weekday:"short",timeZone:"Asia/Jakarta"}).format(new Date(date+"T12:00:00+07:00"));
 const weekRows=dates.map(day=>{
  const studentIds=new Set(roster.map(s=>s.id));
  const rows=(snapshot?.marks||[]).filter(m=>m.class_id===selected?.id&&m.attendance_date===day&&studentIds.has(m.student_id));
  return {day,recorded:new Set(rows.map(x=>x.student_id)).size};
 });
 const navigate=(m:ModuleKey,f:string)=>onRoute?.(m,f);

 return <div className="teacher-home">
  <section className="teacher-home-hero">
   <div><span className="teacher-home-eyebrow"><GraduationCap size={15}/> BERANDA GURU</span>
    <h2>Selamat datang, {snapshot?.name||"Guru"}.</h2>
    <p>{new Date().toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta",weekday:"long",day:"numeric",month:"long",year:"numeric"})} · Fokus pada pekerjaan mengajar hari ini.</p>
   </div>
   <div className="teacher-home-hero-actions">
    <button className="teacher-home-primary" onClick={()=>navigate("buku_kerja","Presensi Siswa")}><ClipboardCheck size={18}/> Presensi siswa <ArrowRight size={16}/></button>
    <button className="teacher-home-refresh" onClick={()=>setReload(x=>x+1)} disabled={loading} aria-label="Muat ulang beranda guru"><RefreshCw size={17}/> Perbarui</button>
   </div>
  </section>
  {loading&&<div className="panel" role="status">Memuat data kelas, jadwal dan tugas Anda…</div>}
  {error&&<section className="panel" role="alert"><p className="teacher-home-error"><AlertCircle size={17}/> Data dashboard belum berhasil dimuat: {error}</p><button className="button secondary" onClick={()=>setReload(x=>x+1)}>Coba lagi</button></section>}
  {!loading&&snapshot&&<>
   <div className="teacher-home-stats" aria-label="Ringkasan guru">
    <button onClick={()=>navigate("buku_kerja","Jadwal Mingguan")}><School2 size={20}/><span>Kelas diampu</span><strong>{classes.length}</strong><small>Berdasarkan penugasan aktif</small></button>
    <button onClick={()=>navigate("buku_kerja","Presensi Siswa")}><Users size={20}/><span>Siswa di kelas diampu</span><strong>{allStudents.length}</strong><small>Data siswa aktif</small></button>
    <button onClick={()=>navigate("buku_kerja","Presensi Siswa")}><ClipboardCheck size={20}/><span>Presensi {selected?.name||"kelas"}</span><strong>{selected?(roster.length?marked+"/"+roster.length:"0 siswa"):"—"}</strong><small>{!selected?"Belum ada kelas ditugaskan":!roster.length?"Belum ada siswa aktif":unmarked?unmarked+" siswa belum dicatat":"Sudah tercatat lengkap"}</small></button>
    <button onClick={()=>navigate("command","Tugas")}><ListChecks size={20}/><span>Tugas untuk saya</span><strong>{tasks.length}</strong><small>{overdue?overdue+" melewati tenggat":"Tidak ada tugas terlambat"}</small></button>
   </div>
   {!classes.length&&<section className="panel teacher-home-empty"><School2 size={21}/><div><strong>Belum ada penugasan kelas untuk akun Anda.</strong><p>Kepala sekolah dapat menghubungkan akun guru dengan kelas dan mata pelajaran melalui Data Induk → Penugasan Guru atau pengaturan wali kelas. Presensi pribadi dan agenda tetap dapat digunakan.</p></div></section>}
   <section className="teacher-home-action-panel panel" aria-label="Akses cepat">
    <div className="sectionhead"><div><span className="teacher-home-eyebrow">LANGSUNG KERJAKAN</span><h2>Alur kerja guru</h2></div></div>
    <div className="teacher-home-actions">
     {([
      ["attendance","Presensi Saya","Check-in / check-out",Clock3],
      ["buku_kerja","Presensi Siswa","Absensi kelas",ClipboardCheck],
      ["buku_kerja","Jurnal Mengajar","Catat pembelajaran",BookOpen],
      ["buku_kerja","Lembar Nilai","Input penilaian",CheckCircle2],
      ["buku_kerja","Jadwal Mingguan","Jadwal dan kelas",CalendarDays],
      ["guru_ai","Proyek Pembelajaran","Perangkat ajar AI",Sparkles]
     ] as const).map(([module,feature,sub,Icon])=><button key={feature} onClick={()=>navigate(module,feature)}><Icon size={20}/><span><strong>{feature}</strong><small>{sub}</small></span><ArrowRight size={15}/></button>)}
    </div>
   </section>
   <div className="teacher-home-columns">
    <section className="panel"><div className="sectionhead"><div><span className="teacher-home-eyebrow">HARI INI</span><h2>Jadwal mengajar</h2></div><button className="teacher-home-link" onClick={()=>navigate("buku_kerja","Jadwal Mingguan")}>Lihat jadwal <ArrowRight size={14}/></button></div>
     <div className="teacher-home-list">{todaysSchedule.map(s=>{const a=getAssignment(s.assignment_id);return <div key={s.id} className="teacher-home-row"><time>{timeLabel(s.starts_at)}<small>{timeLabel(s.ends_at)}</small></time><div><strong>{a?getClass(a.class_id):"Kelas"}</strong><small>{getSubject(a?.subject_id)}{s.room?" · "+s.room:""}</small></div></div>})}
      {!todaysSchedule.length&&<p className="teacher-home-placeholder">Belum ada jadwal mengajar yang tercatat untuk hari ini. Atur melalui Jadwal Mingguan.</p>}</div>
    </section>
    <section className="panel"><div className="sectionhead"><div><span className="teacher-home-eyebrow">KEHADIRAN PRIBADI</span><h2>Presensi saya</h2></div><button className="teacher-home-link" onClick={()=>navigate("attendance","Presensi Saya")}>Buka <ArrowRight size={14}/></button></div>
     <div className="teacher-home-checkin"><Clock3 size={21}/><div><strong>{snapshot.attendance?attendanceName(snapshot.attendance.status):"Belum ada presensi hari ini"}</strong>
     <span>{snapshot.attendance?.check_in_at?"Masuk: "+new Date(snapshot.attendance.check_in_at).toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"})+" WIB":"Belum tercatat masuk"}</span>
     <span>{snapshot.attendance?.check_out_at?"Pulang: "+new Date(snapshot.attendance.check_out_at).toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"})+" WIB":"Belum tercatat pulang"}</span></div></div>
     <button className="button secondary teacher-home-wide" onClick={()=>navigate("attendance","Presensi Saya")}>Buka check-in / check-out <ArrowRight size={15}/></button>
    </section>
   </div>
   <div className="teacher-home-columns">
    <section className="panel"><div className="sectionhead"><div><span className="teacher-home-eyebrow">PRESENSI SISWA</span><h2>Kelengkapan absensi</h2></div><button className="teacher-home-link" onClick={()=>navigate("buku_kerja","Presensi Siswa")}>Kelola <ArrowRight size={14}/></button></div>
     {!!classes.length&&<label className="field teacher-home-class">Pilih kelas<select value={selected?.id||""} onChange={e=>setClassId(e.target.value)}>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
     {selected?<><div className="teacher-home-progress-head"><strong>{roster.length?Math.round(marked/roster.length*100)+"%":"—"}</strong><span>{marked} tercatat · {unmarked} belum dicatat · {present} hadir dari catatan</span></div>
      <div className="teacher-home-progress" role="progressbar" aria-label="Kelengkapan presensi siswa hari ini" aria-valuenow={marked} aria-valuemin={0} aria-valuemax={roster.length||1}><i style={{width:roster.length?marked/roster.length*100+"%":"0%"}}/></div>
      <p className="teacher-home-note">Belum dicatat tidak otomatis berarti alpa. Grafik mengukur kelengkapan input presensi harian.</p>
      <div className="teacher-home-week">{weekRows.map(r=><div key={r.day} title={r.day+": "+r.recorded+" dari "+roster.length+" tercatat"}><div className="teacher-home-bar"><i style={{height:roster.length?r.recorded/roster.length*100+"%":"0%"}}/></div><b>{weekdayShort(r.day)}</b><small>{r.recorded}/{roster.length}</small></div>)}</div>
     </>:<p className="teacher-home-placeholder">Pilih atau minta penugasan kelas terlebih dahulu.</p>}
    </section>
    <section className="panel"><div className="sectionhead"><div><span className="teacher-home-eyebrow">PEKERJAAN SAYA</span><h2>Jurnal dan prioritas</h2></div><button className="teacher-home-link" onClick={()=>navigate("journals","Jurnal Harian")}>Buka jurnal <ArrowRight size={14}/></button></div>
     <div className="teacher-home-journal"><BookOpen size={20}/><div><strong>{snapshot.teachingJournals} jurnal mengajar · {snapshot.workJournals} jurnal kegiatan</strong><small>Catatan milik Anda pada hari ini</small></div><button onClick={()=>navigate("buku_kerja","Jurnal Mengajar")}>Isi jurnal <ArrowRight size={14}/></button></div>
     <div className="teacher-home-list">{[...tasks].sort((a,b)=>(a.due_at||"9999").localeCompare(b.due_at||"9999")).slice(0,4).map(t=><button key={t.id} className="teacher-home-task" onClick={()=>navigate("command","Tugas")}><div><strong>{t.title}</strong><small>{t.due_at?"Tenggat "+new Date(t.due_at).toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta",day:"numeric",month:"short"}):"Belum ada tenggat"}</small></div><ArrowRight size={15}/></button>)}
     {!tasks.length&&<p className="teacher-home-placeholder">Tidak ada tugas aktif yang ditugaskan kepada Anda.</p>}</div>
    </section>
   </div>
   <section className="panel"><div className="sectionhead"><div><span className="teacher-home-eyebrow">AGENDA TERDEKAT</span><h2>Agenda sekolah dan pribadi</h2></div><button className="teacher-home-link" onClick={()=>navigate("calendar","Kalender Sekolah")}>Buka kalender <ArrowRight size={14}/></button></div>
    <div className="teacher-home-agenda">{agenda.slice(0,5).map(e=><button key={e.id} onClick={()=>navigate("calendar","Kalender Sekolah")}><time>{formatDate(e.event_date)}</time><span><strong>{e.title}</strong><small>{e.start_time?timeLabel(e.start_time)+" WIB":"Jam belum diatur"}</small></span><ArrowRight size={15}/></button>)}{!agenda.length&&<p className="teacher-home-placeholder">Belum ada agenda mendatang yang tercatat untuk Anda.</p>}</div>
   </section>
  </>}
 </div>;
}
