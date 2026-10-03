"use client";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import {readAllRows} from "@/lib/read-all-rows";
import SearchableSelect from "@/components/SearchableSelect";
import {errorMessage} from "@/lib/error-message";
import {useEffect,useMemo,useState} from "react";
import {Plus} from "lucide-react";
import RecordListTools,{useRecordList,RecordCheckbox} from "@/components/RecordListTools";
import DataEntryModal from "@/components/DataEntryModal";
import {browserDb} from "@/lib/supabase";
import {downloadNarrativeDocx,loadReportIdentity,printNarrativeDocument} from "@/lib/report-engine";
import {isAdmin,type Role} from "@/lib/modules";
type Doc={id:string;kind:string;title:string;content:string;status:string;revision:number;created_by:string};
const kinds=["PBD","KSP","KOSP","RKJM","RKT","RKAS","SOP","SUPERVISION","TEACHING","REPORT","OTHER"];
export default function DocumentCenter({schoolId,userId,role,teacherOnly=false,focus}:{schoolId:string;userId:string;role:Role;teacherOnly?:boolean;focus?:string}){
 const db=useMemo(()=>browserDb(),[]),manager=isAdmin(role);
 const [docs,setDocs]=useState<Doc[]>([]),[selected,setSelected]=useState(""),[kind,setKind]=useState(teacherOnly?"TEACHING":"RKT"),[title,setTitle]=useState(""),[body,setBody]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState(""),[modal,setModal]=useState(false);
 useRealtimeRefresh(schoolId,()=>load());
 async function load(){if(!db)return;const {data,error}=await readAllRows(db.from("sc_documents").select("id,kind,title,content,status,revision,created_by").eq("school_id",schoolId).order("updated_at",{ascending:false}).order("id"));if(error)setError(error.message);else setDocs((data||[]) as Doc[])}
 useEffect(()=>{void load()},[db,schoolId]);
 function choose(id:string,open=true){setSelected(id);const d=docs.find(x=>x.id===id);setKind(d?.kind||(teacherOnly?"TEACHING":"RKT"));setTitle(d?.title||"");setBody(d?.content||"");if(open)setModal(true)}
 async function task(fn:()=>Promise<void>){setBusy(true);setError("");setOk("");try{await fn();await load();setOk("Perubahan dokumen tersimpan.")}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 async function save(submit:boolean){if(!db)return;await task(async()=>{const {data,error}=await db.rpc("sc_save_document",{p_school:schoolId,p_document:selected||null,p_kind:kind,p_title:title,p_content:body,p_submit:submit});if(error)throw error;setSelected(String(data||""));setModal(false)})}
 async function approve(id:string){if(!db)return;await task(async()=>{const {error}=await db.rpc("sc_approve_document",{p_school:schoolId,p_document:id});if(error)throw error})}
 async function remove(id:string){if(!db||!confirm("Hapus dokumen draft/review ini?"))return;await task(async()=>{const {error}=await db.rpc("sc_delete_auxiliary",{p_school:schoolId,p_entity:"document",p_id:id});if(error)throw error;if(selected===id){setSelected("");setTitle("");setBody("")}})}
 async function exportDoc(d:Doc,format:"docx"|"pdf"){if(!db)return;setBusy(true);setError("");try{const identity=await loadReportIdentity(db,schoolId);if(format==="docx")await downloadNarrativeDocx(identity,d);else printNarrativeDocument(identity,d);setOk(format==="docx"?"Word .docx asli berhasil dibuat.":"Dokumen siap dicetak / disimpan PDF.")}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 const documentKinds:Record<string,string[]>={"PBD/EDS":["PBD"],"KSP/KOSP":["KSP","KOSP"],"RKJM":["RKJM"],"RKT":["RKT"],"RKAS":["RKAS"],"SOP":["SOP"]};
 const focusedKinds=teacherOnly?["TEACHING","REPORT","OTHER"]:documentKinds[focus||""];
 const visibleDocs=docs.filter(d=>(!focusedKinds||focusedKinds.includes(d.kind))&&(!(focus||"").toLowerCase().includes("persetujuan")||d.status==="review"));
 const list=useRecordList(visibleDocs,d=>d.title+" "+d.kind,[{key:"status",label:"Status dokumen",options:["draft","review","approved","archived"].map(x=>({value:x,label:x})),value:d=>d.status}]);
 const canRemove=(id:string)=>{const d=visibleDocs.find(x=>x.id===id);return Boolean(d&&["draft","review"].includes(d.status)&&(manager||d.created_by===userId))};
 const editing=docs.find(d=>d.id===selected);const approvalOnly=(focus||"").toLowerCase().includes("persetujuan");
 return <>
  {!approvalOnly&&<section className="panel"><div className="sectionhead"><div><h2>Pusat Dokumen</h2><p className="muted">Dokumen kerja menggunakan editor, versi, review, dan persetujuan. Editor dibuka melalui popup agar daftar dokumen tetap bersih.</p></div><button className="button" onClick={()=>{setSelected("");setKind(teacherOnly?"TEACHING":documentKinds[focus||""]?.[0]||"RKT");setTitle("");setBody("");setModal(true)}}><Plus size={15}/> Buat Dokumen</button></div></section>}
  <section className="panel"><h2>{approvalOnly?"Persetujuan Dokumen":"Daftar Dokumen"}</h2><RecordListTools list={list} label="dokumen" canSelect={role!=="viewer"} selectable={canRemove} busy={busy} onRefresh={load} actions={[{key:"delete",label:"Hapus draft pilihan",description:"Hanya draft/review milik Anda atau yang boleh dikelola. Dokumen disahkan tetap dilindungi.",danger:true,eligible:canRemove,run:async id=>{if(!db)throw Error("Database belum terhubung");const {error}=await db.rpc("sc_delete_auxiliary",{p_school:schoolId,p_entity:"document",p_id:id});if(error)throw error}}]}/>{list.visible.map(d=><div className="entry" key={d.id}>{canRemove(d.id)&&<RecordCheckbox list={list} id={d.id} label={d.title} disabled={busy}/>}<div className="record-main"><strong>{d.title}</strong><small>{d.kind} · Versi {d.revision} · {d.status}</small></div><div className="flow">{!approvalOnly&&<button className="button secondary" onClick={()=>choose(d.id)}>Buka</button>}{approvalOnly&&<button className="button secondary" onClick={()=>choose(d.id)}>Lihat</button>}{manager&&d.status==="review"&&<button className="button" disabled={busy} onClick={()=>void approve(d.id)}>Setujui</button>}{["draft","review"].includes(d.status)&&(manager||d.created_by===userId)&&<button className="button danger" disabled={busy} onClick={()=>void remove(d.id)}>Hapus</button>}</div></div>)}{!visibleDocs.length&&<div className="empty">Belum ada dokumen.</div>}</section>
  <DataEntryModal open={modal} onClose={()=>setModal(false)} title={editing?"Editor Dokumen":"Buat Dokumen Baru"} subtitle="Pilih jenis dokumen, isi judul dan konten. Dokumen dapat disimpan sebagai draft atau langsung diajukan untuk review." wide>
   <div className="fields"><label className="field">Jenis dokumen<SearchableSelect label="Jenis dokumen" value={kind} onChange={e=>setKind(e.target.value)} disabled={!!editing&&["approved","archived"].includes(editing.status)}>{kinds.filter(k=>!teacherOnly||["TEACHING","REPORT","OTHER"].includes(k)).map(k=><option key={k} value={k}>{k}</option>)}</SearchableSelect></label><label className="field full">Judul<input value={title} maxLength={180} onChange={e=>setTitle(e.target.value)} disabled={!!editing&&["approved","archived"].includes(editing.status)}/></label><label className="field full">Isi<textarea value={body} rows={20} style={{minHeight:360}} onChange={e=>setBody(e.target.value)} disabled={!!editing&&["approved","archived"].includes(editing.status)}/></label></div>
   <div className="modal-actions"><button className="button secondary" onClick={()=>setModal(false)}>Tutup</button>{editing&&<><button className="button secondary" disabled={busy} onClick={()=>void exportDoc(editing,"docx")}>Word (.docx)</button><button className="button secondary" disabled={busy} onClick={()=>void exportDoc(editing,"pdf")}>Cetak / PDF</button></>}{!approvalOnly&&(!editing||!["approved","archived"].includes(editing.status))&&<><button className="button secondary" disabled={busy||title.trim().length<3} onClick={()=>void save(false)}>Simpan Draft</button><button className="button" disabled={busy||title.trim().length<3} onClick={()=>void save(true)}>Ajukan Review</button></>}</div>
  </DataEntryModal>
  {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </>;
}