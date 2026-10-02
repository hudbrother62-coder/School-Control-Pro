"use client";
import SearchableSelect from "@/components/SearchableSelect";
import {errorMessage} from "@/lib/error-message";
import {useEffect,useMemo,useState} from "react";
import {Check,ChevronLeft,ChevronRight,Search} from "lucide-react";
import SmartSelect from "@/components/SmartSelect";
import {browserDb} from "@/lib/supabase";
import {csvExport,saveCsv} from "@/lib/csv";
import {issueAndExport,loadReportIdentity,previewOfficialReport,type OfficialReportModel} from "@/lib/report-engine";
import {isAdmin,type Role} from "@/lib/modules";

type C={id:string;name:string;academic_year:string;grade:string|null};
type S={id:string;name:string;nis:string|null;class_id:string|null;status:string};
type A={student_id:string;class_id:string;attendance_date:string;lesson_key:string;mark:string;notes:string|null};
type G={student_id:string;score:number;subject:string;assessment_name:string};
type Subject={id:string;name:string;code:string|null};
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});
const monthLabel=(m:string)=>new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(m+"-01T00:00:00Z"));
const shiftMonth=(m:string,n:number)=>{const p=m.split("-").map(Number),d=new Date(Date.UTC(p[0],p[1]-1+n,1));return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")};
const monthDays=(m:string)=>{const p=m.split("-").map(Number),o=(new Date(Date.UTC(p[0],p[1]-1,1)).getUTCDay()+6)%7,c=new Date(Date.UTC(p[0],p[1],0)).getUTCDate();return [...Array<string|null>(o).fill(null),...Array.from({length:c},(_,i)=>m+"-"+String(i+1).padStart(2,"0"))]};

export default function AcademicAdvanced({schoolId,userId,role,focus}:{schoolId:string;userId:string;role:Role;focus?:string}){
 const db=useMemo(()=>browserDb(),[]),manager=isAdmin(role);
 const [classes,setClasses]=useState<C[]>([]),[students,setStudents]=useState<S[]>([]),[subjects,setSubjects]=useState<Subject[]>([]),[att,setAtt]=useState<A[]>([]),[grades,setGrades]=useState<G[]>([]);
 const [classId,setClassId]=useState(""),[date,setDate]=useState(today()),[lesson,setLesson]=useState("Harian"),[marks,setMarks]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({}),[query,setQuery]=useState(""),[month,setMonth]=useState(today().slice(0,7));
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState("");
 const allowedIds=useMemo(()=>new Set(classes.map(c=>c.id)),[classes]);
 const baseRoster=students.filter(s=>s.status==="active"&&s.class_id&&allowedIds.has(s.class_id)&&(!classId||s.class_id===classId));
 const roster=baseRoster.filter(s=>(s.name+" "+(s.nis||"")).toLowerCase().includes(query.toLowerCase()));
 const selectedRecords=att.filter(a=>a.attendance_date===date&&a.lesson_key===lesson&&(!classId||a.class_id===classId));

 async function load(){
  if(!db)return;
  const [cl,st,as,su]=await Promise.all([
   db.from("sc_classes").select("id,name,academic_year,grade").eq("school_id",schoolId).order("name"),
   db.from("sc_students").select("id,name,nis,class_id,status").eq("school_id",schoolId).order("name"),
   db.from("sc_teacher_assignments").select("class_id").eq("school_id",schoolId).eq("teacher_id",userId),
   db.from("sc_subjects").select("id,name,code").eq("school_id",schoolId).order("name")
  ]);
  const all=(cl.data||[]) as C[],allowed=new Set((as.data||[]).map(x=>x.class_id));
  setClasses(manager?all:all.filter(c=>allowed.has(c.id)));setStudents((st.data||[]) as S[]);setSubjects((su.data||[]) as Subject[]);
 }
 async function refreshMonth(){
  if(!db)return;
  const start=month+"-01",end=shiftMonth(month,1)+"-01";
  const [a,g]=await Promise.all([
   db.from("sc_student_attendance").select("student_id,class_id,attendance_date,lesson_key,mark,notes").eq("school_id",schoolId).gte("attendance_date",start).lt("attendance_date",end).limit(5000),
   db.from("sc_grades").select("student_id,score,subject,assessment_name").eq("school_id",schoolId).gte("assessment_date",start).lt("assessment_date",end).limit(5000)
  ]);
  setAtt((a.data||[]) as A[]);setGrades((g.data||[]) as G[]);if(a.error)setError(a.error.message);if(g.error)setError(g.error.message)
 }
 useEffect(()=>{void load()},[db,schoolId,userId,role]);
 useEffect(()=>{void refreshMonth()},[db,schoolId,month]);
 useEffect(()=>{
  if(date.slice(0,7)!==month)setMonth(date.slice(0,7));
  const mm:Record<string,string>={},nn:Record<string,string>={};
  for(const a of att.filter(x=>x.attendance_date===date&&x.lesson_key===lesson)){mm[a.student_id]=a.mark;nn[a.student_id]=a.notes||""}
  setMarks(mm);setNotes(nn);
 },[date,lesson,att,month]);

 async function save(){
  if(!db)return;setBusy(true);setError("");setOk("");
  try{
   const rows=baseRoster.map(s=>({student_id:s.id,mark:marks[s.id]||selectedRecords.find(a=>a.student_id===s.id)?.mark||"",notes:notes[s.id]??selectedRecords.find(a=>a.student_id===s.id)?.notes??""})).filter(x=>x.mark);
   if(!rows.length)throw Error("Pilih setidaknya satu status kehadiran.");
   const r=await db.rpc("sc_bulk_attendance",{p_school:schoolId,p_day:date,p_lesson:lesson,p_rows:rows});if(r.error)throw r.error;
   await refreshMonth();setOk(rows.length+" absensi berhasil disimpan.");
  }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 function currentMark(id:string){return marks[id]||selectedRecords.find(a=>a.student_id===id)?.mark||""}
 function currentNote(id:string){return notes[id]??selectedRecords.find(a=>a.student_id===id)?.notes??""}
 function setAll(mark:string){setMarks(Object.fromEntries(baseRoster.map(s=>[s.id,mark])))}
 const count=(m:string)=>roster.filter(s=>currentMark(s.id)===m).length;
 const marked=roster.filter(s=>currentMark(s.id)).length;
 const reportOnly=(focus||"").toLowerCase().includes("rekap")||(focus||"").toLowerCase().includes("laporan");
 const reportRows=baseRoster.map(s=>{const aa=att.filter(x=>x.student_id===s.id),gg=grades.filter(x=>x.student_id===s.id),c=(m:string)=>aa.filter(a=>a.mark===m).length,avg=gg.length?Math.round(gg.reduce((v,g)=>v+Number(g.score),0)/gg.length*100)/100:null;return {s,h:c("present"),i:c("permission"),sk:c("sick"),a:c("absent"),avg}});
 const exportReport=()=>saveCsv("rekap-kelas-"+month+".csv",csvExport(["NIS","Nama","Hadir","Izin","Sakit","Alpa","Rata-rata Nilai"],reportRows.map(r=>[r.s.nis,r.s.name,r.h,r.i,r.sk,r.a,r.avg])));
 function classReportModel():OfficialReportModel{const klass=classId?classes.find(c=>c.id===classId):null,totalAttendance=reportRows.reduce((n,r)=>n+r.h+r.i+r.sk+r.a,0),present=reportRows.reduce((n,r)=>n+r.h,0),validAvg=reportRows.filter(r=>r.avg!==null);return {moduleKey:"buku_kerja",documentType:(focus||"").toLowerCase().includes("laporan")?"laporan_kelas":"rekap_bulanan",prefix:"KLS",title:(focus||"").toLowerCase().includes("laporan")?"Laporan Kelas":"Rekap Bulanan Kelas",subtitle:(klass?klass.name:"Semua kelas")+" · "+monthLabel(month),periodLabel:monthLabel(month),periodStart:month+"-01",periodEnd:shiftMonth(month,1)+"-01",orientation:"landscape",status:"approved",metrics:[{label:"Siswa",value:String(reportRows.length)},{label:"Kehadiran",value:totalAttendance?Math.round(present/totalAttendance*1000)/10+"%":"0%"},{label:"Rerata nilai",value:validAvg.length?(validAvg.reduce((n,r)=>n+Number(r.avg),0)/validAvg.length).toFixed(1):"—"},{label:"Catatan presensi",value:String(totalAttendance)}],sections:[{title:"Rekap Per Siswa",columns:["NIS","Nama","Kelas","Hadir","Izin","Sakit","Alpa","Rata-rata Nilai"],rows:reportRows.map(r=>[r.s.nis||"—",r.s.name,classes.find(c=>c.id===r.s.class_id)?.name||"—",r.h,r.i,r.sk,r.a,r.avg??"—"])}]}}
 async function officialReport(format:"pdf"|"docx"|"xlsx"){if(!db)return;setBusy(true);setError("");setOk("");try{const identity=await loadReportIdentity(db,schoolId),issued=await issueAndExport(db,schoolId,identity,classReportModel(),format);setOk("Laporan "+issued.document_number+" diterbitkan dan masuk arsip.")}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 async function previewReport(){if(!db)return;setBusy(true);setError("");try{const identity=await loadReportIdentity(db,schoolId);previewOfficialReport(identity,{...classReportModel(),status:"draft"});setOk("Preview draft dibuka tanpa memakai nomor dokumen.")}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 const ids=new Set(baseRoster.map(s=>s.id));
 const dayCount=(d:string)=>new Set(att.filter(a=>a.attendance_date===d&&ids.has(a.student_id)).map(a=>a.student_id)).size;
 const dayProgress=(d:string)=>{const n=dayCount(d);return n===0?"missing":n>=baseRoster.length&&baseRoster.length>0?"complete":"partial"};
 const lessonOptions=[{value:"Harian",label:"Harian / wali kelas"},...subjects.map(s=>({value:s.name,label:s.name,subtitle:s.code||undefined}))];

 if(reportOnly)return <section className="panel"><div className="sectionhead"><div><h2>{(focus||"").toLowerCase().includes("laporan")?"Laporan Kelas":"Rekap Bulanan"}</h2><p className="muted">Pilih kelas dan bulan. Preview memakai watermark DRAFT; ekspor final memperoleh nomor dan masuk arsip sekolah.</p></div><div className="flow"><button className="button secondary" disabled={busy} onClick={()=>void previewReport()}>Preview Draft</button><button className="button secondary" onClick={exportReport}>CSV</button><button className="button secondary" disabled={busy} onClick={()=>void officialReport("xlsx")}>Excel</button><button className="button secondary" disabled={busy} onClick={()=>void officialReport("docx")}>Word</button><button className="button" disabled={busy} onClick={()=>void officialReport("pdf")}>PDF</button></div></div><div className="fields"><label className="field">Kelas<SearchableSelect label="Kelas" value={classId} onChange={e=>setClassId(e.target.value)}><option value="">Semua kelas</option>{classes.map(c=><option value={c.id} key={c.id}>{c.name} · {c.grade||c.academic_year}</option>)}</SearchableSelect></label><label className="field">Bulan<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label></div><div className="tablewrap"><table className="data-table"><thead><tr><th>Siswa</th><th>Hadir</th><th>Izin</th><th>Sakit</th><th>Alpa</th><th>Rerata Nilai</th></tr></thead><tbody>{reportRows.map(r=><tr key={r.s.id}><td><strong>{r.s.name}</strong><small style={{display:"block"}}>{r.s.nis||"NIS belum tersedia"}</small></td><td>{r.h}</td><td>{r.i}</td><td>{r.sk}</td><td>{r.a}</td><td>{r.avg??"—"}</td></tr>)}</tbody></table></div>{error&&<div className="banner error">{error}</div>}{ok&&<div className="banner success">{ok}</div>}</section>;

 return <>
  <section className="attendance-page-pro">
   <div className="sectionhead attendance-page-head"><div><span className="eyebrow">KEHADIRAN SISWA</span><h2>Absensi</h2><p className="muted">Catat kehadiran, buka tanggal sebelumnya, dan temukan hari yang belum diabsen.</p></div><button className="button" disabled={busy||!baseRoster.length} onClick={()=>void save()}><Check size={16}/>{busy?"Menyimpan…":"Simpan absensi"}</button></div>
   <div className="attendance-layout-pro">
    <section className="panel attendance-calendar-pro">
     <div className="calendar-head"><button className="iconbutton" onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft size={17}/></button><h2>{monthLabel(month)}</h2><button className="iconbutton" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight size={17}/></button></div>
     <div className="attendance-weekdays">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=><span key={x}>{x}</span>)}</div>
     <div className="attendance-month-grid">{monthDays(month).map((d,i)=>d?<button key={d} className={"attendance-day "+dayProgress(d)+" "+(date===d?"selected":"")} onClick={()=>setDate(d)} title={dayCount(d)?dayCount(d)+" siswa tercatat":"Belum diabsen"}><strong>{Number(d.slice(-2))}</strong><span>{dayProgress(d)==="complete"?"✓":dayProgress(d)==="partial"?dayCount(d)+"/"+baseRoster.length:"·"}</span></button>:<span className="attendance-day-empty" key={"e"+i}/>)}</div>
     <div className="attendance-legend"><span><i className="complete"/>Lengkap</span><span><i className="partial"/>Sebagian</span><span><i className="missing"/>Belum diabsen</span></div>
     <label className="field attendance-date-field">Pilih tanggal<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    </section>
    <div className="attendance-workspace-pro">
     <div className="attendance-toolbar">
      <select value={classId} onChange={e=>setClassId(e.target.value)} aria-label="Pilih kelas"><option value="">Semua kelas</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <div className="searchbox"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama atau NIS…"/></div>
      <div className="attendance-smart"><SmartSelect label="Jenis / mata pelajaran" value={lesson} options={lessonOptions} onChange={setLesson} allowCustom customLabel="Gunakan mata pelajaran ini"/></div>
      <button className="button secondary" onClick={()=>setAll("present")}><Check size={15}/> Tandai semua hadir</button>
     </div>
     <div className="attendance-summary-pro">{[["present","Hadir"],["permission","Izin"],["sick","Sakit"],["absent","Alpa"]].map(x=><div key={x[0]}><strong>{count(x[0])}</strong><span>{x[1]}</span></div>)}<div><strong>{Math.max(0,roster.length-marked)}</strong><span>Belum ditandai</span></div></div>
     <section className="panel attendance-table-panel"><div className="table-caption"><strong>Daftar hadir · {new Date(date+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</strong><span>{roster.length} siswa · klik tanggal lain di kalender untuk membuka riwayat.</span></div><div className="tablewrap"><table className="data-table"><thead><tr><th>Siswa</th><th>NIS</th><th>Kelas</th><th>Status Kehadiran</th><th>Catatan Opsional</th></tr></thead><tbody>{roster.map(s=><tr key={s.id}><td><div className="student-cell"><span>{s.name.slice(0,1)}</span><strong>{s.name}</strong></div></td><td>{s.nis||"—"}</td><td>{classes.find(c=>c.id===s.class_id)?.name||"—"}</td><td><select className="attendance-status" value={currentMark(s.id)} onChange={e=>setMarks(v=>({...v,[s.id]:e.target.value}))}><option value="">Pilih status</option><option value="present">Hadir</option><option value="permission">Izin</option><option value="sick">Sakit</option><option value="absent">Alpa</option></select></td><td><input className="attendance-note" value={currentNote(s.id)} onChange={e=>setNotes(v=>({...v,[s.id]:e.target.value}))} placeholder="—"/></td></tr>)}</tbody></table></div>{!roster.length&&<div className="empty">Tidak ada siswa aktif untuk filter ini.</div>}</section>
    </div>
   </div>
  </section>
  {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </>;
}
