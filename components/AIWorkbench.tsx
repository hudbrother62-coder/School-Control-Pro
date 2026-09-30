"use client";
import {useEffect,useMemo,useState} from "react";
import {browserDb} from "@/lib/supabase";
import {aiTemplates,type AiModule} from "@/lib/education-templates";

type Draft={id:string;template_key:string|null;title:string;content:string;created_at:string};
type ProjectContext={name:string;level:string;grade:string;subject:string;topic:string;meetings:string;method:string;difficulty:string;student_preferences:string};
const emptyProject:ProjectContext={name:"",level:"",grade:"",subject:"",topic:"",meetings:"1",method:"",difficulty:"Sedang",student_preferences:""};

export default function AIWorkbench({module,schoolId,focus}:{module:AiModule;schoolId:string;focus?:string}){
 const db=useMemo(()=>browserDb(),[]);
 const [template,setTemplate]=useState(""),[context,setContext]=useState(""),[output,setOutput]=useState(""),[title,setTitle]=useState(""),[drafts,setDrafts]=useState<Draft[]>([]);
 const [project,setProject]=useState<ProjectContext>(emptyProject),[error,setError]=useState(""),[ok,setOk]=useState(""),[busy,setBusy]=useState(false);
 const focusText=(focus||"").toLowerCase(),historyOnly=focusText.includes("riwayat"),projectOnly=module==="guru_ai"&&focusText.includes("proyek");
 const config=aiTemplates[module].find(t=>t.key===template);
 async function load(){if(!db)return;const {data}=await db.from("sc_ai_drafts").select("id,template_key,title,content,created_at").eq("school_id",schoolId).eq("module_key",module).order("created_at",{ascending:false}).limit(40);setDrafts((data||[]) as Draft[])}
 useEffect(()=>{void load();if(module==="guru_ai"){try{const saved=localStorage.getItem("school-control-teaching-project-"+schoolId);if(saved)setProject({...emptyProject,...JSON.parse(saved)})}catch{}}},[db,schoolId,module]);
 useEffect(()=>{if(!focus)return;const f=focus.toLowerCase();const found=aiTemplates[module].find(t=>t.label.toLowerCase()===f||t.label.toLowerCase().includes(f)||f.includes(t.label.toLowerCase()));if(found)setTemplate(found.key)},[focus,module]);
 function setField<K extends keyof ProjectContext>(k:K,v:ProjectContext[K]){setProject(p=>({...p,[k]:v}))}
 function saveProject(){localStorage.setItem("school-control-teaching-project-"+schoolId,JSON.stringify(project));setOk("Konteks proyek pembelajaran disimpan di perangkat ini. Semua generator akan memakai konteks yang sama.")}
 async function run(fn:()=>Promise<void>){setBusy(true);setError("");setOk("");try{await fn()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 function projectText(){
  if(module!=="guru_ai")return context;
  return [
   "Nama proyek: "+project.name,"Jenjang: "+project.level,"Kelas: "+project.grade,"Mata pelajaran: "+project.subject,
   "Topik: "+project.topic,"Jumlah pertemuan: "+project.meetings,"Metode: "+project.method,"Tingkat kesulitan: "+project.difficulty,
   "Preferensi/kebutuhan siswa: "+project.student_preferences,"Instruksi tambahan: "+context
  ].join("\n");
 }
 async function generate(){if(!db||!config)return;await run(async()=>{const {data:{session}}=await db.auth.getSession();if(!session)throw Error("Masuk kembali untuk menjalankan AI.");const response=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({school_id:schoolId,module,prompt:config.prompt+"\n\nKONTEKS PROYEK:\n"+projectText()})});const j=await response.json();if(!response.ok)throw Error(j.error||"AI belum tersedia.");setOutput(j.text||"");setTitle(config.label+(project.topic?" · "+project.topic:""));setOk("Draf selesai dibuat. Tinjau dan sunting sebelum disimpan.")})}
 async function store(){if(!db)return;await run(async()=>{const {error}=await db.rpc("sc_store_ai_draft",{p_school:schoolId,p_module:module,p_template:template,p_title:title,p_prompt:projectText(),p_content:output});if(error)throw error;await load();setOk("Draf disimpan ke riwayat.")})}
 async function removeDraft(id:string){if(!db||!confirm("Hapus draf AI ini?"))return;await run(async()=>{const {error}=await db.rpc("sc_delete_auxiliary",{p_school:schoolId,p_entity:"ai_draft",p_id:id});if(error)throw error;await load();setOk("Draf dihapus.")})}
 const showProject=module==="guru_ai"&&(!focus||projectOnly);
 const showGenerator=!historyOnly&&!projectOnly;
 return <>
  {showProject&&<section className="panel"><div className="sectionhead"><div><h2>Proyek Pembelajaran</h2><p className="muted">Satu konteks dipakai ulang oleh seluruh alat agar guru tidak mengisi data yang sama berulang kali.</p></div><span className="pill">Workspace Guru</span></div>
   <div className="fields">
    <label className="field">Nama proyek<input value={project.name} onChange={e=>setField("name",e.target.value)} placeholder="Contoh: Relasi & Fungsi"/></label>
    <label className="field">Jenjang<input value={project.level} onChange={e=>setField("level",e.target.value)} placeholder="SD / SMP / SMA / SMK"/></label>
    <label className="field">Kelas<input value={project.grade} onChange={e=>setField("grade",e.target.value)} placeholder="VIII"/></label>
    <label className="field">Mata pelajaran<input value={project.subject} onChange={e=>setField("subject",e.target.value)} placeholder="Matematika"/></label>
    <label className="field full">Topik utama<input value={project.topic} onChange={e=>setField("topic",e.target.value)} placeholder="Topik yang sedang diajarkan"/></label>
    <label className="field">Jumlah pertemuan<input type="number" min={1} max={40} value={project.meetings} onChange={e=>setField("meetings",e.target.value)}/></label>
    <label className="field">Tingkat kesulitan<select value={project.difficulty} onChange={e=>setField("difficulty",e.target.value)}><option>Mudah</option><option>Sedang</option><option>Menantang</option></select></label>
    <label className="field full">Metode / pendekatan<input value={project.method} onChange={e=>setField("method",e.target.value)} placeholder="PBL, diskusi, demonstrasi, diferensiasi..."/></label>
    <label className="field full">Preferensi dan kebutuhan siswa<textarea rows={4} value={project.student_preferences} onChange={e=>setField("student_preferences",e.target.value)} placeholder="Karakter kelas, kebutuhan khusus, fasilitas yang tersedia..."/></label>
   </div><button className="button" style={{marginTop:12}} onClick={saveProject}>Simpan Konteks Proyek</button>
  </section>}
  {showGenerator&&<section className="panel"><div className="sectionhead"><div><h2>{module==="guru_ai"?(config?.label||"Generator Perangkat Ajar"):"Asisten Perencanaan Sekolah"}</h2><p className="muted">{module==="guru_ai"?"Generator mengikuti konteks Proyek Pembelajaran dan menghasilkan draf yang tetap dapat diedit guru.":"Pilih dokumen, berikan konteks faktual sekolah, lalu tinjau hasil sebelum dipakai."}</p></div><span className="pill">{module==="guru_ai"?"Perangkat Ajar":"Manajemen"}</span></div>
   {!focus&&<label className="field full">Jenis generator<select value={template} onChange={e=>setTemplate(e.target.value)}><option value="">Pilih jenis</option>{aiTemplates[module].map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></label>}
   {module==="guru_ai"&&<div className="project-summary"><b>{project.name||"Belum ada nama proyek"}</b><span>{[project.level,project.grade,project.subject,project.topic].filter(Boolean).join(" · ")||"Isi Proyek Pembelajaran agar generator lebih kontekstual."}</span></div>}
   <label className="field full" style={{marginTop:12}}>Instruksi khusus<textarea value={context} onChange={e=>setContext(e.target.value)} rows={5} placeholder={template==="chat"?"Ceritakan masalah kelas atau keputusan yang ingin dibahas...":"Tambahkan tujuan, batasan, format, atau kebutuhan khusus..."}/></label>
   <div className="flow" style={{marginTop:12}}><button className="button" disabled={busy||!template} onClick={()=>void generate()}>{busy?"Memproses…":template==="chat"?"Kirim ke AI":"Buat Draf AI"}</button></div>
   {output&&<div className="panel editor-panel"><h3>Editor Hasil</h3><label className="field">Judul<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="field" style={{marginTop:12}}>Isi<textarea value={output} rows={18} onChange={e=>setOutput(e.target.value)}/></label><div className="flow" style={{marginTop:12}}><button className="button" disabled={busy||title.trim().length<2} onClick={()=>void store()}>Simpan Riwayat</button></div></div>}
  </section>}
  {(historyOnly||!focus)&&<section className="panel"><h2>Riwayat Draf Saya</h2>{drafts.map(d=><div className="entry" key={d.id}><div><strong>{d.title}</strong><small>{new Date(d.created_at).toLocaleDateString("id-ID")} · {d.template_key||"umum"}</small></div><div className="flow"><button className="button secondary" onClick={()=>{setTitle(d.title);setOutput(d.content);setTemplate(d.template_key||"")}}>Buka</button><button className="button danger" onClick={()=>void removeDraft(d.id)}>Hapus</button></div></div>)}{!drafts.length&&<div className="empty">Belum ada draf.</div>}</section>}
  {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </>;
}
