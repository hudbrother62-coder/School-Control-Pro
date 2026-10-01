"use client";
import {useEffect,useMemo,useState} from "react";
import {AlertTriangle,Check,ChevronRight,Clock3,PauseCircle,PlayCircle,RotateCcw,Sparkles,XCircle} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import type {ModuleKey,Role} from "@/lib/modules";

type PlanStep={
 module:ModuleKey;
 feature:string;
 title:string;
 instruction:string;
 permitted:boolean;
 matched?:string[];
 depends_on?:number[];
 required_data?:string[];
 handoff?:Record<string,unknown>;
};
type Plan={title:string;reason:string;steps:PlanStep[];context_summary?:string};
type Run={
 id:string;title:string;request:string;status:string;current_step_order:number|null;source:string;
 context:Record<string,unknown>;created_at:string;updated_at:string;completed_at:string|null;
};
type StoredStep={
 id:string;run_id:string;step_order:number;module_key:ModuleKey;feature:string;title:string;
 instruction:string|null;status:string;blocked_reason:string|null;context:Record<string,unknown>;
 depends_on:number[];completed_at:string|null;updated_at:string;
};
const shortcuts=[
 "Siswa sering alpa, sudah dibina, buat surat panggilan dan agenda orang tua",
 "Dari PBD buat RKT lalu program kerja sampai laporan",
 "Tagihan siswa sampai pembayaran, kuitansi dan buku kas",
 "Pengajuan lembur sampai payroll dan slip gaji",
 "Buat perangkat ajar lalu sambungkan ke jadwal, jurnal, presensi dan penilaian"
];

