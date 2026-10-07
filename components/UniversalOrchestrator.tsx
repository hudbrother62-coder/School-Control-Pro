"use client";

import {useRealtimeRefresh} from "@/lib/school-realtime";
import {errorMessage} from "@/lib/error-message";
import {useEffect,useMemo,useState} from "react";
import {AlertTriangle,Check,ChevronRight,Clock3,Database,Eye,FileCheck2,GitBranch,Layers3,LockKeyhole,Play,RotateCcw,ShieldCheck,Sparkles} from "lucide-react";
import {resolveWorkspaceRoute} from "@/lib/workspace-navigation";
import {planWorkflow,type WorkflowPlan,type WorkflowRisk,type WorkflowStep,type ExecutionMode} from "@/lib/orchestrator";
import {browserDb} from "@/lib/supabase";
import type {ModuleKey,Role} from "@/lib/modules";

type CoachTurn={role:"user"|"assistant";content:string};
type CoachResponse={message:string;refined_goal:string;missing_inputs:string[];suggested_modules:string[]};
type WorkflowRun={id:string;title:string;request:string;status:string;updated_at:string;source?:string;context?:any};
type SavedStep={id:string;step_order:number;module_key:ModuleKey;feature:string;title:string;instruction:string;status:string;context?:any};
const riskLabel:Record<WorkflowRisk,string>={low:"Rendah",medium:"Sedang",high:"Tinggi",critical:"Kritis"};
const riskClass:Record<WorkflowRisk,string>={low:"risk-low",medium:"risk-medium",high:"risk-high",critical:"risk-critical"};
const compact=(value:string,max=52)=>value.length>max?value.slice(0,max-1)+"…":value;

