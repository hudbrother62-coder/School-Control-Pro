"use client";
import SearchableSelect from "@/components/SearchableSelect";
import {useMemo,useState} from "react";
import {Plus} from "lucide-react";
import DataEntryModal from "@/components/DataEntryModal";
import TeamAccess from "@/components/TeamAccess";
import {browserDb} from "@/lib/supabase";
import {modules,canAccess,ROLE_LABELS,type Role} from "@/lib/modules";
const roles:{key:Role;label:string;desc:string}[]=[
 {key:"principal",label:"Kepala Sekolah",desc:"Akses utama operasional dan pengawasan sekolah"},
 {key:"vice_principal",label:"Wakil Kepala Sekolah",desc:"Manajemen, akademik dan operasional"},
 {key:"teacher",label:"Guru",desc:"Pembelajaran, kelas, agenda dan presensi"},
 {key:"counselor",label:"Guru BK",desc:"Konseling privat, disiplin, agenda dan presensi"},
 {key:"treasurer",label:"Bendahara",desc:"Keuangan, tagihan, agenda dan presensi"},
 {key:"finance_staff",label:"Staf Keuangan",desc:"Transaksi, tagihan, laporan keuangan dan agenda sesuai kewenangan"},
 {key:"hr",label:"SDM / HR",desc:"Presensi, cuti, kinerja dan payroll"},
 {key:"supervisor",label:"Supervisor",desc:"Pengawasan tim, kinerja, agenda, approval dan rekap operasional"},
 {key:"staff",label:"Staf",desc:"Agenda, presensi dan slip pribadi"},
 {key:"viewer",label:"Viewer",desc:"Akses baca sesuai kebijakan sekolah"}
];
export default function AccessPanel({schoolId,role,focus}:{schoolId:string;role:Role;focus?:string}){
 const db=useMemo(()=>browserDb(),[]),[inviteRole,setInviteRole]=useState<Role>("teacher"),[code,setCode]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[modal,setModal]=useState(false);
 const f=(focus||"").toLowerCase(),showAdd=!f||f.includes("tambah"),showTeam=!f||f.includes("anggota"),showStructure=!f||f.includes("struktur")||f.includes("hak akses");
 async function invite(){if(!db)return;setBusy(true);setError("");setCode("");const {data,error}=await db.rpc("sc_create_invite",{p_school:schoolId,p_role:inviteRole});setBusy(false);if(error){setError(error.message);return}setCode(String(data||""))}
 return <>
  {showAdd&&<><section className="panel"><div className="sectionhead"><div><h2>Tambah Pengguna</h2><p className="muted">Buat akses baru tanpa memenuhi halaman dengan form. Peran dapat diubah setelah pengguna bergabung.</p></div><button className="button" onClick={()=>{setCode("");setModal(true)}}><Plus size={15}/> Tambah Pengguna</button></div>{code&&<div className="banner success"><strong>Kode undangan:</strong> <code>{code}</code><p className="hint">Bagikan kode ini secara pribadi kepada pengguna yang akan bergabung.</p></div>}</section>
  <DataEntryModal open={modal} onClose={()=>setModal(false)} title="Tambah Pengguna" subtitle="Pilih peran awal. Sistem akan membuat kode undangan sekali pakai."><div className="fields"><label className="field full">Peran awal<SearchableSelect label="Peran awal" value={inviteRole} onChange={e=>setInviteRole(e.target.value as Role)}>{roles.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</SearchableSelect></label></div>{code&&<div className="banner success"><strong>Kode undangan:</strong> <code>{code}</code></div>}<div className="modal-actions"><button className="button secondary" onClick={()=>setModal(false)}>Tutup</button><button className="button" disabled={busy} onClick={()=>void invite()}>{busy?"Membuat…":"Buat Kode Undangan"}</button></div></DataEntryModal></>}
  {showTeam&&<TeamAccess schoolId={schoolId} role={role}/>}
  {showStructure&&<section className="panel"><h2>Struktur Peran & Hak Akses</h2><div className="access-grid">{roles.map(r=><article className="access-card" key={r.key}><strong>{r.label}</strong><small>{r.desc}</small><div className="access-tags">{modules.filter(m=>!["overview","settings","access"].includes(m.key)&&canAccess(m,r.key)).map(m=><span key={m.key}>{m.label}</span>)}</div></article>)}</div></section>}
 </>;
}
