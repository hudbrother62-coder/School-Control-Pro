"use client";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import {useEffect,useMemo,useState} from "react";
import {Bell,CalendarClock,Search,X} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import type {Role,ModuleKey} from "@/lib/modules";

type Hit={id:string;label:string;meta:string;module:ModuleKey;feature:string};
type Notice={id:string;title:string;meta:string;module:ModuleKey;feature:string;due:string};
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});
const plusDays=(n:number)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"})};

export default function WorkspaceTools({schoolId,role,onRoute}:{schoolId:string;role:Role;onRoute:(m:ModuleKey,f?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]),[open,setOpen]=useState<"search"|"notice"|null>(null),[q,setQ]=useState(""),[hits,setHits]=useState<Hit[]>([]),[notices,setNotices]=useState<Notice[]>([]),[busy,setBusy]=useState(false);
 useRealtimeRefresh(schoolId,()=>loadNotices());
 async function loadNotices(){if(!db)return;const end=plusDays(31);const out:Notice[]=[];const add=(x:Notice)=>out.push(x);
 const calls=await Promise.allSettled([
  db.from("sc_calendar_events").select("id,title,event_date,category").eq("school_id",schoolId).gte("event_date",today()).lte("event_date",end).order("event_date").limit(30),
  db.from("sc_program_tasks").select("id,title,due_at,status").eq("school_id",schoolId).neq("status","done").not("due_at","is",null).order("due_at").limit(30),
  db.from("sc_student_bills").select("id,title,due_on,amount_due").eq("school_id",schoolId).gte("due_on",today()).lte("due_on",end).order("due_on").limit(30),
  db.from("sc_discipline_actions").select("id,sanction_name_snapshot,due_date,status").eq("school_id",schoolId).neq("status","completed").not("due_date","is",null).order("due_date").limit(30),
  db.from("sc_leave_requests").select("id,kind,from_date,status").eq("school_id",schoolId).eq("status","pending").order("from_date").limit(30)
 ]);
 const val=(i:number)=>calls[i].status==="fulfilled"?(calls[i] as PromiseFulfilledResult<any>).value.data||[]:[];
 for(const x of val(0))add({id:"cal-"+x.id,title:x.title,meta:"Agenda · "+x.category,module:"calendar",feature:"Kalender Sekolah",due:x.event_date});
 for(const x of val(1))add({id:"task-"+x.id,title:x.title,meta:"Tugas program · "+x.status,module:"command",feature:"Tugas",due:String(x.due_at).slice(0,10)});
 if(["owner","principal","treasurer"].includes(role))for(const x of val(2))add({id:"bill-"+x.id,title:x.title,meta:"Tagihan jatuh tempo",module:"sikas",feature:"Tagihan Siswa",due:x.due_on});
 if(["owner","principal","vice_principal","teacher","counselor"].includes(role))for(const x of val(3))add({id:"dis-"+x.id,title:x.sanction_name_snapshot,meta:"Tindak lanjut disiplin · "+x.status,module:"disiplin",feature:"Tindak Lanjut",due:x.due_date});
 if(["owner","principal","vice_principal","hr"].includes(role))for(const x of val(4))add({id:"leave-"+x.id,title:"Pengajuan "+x.kind,meta:"Menunggu approval",module:"gajian",feature:"Pengajuan SDM",due:x.from_date});
 setNotices(out.sort((a,b)=>a.due.localeCompare(b.due)).slice(0,50))}
 useEffect(()=>{void loadNotices()},[db,schoolId,role]);
 async function search(){if(!db||q.trim().length<2)return;setBusy(true);const n=q.trim();const out:Hit[]=[];const push=(h:Hit)=>out.push(h);const reads=await Promise.allSettled([
  db.from("sc_students").select("id,name,nis").eq("school_id",schoolId).ilike("name","%"+n+"%").limit(12),
  db.from("sc_staff").select("id,name,position").eq("school_id",schoolId).ilike("name","%"+n+"%").limit(12),
  db.from("sc_documents").select("id,title,kind").eq("school_id",schoolId).ilike("title","%"+n+"%").limit(12),
  db.from("sc_programs").select("id,title,status").eq("school_id",schoolId).ilike("title","%"+n+"%").limit(12),
  db.from("sc_calendar_events").select("id,title,event_date").eq("school_id",schoolId).ilike("title","%"+n+"%").limit(12)
 ]);const val=(i:number)=>reads[i].status==="fulfilled"?(reads[i] as PromiseFulfilledResult<any>).value.data||[]:[];
 for(const x of val(0))push({id:"s"+x.id,label:x.name,meta:"Siswa · "+(x.nis||"NIS belum diisi"),module:"master",feature:"Siswa"});
 for(const x of val(1))push({id:"st"+x.id,label:x.name,meta:"SDM · "+(x.position||"Tanpa jabatan"),module:"master",feature:"Guru"});
 for(const x of val(2))push({id:"d"+x.id,label:x.title,meta:"Dokumen · "+x.kind,module:"kepsek_ai",feature:"Pusat dokumen"});
 for(const x of val(3))push({id:"p"+x.id,label:x.title,meta:"Program · "+x.status,module:"command",feature:"Program Kerja"});
 for(const x of val(4))push({id:"c"+x.id,label:x.title,meta:"Agenda · "+x.event_date,module:"calendar",feature:"Kalender Sekolah"});
 setHits(out);setBusy(false)}
 return <div className="flow" style={{gap:6}}>
  <button className="iconbutton" aria-label="Cari seluruh School Control" onClick={()=>setOpen(open==="search"?null:"search")}><Search size={17}/></button>
  <button className="iconbutton" aria-label="Notifikasi" onClick={()=>{setOpen(open==="notice"?null:"notice");void loadNotices()}} style={{position:"relative"}}><Bell size={17}/>{notices.length>0&&<span style={{position:"absolute",right:3,top:3,width:7,height:7,borderRadius:99,background:"currentColor"}}/>}</button>
  {open&&<div style={{position:"fixed",zIndex:120,right:18,top:70,width:"min(520px,calc(100vw - 28px))",maxHeight:"70vh",overflow:"auto"}} className="panel"><div className="sectionhead"><div><h2>{open==="search"?"Pencarian Global":"Notifikasi & Deadline"}</h2><p className="muted">{open==="search"?"Cari siswa, SDM, dokumen, program atau agenda.":"Gabungan agenda, tugas, approval dan jatuh tempo sesuai akses Anda."}</p></div><button className="iconbutton" onClick={()=>setOpen(null)}><X size={16}/></button></div>{open==="search"?<><form className="flow" onSubmit={e=>{e.preventDefault();void search()}}><input style={{flex:1}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Ketik minimal 2 karakter…"/><button className="button" disabled={busy||q.trim().length<2}>{busy?"Mencari…":"Cari"}</button></form><div style={{marginTop:12}}>{hits.map(h=><button className="entry" style={{width:"100%",textAlign:"left"}} key={h.id} onClick={()=>{onRoute(h.module,h.feature);setOpen(null)}}><div><strong>{h.label}</strong><small>{h.meta}</small></div></button>)}{q.length>=2&&!hits.length&&!busy&&<div className="empty">Tidak ada hasil.</div>}</div></>:<div>{notices.map(n=><button className="entry" style={{width:"100%",textAlign:"left"}} key={n.id} onClick={()=>{onRoute(n.module,n.feature);setOpen(null)}}><CalendarClock size={17}/><div><strong>{n.title}</strong><small>{n.due} · {n.meta}</small></div></button>)}{!notices.length&&<div className="empty">Tidak ada deadline dekat.</div>}</div>}</div>}
 </div>
}
