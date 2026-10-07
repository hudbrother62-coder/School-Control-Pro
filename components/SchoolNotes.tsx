"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {Archive,BookOpenText,Filter,Pin,PinOff,Plus,RefreshCw,RotateCcw,Search,SquarePen,Trash2} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {errorMessage} from "@/lib/error-message";
import {readAllRows} from "@/lib/read-all-rows";
import {useSchoolRevision} from "@/lib/school-realtime";
import {ROLE_LABELS,type Role} from "@/lib/modules";
import DataEntryModal from "./DataEntryModal";
import "./school-notes.css";

type Scope="personal"|"role";
type Note={
 id:string; school_id:string; author_id:string; scope:Scope; target_role:Role|null;
 title:string;body:string;is_pinned:boolean;archived_at:string|null;
 created_at:string;updated_at:string;
};
const roleOptions=(Object.entries(ROLE_LABELS) as [Role,string][]).filter(([key])=>key!=="viewer");
const dateLabel=(value:string)=>new Date(value).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"});
const newDraft=(scope:Scope,role:Role)=>({scope,target_role:scope==="role"?(role==="viewer"?"teacher":role):null as Role|null,title:"",body:""});
type Draft=ReturnType<typeof newDraft>;

export default function SchoolNotes({schoolId,userId,role,focus}:{schoolId:string;userId:string;role:Role;focus:string}){
 const db=useMemo(()=>browserDb(),[]);
 const revision=useSchoolRevision(schoolId);
 const manager=role==="owner"||role==="principal";
 const [notes,setNotes]=useState<Note[]>([]);
 const [authors,setAuthors]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [search,setSearch]=useState("");
 const [roleFilter,setRoleFilter]=useState("");
 const [authorFilter,setAuthorFilter]=useState("");
 const [archiveFilter,setArchiveFilter]=useState(false);
 const [editing,setEditing]=useState<Note|null>(null);
 const [draft,setDraft]=useState<Draft>(newDraft("personal",role));
 const [modal,setModal]=useState(false);
 const epoch=useRef(0);

 async function load(){
  if(!db)return;
  const current=++epoch.current;
  const [result,people]=await Promise.all([
   readAllRows(db.from("sc_notes").select("id,school_id,author_id,scope,target_role,title,body,is_pinned,archived_at,created_at,updated_at")
    .eq("school_id",schoolId).order("updated_at",{ascending:false}).order("id")),
   readAllRows(db.from("sc_staff").select("user_id,name").eq("school_id",schoolId).order("id"))
  ]);
  if(current!==epoch.current)return;
  if(result.error)throw result.error;
  setNotes((result.data||[]) as Note[]);
  if(!people.error){
   const names:Record<string,string>={};
   for(const person of people.data||[])if(person.user_id)names[person.user_id]=person.name;
   setAuthors(names);
  }
 }
 useEffect(()=>{
  let active=true;
  setLoading(true);
  setError("");
  void load().catch(e=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false;epoch.current++};
 },[db,schoolId,revision]);

 const authorName=(id:string)=>id===userId?"Saya":authors[id]||"Pengguna sekolah ("+id.slice(0,8)+")";
 const personalView=focus==="Catatan Pribadi";
 const roleView=focus==="Catatan Peran";
 const visible=notes.filter(n=>{
  if(personalView&&(n.scope!=="personal"||n.author_id!==userId))return false;
  if(roleView&&n.scope!=="role")return false;
  if(!manager&&focus==="Semua Catatan"&&n.author_id!==userId&&n.scope!=="role")return false;
  if(!!n.archived_at!==archiveFilter)return false;
  if(roleFilter&&n.target_role!==roleFilter)return false;
  if(authorFilter&&n.author_id!==authorFilter)return false;
  const query=search.toLocaleLowerCase("id-ID").trim();
  return !query||[n.title,n.body,authorName(n.author_id),n.target_role?ROLE_LABELS[n.target_role]:""].join(" ").toLocaleLowerCase("id-ID").includes(query);
 }).sort((a,b)=>Number(b.is_pinned)-Number(a.is_pinned)||Date.parse(b.updated_at)-Date.parse(a.updated_at));

 function openCreate(){
  setEditing(null);
  setDraft(newDraft(roleView?"role":"personal",role));
  setError("");
  setModal(true);
 }
 function openEdit(note:Note){
  if(note.author_id!==userId)return;
  setEditing(note);
  setDraft({scope:note.scope,target_role:note.target_role,title:note.title,body:note.body});
  setError("");
  setModal(true);
 }
 async function mutate(work:()=>Promise<void>,notice:string){
  if(!db||busy)return;
  setBusy(true);setError("");setSuccess("");
  try{await work();await load();setSuccess(notice);}
  catch(e){setError(errorMessage(e))}
  finally{setBusy(false)}
 }
 async function save(){
  if(!db||busy)return;
  const title=draft.title.trim(),body=draft.body.trim();
  if(title.length<2||title.length>160||!body||body.length>12000||(draft.scope==="role"&&!draft.target_role)){
   setError("Lengkapi judul (2–160 karakter), isi (maksimal 12.000 karakter), dan tujuan peran.");return;
  }
  setBusy(true);setError("");setSuccess("");
  const payload={title,body,scope:draft.scope,target_role:draft.scope==="role"?draft.target_role:null};
  try{
   const result=editing
    ?await db.from("sc_notes").update(payload).eq("id",editing.id).eq("school_id",schoolId).eq("author_id",userId).select("id").single()
    :await db.from("sc_notes").insert({...payload,school_id:schoolId,author_id:userId}).select("id").single();
   if(result.error)throw result.error;
   setModal(false);setEditing(null);
   await load();
   setSuccess(editing?"Catatan berhasil diperbarui.":"Catatan berhasil disimpan.");
  }catch(e){setError(errorMessage(e))}
  finally{setBusy(false)}
 }
 async function togglePin(note:Note){
  await mutate(async()=>{
   const {data,error:e}=await db!.from("sc_notes").update({is_pinned:!note.is_pinned})
    .eq("id",note.id).eq("school_id",schoolId).eq("author_id",userId).select("id").single();
   if(e||!data)throw e||Error("Catatan tidak dapat diperbarui.");
  },note.is_pinned?"Sematan dilepas.":"Catatan disematkan.");
 }
 async function toggleArchive(note:Note){
  await mutate(async()=>{
   const {data,error:e}=await db!.from("sc_notes").update({archived_at:note.archived_at?null:new Date().toISOString()})
    .eq("id",note.id).eq("school_id",schoolId).eq("author_id",userId).select("id").single();
   if(e||!data)throw e||Error("Catatan tidak dapat diarsipkan.");
  },note.archived_at?"Catatan dipulihkan.":"Catatan masuk arsip.");
 }
 async function remove(note:Note){
  if(!window.confirm('Hapus catatan "'+note.title+'"? Tindakan ini tidak dapat dibatalkan.'))return;
  await mutate(async()=>{
   const {data,error:e}=await db!.from("sc_notes").delete()
    .eq("id",note.id).eq("school_id",schoolId).eq("author_id",userId).select("id").single();
   if(e||!data)throw e||Error("Catatan tidak dapat dihapus.");
  },"Catatan dihapus.");
 }
 return <div className="notes-workspace">
  <section className="panel">
   <div className="sectionhead">
    <div><h2>{focus}</h2><p className="muted">Tulis catatan kerja berdasarkan peran atau simpan catatan pribadi di satu tempat.</p></div>
    <div className="flow"><button type="button" className="button secondary" disabled={loading||busy} onClick={()=>{setLoading(true);void load().catch(e=>setError(errorMessage(e))).finally(()=>setLoading(false))}}><RefreshCw size={16}/> Segarkan</button><button type="button" className="button" onClick={openCreate}><Plus size={16}/> Tambah Catatan</button></div>
   </div>
   <p className="notes-policy">Catatan peran dapat dibaca pemilik akun, kepala sekolah, penulis, dan pengguna dengan peran tujuan. <strong>Catatan pribadi hanya dapat dibaca penulis, kepala sekolah, dan pemilik akun pada sekolah yang sama.</strong> Pengguna lain tidak dapat melihatnya.</p>
   <div className="notes-toolbar">
    <label className="notes-search"><Search size={17}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari judul, isi, atau penulis…" aria-label="Cari catatan"/></label>
    {!personalView&&<label className="notes-filter"><Filter size={16}/><select aria-label="Filter peran catatan" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="">Semua peran</option>{roleOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
    {manager&&!personalView&&<select aria-label="Filter penulis" value={authorFilter} onChange={e=>setAuthorFilter(e.target.value)}><option value="">Semua penulis</option>{[...new Set(notes.map(n=>n.author_id))].map(id=><option key={id} value={id}>{authorName(id)}</option>)}</select>}
    <label className="notes-archive-toggle"><input type="checkbox" checked={archiveFilter} onChange={e=>setArchiveFilter(e.target.checked)}/> Lihat arsip</label>
   </div>
   {error&&<div className="banner error" role="alert">{error}</div>}
   {success&&<div className="banner success" role="status">{success}</div>}
   <div className="notes-count">{loading?"Memuat catatan…":visible.length+" catatan ditemukan"}</div>
   {!loading&&!visible.length&&<div className="empty"><BookOpenText size={30}/><h3>Belum ada catatan</h3><p>Mulai mencatat hal penting, pekerjaan, ide, atau tindak lanjut.</p><button className="button" onClick={openCreate}><Plus size={16}/> Tulis Catatan</button></div>}
   <div className="notes-grid">{!loading&&visible.map(note=><article key={note.id} className="notes-card">
    <div className="notes-card-top"><span className="pill">{note.scope==="personal"?"Pribadi":"Peran · "+(note.target_role?ROLE_LABELS[note.target_role]:"—")}</span>{note.is_pinned&&<span className="notes-pinned"><Pin size={14}/> Disematkan</span>}</div>
    <h3>{note.title}</h3>
    <p className="notes-body">{note.body}</p>
    <div className="notes-card-foot"><small>{authorName(note.author_id)} · {dateLabel(note.updated_at)}</small>
     {note.author_id===userId&&<div className="notes-card-actions">
      <button className="iconbutton" type="button" title="Edit catatan" aria-label={"Edit "+note.title} disabled={busy} onClick={()=>openEdit(note)}><SquarePen size={16}/></button>
      <button className="iconbutton" type="button" title={note.is_pinned?"Lepas sematan":"Sematkan"} aria-label={note.is_pinned?"Lepas sematan":"Sematkan"} disabled={busy} onClick={()=>void togglePin(note)}>{note.is_pinned?<PinOff size={16}/>:<Pin size={16}/>}</button>
      <button className="iconbutton" type="button" title={note.archived_at?"Pulihkan":"Arsipkan"} aria-label={note.archived_at?"Pulihkan":"Arsipkan"} disabled={busy} onClick={()=>void toggleArchive(note)}>{note.archived_at?<RotateCcw size={16}/>:<Archive size={16}/>}</button>
      <button className="iconbutton danger" type="button" title="Hapus" aria-label={"Hapus "+note.title} disabled={busy} onClick={()=>void remove(note)}><Trash2 size={16}/></button>
     </div>}
    </div>
   </article>)}</div>
  </section>
  <DataEntryModal open={modal} onClose={()=>{if(!busy){setModal(false);setError("")}}} title={editing?"Edit Catatan":"Tambah Catatan"} subtitle="Disimpan otomatis ke database sekolah setelah tombol Simpan ditekan." wide error={error}>
   <form onSubmit={e=>{e.preventDefault();void save()}} className="notes-form">
    <label className="field">Jenis catatan<select value={draft.scope} onChange={e=>setDraft(d=>({...d,scope:e.target.value as Scope,target_role:e.target.value==="role"?(role==="viewer"?"teacher":role):null}))}><option value="personal">Catatan Pribadi</option><option value="role">Catatan Peran</option></select></label>
    {draft.scope==="role"&&<label className="field">Diperuntukkan bagi peran<select value={draft.target_role||""} required onChange={e=>setDraft(d=>({...d,target_role:e.target.value as Role}))}>{roleOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
    {draft.scope==="personal"&&<p className="notes-policy">Catatan ini bukan rahasia dari kepala sekolah atau pemilik akun. Mereka memiliki akses pengawasan.</p>}
    <label className="field">Judul<input autoFocus required maxLength={160} minLength={2} value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="Contoh: Tindak lanjut rapat hari Senin"/></label>
    <label className="field">Isi catatan<textarea rows={9} required maxLength={12000} value={draft.body} onChange={e=>setDraft(d=>({...d,body:e.target.value}))} placeholder="Tuliskan detail, poin penting, dan tindak lanjut…"/></label>
    <small className="hint">{draft.body.length.toLocaleString("id-ID")} / 12.000 karakter</small>
    <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={()=>{setModal(false);setError("")}}>Batal</button><button className="button" type="submit" disabled={busy||draft.title.trim().length<2||!draft.body.trim()}>{busy?"Menyimpan…":editing?"Simpan Perubahan":"Simpan Catatan"}</button></div>
   </form>
  </DataEntryModal>
 </div>;
}
