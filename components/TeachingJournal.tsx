"use client";
import {readAllRows} from "@/lib/read-all-rows";
import {errorMessage} from "@/lib/error-message";
import {useEffect,useMemo,useState} from "react";
import {BookOpen,ChevronDown,Download,Pencil,Plus,Search,Trash2,Upload} from "lucide-react";
import RecordListTools,{useRecordList,RecordCheckbox} from "@/components/RecordListTools";
import DataEntryModal from "@/components/DataEntryModal";
import SmartSelect from "@/components/SmartSelect";
import {browserDb} from "@/lib/supabase";
import {downloadExcel,readExcel,type SheetRows} from "@/lib/excel";
import {isAdmin,type Role} from "@/lib/modules";

type C={id:string;name:string;grade:string|null;academic_year:string};
type Subject={id:string;name:string;code:string|null};
type Staff={id:string;user_id:string|null;name:string;position:string|null;staff_type:string};
type J={id:string;teacher_id:string;class_id:string;subject_id:string|null;subject:string;lesson_date:string;topic:string;notes:string|null;teacher_name_snapshot:string|null;class_name_snapshot:string|null;activity:string|null;reflection:string|null;follow_up:string|null};
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});

export default function TeachingJournal({schoolId,userId,role}:{schoolId:string;userId:string;role:Role}){
 const db=useMemo(()=>browserDb(),[]),manager=isAdmin(role);
 const [classes,setClasses]=useState<C[]>([]),[subjects,setSubjects]=useState<Subject[]>([]),[staff,setStaff]=useState<Staff[]>([]),[rows,setRows]=useState<J[]>([]);
 const [modal,setModal]=useState(false),[editingId,setEditingId]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState(""),[query,setQuery]=useState(""),[importRows,setImportRows]=useState<SheetRows>([]),[importFile,setImportFile]=useState("");
 const [teacher,setTeacher]=useState(userId),[teacherText,setTeacherText]=useState(""),[classValue,setClassValue]=useState(""),[subjectValue,setSubjectValue]=useState(""),[date,setDate]=useState(today()),[topic,setTopic]=useState(""),[activity,setActivity]=useState(""),[reflection,setReflection]=useState(""),[followUp,setFollowUp]=useState("");
 const [filterTeacher,setFilterTeacher]=useState(""),[filterClass,setFilterClass]=useState(""),[filterSubject,setFilterSubject]=useState("");

 async function load(){
  if(!db)return;
  const [cl,su,st,j]=await Promise.all([
   readAllRows(db.from("sc_classes").select("id,name,grade,academic_year").eq("school_id",schoolId).order("name").order("id")),
   readAllRows(db.from("sc_subjects").select("id,name,code").eq("school_id",schoolId).order("name").order("id")),
   readAllRows(db.from("sc_staff").select("id,user_id,name,position,staff_type").eq("school_id",schoolId).order("name").order("id")),
   readAllRows(db.from("sc_teacher_journals").select("id,teacher_id,class_id,subject_id,subject,lesson_date,topic,notes,teacher_name_snapshot,class_name_snapshot,activity,reflection,follow_up").eq("school_id",schoolId).order("lesson_date",{ascending:false}).order("id"))
  ]);
  setClasses((cl.data||[]) as C[]);setSubjects((su.data||[]) as Subject[]);setStaff((st.data||[]) as Staff[]);setRows((j.data||[]) as J[]);
 }
 useEffect(()=>{void load()},[db,schoolId]);

 const teachers=staff.filter(s=>s.staff_type==="teacher"||s.user_id);
 const teacherOptions=teachers.map(s=>({value:s.user_id||s.name,label:s.name,subtitle:s.position||"Guru"}));
 const classOptions=classes.map(c=>({value:c.id,label:c.name,subtitle:[c.grade,c.academic_year].filter(Boolean).join(" · ")}));
 const subjectOptions=subjects.map(s=>({value:s.id,label:s.name,subtitle:s.code||undefined}));
 const nameTeacher=(r:J)=>r.teacher_name_snapshot||staff.find(s=>s.user_id===r.teacher_id)?.name||"Guru";
 const nameClass=(r:J)=>r.class_name_snapshot||classes.find(c=>c.id===r.class_id)?.name||"Kelas";
 const nameSubject=(r:J)=>subjects.find(s=>s.id===r.subject_id)?.name||r.subject||"Umum / wali kelas";
 const filtered=rows.filter(r=>(!filterTeacher||r.teacher_id===filterTeacher||nameTeacher(r)===filterTeacher)&&(!filterClass||r.class_id===filterClass||nameClass(r)===filterClass)&&(!filterSubject||r.subject_id===filterSubject||nameSubject(r)===filterSubject)&&(nameTeacher(r)+" "+nameClass(r)+" "+nameSubject(r)+" "+r.topic).toLowerCase().includes(query.toLowerCase()));

 function reset(){const own=staff.find(s=>s.user_id===userId);setEditingId(null);setTeacher(userId);setTeacherText(own?.name||"");setClassValue("");setSubjectValue("");setDate(today());setTopic("");setActivity("");setReflection("");setFollowUp("")}
 function openEdit(r:J){setEditingId(r.id);setTeacher(r.teacher_id);setTeacherText(nameTeacher(r));setClassValue(r.class_id);setSubjectValue(r.subject_id||r.subject||"");setDate(r.lesson_date);setTopic(r.topic);setActivity(r.activity||"");setReflection(r.reflection||"");setFollowUp(r.follow_up||"");setModal(true)}
 async function resolveClass(){
  const known=classes.find(c=>c.id===classValue);if(known)return known;
  const byName=classes.find(c=>c.name.toLowerCase()===classValue.toLowerCase());if(byName)return byName;
  if(!db||!classValue.trim())throw Error("Pilih atau tulis kelas.");
  const {data,error}=await db.from("sc_classes").insert({school_id:schoolId,name:classValue.trim(),academic_year:new Date().getFullYear()+"/"+(new Date().getFullYear()+1)}).select("id,name,grade,academic_year").single();if(error)throw error;return data as C
 }
 async function resolveSubject(){
  if(!subjectValue)return null;
  const known=subjects.find(s=>s.id===subjectValue);if(known)return known;
  const byName=subjects.find(s=>s.name.toLowerCase()===subjectValue.toLowerCase());if(byName)return byName;
  if(!db)return null;
  const {data,error}=await db.from("sc_subjects").insert({school_id:schoolId,name:subjectValue.trim()}).select("id,name,code").single();if(error)throw error;return data as Subject
 }
 async function save(){
  if(!db)return;setBusy(true);setError("");setOk("");
  try{
   if(topic.trim().length<3)throw Error("Topik pembelajaran belum lengkap.");
   const klass=await resolveClass(),subject=await resolveSubject();
   const selectedTeacher=staff.find(s=>s.user_id===teacher||s.name===teacher);
   const teacherId=selectedTeacher?.user_id||userId,teacherName=selectedTeacher?.name||teacherText||teacher||"Guru";
   const payload={teacher_id:teacherId,class_id:klass.id,subject_id:subject?.id||null,subject:subject?.name||subjectValue||"Umum",lesson_date:date,topic:topic.trim(),notes:[activity&&"Aktivitas: "+activity,reflection&&"Refleksi: "+reflection,followUp&&"Tindak lanjut: "+followUp].filter(Boolean).join("\n\n")||null,teacher_name_snapshot:teacherName,class_name_snapshot:klass.name,activity:activity.trim()||null,reflection:reflection.trim()||null,follow_up:followUp.trim()||null};
   const request=editingId?db.from("sc_teacher_journals").update(payload).eq("school_id",schoolId).eq("id",editingId):db.from("sc_teacher_journals").insert({school_id:schoolId,...payload});const {error:e}=await request;if(e)throw e;
   const edited=!!editingId;setModal(false);reset();await load();setOk(edited?"Jurnal mengajar diperbarui.":"Jurnal mengajar tersimpan dan terhubung dengan data guru, kelas, serta mata pelajaran.");
  }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 async function removeJournal(r:J){if(!db||!(manager||r.teacher_id===userId)||!confirm("Hapus jurnal mengajar ini? Tindakan ini tidak dapat dibatalkan."))return;setBusy(true);setError("");setOk("");try{const {error:e}=await db.from("sc_teacher_journals").delete().eq("school_id",schoolId).eq("id",r.id);if(e)throw e;await load();setOk("Jurnal mengajar dihapus.")}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 async function template(){await downloadExcel("template-jurnal-mengajar-school-control.xlsx",[
  {name:"JURNAL_MENGAJAR",rows:[{Guru:"Nama Guru",Kelas:"VII A",Mata_Pelajaran:"Matematika",Tanggal:today(),Topik:"Pecahan",Aktivitas:"Diskusi dan latihan",Refleksi:"Sebagian siswa perlu penguatan",Tindak_Lanjut:"Remedial terarah"}]},
  {name:"Panduan",rows:[{Ketentuan:"Guru, kelas, dan mata pelajaran sebaiknya sudah tersedia pada Data Induk. Guru biasa hanya dapat mengimport jurnal atas nama dirinya sendiri. Hapus baris contoh sebelum import."}]}
 ])}
 async function readImport(file?:File){if(!file)return;setError("");try{if(file.size>8_000_000)throw Error("File maksimal 8 MB.");const rr=await readExcel(file);if(rr.length>3000)throw Error("Maksimal 3.000 baris per import.");setImportRows(rr);setImportFile(file.name);setOk(file.name+" siap diimport · "+rr.length+" baris.")}catch(e){setError(errorMessage(e))}}
 async function commitImport(){if(!db||!importRows.length)return;setBusy(true);setError("");setOk("");try{let imported=0,skipped=0;const payloads:Record<string,unknown>[]=[];const own=staff.find(s=>s.user_id===userId);for(const raw of importRows){const teacherTextRaw=String(raw.Guru||raw.teacher||"").trim(),classText=String(raw.Kelas||raw.class||"").trim(),subjectText=String(raw.Mata_Pelajaran||raw.Mapel||raw.subject||"").trim(),day=String(raw.Tanggal||raw.date||today()).slice(0,10),topicText=String(raw.Topik||raw.topic||"").trim(),activityText=String(raw.Aktivitas||raw.activity||"").trim(),reflectionText=String(raw.Refleksi||raw.reflection||"").trim(),followText=String(raw.Tindak_Lanjut||raw.Follow_Up||raw.follow_up||"").trim();const klass=classes.find(x=>x.name.trim().toLowerCase()===classText.toLowerCase()),matchedTeacher=manager?teachers.find(x=>x.name.trim().toLowerCase()===teacherTextRaw.toLowerCase()&&x.user_id):own,subject=subjectText?subjects.find(x=>x.name.trim().toLowerCase()===subjectText.toLowerCase()||((x.code||"").trim().toLowerCase()===subjectText.toLowerCase())):null;if(!klass||!matchedTeacher?.user_id||(!manager&&teacherTextRaw&&own&&teacherTextRaw.toLowerCase()!==own.name.toLowerCase())||(subjectText&&!subject)||!topicText||!/^\d{4}-\d{2}-\d{2}$/.test(day)){skipped++;continue}payloads.push({school_id:schoolId,teacher_id:matchedTeacher.user_id,class_id:klass.id,subject_id:subject?.id||null,subject:subject?.name||"Umum",lesson_date:day,topic:topicText,activity:activityText||null,reflection:reflectionText||null,follow_up:followText||null,notes:[activityText&&"Aktivitas: "+activityText,reflectionText&&"Refleksi: "+reflectionText,followText&&"Tindak lanjut: "+followText].filter(Boolean).join("\n\n")||null,teacher_name_snapshot:matchedTeacher.name,class_name_snapshot:klass.name});imported++}if(payloads.length){const {error:e}=await db.from("sc_teacher_journals").insert(payloads);if(e)throw e}await db.from("sc_import_history").insert({school_id:schoolId,module_key:"buku_kerja",import_kind:"teaching_journals",file_name:importFile||"import.xlsx",row_count:importRows.length,imported_count:imported,skipped_count:skipped,details:{target:"sc_teacher_journals"}});setImportRows([]);setImportFile("");await load();setOk("Import jurnal selesai: "+imported+" masuk, "+skipped+" dilewati.")}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 async function exportRows(){await downloadExcel("jurnal-mengajar-school-control.xlsx",[{name:"JURNAL_MENGAJAR",rows:filtered.map(r=>({Guru:nameTeacher(r),Kelas:nameClass(r),Mata_Pelajaran:nameSubject(r),Tanggal:r.lesson_date,Topik:r.topic,Aktivitas:r.activity||"",Refleksi:r.reflection||"",Tindak_Lanjut:r.follow_up||""}))}])}

 const list=useRecordList(filtered,r=>r.topic+" "+nameTeacher(r));
 const allowed=(id:string)=>{const r=filtered.find(x=>x.id===id);return Boolean(r&&(manager||r.teacher_id===userId));};
 const collectionTools=<RecordListTools list={list} label="catatan" showSearch={false} canSelect selectable={allowed} onRefresh={load} busy={busy} actions={[{key:"delete",label:"Hapus pilihan",description:"Hapus catatan yang dipilih sesuai kewenangan akun Anda. Tindakan ini tidak dapat dibatalkan.",danger:true,eligible:allowed,run:async id=>{if(!db)throw Error("Database belum terhubung");const {error}=await db.from("sc_teacher_journals").delete().eq("school_id",schoolId).eq("id",id);if(error)throw error}}]}/>;
 return <>
  <section className="panel journal-page">
   <div className="sectionhead"><div><span className="eyebrow">CATATAN PEMBELAJARAN</span><h2>Jurnal Mengajar</h2><p className="muted">Pilih data yang sudah ada dari Data Induk. Kolom pencarian juga menerima data baru bila pilihan belum tersedia.</p></div><div className="flow"><button className="button secondary" onClick={()=>void template()}><Download size={15}/> Template Excel</button><label className="button secondary"><Upload size={15}/> Import Excel<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>void readImport(e.target.files?.[0])}/></label><button className="button secondary" onClick={()=>void exportRows()}><Download size={15}/> Export</button><button className="button" onClick={()=>{reset();setModal(true)}}><Plus size={15}/> Tulis Jurnal</button></div></div>
   <div className="journal-filters">
    <div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari guru, kelas, mapel, atau topik…"/></div>
    <SmartSelect label="Guru" value={filterTeacher} options={[{value:"",label:"Semua guru"},...teacherOptions]} onChange={setFilterTeacher} allowCustom customLabel="Cari dengan nama ini"/>
    <SmartSelect label="Kelas" value={filterClass} options={[{value:"",label:"Semua kelas"},...classOptions]} onChange={setFilterClass} allowCustom customLabel="Cari kelas ini"/>
    <SmartSelect label="Mata pelajaran" value={filterSubject} options={[{value:"",label:"Semua mapel"},...subjectOptions]} onChange={setFilterSubject} allowCustom customLabel="Cari mapel ini"/>
   </div>
   {importRows.length>0&&<div className="banner"><strong>{importFile} · {importRows.length} baris siap</strong><div className="flow" style={{marginTop:8}}><button className="button" disabled={busy} onClick={()=>void commitImport()}>Proses Import</button><button className="button secondary" onClick={()=>{setImportRows([]);setImportFile("")}}>Batal</button></div></div>}
   {collectionTools}
   <div className="journal-list-pro">{list.visible.map(r=><details className="journal-card-pro" key={r.id}>{allowed(r.id)&&<div className="record-card-select"><RecordCheckbox list={list} id={r.id} label={r.topic} disabled={busy}/><span>Pilih jurnal</span></div>}<summary><span className="journal-date">{r.lesson_date.slice(5)}</span><div><strong>{r.topic}</strong><small>{nameClass(r)} · {nameSubject(r)} · {nameTeacher(r)}</small></div><ChevronDown size={16}/></summary><div className="journal-detail-grid"><div><span>Aktivitas Pembelajaran</span><p>{r.activity||r.notes||"Belum ada catatan aktivitas."}</p></div><div><span>Refleksi</span><p>{r.reflection||"Belum ada refleksi."}</p></div><div><span>Tindak Lanjut</span><p>{r.follow_up||"Belum ada tindak lanjut."}</p></div></div>{(manager||r.teacher_id===userId)&&<div className="flow" style={{marginTop:12}}><button type="button" className="button secondary" onClick={()=>openEdit(r)}><Pencil size={14}/> Edit Jurnal</button><button type="button" className="button danger" disabled={busy} onClick={()=>void removeJournal(r)}><Trash2 size={14}/> Hapus</button></div>}</details>)}{!filtered.length&&<div className="empty"><BookOpen size={20}/> Belum ada jurnal sesuai filter.</div>}</div>
  </section>

  <DataEntryModal open={modal} onClose={()=>setModal(false)} title={editingId?"Edit Jurnal Mengajar":"Tulis Jurnal Mengajar"} subtitle="Struktur mengikuti Buku Kerja Digital: guru, kelas, mata pelajaran, topik, aktivitas, refleksi, dan tindak lanjut." wide>
   <div className="fields">
    <div className="field"><SmartSelect label="Nama guru" value={teacher} options={teacherOptions} onChange={v=>{setTeacher(v);setTeacherText(teachers.find(s=>s.user_id===v)?.name||v)}} allowCustom customLabel="Gunakan nama guru ini"/></div>
    <label className="field">Tanggal<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <div className="field"><SmartSelect label="Kelas" value={classValue} options={classOptions} onChange={setClassValue} allowCustom customLabel="Tambah kelas ini"/></div>
    <div className="field"><SmartSelect label="Mata pelajaran" value={subjectValue} options={[{value:"",label:"Umum / wali kelas"},...subjectOptions]} onChange={setSubjectValue} allowCustom customLabel="Tambah mata pelajaran ini"/></div>
    <label className="field full">Topik pembelajaran<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: Pecahan dan perbandingan"/></label>
    <label className="field full">Aktivitas pembelajaran<textarea rows={4} value={activity} onChange={e=>setActivity(e.target.value)} placeholder="Apa yang dilakukan siswa dan guru?"/></label>
    <label className="field full">Refleksi<textarea rows={4} value={reflection} onChange={e=>setReflection(e.target.value)} placeholder="Apa yang berjalan baik dan perlu diperbaiki?"/></label>
    <label className="field full">Tindak lanjut<textarea rows={4} value={followUp} onChange={e=>setFollowUp(e.target.value)} placeholder="Remedial, pengayaan, atau kegiatan berikutnya"/></label>
   </div>
   <div className="modal-actions"><button className="button secondary" onClick={()=>setModal(false)}>Batal</button><button className="button" disabled={busy||!classValue||topic.trim().length<3} onClick={()=>void save()}>{busy?"Menyimpan…":editingId?"Simpan Perubahan":"Simpan Jurnal"}</button></div>
  </DataEntryModal>
  {error&&<div className="banner error">{error}</div>}{ok&&<div className="banner success">{ok}</div>}
 </>;
}