export default function UniversalOrchestrator({role,schoolId,onRoute}:{role:Role;schoolId?:string;onRoute:(m:ModuleKey,feature?:string)=>void}){
 const db=useMemo(()=>browserDb(),[]);
 const [request,setRequest]=useState(""),[sources,setSources]=useState(""),[executionMode,setExecutionMode]=useState<ExecutionMode>("guided");
 const [submitted,setSubmitted]=useState(""),[plan,setPlan]=useState<WorkflowPlan|null>(null),[source,setSource]=useState("");
 const [done,setDone]=useState<Record<number,boolean>>({}),[approvals,setApprovals]=useState<Record<number,boolean>>({}),[stepRows,setStepRows]=useState<SavedStep[]>([]);
 const [activeRunId,setActiveRunId]=useState(""),[savedRuns,setSavedRuns]=useState<WorkflowRun[]>([]);
 const [busy,setBusy]=useState(false),[planning,setPlanning]=useState(false),[status,setStatus]=useState("");
 const [coachInput,setCoachInput]=useState(""),[coachBusy,setCoachBusy]=useState(false),[coachError,setCoachError]=useState("");
 const [coachMessages,setCoachMessages]=useState<CoachTurn[]>([]),[coachResult,setCoachResult]=useState<CoachResponse|null>(null),[coachContext,setCoachContext]=useState("");

 useRealtimeRefresh(schoolId||"",()=>loadRuns());
 async function loadRuns(){
  if(!db||!schoolId)return;
  const {data,error}=await db.from("sc_workflow_runs").select("id,title,request,status,updated_at,source,context").eq("school_id",schoolId).order("updated_at",{ascending:false}).limit(8);
  if(error){setStatus(error.message);return;}
  setSavedRuns((data||[]) as WorkflowRun[]);
 }
 useEffect(()=>{void loadRuns()},[db,schoolId]);

 async function consult(value:string){
  const text=value.trim();if(text.length<3||!schoolId||!db)return;
  setCoachBusy(true);setCoachError("");setCoachResult(null);
  try{
   const {data:{session}}=await db.auth.getSession();if(!session)throw Error("Silakan masuk untuk menggunakan Asisten AI.");
   const response=await fetch("/api/orchestrator",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
    body:JSON.stringify({school_id:schoolId,assistant_mode:"consult",request:text,context_sources:sources,conversation:coachMessages.slice(-8)})});
   const result=await response.json();if(!response.ok||!result.assistant)throw Error(result.error||"Asisten AI tidak tersedia.");
   const answer=result.assistant as CoachResponse;
   setCoachMessages(items=>[...items,{role:"user" as const,content:text},{role:"assistant" as const,content:answer.message}].slice(-12));
   setCoachResult(answer);setCoachInput("");
   setCoachContext(result.context?.status==="included"?"Menggunakan agregat dan memori sekolah sesuai akses.":"Menggunakan pengetahuan umum dan katalog fitur; agregat sekolah belum tersedia.");
  }catch(e){setCoachError(errorMessage(e));}finally{setCoachBusy(false)}
 }
 async function analyze(value:string){
  const clean=value.trim();if(clean.length<3)return;
  setSubmitted(clean);setPlan(null);setDone({});setApprovals({});setStepRows([]);setActiveRunId("");setStatus("");setPlanning(true);
  try{
   const {data:{session}}=db?await db.auth.getSession():{data:{session:null}};
   if(!session){setPlan({...planWorkflow(clean,role),executionMode});setSource("rencana lokal");return;}
   const response=await fetch("/api/orchestrator",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({school_id:schoolId,request:clean,context_sources:sources.trim(),execution_mode:executionMode,conversation:coachMessages.slice(-8)})});
   const result=await response.json();if(!response.ok||!result.plan)throw Error(result.error||"Perencana AI belum tersedia.");
   setPlan(result.plan as WorkflowPlan);setSource(result.source==="ai"?"Gemini + policy engine":"aturan lokal");if(result.warning)setStatus(String(result.warning));
  }catch(e){setPlan({...planWorkflow(clean,role),executionMode});setSource("rencana lokal aman");setStatus("Gemini tidak dapat digunakan: "+errorMessage(e)+". Rencana lokal tetap tersedia.");}
  finally{setPlanning(false);}
 }

 async function persist(){
  if(!db||!schoolId||!plan||!submitted)return;
  setBusy(true);setStatus("");
  try{
   const {data:{user}}=await db.auth.getUser();if(!user)throw Error("Sesi berakhir.");
   const runContext={uao_version:"2.0",execution_mode:plan.executionMode,sources:sources.trim(),plan:{title:plan.title,objective:plan.objective,reason:plan.reason,riskLevel:plan.riskLevel,autonomyLevel:plan.autonomyLevel,executionMode:plan.executionMode,acceptanceCriteria:plan.acceptanceCriteria,impact:plan.impact,safeguards:plan.safeguards}};
   const {data:run,error}=await db.from("sc_workflow_runs").insert({school_id:schoolId,user_id:user.id,request:submitted,title:plan.title,source,context:runContext,current_step_order:1,status:"active"}).select("id").single();if(error)throw error;
   const rowsToInsert=plan.steps.map((x,i)=>({run_id:run.id,school_id:schoolId,step_order:i+1,module_key:x.module,feature:x.feature,title:x.title,instruction:x.instruction,status:i===0?"active":"pending",depends_on:i?[i]:[],context:{action:x.action,risk:x.risk,requiresApproval:x.requiresApproval,reversible:x.reversible,verification:x.verification,precondition:x.precondition,impact:x.impact}}));
   const {data:rows,error:stepError}=await db.from("sc_workflow_steps").insert(rowsToInsert).select("id,step_order,module_key,feature,title,instruction,status,context").order("step_order");
   if(stepError)throw stepError;
   setActiveRunId(run.id);setStepRows((rows||[]) as SavedStep[]);await loadRuns();
   setStatus("Workflow tersimpan sebagai run yang dapat dilanjutkan dan diaudit.");
  }catch(e){setStatus(errorMessage(e))}finally{setBusy(false)}
 }

 async function resume(run:WorkflowRun){
  if(!db)return;
  setBusy(true);setStatus("");
  try{
   const {data,error}=await db.from("sc_workflow_steps").select("id,step_order,module_key,feature,title,instruction,status,context").eq("run_id",run.id).order("step_order");
   if(error)throw error;
   const rows=(data||[]) as SavedStep[],meta=run.context?.plan||{};
   const steps:WorkflowStep[]=rows.map((row,index)=>{
    const target=resolveWorkspaceRoute(row.module_key,row.feature,role),ctx=row.context||{};
    return {module:target?.module||row.module_key,feature:target?.feature||row.feature,title:row.title,instruction:row.instruction,permitted:!!target,matched:[],action:String(ctx.action||row.module_key+"."+row.feature),risk:(ctx.risk||"medium") as WorkflowRisk,requiresApproval:Boolean(ctx.requiresApproval),reversible:ctx.reversible!==false,verification:String(ctx.verification||"Verifikasi hasil pada modul tujuan."),precondition:String(ctx.precondition||"Langkah sebelumnya harus selesai."),impact:String(ctx.impact||"Perubahan terbatas pada ruang kerja tujuan.")};
   });
   const restored:WorkflowPlan={title:run.title,objective:String(meta.objective||run.request),reason:String(meta.reason||"Lanjutkan workflow dari checkpoint terakhir."),riskLevel:(meta.riskLevel||"medium") as WorkflowRisk,autonomyLevel:meta.autonomyLevel||"A2",executionMode:(meta.executionMode||"guided") as ExecutionMode,acceptanceCriteria:Array.isArray(meta.acceptanceCriteria)?meta.acceptanceCriteria:[],impact:Array.isArray(meta.impact)?meta.impact:[],safeguards:Array.isArray(meta.safeguards)?meta.safeguards:[],steps};
   setRequest(run.request);setSubmitted(run.request);setSources(String(run.context?.sources||""));setExecutionMode(restored.executionMode);setPlan(restored);
   setActiveRunId(run.id);setStepRows(rows);setDone(Object.fromEntries(rows.map((row,i)=>[i,row.status==="done"])));setApprovals(Object.fromEntries(rows.map((row,i)=>[i,Boolean(row.context?.approved_at)])));setSource(run.source||"workflow tersimpan");
  }catch(e){setStatus(errorMessage(e))}finally{setBusy(false)}
 }

 async function approveStep(index:number){
  const row=stepRows[index],step=plan?.steps[index];if(!db||!row||!step||!activeRunId)return;
  setBusy(true);setStatus("");
  try{
   const {data:{user}}=await db.auth.getUser();if(!user)throw Error("Sesi berakhir.");
   const nextContext={...(row.context||{}),approved_at:new Date().toISOString(),approved_by:user.id};
   const {error}=await db.from("sc_workflow_steps").update({context:nextContext,updated_at:new Date().toISOString()}).eq("id",row.id);if(error)throw error;
   setStepRows(rows=>rows.map((item,i)=>i===index?{...item,context:nextContext}:item));setApprovals(v=>({...v,[index]:true}));setStatus("Approval langkah tercatat. Lanjutkan ke fitur tujuan dan verifikasi hasilnya.");
  }catch(e){setStatus(errorMessage(e))}finally{setBusy(false)}
 }

 async function toggleStep(index:number){
  const step=plan?.steps[index];if(!step)return;
  if(!step.permitted){setStatus("Langkah ini diblokir oleh policy akses untuk peran aktif.");return;}
  if(index>0&&!done[index-1]){setStatus("Selesaikan dan verifikasi langkah sebelumnya terlebih dahulu.");return;}
  if(step.requiresApproval&&!approvals[index]){setStatus("Langkah berisiko ini memerlukan approval sebelum dapat ditandai selesai.");return;}
  const next=!done[index];setDone(value=>({...value,[index]:next}));
  const row=stepRows[index];if(!db||!activeRunId||!row)return;
  const nextRow=stepRows[index+1];
  const {error}=await db.from("sc_workflow_steps").update({status:next?"done":"active",completed_at:next?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",row.id);
  if(error){setDone(value=>({...value,[index]:!next}));setStatus(error.message);return;}
  if(nextRow&&next&&!done[index+1])await db.from("sc_workflow_steps").update({status:"active",updated_at:new Date().toISOString()}).eq("id",nextRow.id);
  const state={...done,[index]:next},completed=Object.keys(state).filter(key=>state[Number(key)]).length;
  await db.from("sc_workflow_runs").update({current_step_order:Math.min(completed+1,stepRows.length),status:completed===stepRows.length?"completed":"active",completed_at:completed===stepRows.length?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",activeRunId);
  await loadRuns();
 }

 const shortcuts=[
  "Siswa sering alpa, sudah dibina, buat surat panggilan dan agenda orang tua",
  "Dari PBD buat RKT lalu program kerja sampai laporan",
  "Tagihan siswa sampai pembayaran, kuitansi dan buku kas",
  "Pengajuan lembur sampai payroll dan slip"
 ];
 const completed=plan?plan.steps.filter((_,i)=>done[i]).length:0,progress=plan?.steps.length?Math.round(completed/plan.steps.length*100):0;
 const preflight=plan?[
  {label:"Policy akses",ok:plan.steps.every(x=>x.permitted),detail:plan.steps.every(x=>x.permitted)?"Semua langkah tersedia untuk peran aktif.":"Ada langkah yang diblokir oleh role."},
  {label:"Dependency",ok:plan.steps.length>0,detail:plan.steps.length+" langkah tersusun berurutan."},
  {label:"Approval gate",ok:true,detail:plan.steps.filter(x=>x.requiresApproval).length+" langkah membutuhkan persetujuan eksplisit."},
  {label:"Rollback / kompensasi",ok:true,detail:plan.steps.filter(x=>!x.reversible).length+" langkah irreversible ditandai untuk koreksi/kompensasi."}
 ]:[];

 return <section className="uao-shell">
  <div className="uao-hero">
   <div className="uao-hero-copy"><span className="uao-kicker"><Sparkles size={14}/> UNIVERSAL AI ORCHESTRATOR</span><h2>Dari tujuan menjadi workflow yang aman, terukur, dan bisa diaudit.</h2><p>Goal lock, policy, impact analysis, approval, checkpoint, verifikasi dan evidence berada dalam satu control plane. AI merencanakan; aksi tetap mengikuti fitur, role dan data SekolaPro.</p></div>
   <div className="uao-hero-orbit"><span><ShieldCheck size={18}/> Policy</span><span><GitBranch size={18}/> Workflow</span><span><FileCheck2 size={18}/> QCL</span><span><Database size={18}/> Evidence</span></div>
  </div>

  <section className="panel" style={{marginBlock:16}}>
   <div className="sectionhead"><div><h3>Asisten AI Orchestrator</h3><p className="muted">Diskusikan masalah sekolah, minta analisis, lalu ubah hasil diskusi menjadi Control Plan yang terarah.</p></div><Sparkles size={23}/></div>
   {coachMessages.length>0&&<div role="log" aria-label="Percakapan Asisten Orchestrator" aria-live="polite" style={{display:"grid",gap:10,maxHeight:380,overflowY:"auto",marginBlock:14}}>
    {coachMessages.map((item,index)=><div key={index} style={{padding:12,borderRadius:12,border:"1px solid var(--border, #80808040)",background:item.role==="assistant"?"var(--surface, transparent)":"var(--surface-2, transparent)"}}>
     <strong>{item.role==="assistant"?"Asisten SekolaPro":"Anda"}</strong><p style={{whiteSpace:"pre-wrap",marginBottom:0}}>{item.content}</p>
    </div>)}
   </div>}
   <form onSubmit={event=>{event.preventDefault();void consult(coachInput)}} style={{display:"grid",gap:10}}>
    <label>Diskusi dengan asisten<textarea aria-label="Diskusi dengan Asisten Orchestrator" rows={3} maxLength={4000} value={coachInput} onChange={e=>setCoachInput(e.target.value)} placeholder="Contoh: analisis absensi siswa bulan ini, apa penyebab datanya tidak lengkap dan apa langkah perbaikannya?"/></label>
    <div className="flow" style={{alignItems:"center",gap:12,flexWrap:"wrap"}}><button className="button" type="submit" disabled={coachBusy||coachInput.trim().length<3||!schoolId}>{coachBusy?"Menganalisis…":"Tanya Asisten AI"}</button><small className="muted">{coachContext||"AI hanya menyarankan, tidak mengubah database otomatis."}</small></div>
   </form>
   {coachResult?.refined_goal&&<div style={{display:"grid",gap:8,marginTop:14}}><strong>Tujuan yang disarankan</strong><p style={{margin:0,whiteSpace:"pre-wrap"}}>{coachResult.refined_goal}</p><button type="button" className="button secondary" disabled={planning} onClick={()=>{setRequest(coachResult?.refined_goal||"");void analyze(coachResult?.refined_goal||"")}}>Jadikan Control Plan <ChevronRight size={15}/></button></div>}
   {(coachResult?.missing_inputs?.length??0)>0&&<p className="muted">Untuk memperjelas rencana: {coachResult?.missing_inputs.join(" • ")}</p>}
   {coachError&&<div role="alert" className="banner error">{coachError}</div>}
  </section>

  <div className="uao-compose">
   <form onSubmit={event=>{event.preventDefault();void analyze(request)}} className="uao-prompt">
    <label>Tujuan yang ingin diselesaikan<textarea value={request} onChange={event=>setRequest(event.target.value)} rows={4} placeholder="Contoh: siswa sering alpa, sudah dua kali dibina, buat surat panggilan orang tua dan jadwalkan pertemuan."/></label>
    <details className="uao-source"><summary>Tambahkan sumber / konteks opsional</summary><p>Isi ini diperlakukan sebagai <b>data tidak tepercaya</b>, bukan instruksi eksekusi.</p><textarea value={sources} onChange={event=>setSources(event.target.value)} rows={3} maxLength={3000} placeholder="Contoh: nama dokumen, ringkasan data, atau konteks yang sudah diverifikasi."/></details>
    <div className="uao-compose-foot"><div className="uao-mode" role="group" aria-label="Mode eksekusi"><button type="button" className={executionMode==="simulation"?"active":""} onClick={()=>setExecutionMode("simulation")}><Eye size={15}/> Simulasi</button><button type="button" className={executionMode==="guided"?"active":""} onClick={()=>setExecutionMode("guided")}><Play size={15}/> Terarah</button></div><button className="button uao-primary" disabled={request.trim().length<3||planning}>{planning?"Menyusun control plan…":"Susun Control Plan"}</button></div>
   </form>
   <div className="uao-shortcuts">{shortcuts.map(item=><button type="button" key={item} onClick={()=>{setRequest(item);void analyze(item)}}>{compact(item,62)}</button>)}</div>
  </div>

  {savedRuns.length>0&&<div className="uao-runs"><div className="uao-section-title"><div><Clock3 size={18}/><strong>Run terbaru</strong></div><small>Resume dari checkpoint tanpa mengulang analisis.</small></div><div className="uao-run-grid">{savedRuns.map(run=><button type="button" key={run.id} disabled={busy} onClick={()=>void resume(run)}><span>{run.status==="completed"?"Selesai":"Aktif"}</span><strong>{compact(run.title,46)}</strong><small>{new Date(run.updated_at).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}</small></button>)}</div></div>}

  {planning&&<div className="uao-thinking"><Sparkles size={18}/> Memetakan tujuan, dependency, policy, risiko dan verifikasi…</div>}

  {plan&&<div className="uao-plan">
   <div className="uao-goal">
    <div><span className="uao-kicker">GOAL LOCK</span><h3>{plan.objective}</h3><p>{plan.reason}</p></div>
    <div className="uao-progress"><span>{progress}%</span><small>{completed}/{plan.steps.length} terverifikasi</small><div><i style={{width:progress+"%"}}/></div></div>
   </div>

   <div className="uao-metrics">
    <div><small>Risk</small><strong className={riskClass[plan.riskLevel]}>{riskLabel[plan.riskLevel]}</strong></div>
    <div><small>Autonomy</small><strong>{plan.autonomyLevel}</strong></div>
    <div><small>Mode</small><strong>{plan.executionMode==="simulation"?"Simulasi":"Terarah"}</strong></div>
    <div><small>Source</small><strong>{source||"Policy engine"}</strong></div>
   </div>

   <div className="uao-grid">
    <div className="uao-main">
     <div className="uao-section-title"><div><GitBranch size={18}/><strong>Execution DAG</strong></div>{schoolId&&!activeRunId&&<button className="button secondary" disabled={busy||!plan.steps.length} onClick={()=>void persist()}>{busy?"Menyimpan…":"Simpan run"}</button>}</div>
     <div className="uao-timeline">
      {plan.steps.map((step,index)=><article className={"uao-step "+(done[index]?"done ":"")+(step.permitted?"":"blocked")} key={stepRows[index]?.id||step.action+index}>
       <div className="uao-step-index">{done[index]?<Check size={17}/>:index+1}</div>
       <div className="uao-step-body">
        <div className="uao-step-head"><div><small>{step.action}</small><h4>{step.title}</h4></div><span className={riskClass[step.risk]}>{riskLabel[step.risk]}</span></div>
        <p>{step.instruction}</p>
        <div className="uao-step-meta"><span><LockKeyhole size={14}/>{step.requiresApproval?"Approval wajib":"Approval otomatis"}</span><span><RotateCcw size={14}/>{step.reversible?"Reversible":"Compensation only"}</span><span><Database size={14}/>{step.module} · {step.feature}</span></div>
        <details><summary>Precondition, impact & verification</summary><p><b>Precondition:</b> {step.precondition}</p><p><b>Impact:</b> {step.impact}</p><p><b>Verification:</b> {step.verification}</p></details>
        {!step.permitted&&<div className="uao-inline-warning"><AlertTriangle size={16}/> Diblokir oleh role/policy aktif.</div>}
        {step.requiresApproval&&stepRows[index]&&!approvals[index]&&<button className="button secondary" disabled={busy||!step.permitted} onClick={()=>void approveStep(index)}><ShieldCheck size={15}/> Approve langkah</button>}
       </div>
       <div className="uao-step-actions">{step.permitted&&<button className="button secondary" disabled={index>0&&!done[index-1]} onClick={()=>onRoute(step.module,step.feature)}>Buka <ChevronRight size={14}/></button>}<button className="iconbutton" disabled={busy||!step.permitted||(index>0&&!done[index-1])} onClick={()=>void toggleStep(index)} aria-label={done[index]?"Tandai belum selesai":"Tandai selesai"}><Check size={16}/></button></div>
      </article>)}
      {!plan.steps.length&&<div className="empty">Tujuan belum cukup spesifik untuk membangun workflow.</div>}
     </div>
    </div>

    <aside className="uao-rail">
     <section><div className="uao-section-title"><div><ShieldCheck size={17}/><strong>Pre-flight</strong></div></div>{preflight.map(item=><div className="uao-check" key={item.label}><span className={item.ok?"ok":"warn"}>{item.ok?<Check size={14}/>:<AlertTriangle size={14}/>}</span><div><b>{item.label}</b><small>{item.detail}</small></div></div>)}</section>
     <section><div className="uao-section-title"><div><Layers3 size={17}/><strong>Impact map</strong></div></div>{plan.impact.map(item=><p className="uao-listline" key={item}>{item}</p>)}</section>
     <section><div className="uao-section-title"><div><FileCheck2 size={17}/><strong>Acceptance</strong></div></div>{plan.acceptanceCriteria.map((item,i)=><p className="uao-listline" key={i}>{item}</p>)}</section>
     <section><div className="uao-section-title"><div><LockKeyhole size={17}/><strong>Safeguards</strong></div></div>{plan.safeguards.slice(0,5).map((item,i)=><p className="uao-listline" key={i}>{item}</p>)}</section>
    </aside>
   </div>

   {status&&<div className="banner" role="status">{status}</div>}
   <div className="uao-footer"><small>Run tidak dianggap selesai hanya karena API berhasil. Setiap langkah harus diverifikasi terhadap keadaan aktual.</small><button className="button secondary" onClick={()=>{setSubmitted("");setPlan(null);setDone({});setApprovals({});setStepRows([]);setActiveRunId("");setStatus("")}}><RotateCcw size={14}/> Reset plan</button></div>
  </div>}
 </section>;
}
