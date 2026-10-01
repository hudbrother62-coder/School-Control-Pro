"use client";
import {useEffect,useMemo,useState} from "react";
import {Bell,CalendarClock,History,Search,X} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import type {Role,ModuleKey} from "@/lib/modules";

type Hit={id:string;label:string;meta:string;module:ModuleKey;feature:string};
type Notice={id:string;title:string;meta:string;module:ModuleKey;feature:string;due:string};
type Activity={id:string;action:string;target_id:string|null;metadata:Record<string,unknown>;occurred_at:string};
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});
const plusDays=(n:number)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"})};

export default function WorkspaceTools({schoolId,role,onRoute}:{schoolId:string;role:Role;onRoute:(m:ModuleKey,f?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]);
 const [open,setOpen]=useState<"search"|"notice"|"activity"|null>(null);
 const [q,setQ]=useState(""),[hits,setHits]=useState<Hit[]>([]),[notices,setNotices]=useState<Notice[]>([]),[activity,setActivity]=useState<Activity[]>([]),[busy,setBusy]=useState(false);
 const canFinance=["owner","principal","treasurer","finance_staff"].includes(role);
 const canBk=role==="counselor";
 const canAudit=["owner","principal"].includes(role);

 async function loadNotices(){
  if(!db)return;
  const end=plusDays(31),out:Notice[]=[];
  const calls=await Promise.allSettled([
   db.from("sc_calendar_events").select("id,title,event_date,category").eq("school_id",schoolId).gte("event_date",today()).lte("event_date",end).order("event_date").limit(30),
   db.from("sc_program_tasks").select("id,title,due_at,status").eq("school_id",schoolId).neq("status","done").not("due_at","is",null).order("due_at").limit(30),
   canFinance?db.from("sc_student_bills").select("id,title,due_on,amount_due").eq("school_id",schoolId).neq("status","paid").lte("due_on",end).order("due_on").limit(30):Promise.resolve({data:[]}),
   db.from("sc_discipline_actions").select("id,sanction_name_snapshot,due_date,status").eq("school_id",schoolId).neq("status","completed").not("due_date","is",null).order("due_date").limit(30),
   ["owner","principal","vice_principal","hr","supervisor"].includes(role)?db.from("sc_hr_requests").select("id,kind,from_at,status").eq("school_id",schoolId).eq("status","pending").order("from_at").limit(30):Promise.resolve({data:[]}),
   ["owner","principal","vice_principal"].includes(role)?db.from("sc_documents").select("id,title,status,updated_at").eq("school_id",schoolId).in("status",["draft","review"]).order("updated_at",{ascending:false}).limit(30):Promise.resolve({data:[]}),
   ["owner","principal","vice_principal","teacher"].includes(role)?db.from("sc_supervisions").select("id,scheduled_on,status,instrument").eq("school_id",schoolId).gte("scheduled_on",today()).lte("scheduled_on",end).neq("status","final").order("scheduled_on").limit(30):Promise.resolve({data:[]}),
   canBk?db.from("sc_bk_cases").select("id,category,status,follow_up_date").eq("school_id",schoolId).neq("status","closed").not("follow_up_date","is",null).lte("follow_up_date",end).order("follow_up_date").limit(30):Promise.resolve({data:[]}),
   db.from("sc_workflow_steps").select("id,run_id,title,status,blocked_reason,updated_at").eq("school_id",schoolId).in("status",["blocked","active"]).order("updated_at",{ascending:false}).limit(30)
  ]);
  const val=(i:number)=>calls[i].status==="fulfilled"?((calls[i] as PromiseFulfilledResult<any>).value.data||[]):[];
  for(const x of val(0))out.push({id:"cal-"+x.id,title:x.title,meta:"Agenda · "+x.category,module:"calendar",feature:"Kalender Sekolah",due:x.event_date});
  for(const x of val(1))out.push({id:"task-"+x.id,title:x.title,meta:"Tugas program · "+x.status,module:"command",feature:"Tugas",due:String(x.due_at).slice(0,10)});
  for(const x of val(2))out.push({id:"bill-"+x.id,title:x.title,meta:"Tagihan belum lunas",module:"sikas",feature:"Tagihan Siswa",due:x.due_on});
  for(const x of val(3))out.push({id:"dis-"+x.id,title:x.sanction_name_snapshot,meta:"Tindak lanjut disiplin · "+x.status,module:"disiplin",feature:"Tindak Lanjut",due:x.due_date});
  for(const x of val(4))out.push({id:"hr-"+x.id,title:"Pengajuan "+x.kind,meta:"Menunggu approval",module:"gajian",feature:"Pengajuan SDM",due:String(x.from_at||today()).slice(0,10)});
  for(const x of val(5))out.push({id:"doc-"+x.id,title:x.title,meta:"Dokumen menunggu proses · "+x.status,module:"kepsek_ai",feature:"Workflow Dokumen",due:String(x.updated_at||today()).slice(0,10)});
  for(const x of val(6))out.push({id:"sup-"+x.id,title:"Supervisi "+x.instrument,meta:"Jadwal supervisi · "+x.status,module:"kepsek_ai",feature:"Supervisi guru",due:x.scheduled_on});
  for(const x of val(7))out.push({id:"bk-"+x.id,title:"Tindak lanjut BK · "+x.category,meta:"Privat Guru BK · "+x.status,module:"bk",feature:"Tindak Lanjut",due:x.follow_up_date});
  for(const x of val(8))out.push({id:"wf-"+x.id,title:x.title,meta:x.status==="blocked"?"Workflow tertahan · "+(x.blocked_reason||"perlu data"):"Langkah workflow aktif",module:"orchestrator",feature:"Workflow Aktif",due:today()});
  setNotices(out.sort((a,b)=>a.due.localeCompare(b.due)).slice(0,100));
 }

 async function loadActivity(){
  if(!db||!canAudit){setActivity([]);return}
  const {data}=await db.from("sc_audit_log").select("id,action,target_id,metadata,occurred_at").eq("school_id",schoolId).order("occurred_at",{ascending:false}).limit(80);
  setActivity((data||[]).map((x:any)=>({...x,id:String(x.id)})) as Activity[]);
 }

 useEffect(()=>{void loadNotices()},[db,schoolId,role]);

 async function search(){
  if(!db||q.trim().length<2)return;
  setBusy(true);
  const n=q.trim(),pattern="%"+n+"%",out:Hit[]=[];
  try{
   const reads=await Promise.allSettled([
    db.from("sc_students").select("id,name,nis,status").eq("school_id",schoolId).ilike("name",pattern).limit(12),
    db.from("sc_staff").select("id,name,position").eq("school_id",schoolId).ilike("name",pattern).limit(12),
    db.from("sc_documents").select("id,title,kind").eq("school_id",schoolId).ilike("title",pattern).limit(12),
    db.from("sc_programs").select("id,title,status").eq("school_id",schoolId).ilike("title",pattern).limit(12),
    db.from("sc_calendar_events").select("id,title,event_date").eq("school_id",schoolId).ilike("title",pattern).limit(12),
    canFinance?db.from("sc_finance_transactions").select("id,category,description,occurred_at,amount").eq("school_id",schoolId).or("category.ilike."+pattern+",description.ilike."+pattern).limit(12):Promise.resolve({data:[]}),
    canFinance?db.from("sc_student_bills").select("id,title,due_on,status").eq("school_id",schoolId).ilike("title",pattern).limit(12):Promise.resolve({data:[]}),
    db.from("sc_teacher_journals").select("id,lesson_date,subject,topic").eq("school_id",schoolId).or("subject.ilike."+pattern+",topic.ilike."+pattern).limit(12),
    canBk?db.from("sc_bk_cases").select("id,category,status,follow_up_date").eq("school_id",schoolId).ilike("category",pattern).limit(12):Promise.resolve({data:[]})
   ]);
   const val=(i:number)=>reads[i].status==="fulfilled"?((reads[i] as PromiseFulfilledResult<any>).value.data||[]):[];
   for(const x of val(0))out.push({id:"s"+x.id,label:x.name,meta:"Siswa · "+(x.nis||"NIS belum diisi")+" · "+x.status,module:"master",feature:"Siswa"});
   for(const x of val(1))out.push({id:"st"+x.id,label:x.name,meta:"SDM · "+(x.position||"Tanpa jabatan"),module:"master",feature:"Guru"});
   for(const x of val(2))out.push({id:"d"+x.id,label:x.title,meta:"Dokumen · "+x.kind,module:"kepsek_ai",feature:"Pusat dokumen"});
   for(const x of val(3))out.push({id:"p"+x.id,label:x.title,meta:"Program · "+x.status,module:"command",feature:"Program Kerja"});
   for(const x of val(4))out.push({id:"c"+x.id,label:x.title,meta:"Agenda · "+x.event_date,module:"calendar",feature:"Kalender Sekolah"});
   for(const x of val(5))out.push({id:"f"+x.id,label:x.category,meta:"Transaksi · "+x.occurred_at+" · "+Number(x.amount).toLocaleString("id-ID"),module:"sikas",feature:x.amount>=0?"Buku Kas Umum":"Pengeluaran"});
   for(const x of val(6))out.push({id:"b"+x.id,label:x.title,meta:"Tagihan · "+x.due_on+" · "+x.status,module:"sikas",feature:"Tagihan Siswa"});
   for(const x of val(7))out.push({id:"j"+x.id,label:x.subject+" · "+x.topic,meta:"Jurnal mengajar · "+x.lesson_date,module:"buku_kerja",feature:"Jurnal Mengajar"});
   for(const x of val(8))out.push({id:"bk"+x.id,label:x.category,meta:"Kasus BK · "+x.status+" · tindak lanjut "+(x.follow_up_date||"—"),module:"bk",feature:"Kasus & Asesmen"});
   setHits(out.slice(0,60));
  }finally{setBusy(false)}
 }

 const title=open==="search"?"Pencarian Global":open==="notice"?"Notifikasi & Deadline":"Audit Timeline";
 const subtitle=open==="search"?"Cari lintas data sekolah sesuai hak akses pengguna.":open==="notice"?"Agenda, deadline, approval, tagihan, dokumen dan supervisi dalam satu pusat.":"Jejak perubahan terbaru untuk manajemen sekolah.";

 return <div className="flow" style={{gap:6}}>
  <button className="iconbutton" aria-label="Cari seluruh School Control" onClick={()=>setOpen(open==="search"?null:"search")}><Search size={17}/></button>
  <button className="iconbutton" aria-label="Notifikasi" onClick={()=>{setOpen(open==="notice"?null:"notice");void loadNotices()}} style={{position:"relative"}}><Bell size={17}/>{notices.length>0&&<span style={{position:"absolute",right:3,top:3,width:7,height:7,borderRadius:99,background:"currentColor"}}/>}</button>
  {canAudit&&<button className="iconbutton" aria-label="Audit Timeline" onClick={()=>{setOpen(open==="activity"?null:"activity");void loadActivity()}}><History size={17}/></button>}
  {open&&<div style={{position:"fixed",zIndex:120,right:18,top:70,width:"min(620px,calc(100vw - 28px))",maxHeight:"76vh",overflow:"auto"}} className="panel">
   <div className="sectionhead"><div><h2>{title}</h2><p className="muted">{subtitle}</p></div><button className="iconbutton" onClick={()=>setOpen(null)}><X size={16}/></button></div>
   {open==="search"&&<><form className="flow" onSubmit={e=>{e.preventDefault();void search()}}><input style={{flex:1}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Siswa, guru, dokumen, program, agenda, transaksi, tagihan, jurnal…"/><button className="button" disabled={busy||q.trim().length<2}>{busy?"Mencari…":"Cari"}</button></form><div style={{marginTop:12}}>{hits.map(h=><button className="entry" style={{width:"100%",textAlign:"left"}} key={h.id} onClick={()=>{onRoute(h.module,h.feature);setOpen(null)}}><div><strong>{h.label}</strong><small>{h.meta}</small></div></button>)}{q.length>=2&&!hits.length&&!busy&&<div className="empty">Tidak ada hasil yang dapat diakses.</div>}</div></>}
   {open==="notice"&&<div>{notices.map(n=><button className="entry" style={{width:"100%",textAlign:"left"}} key={n.id} onClick={()=>{onRoute(n.module,n.feature);setOpen(null)}}><CalendarClock size={17}/><div><strong>{n.title}</strong><small>{n.due} · {n.meta}</small></div></button>)}{!notices.length&&<div className="empty">Tidak ada deadline dekat.</div>}</div>}
   {open==="activity"&&<div>{activity.map(a=><div className="entry" key={a.id}><History size={16}/><div><strong>{a.action}</strong><small>{new Date(a.occurred_at).toLocaleString("id-ID")} · target {a.target_id||"—"}</small><p className="hint">{Object.entries(a.metadata||{}).slice(0,5).map(([k,v])=>k+": "+String(v)).join(" · ")}</p></div></div>)}{!activity.length&&<div className="empty">Belum ada audit event yang dapat ditampilkan.</div>}</div>}
  </div>}
 </div>;
}
