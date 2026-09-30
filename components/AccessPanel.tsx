"use client";
import {useMemo,useState} from "react";
import TeamAccess from "@/components/TeamAccess";
import {browserDb} from "@/lib/supabase";
import {modules,canAccess,ROLE_LABELS,type Role} from "@/lib/modules";
const roles:{key:Role;label:string;desc:string}[]=[
 {key:"principal",label:"Kepala Sekolah",desc:"Akses utama operasional dan pengawasan sekolah"},
 {key:"vice_principal",label:"Wakil Kepala Sekolah",desc:"Manajemen, akademik dan operasional"},
 {key:"teacher",label:"Guru",desc:"Pembelajaran, kelas, agenda dan presensi"},
 {key:"counselor",label:"Guru BK",desc:"Konseling privat, disiplin, agenda dan presensi"},
 {key:"treasurer",label:"Bendahara",desc:"Keuangan, tagihan, agenda dan presensi"},
 {key:"hr",label:"SDM / HR",desc:"Presensi, cuti, kinerja dan payroll"},
 {key:"staff",label:"Staf",desc:"Agenda, presensi dan slip pribadi"},
 {key:"viewer",label:"Viewer",desc:"Akses baca sesuai kebijakan sekolah"}
];
export default function AccessPanel({schoolId,role,focus}:{schoolId:string;role:Role;focus?:string}){
 const db=useMemo(()=>browserDb(),[]),[inviteRole,setInviteRole]=useState<Role>("teacher"),[code,setCode]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const f=(focus||"").toLowerCase(),showAdd=!f||f.includes("tambah"),showTeam=!f||f.includes("anggota"),showStructure=!f||f.includes("struktur")||f.includes("hak akses");
 async function invite(){if(!db)return;setBusy(true);setError("");setCode("");const {data,error}=await db.rpc("sc_create_invite",{p_school:schoolId,p_role:inviteRole});setBusy(false);if(error){setError(error.message);return}setCode(String(data||""))}
 return <>
  {showAdd&&<section className="panel"><div className="sectionhead"><div><h2>Tambah Pengguna</h2><p className="muted">Buat kode undangan sekali pakai. Setelah pengguna bergabung, perannya bisa diubah dari Anggota Tim.</p></div></div><div className="fields"><label className="field">Peran awal<select value={inviteRole} onChange={e=>setInviteRole(e.target.value as Role)}>{roles.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select></label><div className="field"><span>Aksi</span><button className="button" disabled={busy} onClick={()=>void invite()}>{busy?"Membuat…":"Buat Kode Undangan"}</button></div></div>{code&&<div className="banner success"><strong>Kode undangan:</strong> <code>{code}</code><p className="hint">Bagikan kode ini secara pribadi kepada pengguna yang akan bergabung.</p></div>}{error&&<div className="banner error">{error}</div>}</section>}
  {showTeam&&<TeamAccess schoolId={schoolId} role={role}/>}
  {showStructure&&<section className="panel"><h2>Struktur Peran & Hak Akses</h2><div className="access-grid">{roles.map(r=><article className="access-card" key={r.key}><strong>{r.label}</strong><small>{r.desc}</small><div className="access-tags">{modules.filter(m=>!["overview","settings","access"].includes(m.key)&&canAccess(m,r.key)).map(m=><span key={m.key}>{m.label}</span>)}</div></article>)}</div></section>}
 </>;
}
