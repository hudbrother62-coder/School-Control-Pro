"use client";
import {useEffect,useMemo,useState} from "react";
import {BookOpenCheck,CheckCircle2,ClipboardList,Save,Sparkles} from "lucide-react";
import SmartSelect,{type SmartOption} from "@/components/SmartSelect";
import {browserDb} from "@/lib/supabase";
import {aiTemplates,type AiModule} from "@/lib/education-templates";
import {subjectDefaults,teacherSystemStandard,teacherToolConfig} from "@/lib/teacher-ai-config";

type Draft={id:string;template_key:string|null;title:string;content:string;created_at:string};
type SchoolClass={id:string;name:string;grade:string|null;academic_year:string};
type Subject={id:string;name:string;code:string|null};
type ProjectContext={
 name:string;level:string;grade:string;phase:string;subject:string;topic:string;academic_year:string;semester:string;curriculum:string;
 meetings:string;duration:string;method:string;difficulty:string;student_count:string;student_character:string;initial_competence:string;cp_tp:string;
 resources:string;local_context:string;inclusion_needs:string;literacy_numeracy:string;target:string;assessment_preference:string;instructions:string
};
const emptyProject:ProjectContext={name:"",level:"SMP",grade:"7",phase:"D",subject:"",topic:"",academic_year:"2026/2027",semester:"Ganjil",curriculum:"Kurikulum Merdeka",meetings:"1",duration:"2 × 45 menit",method:"AI pilih yang paling sesuai",difficulty:"Beragam",student_count:"",student_character:"",initial_competence:"",cp_tp:"",resources:"",local_context:"",inclusion_needs:"",literacy_numeracy:"",target:"",assessment_preference:"",instructions:""};
const levelOptions:SmartOption[]=[
 {value:"PAUD",label:"PAUD"},{value:"TK",label:"TK"},{value:"SD",label:"SD"},{value:"MI",label:"MI"},{value:"SMP",label:"SMP"},{value:"MTs",label:"MTs"},
 {value:"SMA",label:"SMA"},{value:"MA",label:"MA"},{value:"SMK",label:"SMK"},{value:"SLB",label:"SLB"},{value:"PKBM",label:"PKBM"}
];
const gradeFor=(level:string)=>{
 const l=level.toUpperCase();
 if(["PAUD","TK"].includes(l))return ["A","B"];
 if(["SD","MI"].includes(l))return ["1","2","3","4","5","6"];
 if(["SMP","MTS"].includes(l))return ["7","8","9"];
 if(["SMA","MA","SMK"].includes(l))return ["10","11","12"];
 return [];
};
const phaseFor=(level:string,grade:string)=>{
 const n=Number(grade.replace(/\D/g,""));
 if(["SD","MI"].includes(level.toUpperCase()))return n<=2?"A":n<=4?"B":"C";
 if(["SMP","MTS"].includes(level.toUpperCase()))return "D";
 if(["SMA","MA","SMK"].includes(level.toUpperCase()))return n<=10?"E":"F";
 return "";
};
const methods=["AI pilih yang paling sesuai","Problem Based Learning","Project Based Learning","Discovery Learning","Inquiry Learning","Cooperative Learning","Diskusi & kolaborasi","Demonstrasi & praktik","Blended / video"];
const difficulties=["Mudah mengikuti","Beragam","Cenderung kesulitan","Sangat beragam"];

