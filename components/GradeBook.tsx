"use client";
import {readAllRows} from "@/lib/read-all-rows";
import {errorMessage} from "@/lib/error-message";
import {useEffect,useMemo,useState} from "react";
import {Download,Pencil,Plus,Search,Trash2,Upload} from "lucide-react";
import RecordListTools,{useRecordList,RecordCheckbox} from "@/components/RecordListTools";
import DataEntryModal from "@/components/DataEntryModal";
import SmartSelect from "@/components/SmartSelect";
import {browserDb} from "@/lib/supabase";
import {downloadExcel,readExcel,type SheetRows} from "@/lib/excel";
import {isAdmin,type Role} from "@/lib/modules";

type C={id:string;name:string;grade:string|null;academic_year:string};
type S={id:string;name:string;nis:string|null;class_id:string|null;status:string};
type Subject={id:string;name:string;code:string|null};
type Grade={id:string;student_id:string;class_id:string;subject_id:string|null;subject:string;assessment_name:string;assessment_category:string|null;assessment_date:string;score:number;max_score:number;notes:string|null};
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});

export default function GradeBook({schoolId,userId,role}:{schoolId:string;userId:string;role:Role}){
 const db=useMemo(()=>browserDb(),[]),manager=isAdmin(role);
 const [classes,setClasses]=useState<C[]>([]),[students,setStudents]=useState<S[]>([]),[subjects,setSubjects]=useState<Subject[]>([]),[rows,setRows]=useState<Grade[]>([]);
 const [modal,setModal]=useState(false),[editingId,setEditingId]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState(""),[query,setQuery]=useState(""),[importRows,setImportRows]=useState<SheetRows>([]),[importFile,setImportFile]=useState("");
 const [classValue,setClassValue]=useState(""),[studentValue,setStudentValue]=useState(""),[subjectValue,setSubjectValue]=useState(""),[assessment,setAssessment]=useState(""),[category,setCategory]=useState("TUGAS"),[date,setDate]=useState(today()),[score,setScore]=useState(""),[maxScore,setMaxScore]=useState("100"),[notes,setNotes]=useState("");
 const [filterClass,setFilterClass]=useState(""),[filterSubject,setFilterSubject]=useState("");

 async function load(){
  if(!db)return;
  const [cl,st,su,gr,as]=await Promise.all([
   readAllRows(db.from("sc_classes").select("id,name,grade,academic_year").eq("school_id",schoolId).order("name").order("id")),
   readAllRows(db.from("sc_students").select("id,name,nis,class_id,status").eq("school_id",schoolId).order("name").order("id")),
   readAllRows(db.from("sc_subjects").select("id,name,code").eq("school_id",schoolId).order("name").order("id")),
   readAllRows(db.from("sc_grades").select("id,student_id,class_id,subject_id,subject,assessment_name,assessment_category,assessment_date,score,max_score,notes").eq("school_id",schoolId).order("assessment_date",{ascending:false}).order("id")),
   readAllRows(db.from("sc_teacher_assignments").select("class_id").eq("school_id",schoolId).eq("teacher_id",userId).order("id"))
  ]);
  const all=(cl.data||[]) as C[],allowed=new Set((as.data||[]).map(x=>x.class_id));
  setClasses(manager?all:all.filter(c=>allowed.has(c.id)));setStudents((st.data||[]) as S[]);setSubjects((su.data||[]) as Subject[]);setRows((gr.data||[]) as Grade[]);
 }
 useEffect(()=>{void load()},[db,schoolId,userId,role]);
 const classOptions=classes.map(c=>({value:c.id,label:c.name,subtitle:[c.grade,c.academic_year].filter(Boolean).join(" · ")}));
 const studentOptions=students.filter(s=>s.status==="active"&&(!classValue||s.class_id===classValue)).map(s=>({value:s.id,label:s.name,subtitle:s.nis?"NIS "+s.nis:undefined,search:s.nis||""}));
 const subjectOptions=subjects.map(s=>({value:s.id,label:s.name,subtitle:s.code||undefined}));
 const studentName=(id:string)=>students.find(s=>s.id===id)?.name||"Siswa";
 const className=(id:string)=>classes.find(c=>c.id===id)?.name||"Kelas";
 const subjectName=(r:Grade)=>subjects.find(s=>s.id===r.subject_id)?.name||r.subject;
 const filtered=rows.filter(r=>(!filterClass||r.class_id===filterClass)&&(!filterSubject||r.subject_id===filterSubject||r.subject===filterSubject)&&(studentName(r.student_id)+" "+subjectName(r)+" "+r.assessment_name+" "+(r.assessment_category||"")).toLowerCase().includes(query.toLowerCase()));

 async function resolveClass(){
  const known=classes.find(c=>c.id===classValue);if(known)return known;
  const byName=classes.find(c=>c.name.toLowerCase()===classValue.toLowerCase());if(byName)return byName;
  if(!db||!classValue.trim())throw Error("Kelas wajib dipilih.");
  const {data,error:e}=await db.from("sc_classes").insert({school_id:schoolId,name:classValue.trim(),academic_year:new Date().getFullYear()+"/"+(new Date().getFullYear()+1)}).select("id,name,grade,academic_year").single();if(e)throw e;return data as C
 }
 async function resolveSubject(){
  const known=subjects.find(s=>s.id===subjectValue);if(known)return known;
  const byName=subjects.find(s=>s.name.toLowerCase()===subjectValue.toLowerCase());if(byName)return byName;
  if(!db||!subjectValue.trim())throw Error("Mata pelajaran wajib dipilih.");
  const {data,error:e}=await db.from("sc_subjects").insert({school_id:schoolId,name:subjectValue.trim()}).select("id,name,code").single();if(e)throw e;return data as Subject
 }
 async function resolveStudent(klass:C){
  const known=students.find(s=>s.id===studentValue);if(known)return known;
  const byName=students.find(s=>s.name.toLowerCase()===studentValue.toLowerCase()&&s.class_id===klass.id);if(byName)return byName;
  if(!db||!studentValue.trim())throw Error("Siswa wajib dipilih.");
  const {data,error:e}=await db.from("sc_students").insert({school_id:schoolId,name:studentValue.trim(),class_id:klass.id,status:"active"}).select("id,name,nis,class_id,status").single();if(e)throw e;return data as S
 }
 function reset(){setEditingId(null);setClassValue("");setStudentValue("");setSubjectValue("");setAssessment("");setCategory("TUGAS");setDate(today());setScore("");setMaxScore("100");setNotes("")}
 function openEdit(r:Grade){setEditingId(r.id);setClassValue(r.class_id);setStudentValue(r.student_id);setSubjectValue(r.subject_id||r.subject);setAssessment(r.assessment_name);setCategory(r.assessment_category||"TUGAS");setDate(r.assessment_date);setScore(String(r.score));setMaxScore(String(r.max_score||100));setNotes(r.notes||"");setModal(true)}
 async function save(){
  if(!db)return;setBusy(true);setError("");setOk("");
  try{
   const klass=await resolveClass(),student=await resolveStudent(klass),subject=await resolveSubject();
   const n=Number(score),max=Number(maxScore);if(!Number.isFinite(n)||!Number.isFinite(max)||max<=0||n<0||n>max)throw Error("Nilai harus berada antara 0 dan nilai maksimum.");
   const payload={student_id:student.id,class_id:klass.id,subject_id:subject.id,subject:subject.name,assessment_name:assessment.trim(),assessment_category:category.trim(),assessment_date:date,score:n,max_score:max,notes:notes.trim()||null,recorded_by:userId};
   const request=editingId?db.from("sc_grades").update(payload).eq("school_id",schoolId).eq("id",editingId):db.from("sc_grades").insert({school_id:schoolId,...payload});const {error:e}=await request;if(e)throw e;
   const edited=!!editingId;setModal(false);reset();await load();setOk(edited?"Nilai diperbarui.":"Nilai tersimpan dan terhubung dengan siswa, kelas, serta mata pelajaran.");
  }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 async function removeGrade(r:Grade){if(!db||!confirm("Hapus nilai ini? Data nilai akan dihapus dari lembar nilai."))return;setBusy(true);setError("");setOk("");try{const {error:e}=await db.from("sc_grades").delete().eq("school_id",schoolId).eq("id",r.id);if(e)throw e;await load();setOk("Nilai dihapus.")}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 async function template(){await downloadExcel("template-lembar-nilai-school-control.xlsx",[
  {name:"NILAI",rows:[{Kelas:"VII A",NIS:"1001",Nama_Siswa:"Contoh Siswa",Mata_Pelajaran:"Matematika",Asesmen:"Tugas 1",Kategori:"TUGAS",Tanggal:today(),Nilai:85,Nilai_Maksimum:100,Catatan:"Hapus baris contoh sebelum import"}]},
  {name:"Panduan",rows:[{Ketentuan:"Kelas dan siswa harus sudah ada di Data Induk. NIS lebih disarankan daripada pencocokan nama. Nilai wajib 0 sampai Nilai_Maksimum. Guru hanya dapat mengimport kelas yang menjadi penugasannya."}]}
 ])}
 async function readImport(file?:File){if(!file)return;setError("");try{if(file.size>8_000_000)throw Error("File maksimal 8 MB.");const rr=await readExcel(file);if(rr.length>3000)throw Error("Maksimal 3.000 baris per import.");setImportRows(rr);setImportFile(file.name);setOk(file.name+" siap diimport · "+rr.length+" baris.")}catch(e){setError(errorMessage(e))}}
 async function commitImport(){if(!db||!importRows.length)return;setBusy(true);setError("");setOk("");try{let imported=0,skipped=0;const payloads:Record<string,unknown>[]=[];for(const raw of importRows){const classText=String(raw.Kelas||raw.class||"").trim(),nis=String(raw.NIS||raw.nis||"").trim(),studentText=String(raw.Nama_Siswa||raw.Nama||raw.student||"").trim(),subjectText=String(raw.Mata_Pelajaran||raw.Mapel||raw.subject||"").trim(),assessmentText=String(raw.Asesmen||raw.Nama_Asesmen||raw.assessment||"").trim(),categoryText=String(raw.Kategori||raw.category||"TUGAS").trim()||"TUGAS",day=String(raw.Tanggal||raw.date||today()).slice(0,10),value=Number(raw.Nilai??raw.score),max=Number(raw.Nilai_Maksimum??raw.Max??raw.max_score??100),note=String(raw.Catatan||raw.notes||"").trim();const klass=classes.find(x=>x.name.trim().toLowerCase()===classText.toLowerCase()),student=students.find(x=>x.status==="active"&&(!klass||x.class_id===klass.id)&&((nis&&x.nis===nis)||(!nis&&studentText&&x.name.trim().toLowerCase()===studentText.toLowerCase()))),subject=subjects.find(x=>x.name.trim().toLowerCase()===subjectText.toLowerCase()||((x.code||"").trim().toLowerCase()===subjectText.toLowerCase()));if(!klass||!student||!subject||!assessmentText||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(value)||!Number.isFinite(max)||max<=0||value<0||value>max){skipped++;continue}payloads.push({school_id:schoolId,student_id:student.id,class_id:klass.id,subject_id:subject.id,subject:subject.name,assessment_name:assessmentText,assessment_category:categoryText,assessment_date:day,score:value,max_score:max,notes:note||null,recorded_by:userId});imported++}if(payloads.length){const {error:e}=await db.from("sc_grades").insert(payloads);if(e)throw e}await db.from("sc_import_history").insert({school_id:schoolId,module_key:"buku_kerja",import_kind:"grades",file_name:importFile||"import.xlsx",row_count:importRows.length,imported_count:imported,skipped_count:skipped,details:{target:"sc_grades"}});setImportRows([]);setImportFile("");await load();setOk("Import nilai selesai: "+imported+" masuk, "+skipped+" dilewati karena data master/format tidak cocok.")}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 async function exportRows(){await downloadExcel("lembar-nilai-school-control.xlsx",[{name:"NILAI",rows:filtered.map(r=>({Tanggal:r.assessment_date,NIS:students.find(s=>s.id===r.student_id)?.nis||"",Nama_Siswa:studentName(r.student_id),Kelas:className(r.class_id),Mata_Pelajaran:subjectName(r),Asesmen:r.assessment_name,Kategori:r.assessment_category||"",Nilai:r.score,Nilai_Maksimum:r.max_score||100,Catatan:r.notes||""}))}])}

 const list=useRecordList(filtered,r=>studentName(r.student_id)+" "+r.assessment_name);
 const allowed=(id:string)=>{const r=filtered.find(x=>x.id===id);return Boolean(r&&(true));};
 const collectionTools=<RecordListTools list={list} label="catatan" showSearch={false} canSelect selectable={allowed} onRefresh={load} busy={busy} actions={[{key:"delete",label:"Hapus pilihan",description:"Hapus catatan yang dipilih sesuai kewenangan akun Anda. Tindakan ini tidak dapat dibatalkan.",danger:true,eligible:allowed,run:async id=>{if(!db)throw Error("Database belum terhubung");const {error}=await db.from("sc_grades").delete().eq("school_id",schoolId).eq("id",id);if(error)throw error}}]}/>;
 return <>
  <section className="panel"><div className="sectionhead"><div><span className="eyebrow">BUKU NILAI</span><h2>Lembar Nilai</h2><p className="muted">Struktur mengikuti Buku Kerja Digital: kelas, siswa, mapel, asesmen, kategori, tanggal, nilai maksimum, dan catatan.</p></div><div className="flow"><button className="button secondary" onClick={()=>void template()}><Download size={15}/> Template Excel</button><label className="button secondary"><Upload size={15}/> Import Excel<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>void readImport(e.target.files?.[0])}/></label><button className="button secondary" onClick={()=>void exportRows()}><Download size={15}/> Export</button><button className="button" onClick={()=>{reset();setModal(true)}}><Plus size={15}/> Input Nilai</button></div></div>
   <div className="journal-filters"><div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari siswa, mapel, asesmen…"/></div><SmartSelect label="Kelas" value={filterClass} options={[{value:"",label:"Semua kelas"},...classOptions]} onChange={setFilterClass}/><SmartSelect label="Mata pelajaran" value={filterSubject} options={[{value:"",label:"Semua mapel"},...subjectOptions]} onChange={setFilterSubject} allowCustom customLabel="Cari nama ini"/></div>
   {importRows.length>0&&<div className="banner"><strong>{importFile} · {importRows.length} baris siap</strong><div className="flow" style={{marginTop:8}}><button className="button" disabled={busy} onClick={()=>void commitImport()}>Proses Import</button><button className="button secondary" onClick={()=>{setImportRows([]);setImportFile("")}}>Batal</button></div></div>}
   {collectionTools}
   <div className="tablewrap"><table className="data-table"><thead><tr><th>Pilih</th><th>Tanggal</th><th>Siswa</th><th>Kelas</th><th>Mata Pelajaran</th><th>Asesmen</th><th>Nilai</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>{list.visible.map(r=><tr key={r.id}><td><RecordCheckbox list={list} id={r.id} label={studentName(r.student_id)+" "+r.assessment_name} disabled={busy}/></td><td>{r.assessment_date}</td><td>{studentName(r.student_id)}</td><td>{className(r.class_id)}</td><td>{subjectName(r)}</td><td><strong>{r.assessment_name}</strong><small style={{display:"block"}}>{r.assessment_category||"LAINNYA"}</small></td><td><strong>{r.score}</strong> / {r.max_score||100}</td><td>{r.notes||"—"}</td><td><div className="flow"><button className="button secondary" onClick={()=>openEdit(r)}><Pencil size={13}/> Edit</button><button className="button danger" disabled={busy} onClick={()=>void removeGrade(r)}><Trash2 size={13}/> Hapus</button></div></td></tr>)}</tbody></table></div>{!filtered.length&&<div className="empty">Belum ada nilai sesuai filter.</div>}
  </section>
  <DataEntryModal open={modal} onClose={()=>setModal(false)} title={editingId?"Edit Nilai Siswa":"Input Nilai Siswa"} subtitle="Semua dropdown dapat dicari. Bila kelas, siswa, atau mata pelajaran belum tersedia, ketik data baru untuk menambahkannya ke sumber utama." wide>
   <div className="fields">
    <div className="field"><SmartSelect label="Kelas" value={classValue} options={classOptions} onChange={v=>{setClassValue(v);setStudentValue("")}} allowCustom customLabel="Tambah kelas ini"/></div>
    <div className="field"><SmartSelect label="Nama siswa" value={studentValue} options={studentOptions} onChange={setStudentValue} allowCustom customLabel="Tambah siswa ini"/></div>
    <div className="field"><SmartSelect label="Mata pelajaran" value={subjectValue} options={subjectOptions} onChange={setSubjectValue} allowCustom customLabel="Tambah mata pelajaran ini"/></div>
    <label className="field">Nama tugas / asesmen<input value={assessment} onChange={e=>setAssessment(e.target.value)} placeholder="UH Bab 1 / Proyek / Tugas 3"/></label>
    <div className="field"><SmartSelect label="Kategori" value={category} options={["TUGAS","UH","PTS","PAS","PROYEK","PRAKTIK","LAINNYA"].map(x=>({value:x,label:x}))} onChange={setCategory} allowCustom customLabel="Gunakan kategori ini"/></div>
    <label className="field">Tanggal<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label className="field">Nilai<input type="number" min={0} value={score} onChange={e=>setScore(e.target.value)}/></label>
    <label className="field">Nilai maksimum<input type="number" min={1} value={maxScore} onChange={e=>setMaxScore(e.target.value)}/></label>
    <label className="field full">Catatan guru<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
   </div>
   <div className="modal-actions"><button className="button secondary" onClick={()=>setModal(false)}>Batal</button><button className="button" disabled={busy||!classValue||!studentValue||!subjectValue||assessment.trim().length<2||score===""||maxScore==="" } onClick={()=>void save()}>{busy?"Menyimpan…":editingId?"Simpan Perubahan":"Simpan Nilai"}</button></div>
  </DataEntryModal>
  {error&&<div className="banner error">{error}</div>}{ok&&<div className="banner success">{ok}</div>}
 </>;
}
