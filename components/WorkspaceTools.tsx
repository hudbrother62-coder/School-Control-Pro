"use client";
import DataEntryModal from "@/components/DataEntryModal";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import {useEffect,useMemo,useRef,useState} from "react";
import {Bell,CalendarClock,Search,X} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {errorMessage} from "@/lib/error-message";
import type {Role,ModuleKey} from "@/lib/modules";

type Hit={id:string;label:string;meta:string;module:ModuleKey;feature:string};
type Notice={id:string;title:string;meta:string;module:ModuleKey;feature:string;due:string};
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});
const plusDays=(n:number)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"})};

export default function WorkspaceTools({schoolId,role,refreshSignal,onRoute}:{schoolId:string;role:Role;refreshSignal?:number;onRoute:(m:ModuleKey,f?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]),[open,setOpen]=useState<"search"|"notice"|null>(null),[q,setQ]=useState(""),[hits,setHits]=useState<Hit[]>([]),[notices,setNotices]=useState<Notice[]>([]),[busy,setBusy]=useState(false);
 const [searched,setSearched]=useState(false),[searchError,setSearchError]=useState(""),[noticeError,setNoticeError]=useState(""),[noticesBusy,setNoticesBusy]=useState(false);
 const searchSequence=useRef(0),noticeSequence=useRef(0);
 useRealtimeRefresh(schoolId,()=>loadNotices());
 async function loadNotices(){if(!db||!schoolId)return;const seq=++noticeSequence.current;setNoticesBusy(true);setNoticeError("");try{const end=plusDays(31);const out:Notice[]=[];const add=(x:Notice)=>out.push(x);
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
 if(seq===noticeSequence.current){setNotices(out.sort((a,b)=>a.due.localeCompare(b.due)).slice(0,50));if(calls.some(r=>r.status==="rejected"||(r.status==="fulfilled"&&!!r.value.error)))setNoticeError("Sebagian sumber notifikasi belum dapat dimuat.");}
 }catch(e){if(seq===noticeSequence.current)setNoticeError(errorMessage(e))}finally{if(seq===noticeSequence.current)setNoticesBusy(false)}}
 useEffect(()=>{void loadNotices()},[db,schoolId,role,refreshSignal]);
 useEffect(()=>{searchSequence.current++;setOpen(null);setQ("");setHits([]);setSearched(false);setSearchError("")},[schoolId,role]);
 async function search(){if(!db||q.trim().length<2)return;const seq=++searchSequence.current;setBusy(true);setSearchError("");setSearched(false);try{const n=q.trim();const out:Hit[]=[];const push=(h:Hit)=>out.push(h);const reads=await Promise.allSettled([
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
 if(seq===searchSequence.current){setHits(out);setSearched(true);if(reads.some(r=>r.status==="rejected"||(r.status==="fulfilled"&&!!r.value.error)))setSearchError("Sebagian kategori tidak dapat dicari. Hasil yang tersedia tetap ditampilkan.");}
 }catch(e){if(seq===searchSequence.current)setSearchError(errorMessage(e))}finally{if(seq===searchSequence.current)setBusy(false)}}
 return <div className="flow workspace-header-tools" style={{gap:6}}>
  <button type="button" className="iconbutton" title="Cari data sekolah" aria-label="Cari seluruh SekolaPro" aria-expanded={open==="search"} onClick={()=>setOpen(open==="search"?null:"search")}><Search size={17}/></button>
  <button type="button" className="iconbutton" title="Notifikasi dan tenggat" aria-label="Notifikasi" aria-expanded={open==="notice"} onClick={()=>{setOpen(open==="notice"?null:"notice");if(open!=="notice")void loadNotices()}} style={{position:"relative"}}><Bell size={17}/>{notices.length>0&&<span className="workspace-notice-dot"/>}</button>
  <DataEntryModal open={!!open} title={open==="search"?"Pencarian Global":"Notifikasi & Deadline"} subtitle={open==="search"?"Cari siswa, SDM, dokumen, program atau agenda.":"Agenda, tugas dan pengajuan sesuai akses Anda."} onClose={()=>setOpen(null)}>{open==="search"?<><form className="flow" onSubmit={e=>{e.preventDefault();void search()}}><input aria-label="Kata kunci pencarian" style={{flex:"1 1 200px",minWidth:0}} value={q} onChange={e=>{searchSequence.current++;setQ(e.target.value);setHits([]);setSearched(false);setSearchError("");setBusy(false)}} placeholder="Ketik minimal 2 karakter…" type="search"/><button className="button" disabled={busy||q.trim().length<2}>{busy?"Mencari…":"Cari"}</button></form><div style={{marginTop:12}} aria-live="polite">{searchError&&<p className="banner error" role="alert">{searchError}</p>}{hits.map(h=><button type="button" className="workspace-tool-result" key={h.id} onClick={()=>{onRoute(h.module,h.feature);setOpen(null)}}><div><strong>{h.label}</strong><small>{h.meta}</small></div></button>)}{searched&&!hits.length&&!busy&&<div className="empty">Tidak ada hasil untuk pencarian ini.</div>}</div></>:<div aria-live="polite">{noticesBusy&&<p role="status" className="muted">Memuat notifikasi terbaru…</p>}{noticeError&&<p className="banner error" role="alert">{noticeError}</p>}{notices.map(n=><button type="button" className="workspace-tool-result" key={n.id} onClick={()=>{onRoute(n.module,n.feature);setOpen(null)}}><CalendarClock size={17}/><div><strong>{n.title}</strong><small>{n.due} · {n.meta}</small></div></button>)}{!notices.length&&!noticesBusy&&!noticeError&&<div className="empty">Tidak ada tenggat dalam 31 hari ke depan.</div>}</div>}</DataEntryModal>
 </div>
}
