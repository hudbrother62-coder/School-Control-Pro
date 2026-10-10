"use client";

import {useEffect,useMemo,useState} from "react";
import {AlertTriangle,CalendarClock,CheckCircle2,Download,Eye,FileText} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {readAllRows} from "@/lib/read-all-rows";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import {errorMessage} from "@/lib/error-message";
import {isAdmin,type Role} from "@/lib/modules";
import {issueAndExport,loadReportIdentity,officialReportHtml,type OfficialReportModel} from "@/lib/report-engine";

type Student={id:string;name:string;nis:string|null;class_id:string|null};
type ClassRow={id:string;name:string};
type Event={id:string;student_id:string;event_type:string;item_name_snapshot:string|null;title:string;points_snapshot:number;occurred_at:string;chronology:string|null};
type Coaching={id:string;student_id:string;form:string;reason:string;result:string|null;notes:string|null;follow_up_date:string|null;status:string;happened_at:string;created_by:string;recorder_name:string|null};
type Action={id:string;student_id:string;sanction_name_snapshot:string;notes:string|null;due_date:string|null;status:string;completed_at:string|null;created_at:string;created_by:string};
type Reminder={id:string;type:"action"|"coaching";student_id:string;title:string;date:string;status:string;creator:string};

const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});
const plusDays=(date:string,days:number)=>{const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
const statusLabel=(status:string)=>status==="completed"?"Selesai":status==="ongoing"||status==="in_progress"?"Berjalan":"Belum selesai";
const dateLabel=(value:string|null)=>value||"Belum dijadwalkan";

export default function DisciplineFollowupCenter({schoolId,userId,role,focus}:{schoolId:string;userId:string;role:Role;focus:string}){
 const db=useMemo(()=>browserDb(),[]),manager=isAdmin(role);
 const [students,setStudents]=useState<Student[]>([]),[classes,setClasses]=useState<ClassRow[]>([]);
 const [events,setEvents]=useState<Event[]>([]),[coaching,setCoaching]=useState<Coaching[]>([]),[actions,setActions]=useState<Action[]>([]);
 const [month,setMonth]=useState(today().slice(0,7)),[classFilter,setClassFilter]=useState("");
 const [reportKind,setReportKind]=useState<"recap"|"followup"|"reminder">(focus.includes("Pengingat")?"reminder":"recap"),[days,setDays]=useState(7);
 const [preview,setPreview]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [editing,setEditing]=useState(""),[target,setTarget]=useState("");
 useEffect(()=>{setReportKind(focus.includes("Pengingat")?"reminder":"recap");setPreview("")},[focus]);

 async function load(){
  if(!db)return;
  const r=await Promise.all([
   readAllRows(db.from("sc_students").select("id,name,nis,class_id").eq("school_id",schoolId).order("name").order("id")),
   readAllRows(db.from("sc_classes").select("id,name").eq("school_id",schoolId).order("name").order("id")),
   readAllRows(db.from("sc_discipline_events").select("id,student_id,event_type,item_name_snapshot,title,points_snapshot,occurred_at,chronology").eq("school_id",schoolId).order("occurred_at",{ascending:false}).order("id")),
   readAllRows(db.from("sc_discipline_coaching").select("id,student_id,form,reason,result,notes,follow_up_date,status,happened_at,created_by,recorder_name").eq("school_id",schoolId).order("happened_at",{ascending:false}).order("id")),
   readAllRows(db.from("sc_discipline_actions").select("id,student_id,sanction_name_snapshot,notes,due_date,status,completed_at,created_at,created_by").eq("school_id",schoolId).order("created_at",{ascending:false}).order("id"))
  ]);
  const issue=r.find(x=>x.error);if(issue?.error)throw issue.error;
  setStudents((r[0].data||[]) as Student[]);setClasses((r[1].data||[]) as ClassRow[]);
  setEvents((r[2].data||[]) as Event[]);setCoaching((r[3].data||[]) as Coaching[]);setActions((r[4].data||[]) as Action[]);
 }
 useRealtimeRefresh(schoolId,()=>{void load().catch(e=>setError(errorMessage(e)))});
 useEffect(()=>{void load().catch(e=>setError(errorMessage(e)))},[db,schoolId]);
 const student=(id:string)=>students.find(s=>s.id===id);
 const studentName=(id:string)=>student(id)?.name||"Siswa";
 const className=(id:string|null|undefined)=>classes.find(c=>c.id===id)?.name||"—";
 const inClass=(id:string)=>!classFilter||student(id)?.class_id===classFilter;
 const relevantEvents=events.filter(x=>x.occurred_at.startsWith(month)&&inClass(x.student_id));
 const relevantActions=actions.filter(x=>inClass(x.student_id));
 const relevantCoaching=coaching.filter(x=>inClass(x.student_id));
 const reminderList:Reminder[]=[
  ...relevantActions.filter(x=>x.status!=="completed"&&!!x.due_date).map(x=>({id:x.id,type:"action" as const,student_id:x.student_id,title:x.sanction_name_snapshot,date:x.due_date!,status:x.status,creator:x.created_by})),
  ...relevantCoaching.filter(x=>x.status!=="completed"&&!!x.follow_up_date).map(x=>({id:x.id,type:"coaching" as const,student_id:x.student_id,title:x.form+" · "+x.reason,date:x.follow_up_date!,status:x.status,creator:x.created_by}))
 ].sort((a,b)=>a.date.localeCompare(b.date));
 const overdue=reminderList.filter(x=>x.date<today()),upcoming=reminderList.filter(x=>x.date>=today()&&x.date<=plusDays(today(),days));
 const reminders=reminderList.filter(x=>x.date<=plusDays(today(),days));
 const unplanned=relevantActions.filter(x=>x.status!=="completed"&&!x.due_date).length+relevantCoaching.filter(x=>x.status!=="completed"&&!x.follow_up_date).length;
 const canChange=(creator:string)=>manager||creator===userId;

 async function task(work:()=>Promise<void>,success:string){
  if(!db)return;setBusy(true);setError("");setMessage("");
  try{await work();await load();setPreview("");setMessage(success)}catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 async function updateStatus(item:Reminder,status:"ongoing"|"completed"){
  if(!canChange(item.creator))return;
  await task(async()=>{
   const query=item.type==="action"?db.from("sc_discipline_actions"):db.from("sc_discipline_coaching");
   const patch=item.type==="action"?{status,completed_at:status==="completed"?new Date().toISOString():null}:{status};
   const {error:e}=await query.update(patch).eq("id",item.id).eq("school_id",schoolId);
   if(e)throw e;
  },"Status tindak lanjut berhasil diperbarui.");
 }
 async function saveTarget(item:Reminder){
  if(!canChange(item.creator)||!target)return;
  await task(async()=>{
   const query=item.type==="action"?db.from("sc_discipline_actions"):db.from("sc_discipline_coaching");
   const field=item.type==="action"?"due_date":"follow_up_date";
   const {error:e}=await query.update({[field]:target}).eq("id",item.id).eq("school_id",schoolId);
   if(e)throw e;setEditing("");setTarget("");
  },"Tanggal tindak lanjut berhasil diperbarui.");
 }
 function reportModel():OfficialReportModel{
  const activeActions=reportKind==="reminder"?relevantActions.filter(x=>x.status!=="completed"&&!!x.due_date&&x.due_date<=plusDays(today(),days)):reportKind==="recap"?relevantActions.filter(x=>x.created_at.startsWith(month)||x.due_date?.startsWith(month)):relevantActions;
  const activeCoaching=reportKind==="reminder"?relevantCoaching.filter(x=>x.status!=="completed"&&!!x.follow_up_date&&x.follow_up_date<=plusDays(today(),days)):reportKind==="recap"?relevantCoaching.filter(x=>x.happened_at.startsWith(month)||x.follow_up_date?.startsWith(month)):relevantCoaching;
  const monthly=reportKind==="recap",reminder=reportKind==="reminder";
  const title=monthly?"Laporan Kedisiplinan dan Prestasi Peserta Didik":reminder?"Laporan Pengingat Tindak Lanjut Disiplin":"Laporan Tindak Lanjut dan Pembinaan Peserta Didik";
  const sections:OfficialReportModel["sections"]=[];
  if(monthly)sections.push({title:"Pelanggaran dan Prestasi",columns:["Tanggal","Nama siswa","NIS","Kelas","Jenis","Kejadian","Poin","Keterangan"],rows:relevantEvents.map(x=>[x.occurred_at,studentName(x.student_id),student(x.student_id)?.nis||"—",className(student(x.student_id)?.class_id),x.event_type==="achievement"?"Prestasi":"Pelanggaran",x.item_name_snapshot||x.title,x.points_snapshot,x.chronology||"—"])});
  sections.push({title:"Tindak Lanjut dan Sanksi",columns:["Siswa","NIS","Kelas","Tindakan","Target","Status","Tanggal selesai","Catatan"],rows:activeActions.map(x=>[studentName(x.student_id),student(x.student_id)?.nis||"—",className(student(x.student_id)?.class_id),x.sanction_name_snapshot,dateLabel(x.due_date),statusLabel(x.status),x.completed_at?.slice(0,10)||"—",x.notes||"—"])});
  sections.push({title:"Pembinaan dan Pemantauan",columns:["Siswa","Kelas","Pembinaan","Alasan","Hasil","Tanggal pembinaan","Target tinjau ulang","Status","Petugas"],rows:activeCoaching.map(x=>[studentName(x.student_id),className(student(x.student_id)?.class_id),x.form,x.reason,x.result||"Belum dicatat",x.happened_at.slice(0,10),dateLabel(x.follow_up_date),statusLabel(x.status),x.recorder_name||"—"])});
  return {moduleKey:"disiplin",documentType:monthly?"rekap_disiplin_prestasi":reminder?"pengingat_disiplin":"tindak_lanjut_disiplin",prefix:monthly?"DIS-REKAP":reminder?"DIS-ING":"DIS-TL",
   title,subtitle:(classFilter?"Kelas "+className(classFilter)+" · ":"")+(monthly?"Periode "+month:reminder?"Tenggat sampai "+plusDays(today(),days):"Seluruh riwayat penanganan"),
   orientation:"landscape",status:"draft",confidentiality:"restricted",periodLabel:monthly?month:"Diperbarui "+today(),
   ...(monthly?{periodStart:month+"-01",periodEnd:plusDays(month+"-01",new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()-1)}:{}),
   metrics:[{label:monthly?"Kejadian":"Sanksi",value:String(monthly?relevantEvents.length:activeActions.length)},{label:"Pembinaan",value:String(activeCoaching.length)},
    {label:"Belum selesai",value:String(activeActions.filter(x=>x.status!=="completed").length+activeCoaching.filter(x=>x.status!=="completed").length)},
    {label:"Lewat tenggat",value:String([...activeActions.map(x=>({date:x.due_date,status:x.status})),...activeCoaching.map(x=>({date:x.follow_up_date,status:x.status}))].filter(x=>x.status!=="completed"&&x.date&&x.date<today()).length)}],
   notes:["Keterangan dan status diambil dari data sekolah pada saat laporan dibuat.","Data pribadi peserta didik bersifat terbatas; periksa sebelum disahkan dan dibagikan."],sections};
 }
 async function exportReport(format:"preview"|"pdf"|"docx"|"xlsx"){
  if(!db)return;setBusy(true);setError("");setMessage("");
  try{
   const identity=await loadReportIdentity(db,schoolId),model=reportModel();
   const settings=identity.report_settings||{};
   if(reportKind==="recap"){
    model.title=String(settings.discipline_title||model.title);model.subtitle=String(settings.discipline_subtitle||model.subtitle);
    model.footer=String(settings.discipline_footer||identity.name+" · Dokumen kesiswaan");
   }
   if(format==="preview"){setPreview(officialReportHtml(identity,model));setMessage("Preview A4 draft ditampilkan di bawah tanpa menerbitkan nomor dokumen.")}
   else{const result=await issueAndExport(db,schoolId,identity,model,format);setMessage("Laporan "+result.document_number+" diterbitkan dan disimpan di arsip sekolah.");}
  }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 const isReminderPage=focus.includes("Pengingat");
 return <section className="panel">
  <div className="sectionhead"><div><span className="eyebrow">DISIPLIN PRO · PEMANTAUAN</span><h2>{isReminderPage?"Pengingat & Tindak Lanjut":"Laporan Disiplin dan Pembinaan"}</h2><p className="muted">Pantau kasus hingga selesai, periksa tenggat pembinaan dan cetak laporan resmi menggunakan kop, logo, serta tanda tangan sekolah.</p></div>{isReminderPage?<CalendarClock size={22}/>:<FileText size={22}/>}</div>
  <div className="grid">
   <div className="card"><label>Lewat tenggat</label><strong>{overdue.length}</strong><small>Belum diselesaikan</small></div>
   <div className="card"><label>Jatuh tempo {days} hari</label><strong>{upcoming.length}</strong><small>Termasuk hari ini</small></div>
   <div className="card"><label>Belum dijadwalkan</label><strong>{unplanned}</strong><small>Tugas aktif tanpa target</small></div>
   <div className="card"><label>Tindak lanjut aktif</label><strong>{relevantActions.filter(x=>x.status!=="completed").length+relevantCoaching.filter(x=>x.status!=="completed").length}</strong></div>
  </div>
  <div className="fields" style={{marginTop:16}}>
   <label className="field">Kelas<select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setPreview("")}}><option value="">Semua kelas</option>{classes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
   <label className="field">Rentang pengingat<select value={days} onChange={e=>{setDays(Number(e.target.value));setPreview("")}}><option value={3}>3 hari</option><option value={7}>7 hari</option><option value={14}>14 hari</option><option value={30}>30 hari</option></select></label>
  </div>
  <h3 style={{marginTop:20}}>Pengingat perlu penanganan</h3>
  {reminders.map(x=><div className="entry" key={x.type+":"+x.id}>
   <div><strong>{studentName(x.student_id)} · {x.title}</strong><small>{x.type==="action"?"Tindak lanjut / sanksi":"Pembinaan"} · Target {x.date} · {statusLabel(x.status)}</small><small>{x.date<today()?"Lewat tenggat":x.date===today()?"Jatuh tempo hari ini":"Segera jatuh tempo"}</small></div>
   <div className="flow"><span className="pill">{x.date<today()?"Terlambat":x.date===today()?"Hari ini":"Mendatang"}</span>{canChange(x.creator)&&<><button className="button secondary" disabled={busy||x.status==="ongoing"} onClick={()=>void updateStatus(x,"ongoing")}>Proses</button><button className="button" disabled={busy} onClick={()=>void updateStatus(x,"completed")}><CheckCircle2 size={14}/> Selesai</button></>}</div>
  </div>)}
  {!reminders.length&&<div className="empty">Tidak ada tindak lanjut yang lewat tenggat atau jatuh tempo dalam {days} hari.</div>}
  <details style={{marginTop:14}}><summary>Atur target atau tuntaskan tindak lanjut lain</summary>
   {([
    ...relevantActions.filter(x=>x.status!=="completed").map(x=>({id:x.id,type:"action" as const,student_id:x.student_id,title:x.sanction_name_snapshot,date:x.due_date||"",status:x.status,creator:x.created_by})),
    ...relevantCoaching.filter(x=>x.status!=="completed").map(x=>({id:x.id,type:"coaching" as const,student_id:x.student_id,title:x.form+" · "+x.reason,date:x.follow_up_date||"",status:x.status,creator:x.created_by}))
   ]).map(x=><div className="entry" key={x.type+":"+x.id}><div><strong>{studentName(x.student_id)} · {x.title}</strong><small>{dateLabel(x.date)} · {statusLabel(x.status)}</small>{editing===x.type+x.id&&<label className="field">Ubah tanggal target<input type="date" value={target} onChange={e=>setTarget(e.target.value)}/></label>}</div><div className="flow">{canChange(x.creator)&&<>{editing===x.type+x.id?<button className="button" disabled={busy||!target} onClick={()=>void saveTarget(x)}>Simpan tanggal</button>:<button className="button secondary" disabled={busy} onClick={()=>{setEditing(x.type+x.id);setTarget(x.date)}}>Atur jadwal</button>}<button className="button secondary" disabled={busy} onClick={()=>void updateStatus(x,"completed")}>Tuntaskan</button></>}</div></div>)}
  </details>
  <div className="divider" style={{height:1,background:"var(--border, #d6dce5)",margin:"24px 0"}}/>
  <h3>Dokumen dan laporan</h3>
  <div className="fields">
   <label className="field">Jenis laporan<select value={reportKind} onChange={e=>{setReportKind(e.target.value as typeof reportKind);setPreview("")}}><option value="recap">Rekap disiplin & prestasi</option><option value="followup">Laporan tindak lanjut & pembinaan</option><option value="reminder">Daftar pengingat jatuh tempo</option></select></label>
   {reportKind==="recap"&&<label className="field">Bulan<input type="month" value={month} onChange={e=>{setMonth(e.target.value);setPreview("")}}/></label>}
  </div>
  <div className="flow" style={{marginBottom:12}}><button className="button secondary" disabled={busy} onClick={()=>void exportReport("preview")}><Eye size={15}/> Preview di halaman</button><button className="button secondary" disabled={busy} onClick={()=>void exportReport("docx")}><Download size={15}/> Word</button><button className="button secondary" disabled={busy} onClick={()=>void exportReport("xlsx")}><Download size={15}/> Excel</button><button className="button" disabled={busy} onClick={()=>void exportReport("pdf")}><Download size={15}/> PDF / Cetak</button></div>
  <p className="hint">Preview tidak menerbitkan dokumen. Ekspor final memperoleh nomor laporan dan arsip. Logo dan tanda tangan diatur pada Disiplin Pro → Template Laporan. Pengingat ini tampil saat aplikasi dibuka, bukan notifikasi push/WhatsApp otomatis.</p>
  {preview&&<div style={{marginTop:16}}><div className="flow" style={{justifyContent:"space-between",marginBottom:10}}><strong>Preview laporan A4 · draft</strong><button className="button secondary" onClick={()=>setPreview("")}>Tutup preview</button></div><iframe title="Preview dokumen disiplin" srcDoc={preview} sandbox="" style={{width:"100%",minHeight:630,border:"1px solid #d6dce5",borderRadius:12,background:"#fff"}}/></div>}
  {error&&<div className="banner error" role="alert"><AlertTriangle size={15}/> {error}</div>}
  {message&&<div className="banner success" role="status">{message}</div>}
 </section>;
}
