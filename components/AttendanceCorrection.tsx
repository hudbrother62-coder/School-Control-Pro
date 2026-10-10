"use client";

import {useEffect,useMemo,useState} from "react";
import {CalendarDays,CheckCircle2,Clock3,Download,FileUp,History,PencilLine,RefreshCw,ShieldCheck,Users} from "lucide-react";
import DataEntryModal from "@/components/DataEntryModal";
import SearchableSelect from "@/components/SearchableSelect";
import {downloadExcel,readExcel,type SheetRows} from "@/lib/excel";
import {readAllRows} from "@/lib/read-all-rows";
import {errorMessage} from "@/lib/error-message";
import {browserDb} from "@/lib/supabase";
import {isAdmin,type Role,type Staff} from "@/lib/modules";
import "./attendance-correction.css";

type Agenda={
 id:string;title:string;event_date:string;start_time:string|null;end_time:string|null;
 attendance_target:string;attendance_roles:string[];attendance_users:string[];
 attendance_required:boolean;scope:string;attendance_address:string|null;
};
type Member={user_id:string;role:string;is_active:boolean};
type Directory={user_id:string;staff_name:string|null;email:string|null;role:string|null};
type Attendance={
 id:string;event_id:string;user_id:string;status:string;check_in_at:string|null;check_out_at:string|null;
 correction_reason:string|null;corrected_at:string|null;
};
type CorrectionStatus="present"|"late"|"absent"|"excused";
const statusLabels:Record<CorrectionStatus,string>={present:"Hadir",late:"Terlambat",absent:"Tidak hadir",excused:"Izin / dispensasi"};
const validStatuses=Object.keys(statusLabels);
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});
function localStamp(value:string|null,timezone:string){
 if(!value)return "";
 try{
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value));
  const get=(type:string)=>parts.find(p=>p.type===type)?.value||"00";
  return get("year")+"-"+get("month")+"-"+get("day")+"T"+get("hour")+":"+get("minute");
 }catch{return ""}
}
function isValidLocal(value:string){return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)&&!Number.isNaN(new Date(value).getTime())}
function labelStatus(status:string){return statusLabels[status as CorrectionStatus]||"Belum tercatat"}
function showClock(value:string){return value?value.replace("T"," · "):"—"}

