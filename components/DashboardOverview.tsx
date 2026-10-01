"use client";
import {useEffect,useMemo,useState} from "react";
import {AlertTriangle,ArrowRight,BarChart3,BookOpen,CalendarDays,CheckCircle2,Clock3,GraduationCap,ListChecks,Sparkles,Users,WalletCards} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {canAccess,modules,ROLE_LABELS,type ModuleKey,type Role} from "@/lib/modules";

type Student={id:string;class_id:string|null;status:string};
type ClassRow={id:string;name:string};
type Attendance={duty_date:string;status:string};
type EventRow={id:string;title:string;event_date:string;start_time:string|null};
type Task={id:string;title:string;status:string;due_at:string|null};
type Staff={id:string};
type RouteAction={label:string;caption:string;module:ModuleKey;feature:string;icon:typeof Users};

const dayKey=(d:Date)=>d.toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});

export default function DashboardOverview({schoolId,userId,role,focus,onRoute}:{schoolId:string;userId:string;role:Role;focus?:string;onRoute?:(module:ModuleKey,feature?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]);
 const [students,setStudents]=useState<Student[]>([]),[classes,setClasses]=useState<ClassRow[]>([]),[staff,setStaff]=useState<Staff[]>([]);
 const [attendance,setAttendance]=useState<Attendance[]>([]),[events,setEvents]=useState<EventRow[]>([]),[tasks,setTasks]=useState<Task[]>([]),[error,setError]=useState("");
 const mode=(focus||"Ringkasan Operasional").toLowerCase();
 useEffect(()=>{if(!db)return;let live=true;(async()=>{
  const today=new Date(),start=new Date(today);start.setDate(today.getDate()-6);
  const until=new Date(today);until.setDate(today.getDate()+31);
  const r=await Promise.all([
   db.from("sc_students").select("id,class_id,status").eq("school_id",schoolId),
   db.from("sc_classes").select("id,name").eq("school_id",schoolId).order("name"),
   db.from("sc_staff").select("id").eq("school_id",schoolId),
   db.from("sc_attendance").select("duty_date,status").eq("school_id",schoolId).gte("duty_date",dayKey(start)).lte("duty_date",dayKey(today)),
   db.from("sc_calendar_events").select("id,title,event_date,start_time").eq("school_id",schoolId).gte("event_date",dayKey(today)).lte("event_date",dayKey(until)).order("event_date").limit(12),
   db.from("sc_program_tasks").select("id,title,status,due_at").eq("school_id",schoolId).neq("status","done").order("due_at",{ascending:true}).limit(12)
  ]);
  if(!live)return;
  setStudents((r[0].data||[]) as Student[]);setClasses((r[1].data||[]) as ClassRow[]);setStaff((r[2].data||[]) as Staff[]);
  setAttendance((r[3].data||[]) as Attendance[]);setEvents((r[4].data||[]) as EventRow[]);setTasks((r[5].data||[]) as Task[]);
  const first=r.find(x=>x.error);if(first?.error)setError(first.error.message);
 })();return()=>{live=false}},[db,schoolId]);

 const activeStudents=students.filter(x=>x.status==="active");
 const today=dayKey(new Date());
 const todayAttendance=attendance.filter(x=>x.duty_date===today);
 const presentToday=todayAttendance.filter(x=>["present","late"].includes(x.status)).length;
 const attendanceRate=staff.length?Math.round(presentToday/staff.length*100):0;
 const week=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const key=dayKey(d);const rows=attendance.filter(x=>x.duty_date===key);return {key,label:d.toLocaleDateString("id-ID",{weekday:"short"}),present:rows.filter(x=>["present","late"].includes(x.status)).length,late:rows.filter(x=>x.status==="late").length}});
 const maxAttend=Math.max(1,staff.length,...week.map(x=>x.present));
 const openTasks=tasks.filter(x=>!["done","completed","verified"].includes(x.status));
 const overdue=openTasks.filter(x=>x.due_at&&new Date(x.due_at).getTime()<Date.now()).length;
 const upcomingToday=events.filter(x=>x.event_date===today);
 const attentionCount=overdue+(staff.length-presentToday>0?1:0);
 const taskStatus=[
  {label:"Belum mulai",count:tasks.filter(x=>["todo","pending","open","planned"].includes(x.status)).length},
  {label:"Berjalan",count:tasks.filter(x=>["in_progress","progress","active","doing"].includes(x.status)).length},
  {label:"Terlambat",count:overdue}
 ];
 const maxTask=Math.max(1,...taskStatus.map(x=>x.count));
 const showSummary=!focus||mode.includes("ringkasan"),showAnalytics=!focus||mode.includes("analitik"),showAgenda=!focus||mode.includes("agenda")||mode.includes("deadline");
 const actionCatalog:RouteAction[]=[
  {label:"Data Siswa",caption:"Kelola siswa, kelas, guru dan import Excel",module:"master",feature:"Siswa",icon:Users},
  {label:"Presensi Siswa",caption:"Absensi harian, riwayat dan rekap kelas",module:"buku_kerja",feature:"Presensi Siswa",icon:GraduationCap},
  {label:"Agenda Sekolah",caption:"Kalender, indikator agenda dan rekap bulanan",module:"calendar",feature:"Kalender Sekolah",icon:CalendarDays},
  {label:"Perangkat Ajar AI",caption:"Proyek, modul ajar, asesmen dan bahan ajar",module:"guru_ai",feature:"Proyek Pembelajaran",icon:Sparkles},
  {label:"Program Kerja",caption:"PIC, tugas, deadline, bukti dan laporan",module:"command",feature:"Program Kerja",icon:ListChecks},
  {label:"Pusat Laporan",caption:"Laporan standar sekolah Indonesia dan arsip",module:"reports",feature:"Ringkasan Laporan",icon:BookOpen},
  {label:"Keuangan",caption:"Kas, anggaran, tagihan dan laporan resmi",module:"sikas",feature:"Dashboard Keuangan",icon:WalletCards}
 ];\n const actions=actionCatalog.filter(a=>{const m=modules.find(x=>x.key===a.module);return !!m&&canAccess(m,role)});

 return <>
  {showSummary&&<>
   <section className="command-hero">
    <div>
     <span className="eyebrow">COMMAND CENTER SEKOLAH</span>
     <h2>Kondisi sekolah hari ini</h2>
     <p>{new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · {ROLE_LABELS[role]}</p>
    </div>
    <div className="command-hero-status">
     <span className={attentionCount?"status-dot attention":"status-dot ok"}>{attentionCount?<AlertTriangle size={14}/>:<CheckCircle2 size={14}/>} {attentionCount?attentionCount+" perhatian":"Operasional normal"}</span>
     <span className="status-dot"><CalendarDays size={14}/> {upcomingToday.length} agenda hari ini</span>
    </div>
   </section>

   <div className="grid dashboard-kpis dashboard-kpis-pro">
    <button className="metric-card" onClick={()=>onRoute?.("master","Siswa")}><span><Users size={17}/> Siswa aktif</span><strong>{activeStudents.length}</strong><small>{classes.length} kelas aktif</small></button>
    <button className="metric-card" onClick={()=>onRoute?.("attendance","Riwayat kehadiran")}><span><Clock3 size={17}/> Kehadiran SDM</span><strong>{attendanceRate}%</strong><small>{presentToday} dari {staff.length||0} tercatat hari ini</small></button>
    <button className="metric-card" onClick={()=>onRoute?.("command","Deadline")}><span><ListChecks size={17}/> Tugas aktif</span><strong>{openTasks.length}</strong><small>{overdue} melewati tenggat</small></button>
    <button className="metric-card" onClick={()=>onRoute?.("calendar","Kalender Sekolah")}><span><CalendarDays size={17}/> Agenda 31 hari</span><strong>{events.length}</strong><small>{upcomingToday.length} berlangsung hari ini</small></button>
   </div>

   <section className="panel quick-launch">
    <div className="sectionhead"><div><span className="eyebrow">AKSES CEPAT</span><h2>Masuk langsung ke pekerjaan</h2></div><span className="pill">{actions.length} ruang kerja</span></div>
    <div className="quick-launch-grid">{actions.map(a=>{const Icon=a.icon;return <button key={a.module+"-"+a.feature} onClick={()=>onRoute?.(a.module,a.feature)}><span className="quick-icon"><Icon size={18}/></span><span><strong>{a.label}</strong><small>{a.caption}</small></span><ArrowRight size={16}/></button>})}</div>
   </section>

   <div className="dashboard-focus-grid">
    <section className="panel">
     <div className="sectionhead"><div><span className="eyebrow">PRIORITAS</span><h2>Perlu ditindak hari ini</h2></div>{overdue>0&&<span className="pill danger-pill">{overdue} terlambat</span>}</div>
     <div className="focus-list">
      {openTasks.slice(0,4).map(t=><button key={t.id} onClick={()=>onRoute?.("command","Tugas")}><span><strong>{t.title}</strong><small>{t.due_at?"Tenggat "+new Date(t.due_at).toLocaleDateString("id-ID",{dateStyle:"medium"}):"Belum ada tenggat"}</small></span><ArrowRight size={15}/></button>)}
      {!openTasks.length&&<div className="empty compact-empty">Tidak ada tugas aktif yang perlu tindakan.</div>}
     </div>
    </section>
    <section className="panel">
     <div className="sectionhead"><div><span className="eyebrow">AGENDA</span><h2>Agenda terdekat</h2></div><button className="text-action" onClick={()=>onRoute?.("calendar","Kalender Sekolah")}>Buka kalender <ArrowRight size={14}/></button></div>
     <div className="focus-list">{events.slice(0,4).map(e=><button key={e.id} onClick={()=>onRoute?.("calendar","Kalender Sekolah")}><time>{new Date(e.event_date+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short"})}</time><span><strong>{e.title}</strong><small>{e.start_time?e.start_time.slice(0,5)+" WIB":"Waktu belum diatur"}</small></span><ArrowRight size={15}/></button>)}{!events.length&&<div className="empty compact-empty">Belum ada agenda mendatang.</div>}</div>
    </section>
   </div>
  </>}

  {showAnalytics&&<div className="dashboard-charts">
   <section className="panel"><div className="sectionhead"><div><span className="eyebrow">ANALITIK</span><h2>Tren Kehadiran 7 Hari</h2></div><BarChart3 size={19}/></div>
    <div className="vertical-chart">{week.map(x=><div className="vbar-col" key={x.key}><div className="vbar-track"><i style={{height:(x.present/maxAttend*100)+"%"}}/><em style={{height:(x.late/maxAttend*100)+"%"}}/></div><b>{x.present}</b><small>{x.label}</small></div>)}</div>
    <div className="chart-legend"><span><i/>Hadir</span><span><i className="late"/>Terlambat</span></div>
   </section>
   <section className="panel"><div className="sectionhead"><div><span className="eyebrow">PROGRAM</span><h2>Status Program & Deadline</h2></div><span className="pill">{openTasks.length} aktif</span></div>
    <div className="horizontal-chart">{taskStatus.map(x=><div className="hbar-row" key={x.label}><span>{x.label}</span><div><i style={{width:(x.count/maxTask*100)+"%"}}/></div><b>{x.count}</b></div>)}</div>
    <button className="button secondary dashboard-panel-action" onClick={()=>onRoute?.("command","Progres")}>Buka kontrol program <ArrowRight size={14}/></button>
   </section>
  </div>}

  {showAgenda&&<div className="dashboard-charts">
   <section className="panel"><div className="sectionhead"><div><h2>Agenda 31 Hari ke Depan</h2><p className="muted">Urutan agenda terdekat.</p></div><span className="pill">{events.length} agenda</span></div>
    {events.slice(0,7).map(e=><div className="entry" key={e.id}><div><strong>{e.title}</strong><small>{new Date(e.event_date+"T00:00:00").toLocaleDateString("id-ID",{dateStyle:"medium"})}{e.start_time?" · "+e.start_time.slice(0,5):""}</small></div></div>)}
    {!events.length&&<div className="empty">Belum ada agenda mendatang.</div>}
   </section>
   <section className="panel"><div className="sectionhead"><div><h2>Deadline Program</h2><p className="muted">Tugas aktif yang perlu ditindaklanjuti.</p></div>{overdue>0&&<span className="pill danger-pill">{overdue} terlambat</span>}</div>
    {openTasks.slice(0,7).map(t=><div className="entry" key={t.id}><div><strong>{t.title}</strong><small>{t.due_at?"Tenggat "+new Date(t.due_at).toLocaleDateString("id-ID",{dateStyle:"medium"}):"Belum ada tenggat"} · {t.status}</small></div></div>)}
    {!openTasks.length&&<div className="empty">Tidak ada tugas aktif.</div>}
   </section>
  </div>}
  {error&&<div className="banner error" role="alert">{error}</div>}
 </>;
}