export default function AIWorkbench({module,schoolId,focus}:{module:AiModule;schoolId:string;focus?:string}){
 const db=useMemo(()=>browserDb(),[]);
 const [template,setTemplate]=useState(""),[context,setContext]=useState(""),[output,setOutput]=useState(""),[title,setTitle]=useState(""),[drafts,setDrafts]=useState<Draft[]>([]);
 const [project,setProject]=useState<ProjectContext>(emptyProject),[toolData,setToolData]=useState<Record<string,string>>({});
 const [classes,setClasses]=useState<SchoolClass[]>([]),[subjects,setSubjects]=useState<Subject[]>([]),[teacherName,setTeacherName]=useState("");
 const [error,setError]=useState(""),[ok,setOk]=useState(""),[busy,setBusy]=useState(false);
 const focusText=(focus||"").toLowerCase(),historyOnly=focusText.includes("riwayat"),projectOnly=module==="guru_ai"&&focusText.includes("proyek");
 const config=aiTemplates[module].find(t=>t.key===template);
 const teacherConfig=module==="guru_ai"?teacherToolConfig[template]:undefined;

 async function load(){
  if(!db)return;
  const {data:d}=await db.from("sc_ai_drafts").select("id,template_key,title,content,created_at").eq("school_id",schoolId).eq("module_key",module).order("created_at",{ascending:false}).limit(40);setDrafts((d||[]) as Draft[]);
  if(module==="guru_ai"){
   const [{data:c},{data:s},{data:school},{data:{user}}]=await Promise.all([
    db.from("sc_classes").select("id,name,grade,academic_year").eq("school_id",schoolId).order("name"),
    db.from("sc_subjects").select("id,name,code").eq("school_id",schoolId).order("name"),
    db.from("sc_schools").select("education_level,academic_year,semester").eq("id",schoolId).maybeSingle(),
    db.auth.getUser()
   ]);
   setClasses((c||[]) as SchoolClass[]);setSubjects((s||[]) as Subject[]);
   let hasSaved=false;try{hasSaved=!!localStorage.getItem("school-control-teaching-project-"+schoolId)}catch{}
   if(!hasSaved&&school){const lv=String(school.education_level||emptyProject.level),gr=gradeFor(lv)[0]||emptyProject.grade;setProject(p=>({...p,level:lv,grade:gr,phase:phaseFor(lv,gr)||p.phase,academic_year:String(school.academic_year||p.academic_year),semester:String(school.semester||p.semester)}))}
   if(user){const {data:st}=await db.from("sc_staff").select("name").eq("school_id",schoolId).eq("user_id",user.id).maybeSingle();setTeacherName(st?.name||"")}
  }
 }
 useEffect(()=>{void load();if(module==="guru_ai"){try{const saved=localStorage.getItem("school-control-teaching-project-"+schoolId);if(saved)setProject({...emptyProject,...JSON.parse(saved)})}catch{}}},[db,schoolId,module]);
 useEffect(()=>{if(!focus)return;const f=focus.toLowerCase();const found=aiTemplates[module].find(t=>t.label.toLowerCase()===f||t.label.toLowerCase().includes(f)||f.includes(t.label.toLowerCase()));if(found)setTemplate(found.key)},[focus,module]);
 useEffect(()=>{setToolData({});setContext("")},[template]);
 function setField<K extends keyof ProjectContext>(k:K,v:ProjectContext[K]){setProject(p=>({...p,[k]:v}))}
 function saveProject(){localStorage.setItem("school-control-teaching-project-"+schoolId,JSON.stringify(project));setOk("Konteks pembelajaran tersimpan. Seluruh generator akan memakai data yang sama.")}
 async function run(fn:()=>Promise<void>){setBusy(true);setError("");setOk("");try{await fn()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}

 const classOptions:SmartOption[]=useMemo(()=>{
  const fromDb=classes.map(c=>({value:c.name,label:c.name,subtitle:[c.grade,c.academic_year].filter(Boolean).join(" · ")}));
  const fallback=gradeFor(project.level).map(g=>({value:g,label:"Kelas "+g,search:g}));
  return [...fromDb,...fallback.filter(x=>!fromDb.some(d=>d.value.toLowerCase()===x.value.toLowerCase()))];
 },[classes,project.level]);
 const subjectOptions:SmartOption[]=useMemo(()=>{
  const digits=project.grade.replace(/\D/g,""),key=project.level+" "+digits;
  const byLevel=Object.entries(subjectDefaults).filter(([k])=>k.startsWith(project.level+" ")).flatMap(([,v])=>v);
  const names=[...subjects.map(s=>s.name),...(subjectDefaults[key]||[]),...byLevel];
  return [...new Set(names)].map(name=>({value:name,label:name,subtitle:subjects.find(s=>s.name===name)?.code||undefined}));
 },[subjects,project.level,project.grade]);

 function projectText(){
  if(module!=="guru_ai")return context;
  const detail=Object.entries(toolData).filter(([,v])=>String(v).trim()).map(([k,v])=>k+": "+v).join("\n");
  return [
   teacherSystemStandard,
   "",
   "KONTEKS GURU & PROYEK",
   "Nama guru: "+(teacherName||"Belum tersedia"),
   "Nama proyek: "+project.name,
   "Jenjang: "+project.level,
   "Kelas: "+project.grade,
   "Fase: "+project.phase,
   "Tahun ajaran: "+project.academic_year,
   "Semester: "+project.semester,
   "Kurikulum/acuan: "+project.curriculum,
   "Mata pelajaran: "+project.subject,
   "Topik: "+project.topic,
   "Jumlah siswa: "+project.student_count,
   "Kompetensi awal/prasyarat: "+project.initial_competence,
   "CP/TP/ATP yang diketahui: "+project.cp_tp,
   "Jumlah pertemuan: "+project.meetings,
   "Durasi tiap pertemuan: "+project.duration,
   "Kesulitan menangkap materi: "+project.difficulty,
   "Metode utama: "+project.method,
   "Karakter siswa: "+project.student_character,
   "Kondisi/sumber daya: "+project.resources,
   "Konteks lokal/sekolah: "+project.local_context,
   "Kebutuhan inklusi/dukungan khusus: "+project.inclusion_needs,
   "Fokus literasi/numerasi: "+project.literacy_numeracy,
   "Target pemahaman/hasil akhir: "+project.target,
   "Preferensi asesmen: "+project.assessment_preference,
   "Instruksi tambahan proyek: "+project.instructions,
   detail?"\nDATA KHUSUS ALAT\n"+detail:"",
   context?"\nINSTRUKSI KHUSUS OUTPUT\n"+context:"",
   teacherConfig?"\nSTANDAR OUTPUT WAJIB\n- "+teacherConfig.standard.join("\n- "):"",
   teacherConfig?"\nARAHAN ALAT\n"+teacherConfig.instruction:""
  ].filter(Boolean).join("\n");
 }
 async function generate(){if(!db||!config)return;await run(async()=>{
  if(module==="guru_ai"&&(!project.level||!project.grade||!project.subject||!project.topic))throw Error("Lengkapi jenjang, kelas, mata pelajaran, dan topik terlebih dahulu.");
  const {data:{session}}=await db.auth.getSession();if(!session)throw Error("Masuk kembali untuk menjalankan AI.");
  const response=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({school_id:schoolId,module,prompt:config.prompt+"\n\n"+projectText()})});
  const j=await response.json();if(!response.ok)throw Error(j.error||"AI belum tersedia.");setOutput(j.text||"");setTitle(config.label+(project.topic?" · "+project.topic:""));setOk("Draf selesai dibuat. Tinjau standar output sebelum disimpan.");
 })}
 async function store(){if(!db)return;await run(async()=>{const {error}=await db.rpc("sc_store_ai_draft",{p_school:schoolId,p_module:module,p_template:template,p_title:title,p_prompt:projectText(),p_content:output});if(error)throw error;await load();setOk("Draf disimpan ke riwayat.")})}
 async function removeDraft(id:string){if(!db||!confirm("Hapus draf AI ini?"))return;await run(async()=>{const {error}=await db.rpc("sc_delete_auxiliary",{p_school:schoolId,p_entity:"ai_draft",p_id:id});if(error)throw error;await load();setOk("Draf dihapus.")})}

 const showProject=module==="guru_ai"&&(!focus||projectOnly);
 const showGenerator=!historyOnly&&!projectOnly;
 return <>
  {showProject&&<section className="panel teacher-project">
   <div className="sectionhead"><div><h2>Project Builder Pembelajaran</h2><p className="muted">Standar input diambil dari Guru AI lama. Satu konteks dipakai ulang agar hasil Modul Ajar, LKPD, asesmen, bahan ajar dan rubrik tetap konsisten.</p></div><span className="pill"><Sparkles size={13}/> Workspace Guru</span></div>
   <div className="fields">
    <label className="field full">Nama proyek<input value={project.name} onChange={e=>setField("name",e.target.value)} placeholder="Contoh: Relasi & Fungsi – Semester Ganjil"/></label>
    <div className="field"><SmartSelect label="Jenjang" value={project.level} options={levelOptions} onChange={v=>{const g=gradeFor(v)[0]||"";setField("level",v);setField("grade",g);setField("phase",phaseFor(v,g));setField("subject","")}} allowCustom customLabel="Gunakan jenjang ini"/></div>
    <div className="field"><SmartSelect label="Kelas" value={project.grade} options={classOptions} onChange={v=>{const g=v.replace(/^Kelas\s+/i,"");setField("grade",g);setField("phase",phaseFor(project.level,g)||project.phase)}} allowCustom customLabel="Gunakan kelas yang diketik"/></div>
    <div className="field"><SmartSelect label="Fase" value={project.phase} options={["A","B","C","D","E","F"].map(x=>({value:x,label:"Fase "+x}))} onChange={v=>setField("phase",v)} allowCustom customLabel="Gunakan fase ini"/></div>
    <label className="field">Tahun ajaran<input value={project.academic_year} onChange={e=>setField("academic_year",e.target.value)} placeholder="2026/2027"/></label>
    <label className="field">Semester<select value={project.semester} onChange={e=>setField("semester",e.target.value)}><option>Ganjil</option><option>Genap</option><option>Fleksibel / lainnya</option></select></label>
    <label className="field full">Kurikulum / acuan<input value={project.curriculum} onChange={e=>setField("curriculum",e.target.value)} placeholder="Kurikulum Merdeka / kurikulum sekolah / lainnya"/></label>
    <div className="field full"><SmartSelect label="Mata pelajaran" value={project.subject} options={subjectOptions} onChange={v=>setField("subject",v)} allowCustom customLabel="Tambah mata pelajaran ini"/></div>
    <label className="field full">Topik pembelajaran<input value={project.topic} onChange={e=>setField("topic",e.target.value)} placeholder="Materi spesifik yang akan dipelajari"/></label>
    <label className="field">Jumlah siswa<input type="number" min={1} max={200} value={project.student_count} onChange={e=>setField("student_count",e.target.value)} placeholder="Contoh: 32"/></label>
    <label className="field">Jumlah pertemuan<input type="number" min={1} max={40} value={project.meetings} onChange={e=>setField("meetings",e.target.value)}/></label>
    <label className="field">Durasi tiap pertemuan<input value={project.duration} onChange={e=>setField("duration",e.target.value)} placeholder="2 × 45 menit"/></label>
    <label className="field">Kesulitan menangkap materi<select value={project.difficulty} onChange={e=>setField("difficulty",e.target.value)}>{difficulties.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="field">Metode utama<select value={project.method} onChange={e=>setField("method",e.target.value)}>{methods.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="field full">Kompetensi awal / prasyarat<textarea rows={3} value={project.initial_competence} onChange={e=>setField("initial_competence",e.target.value)} placeholder="Pengetahuan/kemampuan yang sudah dimiliki siswa sebelum materi ini"/></label>
    <label className="field full">CP / TP / ATP yang diketahui<textarea rows={4} value={project.cp_tp} onChange={e=>setField("cp_tp",e.target.value)} placeholder="Tempel CP/TP/ATP sekolah bila tersedia. Jika kosong AI wajib menandai bagian yang perlu diverifikasi."/></label>
    <label className="field full">Karakter siswa<textarea rows={4} value={project.student_character} onChange={e=>setField("student_character",e.target.value)} placeholder="Kemampuan awal, minat, kebiasaan belajar, variasi kemampuan, motivasi…"/></label>
    <label className="field full">Kondisi / sumber daya<textarea rows={4} value={project.resources} onChange={e=>setField("resources",e.target.value)} placeholder="LCD, laboratorium, internet, buku, lingkungan sekitar, keterbatasan alat…"/></label>
    <label className="field full">Konteks lokal / sekolah<textarea rows={3} value={project.local_context} onChange={e=>setField("local_context",e.target.value)} placeholder="Budaya lokal, lingkungan, program sekolah, contoh yang dekat dengan kehidupan siswa…"/></label>
    <label className="field full">Kebutuhan inklusi / dukungan khusus<textarea rows={3} value={project.inclusion_needs} onChange={e=>setField("inclusion_needs",e.target.value)} placeholder="Akomodasi, kebutuhan belajar khusus, hambatan akses, dukungan pendamping…"/></label>
    <label className="field full">Fokus literasi / numerasi<textarea rows={3} value={project.literacy_numeracy} onChange={e=>setField("literacy_numeracy",e.target.value)} placeholder="Kompetensi literasi/numerasi yang ingin diperkuat bila relevan"/></label>
    <label className="field full">Target pemahaman / hasil akhir<textarea rows={4} value={project.target} onChange={e=>setField("target",e.target.value)} placeholder="Apa yang harus mampu dilakukan siswa setelah rangkaian pembelajaran?"/></label>
    <label className="field full">Preferensi asesmen<textarea rows={3} value={project.assessment_preference} onChange={e=>setField("assessment_preference",e.target.value)} placeholder="Produk, performa, tes tertulis, observasi, portofolio, rubrik, atau kombinasi"/></label>
    <label className="field full">Instruksi tambahan proyek<textarea rows={4} value={project.instructions} onChange={e=>setField("instructions",e.target.value)} placeholder="Gaya bahasa, konteks lokal, format khusus, hal yang harus dihindari…"/></label>
   </div>
   <div className="flow" style={{marginTop:14}}><button className="button" onClick={saveProject}><Save size={15}/> Simpan Konteks Proyek</button></div>
  </section>}

  {showGenerator&&<section className="panel teacher-generator">
   <div className="sectionhead"><div><h2>{module==="guru_ai"?(config?.label||"Generator Perangkat Ajar"):"Asisten Perencanaan Sekolah"}</h2><p className="muted">{module==="guru_ai"?"Setiap alat memiliki input dan standar output sendiri; konteks proyek tetap dipakai otomatis.":"Pilih dokumen, berikan konteks faktual sekolah, lalu tinjau hasil sebelum dipakai."}</p></div><span className="pill">{module==="guru_ai"?"Perangkat Ajar":"Manajemen"}</span></div>
   {!focus&&<label className="field full">Jenis generator<select value={template} onChange={e=>setTemplate(e.target.value)}><option value="">Pilih jenis</option>{aiTemplates[module].map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select></label>}
   {module==="guru_ai"&&<div className="project-summary"><b>{project.name||"Proyek belum diberi nama"}</b><span>{[project.level,project.grade&&"Kelas "+project.grade,project.subject,project.topic].filter(Boolean).join(" · ")||"Lengkapi Project Builder terlebih dahulu."}</span></div>}
   {module==="guru_ai"&&teacherConfig&&<>
    <div className="tool-question-grid">{teacherConfig.fields.map(f=><label className={"field "+(f.type==="textarea"?"full":"")} key={f.key}>{f.label}{f.type==="select"?<select value={toolData[f.key]||""} onChange={e=>setToolData(v=>({...v,[f.key]:e.target.value}))}><option value="">Pilih</option>{f.options?.map(o=><option key={o}>{o}</option>)}</select>:f.type==="textarea"?<textarea rows={4} value={toolData[f.key]||""} onChange={e=>setToolData(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder}/>:<input type={f.type||"text"} value={toolData[f.key]||""} onChange={e=>setToolData(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder}/>}</label>)}</div>
    <div className="output-standard"><div><BookOpenCheck size={18}/><span><b>Standar output {config?.label}</b><small>AI diarahkan menghasilkan bagian berikut secara lengkap.</small></span></div><div className="standard-grid">{teacherConfig.standard.map(s=><span key={s}><CheckCircle2 size={14}/>{s}</span>)}</div></div>
   </>}
   <label className="field full" style={{marginTop:14}}>Instruksi tambahan untuk hasil<textarea value={context} onChange={e=>setContext(e.target.value)} rows={5} placeholder={template==="chat"?"Ceritakan masalah kelas atau keputusan yang ingin dibahas…":"Tambahkan batasan, gaya, contoh lokal, atau kebutuhan khusus yang belum tercakup…"}/></label>
   <div className="flow" style={{marginTop:12}}><button className="button" disabled={busy||!template} onClick={()=>void generate()}><Sparkles size={15}/>{busy?"Memproses…":template==="chat"?"Kirim ke AI":"Generate Draf Lengkap"}</button></div>
   {output&&<div className="panel editor-panel"><div className="sectionhead"><div><h3>Editor Hasil</h3><p className="muted">Periksa kesesuaian CP/TP, fakta sekolah, rumus, dan data sebelum digunakan.</p></div><ClipboardList size={18}/></div><label className="field">Judul<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="field" style={{marginTop:12}}>Isi<textarea value={output} rows={24} onChange={e=>setOutput(e.target.value)}/></label><div className="flow" style={{marginTop:12}}><button className="button" disabled={busy||title.trim().length<2} onClick={()=>void store()}>Simpan Riwayat</button></div></div>}
  </section>}

  {(historyOnly||!focus)&&<section className="panel"><h2>Riwayat Draf Saya</h2>{drafts.map(d=><div className="entry" key={d.id}><div><strong>{d.title}</strong><small>{new Date(d.created_at).toLocaleDateString("id-ID")} · {d.template_key||"umum"}</small></div><div className="flow"><button className="button secondary" onClick={()=>{setTitle(d.title);setOutput(d.content);setTemplate(d.template_key||"")}}>Buka</button><button className="button danger" onClick={()=>void removeDraft(d.id)}>Hapus</button></div></div>)}{!drafts.length&&<div className="empty">Belum ada draf.</div>}</section>}
  {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </>;
}