export default function AttendanceCorrection({schoolId,role,staff,onChanged,timezone="Asia/Jakarta"}:{
 schoolId:string;role:Role;staff:Staff[];onChanged:()=>Promise<void>;timezone?:string;
}){
 const db=useMemo(()=>browserDb(),[]);
 const manager=isAdmin(role);
 const [events,setEvents]=useState<Agenda[]>([]);
 const [members,setMembers]=useState<Member[]>([]);
 const [directory,setDirectory]=useState<Directory[]>([]);
 const [records,setRecords]=useState<Attendance[]>([]);
 const [eventId,setEventId]=useState("");
 const [selectedUser,setSelectedUser]=useState("");
 const [search,setSearch]=useState("");
 const [memberSearch,setMemberSearch]=useState("");
 const [dateFrom,setDateFrom]=useState("");
 const [dateTo,setDateTo]=useState("");
 const [status,setStatus]=useState("");
 const [checkIn,setCheckIn]=useState("");
 const [checkOut,setCheckOut]=useState("");
 const [reason,setReason]=useState("");
 const [modal,setModal]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [loadingRecords,setLoadingRecords]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [importRows,setImportRows]=useState<SheetRows>([]);
 const [importFile,setImportFile]=useState("");
 const [importErrors,setImportErrors]=useState<{Baris:number;Kesalahan:string}[]>([]);
 const event=events.find(e=>e.id===eventId)||null;
 const filteredEvents=events.filter(e=>(!dateFrom||e.event_date>=dateFrom)&&(!dateTo||e.event_date<=dateTo)&&(!search||e.title.toLowerCase().includes(search.toLowerCase())||e.event_date.includes(search)));
 const roster=useMemo(()=>{
  if(!event)return [] as Member[];
  return members.filter(m=>m.role!=="viewer"&&(
   (m.is_active&&(event.attendance_target==="users"?event.attendance_users.includes(m.user_id):event.attendance_roles.includes(m.role)))||
   records.some(r=>r.user_id===m.user_id)
  )).sort((a,b)=>{
   const aName=directory.find(d=>d.user_id===a.user_id)?.staff_name||staff.find(s=>s.user_id===a.user_id)?.name||a.user_id;
   const bName=directory.find(d=>d.user_id===b.user_id)?.staff_name||staff.find(s=>s.user_id===b.user_id)?.name||b.user_id;
   return aName.localeCompare(bName,"id-ID");
  });
 },[event,members,records,directory,staff]);
 const visibleRoster=roster.filter(m=>!memberSearch||nameOf(m.user_id).toLowerCase().includes(memberSearch.toLowerCase()));
 const attendance=records.find(r=>r.user_id===selectedUser)||null;
 const counts={present:records.filter(r=>r.status==="present"||r.status==="late").length,
  absent:records.filter(r=>r.status==="absent"||r.status==="excused").length,
  waiting:roster.filter(m=>!records.some(r=>r.user_id===m.user_id&&validStatuses.includes(r.status))).length};
 const isPresence=status==="present"||status==="late";
 const canSave=Boolean(event&&selectedUser&&validStatuses.includes(status)&&reason.trim().length>=10&&
  (!isPresence||(isValidLocal(checkIn)&&checkIn.slice(0,10)===event.event_date&&(!checkOut||(isValidLocal(checkOut)&&checkOut>=checkIn))))&&!busy);
 function nameOf(id:string){
  const person=directory.find(x=>x.user_id===id);
  return person?.staff_name||staff.find(s=>s.user_id===id)?.name||person?.email||("Anggota "+id.slice(0,8));
 }
 async function loadContext(){
  if(!db||!manager)return;
  setLoading(true);setError("");
  try{
   const [agendaResult,memberResult,directoryResult]=await Promise.all([
    readAllRows(db.from("sc_calendar_events").select("id,title,event_date,start_time,end_time,attendance_target,attendance_roles,attendance_users,attendance_required,scope,attendance_address").eq("school_id",schoolId).eq("scope","school").eq("attendance_required",true).order("event_date",{ascending:false}).order("id")),
    readAllRows(db.from("sc_members").select("user_id,role,is_active").eq("school_id",schoolId).order("user_id")),
    db.rpc("sc_team_directory",{p_school:schoolId})
   ]);
   if(agendaResult.error)throw agendaResult.error;
   if(memberResult.error)throw memberResult.error;
   const list=(agendaResult.data||[]) as Agenda[];
   setEvents(list);
   setMembers((memberResult.data||[]) as Member[]);
   setDirectory(directoryResult.error?[]:((directoryResult.data||[]) as Directory[]));
   setEventId(old=>list.some(e=>e.id===old)?old:(list[0]?.id||""));
  }catch(e){setError(errorMessage(e))}finally{setLoading(false)}
 }
 async function loadRecords(id=eventId){
  if(!db||!manager||!id){setRecords([]);return}
  setLoadingRecords(true);
  const {data,error:requestError}=await readAllRows(db.from("sc_event_attendance")
   .select("id,event_id,user_id,status,check_in_at,check_out_at,correction_reason,corrected_at")
   .eq("school_id",schoolId).eq("event_id",id).order("user_id"));
  if(requestError)setError(requestError.message);
  else setRecords((data||[]) as Attendance[]);
  setLoadingRecords(false);
 }
 useEffect(()=>{void loadContext()},[db,schoolId,manager]);
 useEffect(()=>{
  let active=true;
  setRecords([]);
  if(!db||!eventId||!manager)return;
  setLoadingRecords(true);
  void readAllRows(db.from("sc_event_attendance")
   .select("id,event_id,user_id,status,check_in_at,check_out_at,correction_reason,corrected_at")
   .eq("school_id",schoolId).eq("event_id",eventId).order("user_id")).then(({data,error:requestError})=>{
    if(!active)return;
    if(requestError)setError(requestError.message);
    else setRecords((data||[]) as Attendance[]);
    setLoadingRecords(false);
   });
  return()=>{active=false};
 },[db,schoolId,eventId,manager]);
 useEffect(()=>{setSelectedUser(current=>roster.some(x=>x.user_id===current)?current:(roster[0]?.user_id||""))},[roster]);
 useEffect(()=>{
  const old=records.find(r=>r.user_id===selectedUser);
  setStatus(old&&validStatuses.includes(old.status)?old.status:"");
  setCheckIn(localStamp(old?.check_in_at||null,timezone));
  setCheckOut(localStamp(old?.check_out_at||null,timezone));
  setReason("");
 },[selectedUser,records,timezone]);
 async function save(){
  if(!db||!canSave||!event)return;
  setBusy(true);setError("");setSuccess("");
  try{
   const {error:saveError}=await db.rpc("sc_correct_event_attendance",{
    p_school:schoolId,p_event:event.id,p_user:selectedUser,p_status:status,
    p_check_in_local:isPresence?checkIn:null,p_check_out_local:isPresence&&checkOut?checkOut:null,p_reason:reason.trim()
   });
   if(saveError)throw saveError;
   await loadRecords(event.id);
   await onChanged();
   setModal(false);
   setSuccess("Presensi "+nameOf(selectedUser)+" berhasil dikoreksi untuk kegiatan "+event.title+". Histori perubahan tersimpan.");
  }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 function excelRows(template=false){
  if(!event)return [];
  return roster.map(m=>{
   const rec=records.find(a=>a.user_id===m.user_id);
   return {ID_Kegiatan:event.id,Kegiatan:event.title,Tanggal:event.event_date,
    ID_Akun:m.user_id,Pegawai:nameOf(m.user_id),
    Status:template?"":(rec&&validStatuses.includes(rec.status)?rec.status:""),
    Jam_Masuk:template?"":localStamp(rec?.check_in_at||null,timezone),
    Jam_Pulang:template?"":localStamp(rec?.check_out_at||null,timezone),
    Alasan:template?"":(rec?.correction_reason||"")};
  });
 }
 async function excel(template=false){
  if(!event)return;
  await downloadExcel((template?"template-":"rekap-")+"koreksi-presensi-"+event.event_date+".xlsx",[
   {name:"PRESENSI",rows:excelRows(template)},
   {name:"PANDUAN",rows:[{Ketentuan:"Hanya peserta pada ID_Kegiatan yang terpilih. Status wajib: present, late, absent, excused. Jam: YYYY-MM-DDTHH:MM dengan zona waktu sekolah. Untuk absent/excused kosongkan kedua jam. Alasan minimal 10 karakter. Data awal dan GPS disimpan di histori audit."}]}
  ]);
 }
 async function loadImport(file?:File){
  if(!file)return;
  setError("");setImportErrors([]);
  try{
   if(file.size>5_000_000)throw Error("Ukuran berkas maksimal 5 MB.");
   const rows=await readExcel(file);
   if(!rows.length||rows.length>500)throw Error("Import membutuhkan 1–500 baris.");
   setImportRows(rows);setImportFile(file.name);
  }catch(e){setError(errorMessage(e))}
 }
 async function commitImport(){
  if(!db||!event||!importRows.length||busy)return;
  setBusy(true);setError("");setSuccess("");
  let saved=0;
  const issues:{Baris:number;Kesalahan:string}[]=[];
  for(const [i,row] of importRows.entries()){
   try{
    const id=String(row.ID_Akun||"").trim(),eventKey=String(row.ID_Kegiatan||"").trim();
    const mark=String(row.Status||"").trim().toLowerCase(),reasonText=String(row.Alasan||"").trim();
    const checkin=String(row.Jam_Masuk||"").trim().replace(" ","T");
    const checkout=String(row.Jam_Pulang||"").trim().replace(" ","T");
    if(eventKey!==event.id)throw Error("ID kegiatan tidak sesuai pilihan.");
    if(!roster.some(m=>m.user_id===id))throw Error("Akun bukan peserta kegiatan.");
    if(!validStatuses.includes(mark))throw Error("Status harus present, late, absent, atau excused.");
    if(reasonText.length<10||reasonText.length>2000)throw Error("Alasan harus 10–2000 karakter.");
    if(mark==="present"||mark==="late"){
     if(!isValidLocal(checkin)||checkin.slice(0,10)!==event.event_date||checkout&&(!isValidLocal(checkout)||checkout<checkin))throw Error("Jam masuk/pulang salah.");
    }else if(checkin||checkout)throw Error("Status tidak hadir/izin harus tanpa jam.");
    const {error:saveError}=await db.rpc("sc_correct_event_attendance",{
     p_school:schoolId,p_event:event.id,p_user:id,p_status:mark,
     p_check_in_local:mark==="present"||mark==="late"?checkin:null,
     p_check_out_local:(mark==="present"||mark==="late")&&checkout?checkout:null,p_reason:reasonText
    });
    if(saveError)throw saveError;
    saved++;
   }catch(e){issues.push({Baris:i+2,Kesalahan:errorMessage(e)})}
  }
  setBusy(false);setImportRows([]);setImportErrors(issues);
  await loadRecords(event.id);await onChanged();
  setSuccess(saved+" koreksi berhasil disimpan"+(issues.length?", "+issues.length+" baris gagal.":"."));
 }
 if(!manager)return <section className="panel"><h2>Koreksi Presensi Kegiatan</h2><p className="muted">Koreksi data kehadiran kegiatan dilakukan manajemen sekolah dan tercatat dalam audit.</p></section>;
 return <section className="panel agenda-correction">
  <div className="correction-hero">
   <div className="correction-hero-icon"><PencilLine size={22}/></div>
   <div><span className="correction-kicker">PRESENSI TERHUBUNG AGENDA</span><h2>Koreksi Presensi Kegiatan</h2>
    <p>Pilih kegiatan dan peserta untuk memperbaiki status serta jam kehadiran yang benar. Setiap perubahan menyimpan alasan dan riwayat data sebelumnya.</p></div>
   <button type="button" className="button secondary correction-refresh" disabled={busy||loading} onClick={()=>void loadContext()}><RefreshCw size={16}/> Muat ulang</button>
  </div>
  <div className="correction-step"><span>01</span><strong>Tentukan kegiatan</strong><small>Hanya kegiatan yang mengaktifkan presensi</small></div>
  <div className="correction-filters">
   <label className="field correction-search">Cari kegiatan<input type="search" placeholder="Nama kegiatan atau tanggal" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <label className="field">Dari tanggal<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label>
   <label className="field">Sampai tanggal<input type="date" min={dateFrom||undefined} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label>
  </div>
  <label className="field full correction-event-select">Kegiatan yang akan dikoreksi
   <SearchableSelect label="Pilih kegiatan yang memiliki presensi" value={filteredEvents.some(x=>x.id===eventId)?eventId:""} onChange={e=>{setEventId(e.target.value);setSelectedUser("");setImportRows([]);setSuccess("");setError("")}}>
    <option value="">Pilih kegiatan...</option>
    {filteredEvents.map(e=><option key={e.id} value={e.id}>{e.event_date} · {e.title}</option>)}
   </SearchableSelect>
  </label>
  {error&&<div className="banner error" role="alert">{error}</div>}
  {success&&<div className="banner success" role="status">{success}</div>}
  {loading?<div className="correction-empty">Mengambil kegiatan dan peserta sekolah…</div>:!events.length?<div className="correction-empty"><CalendarDays size={25}/><strong>Belum ada kegiatan dengan presensi aktif</strong><p>Buat kegiatan dan aktifkan presensi di Kalender Sekolah terlebih dahulu. Koreksi tidak dapat dibuat tanpa kegiatan.</p></div>:!filteredEvents.length?<div className="correction-empty">Tidak ada kegiatan yang cocok dengan filter tanggal/pencarian.</div>:event&&<>
   <div className="correction-event-summary">
    <div className="correction-event-icon"><CalendarDays size={24}/></div><div><small>KEGIATAN TERPILIH</small><h3>{event.title}</h3><p>{event.event_date} · {(event.start_time||"").slice(0,5)||"Belum ada jam"}{event.end_time?" – "+event.end_time.slice(0,5):""} · {event.attendance_address||"Lokasi tidak tercantum"}</p></div>
    <span className="correction-event-tag"><ShieldCheck size={14}/> Presensi aktif</span>
   </div>
   <div className="correction-metrics">
    <div><Users size={17}/><strong>{roster.length}</strong><span>Peserta</span></div>
    <div><CheckCircle2 size={17}/><strong>{counts.present}</strong><span>Hadir / terlambat</span></div>
    <div><Clock3 size={17}/><strong>{counts.waiting}</strong><span>Belum tercatat</span></div>
    <div><History size={17}/><strong>{counts.absent}</strong><span>Tidak hadir / izin</span></div>
   </div>
   <div className="correction-step correction-step-two"><span>02</span><strong>Pilih presensi untuk diperbaiki</strong><small>Status yang ditampilkan berasal dari database kegiatan</small></div>
   <div className="correction-actions">
    <input aria-label="Cari peserta kegiatan" type="search" placeholder="Cari nama peserta..." value={memberSearch} onChange={e=>setMemberSearch(e.target.value)}/>
    <button type="button" className="button secondary" onClick={()=>void excel(true)} disabled={!roster.length||busy}><Download size={15}/> Template Excel</button>
    <button type="button" className="button secondary" onClick={()=>void excel()} disabled={!roster.length||busy}><Download size={15}/> Export</button>
    <label className="button secondary correction-upload"><FileUp size={15}/> Import Excel<input type="file" accept=".xlsx,.xls,.csv" hidden onChange={e=>{void loadImport(e.target.files?.[0]);e.target.value=""}}/></label>
   </div>
   {importRows.length>0&&<div className="correction-import"><span>{importFile}: {importRows.length} baris akan dikoreksi pada <strong>{event.title}</strong></span><button type="button" className="button" disabled={busy} onClick={()=>void commitImport()}>Proses import</button><button type="button" className="button secondary" disabled={busy} onClick={()=>setImportRows([])}>Batal</button></div>}
   {importErrors.length>0&&<div className="correction-import"><span>{importErrors.length} baris gagal diperbarui.</span><button type="button" className="button secondary" onClick={()=>void downloadExcel("kesalahan-koreksi-presensi.xlsx",[{name:"KESALAHAN",rows:importErrors}])}>Unduh rincian kesalahan</button></div>}
   <div className="correction-table-wrap"><table className="data-table correction-table"><thead><tr><th>Peserta</th><th>Status aktual</th><th>Masuk</th><th>Pulang</th><th>Aksi</th></tr></thead><tbody>
    {visibleRoster.map(m=>{const r=records.find(x=>x.user_id===m.user_id);return <tr key={m.user_id}>
     <td><strong>{nameOf(m.user_id)}</strong><small>{m.role}</small></td>
     <td><span className={"correction-status correction-status-"+(r?.status||"waiting")}>{r?labelStatus(r.status):"Belum tercatat"}</span>{r?.corrected_at&&<small>Telah dikoreksi</small>}</td>
     <td>{showClock(localStamp(r?.check_in_at||null,timezone))}</td><td>{showClock(localStamp(r?.check_out_at||null,timezone))}</td>
     <td><button type="button" className="button secondary" disabled={busy||loadingRecords} onClick={()=>{setSelectedUser(m.user_id);setError("");setModal(true)}}><PencilLine size={14}/> Koreksi</button></td>
    </tr>})}
   </tbody></table>
    {loadingRecords&&<div className="correction-empty">Memuat catatan kehadiran…</div>}
    {!loadingRecords&&!visibleRoster.length&&<div className="correction-empty">Tidak ada peserta yang sesuai kegiatan dan filter nama.</div>}
   </div>
  </>}
  <DataEntryModal open={modal} onClose={()=>{if(!busy)setModal(false)}} title="Koreksi Presensi Kegiatan" subtitle="Perubahan akan memperbarui catatan kegiatan dan mencatat data lama dalam histori audit." wide error={error}>
   <div className="correction-modal-context"><CalendarDays size={17}/><div><strong>{event?.title||"Kegiatan"}</strong><small>{event?.event_date} · {nameOf(selectedUser)}</small></div></div>
   <div className="correction-original"><span>CATATAN SEBELUM KOREKSI</span><div><strong>{attendance?labelStatus(attendance.status):"Belum ada catatan"}</strong><small>Masuk: {showClock(localStamp(attendance?.check_in_at||null,timezone))} · Pulang: {showClock(localStamp(attendance?.check_out_at||null,timezone))}</small></div></div>
   <div className="correction-step"><span>03</span><strong>Isi data presensi yang benar</strong></div>
   <div className="fields correction-form-fields">
    <label className="field full">Status kehadiran<select value={status} onChange={e=>{setStatus(e.target.value);if(e.target.value==="absent"||e.target.value==="excused"){setCheckIn("");setCheckOut("")}}}><option value="">Pilih status...</option>{validStatuses.map(s=><option key={s} value={s}>{statusLabels[s as CorrectionStatus]}</option>)}</select></label>
    {isPresence&&<>
     <label className="field">Tanggal dan jam masuk<input type="datetime-local" value={checkIn} onChange={e=>setCheckIn(e.target.value)} required/></label>
     <label className="field">Tanggal dan jam pulang (opsional)<input type="datetime-local" min={checkIn||undefined} value={checkOut} onChange={e=>setCheckOut(e.target.value)}/></label>
    </>}
    <label className="field full">Alasan koreksi<textarea value={reason} minLength={10} maxLength={2000} rows={3} placeholder="Contoh: Peserta hadir saat rapat, tetapi pencatatan check-in tidak masuk karena kendala koneksi." onChange={e=>setReason(e.target.value)}/><small>{reason.trim().length}/2000 · Minimal 10 karakter</small></label>
   </div>
   <div className="correction-notice"><ShieldCheck size={18}/><p>Jam dan status sebelumnya tersimpan dalam audit. Waktu yang dikoreksi secara manual tidak dianggap sebagai bukti GPS otomatis.</p></div>
   <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={()=>setModal(false)}>Batal</button><button type="button" className="button" disabled={!canSave} onClick={()=>void save()}>{busy?"Menyimpan…":"Simpan Koreksi Presensi"}</button></div>
  </DataEntryModal>
 </section>;
}
