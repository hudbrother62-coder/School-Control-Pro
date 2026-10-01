"use client";
import {BookOpen,BriefcaseBusiness,ClipboardCheck,Coins,FileBarChart,GraduationCap,HeartHandshake,ListChecks,ShieldAlert,UsersRound,ArrowRight} from "lucide-react";
import {canAccess,modules,type ModuleKey,type Role} from "@/lib/modules";

type ReportRoute={title:string;caption:string;module:ModuleKey;feature:string;icon:typeof FileBarChart;formats:string};

export default function ReportCenter({role,focus,onRoute}:{schoolId:string;role:Role;focus?:string;onRoute:(module:ModuleKey,feature?:string)=>void}){
 const reportCatalog:ReportRoute[]=[
  {title:"Laporan Akademik",caption:"Nilai, jurnal, presensi siswa dan rekap kelas.",module:"buku_kerja",feature:"Laporan Lengkap",icon:GraduationCap,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Kehadiran",caption:"Kehadiran siswa/kelas dan riwayat periode.",module:"buku_kerja",feature:"Laporan Kelas",icon:ClipboardCheck,formats:"PDF · XLSX"},
  {title:"Laporan Disiplin & Prestasi",caption:"Pelanggaran, prestasi, pembinaan dan tindak lanjut.",module:"disiplin",feature:"Template Laporan",icon:ShieldAlert,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan BK",caption:"Layanan, program, kasus dan tindak lanjut BK.",module:"bk",feature:"Laporan BK",icon:HeartHandshake,formats:"PDF · DOCX"},
  {title:"Laporan Program Kerja",caption:"Program, PIC, progres, bukti, kendala dan rapat.",module:"command",feature:"Laporan Program",icon:ListChecks,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Keuangan",caption:"BKU, kas, anggaran, realisasi, tagihan dan transaksi.",module:"sikas",feature:"Laporan",icon:Coins,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan SDM & Payroll",caption:"Kehadiran, pengajuan, payroll dan kompensasi.",module:"gajian",feature:"Laporan HR",icon:UsersRound,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Supervisi",caption:"Instrumen, hasil supervisi dan tindak lanjut guru.",module:"kepsek_ai",feature:"Supervisi guru",icon:BriefcaseBusiness,formats:"PDF · DOCX"}
 ];\n const reportRoutes=reportCatalog.filter(x=>{const m=modules.find(m=>m.key===x.module);return !!m&&canAccess(m,role)});

 const standardItems=["Kop & identitas sekolah","NPSN dan tahun pelajaran","Nomor dokumen","Periode laporan","Tanda tangan kepala sekolah","Status draft / terbit","Arsip revisi","Format cetak A4"];

 return <div className="report-center">
  <section className="report-center-hero">
   <div><span className="eyebrow">PUSAT LAPORAN</span><h2>Laporan resmi sekolah dalam satu tempat</h2><p>Pilih jenis laporan. Data tetap diambil dari modul sumber agar tidak ada input ganda.</p></div>
   <div className="report-standard-card"><BookOpen size={20}/><div><strong>Standar dokumen sekolah Indonesia</strong><small>Kop, identitas, periode, nomor dokumen, tanda tangan, status dan arsip.</small></div></div>
  </section>

  {(!focus||focus==="Ringkasan Laporan")&&<>
   <div className="report-center-grid">{reportRoutes.map(r=>{const Icon=r.icon;return <button key={r.title} onClick={()=>onRoute(r.module,r.feature)}><span className="report-route-icon"><Icon size={19}/></span><span><strong>{r.title}</strong><small>{r.caption}</small><em>{r.formats}</em></span><ArrowRight size={16}/></button>})}</div>
   <section className="panel report-standard-panel"><div className="sectionhead"><div><span className="eyebrow">TEMPLATE STANDAR</span><h2>Elemen wajib laporan</h2></div><span className="pill">Siap ekspor</span></div><div className="report-standard-grid">{standardItems.map(x=><span key={x}><ClipboardCheck size={14}/>{x}</span>)}</div></section>
  </>}

  {focus&&focus!=="Ringkasan Laporan"&&focus!=="Arsip Laporan"&&<section className="panel"><div className="sectionhead"><div><span className="eyebrow">JENIS LAPORAN</span><h2>{focus}</h2><p className="muted">Buka generator laporan pada modul sumber dengan data yang sudah terhubung.</p></div></div><div className="report-center-grid">{reportRoutes.filter(r=>r.title.toLowerCase().includes(focus.toLowerCase())||focus==="Kehadiran"&&r.title.includes("Kehadiran")||focus==="Akademik"&&r.title.includes("Akademik")||focus==="Disiplin"&&r.title.includes("Disiplin")||focus==="BK"&&r.title==="Laporan BK"||focus==="Program & Tugas"&&r.title.includes("Program")||focus==="Keuangan"&&r.title.includes("Keuangan")||focus==="SDM & Payroll"&&r.title.includes("SDM")||focus==="Supervisi"&&r.title.includes("Supervisi")).map(r=>{const Icon=r.icon;return <button key={r.title} onClick={()=>onRoute(r.module,r.feature)}><span className="report-route-icon"><Icon size={19}/></span><span><strong>{r.title}</strong><small>{r.caption}</small><em>{r.formats}</em></span><ArrowRight size={16}/></button>})}</div></section>}
 </div>;
}
