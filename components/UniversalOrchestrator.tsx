"use client";

import {useEffect,useMemo,useState} from "react";
import {Check,ChevronRight,RotateCcw,Sparkles} from "lucide-react";
import {planWorkflow,type WorkflowPlan,type WorkflowStep} from "@/lib/orchestrator";
import {browserDb} from "@/lib/supabase";
import {modules,canAccess,type ModuleKey,type Role} from "@/lib/modules";

type WorkflowRun={id:string;title:string;request:string;status:string;updated_at:string};
type SavedStep={id:string;step_order:number;module_key:ModuleKey;feature:string;title:string;instruction:string;status:string};

export default function UniversalOrchestrator({role,schoolId,onRoute}:{role:Role;schoolId?:string;onRoute:(m:ModuleKey,feature?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]);
 const [request,setRequest]=useState(""),[submitted,setSubmitted]=useState("");
 const [plan,setPlan]=useState<WorkflowPlan|null>(null),[source,setSource]=useState("");
 const [done,setDone]=useState<Record<number,boolean>>({}),[stepRows,setStepRows]=useState<SavedStep[]>([]);
 const [activeRunId,setActiveRunId]=useState(""),[savedRuns,setSavedRuns]=useState<WorkflowRun[]>([]);
 const [busy,setBusy]=useState(false),[planning,setPlanning]=useState(false),[status,setStatus]=useState("");

 async function loadRuns(){
  if(!db||!schoolId)return;
  const {data,error}=await db.from("sc_workflow_runs").select("id,title,request,status,updated_at").eq("school_id",schoolId).order("updated_at",{ascending:false}).limit(10);
  if(error){setStatus(error.message);return;}
  setSavedRuns((data||[]) as WorkflowRun[]);
 }
 useEffect(()=>{void loadRuns()},[db,schoolId]);

 async function analyze(value:string){
  const clean=value.trim();if(clean.length<3)return;
  setSubmitted(clean);setPlan(null);setDone({});setStepRows([]);setActiveRunId("");setStatus("");setPlanning(true);
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
   const {data:run,error}=await db.from("sc_workflow_runs").insert({school_id:schoolId,user_id:user.id,request:submitted,title:plan.title,source}).select("id").single();if(error)throw error;
   const {data:rows,error:stepError}=await db.from("sc_workflow_steps").insert(plan.steps.map((x,i)=>({run_id:run.id,school_id:schoolId,step_order:i+1,module_key:x.module,feature:x.feature,title:x.title,instruction:x.instruction,status:i===0?"active":"pending"}))).select("id,step_order,module_key,feature,title,instruction,status").order("step_order");
   if(stepError)throw stepError;
   setActiveRunId(run.id);setStepRows((rows||[]) as SavedStep[]);await loadRuns();
   setStatus("Workflow tersimpan. Progres bisa dilanjutkan nanti.");
  }catch(e){setStatus(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }

 async function resume(run:WorkflowRun){
  if(!db)return;
  setBusy(true);setStatus("");
  try{
   const {data,error}=await db.from("sc_workflow_steps").select("id,step_order,module_key,feature,title,instruction,status").eq("run_id",run.id).order("step_order");
   if(error)throw error;
   const rows=(data||[]) as SavedStep[];
   const steps:WorkflowStep[]=rows.map(row=>({module:row.module_key,feature:row.feature,title:row.title,instruction:row.instruction,permitted:canAccess(modules.find(m=>m.key===row.module_key)!,role),matched:[]}));
   setRequest(run.request);setSubmitted(run.request);setPlan({title:run.title,reason:"Lanjutkan langkah yang belum selesai. Data yang sudah tersimpan tetap mengikuti izin tiap modul.",steps});
   setActiveRunId(run.id);setStepRows(rows);setDone(Object.fromEntries(rows.map((row,i)=>[i,row.status==="done"])));setSource("workflow tersimpan");
  }catch(e){setStatus(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }

 async function toggleStep(index:number){
  const next=!done[index];setDone(value=>({...value,[index]:next}));
  const row=stepRows[index];if(!db||!activeRunId||!row)return;
  const nextRow=stepRows[index+1];
  const {error}=await db.from("sc_workflow_steps").update({status:next?"done":"active",completed_at:next?new Date().toISOString():null}).eq("id",row.id);
  if(error){setDone(value=>({...value,[index]:!next}));setStatus(error.message);return;}
  if(nextRow&&next&&!done[index+1])await db.from("sc_workflow_steps").update({status:"active"}).eq("id",nextRow.id);
  const completed=Object.keys({...done,[index]:next}).filter(key=>({...done,[index]:next})[Number(key)]).length;
  await db.from("sc_workflow_runs").update({current_step_order:Math.min(completed+1,stepRows.length),status:completed===stepRows.length?"completed":"active",completed_at:completed===stepRows.length?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",activeRunId);
  await loadRuns();
 }

 const shortcuts=["Siswa sering alpa, sudah dibina, buat surat panggilan dan agenda orang tua","Dari PBD buat RKT lalu program kerja sampai laporan","Tagihan siswa sampai pembayaran, kuitansi dan buku kas","Pengajuan lembur sampai payroll dan slip"];
 return <section className="panel">
  <div className="sectionhead"><div><span className="pill"><Sparkles size={13}/> Universal AI Orchestrator</span><h2 style={{marginTop:10}}>Rencanakan pekerjaan lintas modul</h2><p className="muted">Susun langkah lintas modul, periksa hak akses, lalu simpan dan lanjutkan progres kapan pun.</p></div></div>
  <form onSubmit={event=>{event.preventDefault();void analyze(request)}} className="fields"><label className="field full">Permintaan<textarea value={request} onChange={event=>setRequest(event.target.value)} rows={4} placeholder="Contoh: siswa sering alpa, sudah dua kali dibina, buat surat panggilan orang tua dan jadwalkan pertemuan"/></label><button className="button" disabled={request.trim().length<3||planning}>{planning?"Menyusun…":"Susun Workflow"}</button></form>
  <div className="flow" style={{marginTop:12}}>{shortcuts.map(item=><button type="button" key={item} className="button secondary" onClick={()=>{setRequest(item);void analyze(item)}}>{item.length>34?item.slice(0,34)+"…":item}</button>)}</div>
  {savedRuns.length>0&&<div className="panel" style={{marginTop:14}}><strong>Workflow tersimpan</strong><div className="flow" style={{marginTop:8}}>{savedRuns.map(run=><button type="button" key={run.id} className="button secondary" disabled={busy} onClick={()=>void resume(run)}>{run.title} · {run.status}</button>)}</div></div>}
  {planning&&<div className="banner" role="status">Menyusun urutan kerja dan memeriksa hak akses…</div>}
  {plan&&<div style={{marginTop:18}}><div className="sectionhead"><div><h3>{plan.title}</h3><p className="muted">{plan.reason}</p><small>Rencana: {source}</small></div>{schoolId&&!activeRunId&&<button className="button secondary" disabled={busy||!plan.steps.length} onClick={()=>void persist()}>{busy?"Menyimpan…":"Simpan Workflow"}</button>}</div>
   {plan.steps.map((step,index)=><article className="entry" key={stepRows[index]?.id||index} style={{alignItems:"flex-start"}}><button className="iconbutton" disabled={busy} onClick={()=>void toggleStep(index)} aria-label={done[index]?"Tandai belum selesai":"Tandai selesai"}>{done[index]?<Check size={16}/>:<span style={{fontWeight:800}}>{index+1}</span>}</button><div style={{flex:1}}><strong>{step.title}</strong><small>{step.module} · {step.feature||"Ruang kerja utama"}</small><p>{step.instruction}</p>{!step.permitted&&<div className="banner error">Peran ini tidak mempunyai akses ke langkah tersebut.</div>}</div>{step.permitted&&<button className="button secondary" disabled={index>0&&!done[index-1]} onClick={()=>onRoute(step.module,step.feature)}>Buka <ChevronRight size={14}/></button>}</article>)}
   {!plan.steps.length&&<div className="empty">Tambahkan objek pekerjaan yang lebih spesifik agar workflow dapat disusun.</div>}
   {status&&<div className="banner" role="status">{status}</div>}
   <button className="button secondary" style={{marginTop:12}} onClick={()=>{setSubmitted("");setPlan(null);setDone({});setStepRows([]);setActiveRunId("");setStatus("")}}><RotateCcw size={14}/> Reset</button>
  </div>}
 </section>;
}
