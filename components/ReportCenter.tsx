"use client";
import {BookOpen,BriefcaseBusiness,ClipboardCheck,Coins,FileBarChart,GraduationCap,HeartHandshake,ListChecks,ShieldAlert,ArrowRight,Warehouse} from "lucide-react";
import {canAccess,modules,type ModuleKey,type Role} from "@/lib/modules";

type ReportRoute={title:string;caption:string;module:ModuleKey;feature:string;icon:typeof FileBarChart;formats:string};

export default function ReportCenter({role,focus,onRoute}:{schoolId:string;role:Role;focus?:string;onRoute:(module:ModuleKey,feature?:string)=>void}){
 const reportCatalog:ReportRoute[]=[
  {title:"Laporan Jurnal",caption:"Jurnal harian, jurnal siswa dan rekap bulanan per pengguna.",module:"journals",feature:"Rekap Bulanan",icon:BookOpen,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Akademik",caption:"Nilai, jurnal, presensi siswa dan rekap kelas.",module:"buku_kerja",feature:"Laporan Lengkap",icon:GraduationCap,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Kehadiran",caption:"Kehadiran siswa/kelas, kelengkapan absensi per hari dan riwayat periode.",module:"buku_kerja",feature:"Laporan Kehadiran",icon:ClipboardCheck,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Disiplin & Prestasi",caption:"Pelanggaran, prestasi, pembinaan dan tindak lanjut.",module:"disiplin",feature:"Template Laporan",icon:ShieldAlert,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan BK",caption:"Layanan, program, kasus dan tindak lanjut BK.",module:"bk",feature:"Laporan BK",icon:HeartHandshake,formats:"PDF · DOCX"},
  {title:"Laporan Program Kerja",caption:"Program, PIC, progres, bukti, kendala dan rapat.",module:"command",feature:"Laporan Program",icon:ListChecks,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Keuangan",caption:"BKU, kas, anggaran, realisasi, tagihan dan transaksi.",module:"sikas",feature:"Laporan",icon:Coins,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Perpustakaan",caption:"Koleksi, peminjaman, kunjungan, pengadaan dan perawatan.",module:"library",feature:"Laporan & Statistik",icon:BookOpen,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Sarana & Prasarana",caption:"Inventaris, merek, ruang, peminjaman, perawatan, pengadaan dan opname.",module:"sarpras",feature:"Opname & Laporan",icon:Warehouse,formats:"PDF · DOCX · XLSX"},
  {title:"Laporan Supervisi",caption:"Instrumen, hasil supervisi dan tindak lanjut guru.",module:"kepsek_ai",feature:"Supervisi guru",icon:BriefcaseBusiness,formats:"PDF · DOCX"}
 ];
 const reportRoutes=reportCatalog.filter(x=>{const m=modules.find(m=>m.key===x.module);return !!m&&canAccess(m,role)});

 const standardItems=["Kop & identitas sekolah","NPSN dan tahun pelajaran","Nomor dokumen bila diterbitkan","Periode laporan","Pejabat penandatangan yang berwenang","Status draft / terbit","Arsip dan riwayat","Format cetak A4"];

 return <div className="report-center">
  <button className="button secondary" style={{marginBottom:16}} onClick={()=>onRoute("reports","Template Laporan Sekolah")}>Template & Format Laporan Sekolah</button>
  <section className="report-center-hero">
   <div><span className="eyebrow">PUSAT LAPORAN</span><h2>Laporan resmi sekolah dalam satu tempat</h2><p>Pilih jenis laporan. Data tetap diambil dari modul sumber agar tidak ada input ganda.</p></div>
   <div className="report-standard-card"><BookOpen size={20}/><div><strong>Standar dokumen sekolah Indonesia</strong><small>Kop, identitas, periode, nomor dokumen, pengesahan, status dan arsip; disesuaikan dengan jenis laporan dan aturan dinas.</small></div></div>
  </section>

  {(!focus||focus==="Ringkasan Laporan")&&<>
   <div className="report-center-grid">{reportRoutes.map(r=>{const Icon=r.icon;return <button key={r.title} onClick={()=>onRoute(r.module,r.feature)}><span className="report-route-icon"><Icon size={19}/></span><span><strong>{r.title}</strong><small>{r.caption}</small><em>{r.formats}</em></span><ArrowRight size={16}/></button>})}</div>
   <section className="panel report-standard-panel"><div className="sectionhead"><div><span className="eyebrow">TEMPLATE STANDAR</span><h2>Checklist format laporan</h2></div><span className="pill">Periksa sebelum terbit</span></div><div className="report-standard-grid">{standardItems.map(x=><span key={x}><ClipboardCheck size={14}/>{x}</span>)}</div></section>
  </>}

  {focus&&focus!=="Ringkasan Laporan"&&focus!=="Arsip Laporan"&&<section className="panel"><div className="sectionhead"><div><span className="eyebrow">JENIS LAPORAN</span><h2>{focus}</h2><p className="muted">Buka generator laporan pada modul sumber dengan data yang sudah terhubung.</p></div></div><div className="report-center-grid">{reportRoutes.filter(r=>r.title.toLowerCase().includes(focus.toLowerCase())||focus==="Kehadiran"&&r.title.includes("Kehadiran")||focus==="Akademik"&&r.title.includes("Akademik")||focus==="Disiplin"&&r.title.includes("Disiplin")||focus==="BK"&&r.title==="Laporan BK"||focus==="Program & Tugas"&&r.title.includes("Program")||focus==="Keuangan"&&r.title.includes("Keuangan")||focus==="Perpustakaan"&&r.title.includes("Perpustakaan")||focus==="Sarana & Prasarana"&&r.title.includes("Sarana")||focus==="Supervisi"&&r.title.includes("Supervisi")).map(r=>{const Icon=r.icon;return <button key={r.title} onClick={()=>onRoute(r.module,r.feature)}><span className="report-route-icon"><Icon size={19}/></span><span><strong>{r.title}</strong><small>{r.caption}</small><em>{r.formats}</em></span><ArrowRight size={16}/></button>})}</div></section>}
 </div>;
}
