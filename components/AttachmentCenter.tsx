"use client";
import {useEffect,useMemo,useState} from "react";
import {ExternalLink,File,Paperclip,Search} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import type {ModuleKey,Role} from "@/lib/modules";

type Attachment={
 id:string;title:string;meta:string;path:string;created_at:string;
 module:ModuleKey;feature:string;kind:string;
};

export default function AttachmentCenter({schoolId,role,onRoute}:{schoolId:string;role:Role;onRoute:(m:ModuleKey,f?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]);
 const [items,setItems]=useState<Attachment[]>([]),[query,setQuery]=useState(""),[kind,setKind]=useState(""),[error,setError]=useState("");
 const canFinance=["owner","principal","treasurer","finance_staff"].includes(role);
 const canHead=["owner","principal","vice_principal","hr"].includes(role);

 async function load(){
  if(!db)return;setError("");
  const reads=await Promise.allSettled([
   db.from("sc_evidence").select("id,target_type,target_id,file_path,description,status,created_at").eq("school_id",schoolId).order("created_at",{ascending:false}).limit(300),
   canFinance?db.from("sc_finance_transactions").select("id,number,category,description,proof_path,occurred_at,created_at").eq("school_id",schoolId).not("proof_path","is",null).order("created_at",{ascending:false}).limit(200):Promise.resolve({data:[]}),
   canFinance?db.from("sc_bill_payments").select("id,receipt_no,proof_path,paid_at").eq("school_id",schoolId).not("proof_path","is",null).order("paid_at",{ascending:false}).limit(200):Promise.resolve({data:[]}),
   ["owner","principal","vice_principal"].includes(role)?db.from("sc_document_sources").select("id,document_id,title,source_type,storage_path,created_at").eq("school_id",schoolId).not("storage_path","is",null).order("created_at",{ascending:false}).limit(200):Promise.resolve({data:[]}),
   canHead?db.from("sc_staff_events").select("id,title,event_type,evidence_path,occurred_at,created_at").eq("school_id",schoolId).not("evidence_path","is",null).order("created_at",{ascending:false}).limit(200):Promise.resolve({data:[]})
  ]);
  const val=(i:number)=>reads[i].status==="fulfilled"?((reads[i] as PromiseFulfilledResult<any>).value.data||[]):[];
  const out:Attachment[]=[];
  for(const x of val(0))out.push({id:"ev-"+x.id,title:x.description||"Bukti "+x.target_type,meta:x.target_type+" · "+x.status,path:x.file_path,created_at:x.created_at,module:"command",feature:"Bukti Kegiatan",kind:"Bukti Kegiatan"});
  for(const x of val(1))out.push({id:"tx-"+x.id,title:(x.number||"Transaksi")+" · "+x.category,meta:x.description||"Bukti transaksi",path:x.proof_path,created_at:x.created_at,module:"sikas",feature:"Bukti Transaksi",kind:"Keuangan"});
  for(const x of val(2))out.push({id:"pay-"+x.id,title:"Kuitansi "+x.receipt_no,meta:"Bukti pembayaran siswa",path:x.proof_path,created_at:x.paid_at,module:"sikas",feature:"Riwayat Pembayaran",kind:"Pembayaran"});
  for(const x of val(3))out.push({id:"src-"+x.id,title:x.title,meta:"Sumber dokumen · "+x.source_type,path:x.storage_path,created_at:x.created_at,module:"kepsek_ai",feature:"Sumber Dokumen",kind:"Dokumen Sumber"});
  for(const x of val(4))out.push({id:"staff-"+x.id,title:x.title,meta:x.event_type+" · "+x.occurred_at,path:x.evidence_path,created_at:x.created_at,module:"kepsek_ai",feature:"Kinerja Kepala Sekolah",kind:"Bukti Kinerja"});
  setItems(out.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))));
 }
 useEffect(()=>{void load()},[db,schoolId,role]);

 async function open(path:string){
  if(!db)return;
  const {data,error:e}=await db.storage.from("sc-evidence").createSignedUrl(path,180);
  if(e){setError(e.message);return}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 const kinds=[...new Set(items.map(x=>x.kind))];
 const shown=items.filter(x=>(!kind||x.kind===kind)&&(x.title+" "+x.meta+" "+x.kind).toLowerCase().includes(query.toLowerCase()));

 return <section className="panel">
  <div className="sectionhead"><div><h2>Attachment Center</h2><p className="muted">Satu indeks untuk bukti program, keuangan, pembayaran, sumber dokumen dan bukti kinerja. Hak akses tetap mengikuti modul asal; file tidak disalin atau diduplikasi.</p></div><Paperclip/></div>
  <div className="fields"><label className="field full"><span>Cari lampiran</span><div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nama file, kuitansi, kategori, bukti…"/></div></label><label className="field">Jenis<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Semua yang dapat diakses</option>{kinds.map(k=><option key={k}>{k}</option>)}</select></label></div>
  <div className="grid" style={{marginTop:16}}><div className="card"><label>Total terlihat</label><strong>{shown.length}</strong></div><div className="card"><label>Program</label><strong>{shown.filter(x=>x.kind==="Bukti Kegiatan").length}</strong></div><div className="card"><label>Keuangan</label><strong>{shown.filter(x=>["Keuangan","Pembayaran"].includes(x.kind)).length}</strong></div><div className="card"><label>Dokumen/Kinerja</label><strong>{shown.filter(x=>["Dokumen Sumber","Bukti Kinerja"].includes(x.kind)).length}</strong></div></div>
  <div style={{marginTop:16}}>{shown.map(x=><div className="entry" key={x.id}><File size={18}/><div style={{flex:1}}><strong>{x.title}</strong><small>{x.kind} · {x.meta} · {new Date(x.created_at).toLocaleString("id-ID")}</small></div><div className="flow"><button className="button secondary" onClick={()=>void open(x.path)}><ExternalLink size={14}/> Buka</button><button className="button secondary" onClick={()=>onRoute(x.module,x.feature)}>Lihat Sumber</button></div></div>)}{!shown.length&&<div className="empty">Belum ada lampiran yang dapat diakses pada filter ini.</div>}</div>
  {error&&<div className="banner error">{error}</div>}
 </section>;
}