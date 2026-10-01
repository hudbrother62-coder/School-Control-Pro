"use client";
import {useMemo,useState} from "react";
import {Check,ChevronRight,RotateCcw,Sparkles} from "lucide-react";
import {planWorkflow,type WorkflowPlan} from "@/lib/orchestrator";
import {browserDb} from "@/lib/supabase";
import type {ModuleKey,Role} from "@/lib/modules";

export default function UniversalOrchestrator({role,schoolId,onRoute}:{role:Role;schoolId?:string;onRoute:(m:ModuleKey,feature?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]),[request,setRequest]=useState(""),[submitted,setSubmitted]=useState(""),[plan,setPlan]=useState<WorkflowPlan|null>(null),[done,setDone]=useState<Record<number,boolean>>({}),[busy,setBusy]=useState(false),[planning,setPlanning]=useState(false),[source,setSource]=useState(""),[status,setStatus]=useState("");
 async function analyze(value:string){
  const clean=value.trim();if(clean.length<3)return;
  setSubmitted(clean);setPlan(null);setDone({});setStatus("");setPlanning(true);
  try{
   const {data:{session}}=db?await db.auth.getSession():{data:{session:null}};
   if(!session){setPlan(planWorkflow(clean,role));setSource("rencana lokal");return;}
   const response=await fetch("/api/orchestrator",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({school_id:schoolId,request:clean})});
   const result=await response.json();if(!response.ok||!result.plan)throw Error(result.error||"Perencana AI belum tersedia.");
   setPlan(result.plan as WorkflowPlan);setSource(result.source==="ai"?"dibantu AI":"rencana sistem");
  }catch{setPlan(planWorkflow(clean,role));setSource("rencana lokal");}
  finally{setPlanning(false);}
 }
 async function persist(){
  if(!db||!schoolId||!plan||!submitted)return;
  setBusy(true);setStatus("");
  try{
   const {data:{user}}=await db.auth.getUser();if(!user)throw Error("Sesi berakhir.");
   const {data:run,error}=await db.from("sc_workflow_runs").insert({school_id:schoolId,user_id:user.id,request:submitted,title:plan.title}).select("id").single();if(error)throw error;
   if(plan.steps.length){const {error:s}=await db.from("sc_workflow_steps").insert(plan.steps.map((x,i)=>({run_id:run.id,school_id:schoolId,step_order:i+1,module_key:x.module,feature:x.feature,title:x.title,instruction:x.instruction,status:i===0?"active":"pending"})));if(s)throw s}
   setStatus("Workflow disimpan. Progres dapat dilanjutkan tanpa mengulang perencanaan.");
  }catch(e){setStatus(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 const shortcuts=["Siswa sering alpa, sudah dibina, buat surat panggilan dan agenda orang tua","Dari PBD buat RKT lalu program kerja sampai laporan","Tagihan siswa sampai pembayaran, kuitansi dan buku kas","Pengajuan lembur sampai payroll dan slip"];
 return <section className="panel"><div className="sectionhead"><div><span className="pill"><Sparkles size={13}/> Universal AI Orchestrator</span><h2 style={{marginTop:10}}>Rencanakan pekerjaan lintas modul</h2><p className="muted">Permintaan dipecah menjadi beberapa langkah dengan urutan data yang benar. Tidak ada perubahan data otomatis sebelum Anda membuka dan mengonfirmasi fitur tujuan.</p></div></div><form onSubmit={e=>{e.preventDefault();void analyze(request)}} className="fields"><label className="field full">Permintaan<textarea value={request} onChange={e=>setRequest(e.target.value)} rows={4} placeholder="Contoh: siswa sering alpa, sudah dua kali dibina, buat surat panggilan orang tua dan jadwalkan pertemuan"/></label><button className="button" disabled={request.trim().length<3||planning}>{planning?"Menyusun…":"Susun Workflow"}</button></form><div className="flow" style={{marginTop:12}}>{shortcuts.map(k=><button type="button" key={k} className="button secondary" onClick={()=>{setRequest(k);void analyze(k)}}>{k.length>34?k.slice(0,34)+"…":k}</button>)}</div>{planning&&<div className="banner" role="status">Menyusun urutan kerja dan memeriksa hak akses…</div>}{plan&&<div style={{marginTop:18}}><div className="sectionhead"><div><h3>{plan.title}</h3><p className="muted">{plan.reason}</p><small>Rencana: {source}</small></div>{schoolId&&<button className="button secondary" disabled={busy||!plan.steps.length} onClick={()=>void persist()}>{busy?"Menyimpan…":"Simpan Workflow"}</button>}</div>{plan.steps.map((s,i)=><article className="entry" key={i} style={{alignItems:"flex-start"}}><button className="iconbutton" onClick={()=>setDone(v=>({...v,[i]:!v[i]}))} aria-label="Tandai selesai">{done[i]?<Check size={16}/>:<span style={{fontWeight:800}}>{i+1}</span>}</button><div style={{flex:1}}><strong>{s.title}</strong><small>{s.module} · {s.feature||"Ruang kerja utama"}</small><p>{s.instruction}</p>{!s.permitted&&<div className="banner error">Peran ini tidak mempunyai akses ke langkah tersebut.</div>}</div>{s.permitted&&<button className="button secondary" onClick={()=>onRoute(s.module,s.feature)}>Buka <ChevronRight size={14}/></button>}</article>)}{!plan.steps.length&&<div className="empty">Tambahkan objek pekerjaan yang lebih spesifik agar workflow dapat disusun.</div>}{status&&<div className="banner">{status}</div>}<button className="button secondary" style={{marginTop:12}} onClick={()=>{setSubmitted("");setPlan(null);setDone({});setStatus("")}}><RotateCcw size={14}/> Reset</button></div>}</section>;
}