export default function UniversalOrchestrator({role,schoolId,focus,onRoute}:{role:Role;schoolId:string;focus?:string;onRoute:(m:ModuleKey,feature?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]);
 const [request,setRequest]=useState("");
 const [plan,setPlan]=useState<Plan|null>(null);
 const [source,setSource]=useState("");
 const [runs,setRuns]=useState<Run[]>([]);
 const [activeRunId,setActiveRunId]=useState("");
 const [steps,setSteps]=useState<StoredStep[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");

 const activeRun=runs.find(r=>r.id===activeRunId)||null;
 const activeSteps=steps.filter(s=>s.run_id===activeRunId).sort((a,b)=>a.step_order-b.step_order);
 const completedCount=activeSteps.filter(s=>["completed","skipped"].includes(s.status)).length;
 const percent=activeSteps.length?Math.round(completedCount/activeSteps.length*100):0;

 async function loadRuns(preferId?:string){
  if(!db)return;
  const {data:{user}}=await db.auth.getUser();
  if(!user)return;
  const {data,error:e}=await db.from("sc_workflow_runs")
   .select("id,title,request,status,current_step_order,source,context,created_at,updated_at,completed_at")
   .eq("school_id",schoolId).eq("user_id",user.id).order("updated_at",{ascending:false}).limit(40);
  if(e){setError(e.message);return}
  const list=(data||[]) as Run[];
  setRuns(list);
  const next=preferId||activeRunId||list.find(x=>x.status==="active")?.id||list[0]?.id||"";
  if(next){setActiveRunId(next);await loadSteps(next)}
 }
 async function loadSteps(runId:string){
  if(!db||!runId){setSteps([]);return}
  const {data,error:e}=await db.from("sc_workflow_steps")
   .select("id,run_id,step_order,module_key,feature,title,instruction,status,blocked_reason,context,depends_on,completed_at,updated_at")
   .eq("run_id",runId).order("step_order");
  if(e){setError(e.message);return}
  setSteps((data||[]) as StoredStep[]);
 }
 useEffect(()=>{void loadRuns()},[db,schoolId]);
 useEffect(()=>{if(activeRunId)void loadSteps(activeRunId)},[activeRunId]);

 async function makePlan(value?:string){
  const input=(value??request).trim();
  if(input.length<3||!db)return;
  setBusy(true);setError("");setMessage("");setPlan(null);
  try{
   const {data:{session}}=await db.auth.getSession();
   if(!session)throw Error("Sesi berakhir. Silakan masuk kembali.");
   const response=await fetch("/api/orchestrator",{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
    body:JSON.stringify({school_id:schoolId,request:input})
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"Orchestrator tidak dapat menyusun workflow.");
   setRequest(input);
   setPlan(result.plan as Plan);
   setSource(String(result.source||"ai"));
   setMessage(result.source==="ai"?"Workflow disusun oleh AI dari katalog fitur dan konteks sekolah yang boleh dibaca role ini.":"AI provider tidak tersedia; workflow aman disusun oleh fallback internal.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }

 async function savePlan(){
  if(!db||!plan||request.trim().length<3)return;
  setBusy(true);setError("");setMessage("");
  try{
   const {data:{user}}=await db.auth.getUser();
   if(!user)throw Error("Sesi berakhir.");
   const {data:run,error:rErr}=await db.from("sc_workflow_runs").insert({
    school_id:schoolId,user_id:user.id,request:request.trim(),title:plan.title,status:"active",
    current_step_order:plan.steps.length?1:null,source:source||"ai",
    context:{reason:plan.reason,context_summary:plan.context_summary||"",planned_at:new Date().toISOString()}
   }).select("id").single();
   if(rErr)throw rErr;
   if(plan.steps.length){
    const rows=plan.steps.map((s,i)=>({
     run_id:run.id,school_id:schoolId,step_order:i+1,module_key:s.module,feature:s.feature,title:s.title,
     instruction:s.instruction,status:i===0?"active":"pending",
     depends_on:i===0?[]:[i],
     context:{matched:s.matched||[],required_data:s.required_data||[],handoff:s.handoff||{}}
    }));
    const {error:sErr}=await db.from("sc_workflow_steps").insert(rows);
    if(sErr)throw sErr;
   }
   setPlan(null);
   setMessage("Workflow disimpan. Progres sekarang persisten dan bisa dilanjutkan kapan saja.");
   await loadRuns(run.id);
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }

 async function updateStep(step:StoredStep,status:string,blockedReason:string|null=null){
  if(!db||!activeRun)return;
  setBusy(true);setError("");setMessage("");
  try{
   const completed=status==="completed"||status==="skipped";
   const {error:e}=await db.from("sc_workflow_steps").update({
    status,blocked_reason:blockedReason,completed_at:completed?new Date().toISOString():null,updated_at:new Date().toISOString()
   }).eq("id",step.id);
   if(e)throw e;
   const ordered=activeSteps.map(x=>x.id===step.id?{...x,status}:x);
   const next=ordered.find(x=>!["completed","skipped"].includes(x.status)&&x.id!==step.id);
   if(completed&&next&&next.status==="pending"){
    await db.from("sc_workflow_steps").update({status:"active",updated_at:new Date().toISOString()}).eq("id",next.id);
   }
   const remaining=ordered.some(x=>!["completed","skipped"].includes(x.status));
   const runPatch=remaining?{
    status:"active",current_step_order:next?.step_order||step.step_order,updated_at:new Date().toISOString(),last_error:blockedReason
   }:{
    status:"completed",current_step_order:null,updated_at:new Date().toISOString(),completed_at:new Date().toISOString(),last_error:null
   };
   const {error:rErr}=await db.from("sc_workflow_runs").update(runPatch).eq("id",activeRun.id);
   if(rErr)throw rErr;
   setMessage(remaining?"Status langkah diperbarui. Workflow siap dilanjutkan.":"Workflow selesai dan disimpan ke riwayat.");
   await loadRuns(activeRun.id);
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }

 async function blockStep(step:StoredStep){
  const reason=window.prompt("Data apa yang masih kurang atau apa yang menghalangi langkah ini?")?.trim();
  if(!reason)return;
  await updateStep(step,"blocked",reason);
 }

 async function reopenRun(run:Run){
  if(!db)return;
  setBusy(true);setError("");
  try{
   const {error:e}=await db.from("sc_workflow_runs").update({status:"active",completed_at:null,updated_at:new Date().toISOString()}).eq("id",run.id);
   if(e)throw e;
   await loadRuns(run.id);
   setMessage("Workflow dibuka kembali.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }

 async function cancelRun(run:Run){
  if(!db||!window.confirm("Batalkan workflow ini? Riwayat langkah tetap disimpan."))return;
  setBusy(true);setError("");
  try{
   const {error:e}=await db.from("sc_workflow_runs").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",run.id);
   if(e)throw e;
   await loadRuns(run.id);
   setMessage("Workflow dibatalkan tanpa menghapus riwayat.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }

 function openStep(step:StoredStep){
  try{
   sessionStorage.setItem("school-control-orchestrator-context",JSON.stringify({
    run_id:activeRun?.id,workflow_title:activeRun?.title,request:activeRun?.request,
    step_order:step.step_order,step_title:step.title,instruction:step.instruction,context:step.context
   }));
  }catch{}
  onRoute(step.module_key,step.feature);
 }

 const feedback=<>{error&&<div className="banner error">{error}</div>}{message&&<div className="banner success">{message}</div>}</>;
 const showNew=!focus||focus==="Workflow Baru";
 const showActive=!focus||focus==="Workflow Aktif";
 const showHistory=focus==="Riwayat Workflow";

 return <div>
  {showNew&&<section className="panel">
   <div className="sectionhead"><div><span className="pill"><Sparkles size={13}/> Universal AI Orchestrator</span><h2 style={{marginTop:10}}>Satu permintaan → workflow lintas modul</h2><p className="muted">AI menyusun urutan kerja dari fitur yang benar-benar ada, role pengguna, dan ringkasan data sekolah yang boleh diakses. Perubahan data tetap membutuhkan tindakan pengguna.</p></div></div>
   <form onSubmit={e=>{e.preventDefault();void makePlan()}} className="fields">
    <label className="field full">Tujuan pekerjaan<textarea value={request} onChange={e=>setRequest(e.target.value)} rows={5} placeholder="Contoh: siswa sering alpa, sudah dua kali dibina, buat surat panggilan orang tua lalu jadwalkan pertemuan"/></label>
    <button className="button" disabled={busy||request.trim().length<3}>{busy?"Menyusun…":"Susun Workflow AI"}</button>
   </form>
   <div className="flow" style={{marginTop:12}}>{shortcuts.map(k=><button type="button" key={k} className="button secondary" onClick={()=>void makePlan(k)}>{k.length>38?k.slice(0,38)+"…":k}</button>)}</div>
   {plan&&<div style={{marginTop:20}}>
    <div className="sectionhead"><div><h3>{plan.title}</h3><p className="muted">{plan.reason}</p>{plan.context_summary&&<p className="hint">{plan.context_summary}</p>}</div><span className="pill">{source==="ai"?"AI planner":"fallback"}</span></div>
    {plan.steps.map((s,i)=><article className="entry" key={i}><div style={{display:"flex",gap:12,flex:1}}><span className="pill">{i+1}</span><div><strong>{s.title}</strong><small>{s.module} · {s.feature}</small><p>{s.instruction}</p>{s.required_data?.length?<small>Data yang perlu tersedia: {s.required_data.join(", ")}</small>:null}{!s.permitted&&<div className="banner error">Role ini tidak diizinkan membuka langkah tersebut.</div>}</div></div></article>)}
    <div className="flow" style={{marginTop:14}}><button className="button" disabled={busy||!plan.steps.length} onClick={()=>void savePlan()}>Simpan & Mulai Workflow</button><button className="button secondary" onClick={()=>{setPlan(null);setMessage("")}}><RotateCcw size={14}/> Susun Ulang</button></div>
   </div>}
   {feedback}
  </section>}

  {showActive&&<section className="panel">
   <div className="sectionhead"><div><h2>Workflow Aktif</h2><p className="muted">Langkah tersimpan di database. Status selesai, tertahan, dilewati, dan posisi terakhir tidak hilang saat pindah menu atau login ulang.</p></div><Clock3/></div>
   <div className="fields"><label className="field full">Pilih workflow<select value={activeRunId} onChange={e=>setActiveRunId(e.target.value)}><option value="">Belum ada workflow</option>{runs.filter(r=>r.status!=="cancelled").map(r=><option key={r.id} value={r.id}>{r.status==="completed"?"✓ ":""}{r.title} · {r.status}</option>)}</select></label></div>
   {activeRun&&<><div className="grid" style={{marginTop:14}}><div className="card"><label>Status</label><strong style={{fontSize:20}}>{activeRun.status}</strong></div><div className="card"><label>Progres</label><strong style={{fontSize:20}}>{percent}%</strong></div><div className="card"><label>Langkah</label><strong style={{fontSize:20}}>{completedCount}/{activeSteps.length}</strong></div><div className="card"><label>Planner</label><strong style={{fontSize:20}}>{activeRun.source||"—"}</strong></div></div>
    <div className="banner" style={{marginTop:14}}><strong>{activeRun.request}</strong><p style={{marginBottom:0}}>{String(activeRun.context?.reason||"")}</p></div>
    {activeSteps.map(step=><article className="entry" key={step.id} style={{alignItems:"flex-start"}}>
     <div style={{minWidth:38}}>{step.status==="completed"?<Check size={20}/>:step.status==="blocked"?<AlertTriangle size={20}/>:step.status==="active"?<PlayCircle size={20}/>:step.status==="skipped"?<XCircle size={20}/>:<PauseCircle size={20}/>}</div>
     <div style={{flex:1}}><strong>{step.step_order}. {step.title}</strong><small>{step.module_key} · {step.feature} · {step.status}</small><p>{step.instruction||""}</p>{step.blocked_reason&&<div className="banner error">{step.blocked_reason}</div>}</div>
     <div className="flow">
      {!["completed","skipped"].includes(step.status)&&<button className="button secondary" onClick={()=>openStep(step)}>Buka <ChevronRight size={14}/></button>}
      {!["completed","skipped"].includes(step.status)&&<button className="button" disabled={busy} onClick={()=>void updateStep(step,"completed")}><Check size={14}/> Selesai</button>}
      {!["completed","skipped"].includes(step.status)&&<button className="button secondary" disabled={busy} onClick={()=>void blockStep(step)}>Perlu Data</button>}
      {step.status==="blocked"&&<button className="button secondary" disabled={busy} onClick={()=>void updateStep(step,"active")}>Lanjutkan</button>}
     </div>
    </article>)}
    <div className="flow" style={{marginTop:14}}>{activeRun.status==="completed"&&<button className="button secondary" onClick={()=>void reopenRun(activeRun)}>Buka Kembali</button>}{activeRun.status==="active"&&<button className="button danger" onClick={()=>void cancelRun(activeRun)}>Batalkan Workflow</button>}</div>
   </>}
   {!activeRun&&<div className="empty">Belum ada workflow tersimpan. Buat dari menu Workflow Baru.</div>}
   {feedback}
  </section>}

  {showHistory&&<section className="panel">
   <div className="sectionhead"><div><h2>Riwayat Workflow</h2><p className="muted">Semua workflow pengguna ini tetap dapat dibuka ulang tanpa kehilangan urutan dan status langkah.</p></div><Clock3/></div>
   {runs.map(r=><div className="entry" key={r.id}><div><strong>{r.title}</strong><small>{new Date(r.updated_at).toLocaleString("id-ID")} · {r.status} · {r.source}</small><p>{r.request}</p></div><div className="flow"><button className="button secondary" onClick={()=>{setActiveRunId(r.id);void loadSteps(r.id)}}>Lihat</button>{r.status!=="active"&&<button className="button secondary" onClick={()=>void reopenRun(r)}>Resume</button>}</div></div>)}
   {!runs.length&&<div className="empty">Belum ada riwayat workflow.</div>}
   {feedback}
  </section>}
 </div>;
}
