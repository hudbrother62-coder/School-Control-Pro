"use client";
import TeamAccess from "@/components/TeamAccess";
import {modules,canAccess,type Role} from "@/lib/modules";
const roles:{key:Role;label:string;desc:string}[]=[
 {key:"principal",label:"Kepala Sekolah",desc:"Akses utama operasional sekolah"},
 {key:"vice_principal",label:"Wakil Kepala Sekolah",desc:"Manajemen dan operasional"},
 {key:"teacher",label:"Guru",desc:"Pembelajaran, siswa, agenda, presensi"},
 {key:"counselor",label:"Guru BK",desc:"Konseling, disiplin, agenda, presensi"},
 {key:"treasurer",label:"Bendahara",desc:"Keuangan, agenda, presensi"},
 {key:"hr",label:"SDM / HR",desc:"Presensi, cuti, kinerja, payroll"},
 {key:"staff",label:"Staf",desc:"Agenda, presensi, slip pribadi"},
 {key:"viewer",label:"Viewer",desc:"Hanya melihat data yang diizinkan"}
];
export default function AccessPanel({schoolId,role}:{schoolId:string;role:Role}){
 return <><section className="panel"><h2>Struktur Akses</h2><div className="access-grid">{roles.map(r=><article className="access-card" key={r.key}><strong>{r.label}</strong><small>{r.desc}</small><div className="access-tags">{modules.filter(m=>!["overview","settings","access"].includes(m.key)&&canAccess(m,r.key)).slice(0,7).map(m=><span key={m.key}>{m.label}</span>)}</div></article>)}</div></section><TeamAccess schoolId={schoolId} role={role}/></>;
}
