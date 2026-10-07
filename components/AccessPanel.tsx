"use client";
import {useEffect,useMemo,useState} from "react";
import {Eye,EyeOff,Plus,UserRoundCheck} from "lucide-react";
import DataEntryModal from "@/components/DataEntryModal";
import TeamAccess from "@/components/TeamAccess";
import {browserDb} from "@/lib/supabase";
import {modules,canAccess,visibleFeatures,ROLE_LABELS,type Role} from "@/lib/modules";

const descriptions:Partial<Record<Role,string>>={
 owner:"Pemilik sekolah: seluruh konfigurasi sekolah, penunjukan kepala sekolah dan akses tertinggi di tenant.",
 principal:"Kepala sekolah: operasional, pengawasan, data induk, akademik, SDM, pengelolaan akun staf dan laporan.",
 vice_principal:"Wakil kepala sekolah: manajemen kegiatan, administrasi sekolah, akademik dan pemantauan sesuai kebijakan.",
 teacher:"Guru: pembelajaran, administrasi kelas, jurnal, nilai, presensi siswa, agenda dan presensi kerja.",
 counselor:"Guru BK: konseling, penanganan kasus privat, disiplin, agenda dan presensi pribadi.",
 hr:"SDM / HR: data kepegawaian, kehadiran, pengajuan, jadwal, kinerja dan proses penggajian sesuai otorisasi.",
 treasurer:"Bendahara: keuangan, anggaran, transaksi, tagihan, laporan dan presensi kerja.",
 finance_staff:"Staf keuangan: transaksi, tagihan dan laporan sesuai otorisasi, tanpa akses otomatis ke seluruh payroll.",
 supervisor:"Supervisor: pemantauan tim, aktivitas, approval dan progres program dalam lingkup tugas.",
 staff:"Staf: agenda kerja, tugas, presensi, pengajuan SDM dan informasi pribadi.",
 viewer:"Viewer: hanya tampilan yang secara eksplisit diizinkan; tidak boleh membuat perubahan atau melakukan presensi."
};
const roles:Role[]=["principal","vice_principal","teacher","counselor","treasurer","finance_staff","hr","supervisor","staff","viewer"];
type Profile={id:string;name:string;email:string|null;user_id:string|null;staff_type:string|null};
export default function AccessPanel({schoolId,role,focus}:{schoolId:string;role:Role;focus?:string}){
 const db=useMemo(()=>browserDb(),[]);
 const [memberRole,setMemberRole]=useState<Role>("teacher"),[guideRole,setGuideRole]=useState<Role>("teacher");
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[staffId,setStaffId]=useState("");
 const [showPassword,setShowPassword]=useState(false),[profiles,setProfiles]=useState<Profile[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(""),[modal,setModal]=useState(false),[reload,setReload]=useState(0);
 const f=(focus||"").toLowerCase(),showAdd=!f||f.includes("tambah"),showTeam=!f||f.includes("anggota"),showStructure=!f||f.includes("struktur")||f.includes("hak akses");
 const canCreate=role==="owner"||role==="principal";
 const choices=roles.filter(r=>role==="owner"||r!=="principal");
 const permissions=modules.map(m=>({...m,available:canAccess(m,guideRole),features:visibleFeatures(m,guideRole)}));
 const allowed=permissions.filter(x=>x.available&&x.features.length);
 const blocked=permissions.filter(x=>!x.available||!x.features.length);
 const current=modules.flatMap(m=>canAccess(m,memberRole)?visibleFeatures(m,memberRole).map(x=>m.label+" · "+x):[]);
 useEffect(()=>{if(!canCreate)return;let mounted=true;void db.from("sc_staff").select("id,name,email,user_id,staff_type").eq("school_id",schoolId).is("user_id",null).order("name").then(({data})=>{if(mounted)setProfiles((data||[]) as Profile[])});return()=>{mounted=false}},[db,schoolId,canCreate,reload]);
 function open(){setError("");setSuccess("");setName("");setEmail("");setPassword("");setStaffId("");setMemberRole("teacher");setModal(true)}
 function updateStaff(value:string){setStaffId(value);const selected=profiles.find(x=>x.id===value);if(selected){setName(selected.name);setEmail(selected.email||"")}}
 async function createAccount(){
  if(!canCreate||!name.trim()||!email.trim()||password.length<8)return;
  setBusy(true);setError("");setSuccess("");
  try{
   const {data:{session},error:authError}=await db.auth.getSession();
   if(authError||!session)throw Error("Sesi masuk kedaluwarsa. Silakan login kembali.");
   const response=await fetch("/api/school/members",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({school_id:schoolId,name:name.trim(),email:email.trim(),password,role:memberRole,staff_id:staffId||null})});
   const payload=await response.json();
   if(!response.ok||!payload.ok)throw Error(payload.error||"Akun tidak dapat dibuat.");
   setPassword("");setModal(false);setReload(n=>n+1);
   setSuccess("Akun "+email.trim()+" berhasil dibuat. Pengguna dapat langsung login dengan email dan kata sandi yang ditetapkan. "+(memberRole==="viewer"?"Akun viewer tidak termasuk presensi.":"Akun terhubung ke daftar pegawai dan presensi."));
  }catch(e){setError(e instanceof Error?e.message:"Gagal membuat akun.")}
  finally{setBusy(false)}
 }
 return <>
  {showAdd&&<><section className="panel">
   <div className="sectionhead"><div><h2>Tambah akun pengguna</h2><p className="muted">Kepala sekolah menentukan identitas login dan peran. Akun aktif tersambung dengan daftar pegawai, presensi, serta menu sesuai haknya.</p></div>
   {canCreate&&<button className="button" onClick={open}><Plus size={15}/> Buat Akun Login</button>}</div>
   <div className="flow" style={{marginTop:12}}><span className="pill">Login: email + kata sandi</span><span className="pill">Hak akses berbasis peran</span><span className="pill">Presensi terhubung</span></div>
   {!canCreate&&<p className="hint">Hanya pemilik sekolah dan kepala sekolah dapat menambahkan akun.</p>}
   {success&&<div className="banner success" role="status" style={{marginTop:14}}>{success}</div>}
  </section>
  <DataEntryModal open={modal} onClose={()=>{if(!busy)setModal(false)}} title="Buat Akun Pengguna" subtitle="Isi identitas login. Data hanya disimpan jika akun, peran dan profil pegawai berhasil dibuat." wide error={error}>
   <div className="fields">
    <label className="field full">Tautkan dengan guru/staf dari Data Induk (opsional)<select value={staffId} onChange={e=>updateStaff(e.target.value)}><option value="">Buat profil anggota baru</option>{profiles.map(x=><option key={x.id} value={x.id}>{x.name}{x.email?" · "+x.email:""}</option>)}</select></label>
    <label className="field">Nama lengkap<input value={name} autoComplete="off" onChange={e=>setName(e.target.value)} maxLength={120} placeholder="Nama guru atau staf" required/></label>
    <label className="field">Email login<input type="email" autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} placeholder="guru@sekolah.sch.id" required/></label>
    <label className="field">Kata sandi awal<div style={{display:"flex",gap:8}}><input style={{flex:1,minWidth:0}} type={showPassword?"text":"password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} placeholder="Minimal 8 karakter" required/><button className="button secondary" type="button" onClick={()=>setShowPassword(x=>!x)} aria-label={showPassword?"Sembunyikan kata sandi":"Lihat kata sandi"}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    <label className="field">Peran pengguna<select value={memberRole} onChange={e=>setMemberRole(e.target.value as Role)}>{choices.map(r=><option value={r} key={r}>{ROLE_LABELS[r]}</option>)}</select></label>
   </div>
   <div style={{marginTop:14}}><strong>{ROLE_LABELS[memberRole]}</strong><p className="muted">{descriptions[memberRole]}</p><small className="hint">{current.length} fitur/menu tersedia sesuai peran. {memberRole==="viewer"?"Tidak termasuk peserta presensi.":"Termasuk personel presensi bila akun aktif."}</small></div>
   <div className="modal-actions"><button className="button secondary" type="button" disabled={busy} onClick={()=>setModal(false)}>Batal</button><button className="button" type="button" disabled={busy||name.trim().length<2||!email.includes("@")||password.length<8} onClick={()=>void createAccount()}>{busy?"Membuat akun…":"Simpan & Aktifkan Login"}</button></div>
  </DataEntryModal></>}
  {showTeam&&<TeamAccess key={schoolId+":"+reload} schoolId={schoolId} role={role}/>}
  {showStructure&&<section className="panel">
   <div className="sectionhead"><div><h2>Panduan hak akses per peran</h2><p className="muted">Pilih peran untuk melihat seluruh modul dan fitur yang tampil. Otorisasi data sensitif tetap mengikuti kebijakan database, bukan sekadar menu yang terlihat.</p></div></div>
   <label className="field" style={{maxWidth:340,marginTop:15}}>Peran yang ingin diperiksa<select value={guideRole} onChange={e=>setGuideRole(e.target.value as Role)}><option value="owner">{ROLE_LABELS.owner}</option>{roles.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label>
   <div className="panel" style={{marginTop:14}}><strong>{ROLE_LABELS[guideRole]}</strong><p className="muted" style={{marginTop:6}}>{descriptions[guideRole]}</p><div className="flow"><span className="pill">{allowed.length} modul ditampilkan</span><span className="pill">{allowed.reduce((sum,m)=>sum+m.features.length,0)} fitur tersedia</span><span className="pill">{blocked.length} modul dibatasi</span></div></div>
   <div className="access-grid">{permissions.map(m=><article className="access-card" key={m.key}>
    <strong>{m.label}</strong><small>{m.available&&m.features.length?"Dapat membuka menu":"Tidak dapat membuka menu"}</small>
    <small>{m.description}</small>
    {m.available&&m.features.length?<div className="access-tags">{m.features.map(feature=><span key={feature}>{feature}</span>)}</div>:<p className="hint">Tidak termasuk hak akses peran ini.</p>}
   </article>)}</div>
   <p className="hint" style={{marginTop:14}}>Akun terhubung ke sekolah tempat dibuat. Wali kelas tanpa akun tetap tercatat di data kelas tetapi tidak otomatis memiliki akses menu ataupun presensi.</p>
  </section>}
 </>;
}