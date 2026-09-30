"use client";
import {useEffect,useMemo,useState} from "react";
import {browserDb} from "@/lib/supabase";
import type {Role} from "@/lib/modules";

type Student={id:string;class_id:string|null;status:string};
type ClassRow={id:string;name:string};
type Attendance={duty_date:string;status:string};
type EventRow={id:string;title:string;event_date:string;start_time:string|null};
type Task={id:string;title:string;status:string;due_at:string|null};
type Staff={id:string};
const dayKey=(d:Date)=>d.toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});

export default function DashboardOverview({schoolId,userId,role,focus}:{schoolId:string;userId:string;role:Role;focus?:string}){
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
 const classData=classes.map(c=>({name:c.name,count:activeStudents.filter(s=>s.class_id===c.id).length})).sort((a,b)=>b.count-a.count).slice(0,8);
 const maxClass=Math.max(1,...classData.map(x=>x.count)),maxAttend=Math.max(1,staff.length,...week.map(x=>x.present));
 const openTasks=tasks.filter(x=>!["done","completed","verified"].includes(x.status));
 const overdue=openTasks.filter(x=>x.due_at&&new Date(x.due_at).getTime()<Date.now()).length;
 const taskStatus=[
  {label:"Belum mulai",count:tasks.filter(x=>["todo","pending","open","planned"].includes(x.status)).length},
  {label:"Berjalan",count:tasks.filter(x=>["in_progress","progress","active","doing"].includes(x.status)).length},
  {label:"Terlambat",count:overdue}
 ];
 const maxTask=Math.max(1,...taskStatus.map(x=>x.count));
 const showSummary=!focus||mode.includes("ringkasan"),showAnalytics=!focus||mode.includes("analitik"),showAgenda=!focus||mode.includes("agenda")||mode.includes("deadline");
 return <>
  {showSummary&&<><div className="grid dashboard-kpis">
   <div className="card"><label>Siswa aktif</label><strong>{activeStudents.length}</strong><small>{classes.length} kelas aktif</small></div>
   <div className="card"><label>Guru & tenaga kependidikan</label><strong>{staff.length}</strong><small>Sumber presensi dan payroll</small></div>
   <div className="card"><label>Kehadiran SDM hari ini</label><strong>{attendanceRate}%</strong><small>{presentToday} dari {staff.length||0} tercatat</small></div>
   <div className="card"><label>Tugas perlu perhatian</label><strong>{openTasks.length}</strong><small>{overdue} melewati tenggat</small></div>
  </div></>}
  {showAnalytics&&<div className="dashboard-charts">
   <section className="panel"><div className="sectionhead"><div><h2>Tren Kehadiran 7 Hari</h2><p className="muted">Jumlah guru/staf hadir dan terlambat dari presensi realtime.</p></div><span className="pill">Operasional</span></div>
    <div className="vertical-chart">{week.map(x=><div className="vbar-col" key={x.key}><div className="vbar-track"><i style={{height:(x.present/maxAttend*100)+"%"}}/><em style={{height:(x.late/maxAttend*100)+"%"}}/></div><b>{x.present}</b><small>{x.label}</small></div>)}</div>
    <div className="chart-legend"><span><i/>Hadir</span><span><i className="late"/>Terlambat</span></div>
   </section>
   <section className="panel"><div className="sectionhead"><div><h2>Status Program & Deadline</h2><p className="muted">Grafik prioritas untuk pekerjaan sekolah yang perlu tindakan manajemen.</p></div><span className="pill">Prioritas</span></div>
    <div className="horizontal-chart">{taskStatus.map(x=><div className="hbar-row" key={x.label}><span>{x.label}</span><div><i style={{width:(x.count/maxTask*100)+"%"}}/></div><b>{x.count}</b></div>)}</div>
    <div className="chart-note">Distribusi siswa tetap tersedia sebagai konteks akademik: {classData.slice(0,4).map(x=>x.name+" "+x.count).join(" · ")||"belum ada data kelas"}.</div>
   </section>
  </div>}
  {showAgenda&&<div className="dashboard-charts">
   <section className="panel"><div className="sectionhead"><div><h2>Agenda 31 Hari ke Depan</h2><p className="muted">Agenda sekolah yang paling dekat dengan hari ini.</p></div><span className="pill">{events.length} agenda</span></div>
    {events.slice(0,7).map(e=><div className="entry" key={e.id}><div><strong>{e.title}</strong><small>{new Date(e.event_date+"T00:00:00").toLocaleDateString("id-ID",{dateStyle:"medium"})}{e.start_time?" · "+e.start_time.slice(0,5):""}</small></div></div>)}
    {!events.length&&<div className="empty">Belum ada agenda mendatang.</div>}
   </section>
   <section className="panel"><div className="sectionhead"><div><h2>Deadline Program</h2><p className="muted">Tugas yang belum selesai dan perlu ditindaklanjuti.</p></div>{overdue>0&&<span className="pill danger-pill">{overdue} terlambat</span>}</div>
    {openTasks.slice(0,7).map(t=><div className="entry" key={t.id}><div><strong>{t.title}</strong><small>{t.due_at?"Tenggat "+new Date(t.due_at).toLocaleDateString("id-ID",{dateStyle:"medium"}):"Belum ada tenggat"} · {t.status}</small></div></div>)}
    {!openTasks.length&&<div className="empty">Tidak ada tugas aktif.</div>}
   </section>
  </div>}
  {error&&<div className="banner error" role="alert">{error}</div>}
 </>;
}
