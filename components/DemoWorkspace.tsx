"use client";
import {useEffect,useMemo,useState} from "react";
import {LayoutDashboard,Database,BookOpenCheck,Sparkles,ClipboardCheck,HeartHandshake,ListChecks,WalletCards,BriefcaseBusiness,Settings,LogOut,Clock3,BarChart3,Search,ChevronRight,GraduationCap,Sun,Moon,CalendarDays,KeyRound,Plus,Pencil,Trash2,MapPin,Download,Upload,AlertTriangle,CheckCircle2} from "lucide-react";
import DataEntryModal from "@/components/DataEntryModal";
import {downloadOfficialDocx,downloadOfficialExcel,previewOfficialReport,printOfficialReport,type OfficialReportModel,type ReportIdentity} from "@/lib/report-engine";
import "./demo.css";

const menu=[
 ["overview","Beranda",LayoutDashboard,["Ringkasan Operasional","Analitik Sekolah","Agenda & Deadline"]],
 ["master","Data Induk",Database,["Siswa","Kelas","Guru","Tenaga Kependidikan","Mata Pelajaran","Penugasan Guru","Import Excel Keseluruhan"]],
 ["calendar","Agenda Sekolah",CalendarDays,["Kalender Sekolah","Agenda Pribadi","Agenda Pengguna","Kehadiran Agenda"]],
 ["teaching","Perangkat Ajar AI",Sparkles,["Proyek Pembelajaran","Modul Ajar","RPP","LKPD","Asesmen Soal","Strategi Pembelajaran","Bahan Ajar","Rubrik Penilaian","Panduan Presentasi","Peta Konsep","Ngobrol AI","Riwayat Draf"]],
 ["academic","Pembelajaran & Penilaian",BookOpenCheck,["Presensi Siswa","Lembar Nilai","Jurnal Mengajar","Agenda Mengajar","Rekap Bulanan","Laporan Kelas","Laporan Lengkap","Import/Export Excel"]],
 ["student","Disiplin & Prestasi",ClipboardCheck,["Pelanggaran","Prestasi","Pembinaan","Tindak Lanjut","Rekap & Laporan","Surat & Dokumen","Template Laporan"]],
 ["counseling","Bimbingan Konseling",HeartHandshake,["Pemetaan Kebutuhan","Kasus","Konseling Individu","Konseling Kelompok","Layanan Klasikal","RPL","Kunjungan Rumah","Rujukan","Karier","Riwayat Siswa","Tindak Lanjut","Laporan BK"]],
 ["planning","Perencanaan & Supervisi",GraduationCap,["PBD/EDS","KSP/KOSP","RKJM","RKT","RKAS","SOP","Supervisi Guru","Pusat Dokumen","Persetujuan Dokumen","Arsip Laporan"]],
 ["execution","Program, Tugas & Agenda",ListChecks,["Program Kerja","PIC","Tugas","Deadline","Progres","Kendala","Hasil Rapat","Agenda","Bukti Kegiatan","Laporan Program"]],
 ["attendance","Presensi Realtime",Clock3,["Check-in/Check-out","Jadwal/Shift","Riwayat Kehadiran","Koreksi Beralasan","Izin","Cuti"]],
 ["performance","Kinerja & Pengembangan",BarChart3,["Kehadiran","Partisipasi Program","Pelatihan","Bukti Capaian","Evaluasi","Tanggapan Guru"]],
 ["finance","Keuangan & Tagihan",WalletCards,["Dashboard Keuangan","Kas/Rekening","Pemasukan","Pengeluaran","Anggaran","Realisasi Anggaran","Tagihan Siswa","Pembayaran","Kuitansi","Buku Kas Umum","Laporan","Import/Export"]],
 ["payroll","Payroll & Slip",BriefcaseBusiness,["Komponen Gaji","Tunjangan","Potongan","Draft Payroll","Review","Approval","Kunci Periode","Rekap Payroll","Laporan HR","Slip Saya"]],
 ["access","Akses & Peran",KeyRound,["Tambah Pengguna","Anggota Tim","Struktur Peran","Hak Akses Fitur"]],
 ["settings","Pengaturan Sekolah",Settings,["Profil Sekolah","Identitas & Kontak","Lokasi Sekolah","Akademik","Branding","Memori Sekolah","Langganan","Riwayat Pembayaran"]]
] as const;
type Key=typeof menu[number][0];
type Field={key:string;label:string;type?:"text"|"date"|"time"|"number"|"textarea"|"select";options?:string[];wide?:boolean};
type Saved={id:string;fields:Record<string,string>};

const today=()=>new Date().toLocaleDateString("en-CA");
function fieldsFor(active:Key,feature:string):Field[]{
 if(active==="master"&&feature==="Siswa")return [{key:"name",label:"Nama lengkap"},{key:"nis",label:"NIS"},{key:"nisn",label:"NISN"},{key:"gender",label:"Jenis kelamin",type:"select",options:["Laki-laki","Perempuan"]},{key:"class",label:"Kelas"},{key:"guardian",label:"Nama orang tua / wali"},{key:"guardianPhone",label:"WhatsApp wali"},{key:"status",label:"Status",type:"select",options:["Aktif","Arsip"]}];
 if(active==="master"&&(feature==="Guru"||feature==="Tenaga Kependidikan"))return [{key:"employeeCode",label:"ID pegawai"},{key:"name",label:"Nama lengkap"},{key:"email",label:"Email"},{key:"phone",label:"Nomor ponsel"},{key:"department",label:"Organisasi / Unit"},{key:"position",label:"Jabatan"},{key:"rank",label:"Pangkat"},{key:"employment",label:"Status kerja",type:"select",options:["Tetap","Kontrak","PKWT","Harian","Magang"]},{key:"hireDate",label:"Tanggal bergabung",type:"date"},{key:"shift",label:"Jam masuk",type:"time"},{key:"education",label:"Pendidikan terakhir"},{key:"bank",label:"Bank"},{key:"account",label:"Nomor rekening"}];
 if(active==="master"&&feature==="Kelas")return [{key:"name",label:"Nama kelas"},{key:"grade",label:"Jenjang"},{key:"year",label:"Tahun ajaran"}];
 if(active==="master"&&feature==="Mata Pelajaran")return [{key:"code",label:"Kode mata pelajaran"},{key:"name",label:"Nama mata pelajaran"}];
 if(active==="master"&&feature==="Penugasan Guru")return [{key:"teacher",label:"Guru"},{key:"class",label:"Kelas"},{key:"subject",label:"Mata pelajaran"},{key:"mode",label:"Jenis penugasan",type:"select",options:["Wali Kelas","Guru Mapel","Gabungan"]}];
 if(active==="calendar")return [{key:"title",label:"Nama agenda",wide:true},{key:"date",label:"Tanggal",type:"date"},{key:"start",label:"Mulai",type:"time"},{key:"end",label:"Selesai",type:"time"},{key:"scope",label:"Jenis",type:"select",options:["Agenda Sekolah","Agenda Pribadi"]},{key:"category",label:"Kategori",type:"select",options:["Pembelajaran","Rapat","Pelatihan","Program","Lainnya"]},{key:"location",label:"Lokasi",wide:true},{key:"participants",label:"Guru / staf terlibat",wide:true},{key:"notes",label:"Keterangan",type:"textarea",wide:true}];
 if(active==="academic"&&feature==="Presensi Siswa")return [{key:"class",label:"Kelas"},{key:"date",label:"Tanggal",type:"date"},{key:"lesson",label:"Mata pelajaran / Jam"},{key:"student",label:"Siswa"},{key:"status",label:"Status",type:"select",options:["Hadir","Sakit","Izin","Alpa"]},{key:"notes",label:"Catatan",type:"textarea",wide:true}];
 if(active==="academic"&&feature==="Lembar Nilai")return [{key:"student",label:"Siswa"},{key:"class",label:"Kelas"},{key:"subject",label:"Mata pelajaran"},{key:"assessment",label:"Nama penilaian"},{key:"date",label:"Tanggal",type:"date"},{key:"score",label:"Nilai",type:"number"},{key:"max",label:"Nilai maksimum",type:"number"}];
 if(active==="academic")return [{key:"title",label:"Kegiatan / Topik"},{key:"class",label:"Kelas"},{key:"subject",label:"Mata pelajaran"},{key:"date",label:"Tanggal",type:"date"},{key:"notes",label:"Aktivitas, refleksi & tindak lanjut",type:"textarea",wide:true}];
 if(active==="student")return [{key:"student",label:"Siswa"},{key:"category",label:"Jenis",type:"select",options:["Pelanggaran","Prestasi","Pembinaan"]},{key:"title",label:"Kejadian / Prestasi",wide:true},{key:"date",label:"Tanggal",type:"date"},{key:"followup",label:"Kronologi & tindak lanjut",type:"textarea",wide:true}];
 if(active==="counseling")return [{key:"student",label:"Siswa / Sasaran"},{key:"kind",label:"Jenis layanan",type:"select",options:["Pemetaan Kebutuhan","Konseling Individu","Konseling Kelompok","Layanan Klasikal","RPL","Kunjungan Rumah","Rujukan","Karier"]},{key:"domain",label:"Bidang",type:"select",options:["Pribadi","Sosial","Belajar","Karier"]},{key:"date",label:"Tanggal",type:"date"},{key:"followDate",label:"Tindak lanjut",type:"date"},{key:"notes",label:"Tujuan, metode, temuan, evaluasi & tindak lanjut",type:"textarea",wide:true}];
 if(active==="planning")return [{key:"title",label:"Dokumen / Supervisi"},{key:"period",label:"Periode"},{key:"target",label:"Sasaran"},{key:"notes",label:"Data, temuan, rekomendasi & tindak lanjut",type:"textarea",wide:true}];
 if(active==="execution")return [{key:"title",label:"Program / Tugas"},{key:"pic",label:"PIC"},{key:"deadline",label:"Deadline",type:"date"},{key:"status",label:"Status",type:"select",options:["Direncanakan","Berjalan","Terhambat","Selesai"]},{key:"problem",label:"Kendala",type:"textarea",wide:true},{key:"result",label:"Hasil / Bukti",type:"textarea",wide:true}];
 if(active==="attendance")return [{key:"person",label:"Guru / Staf"},{key:"date",label:"Tanggal",type:"date"},{key:"time",label:"Waktu",type:"time"},{key:"shift",label:"Shift / Jadwal"},{key:"location",label:"Lokasi / Alasan",wide:true}];
 if(active==="performance")return [{key:"person",label:"Guru / Staf"},{key:"activity",label:"Kegiatan / Bukti"},{key:"period",label:"Periode"},{key:"notes",label:"Catatan evaluasi / tanggapan",type:"textarea",wide:true}];
 if(active==="finance"&&feature==="Kas/Rekening")return [{key:"name",label:"Nama kas / rekening"},{key:"kind",label:"Jenis",type:"select",options:["Tunai","Bank","E-Wallet","Lainnya"]},{key:"opening",label:"Saldo awal",type:"number"}];
 if(active==="finance"&&(feature==="Pemasukan"||feature==="Pengeluaran"))return [{key:"date",label:"Tanggal",type:"date"},{key:"account",label:"Kas / Rekening"},{key:"category",label:"Kategori"},{key:"activity",label:"Kegiatan"},{key:"amount",label:"Nominal",type:"number"},{key:"description",label:"Uraian",type:"textarea",wide:true}];
 if(active==="finance"&&feature==="Anggaran")return [{key:"year",label:"Tahun"},{key:"category",label:"Kategori / Kegiatan"},{key:"amount",label:"Pagu",type:"number"},{key:"notes",label:"Catatan",type:"textarea",wide:true}];
 if(active==="finance"&&feature==="Tagihan Siswa")return [{key:"student",label:"Siswa"},{key:"title",label:"Nama tagihan"},{key:"period",label:"Periode"},{key:"due",label:"Jatuh tempo",type:"date"},{key:"amount",label:"Nominal",type:"number"}];
 if(active==="finance"&&(feature==="Pembayaran"||feature==="Kuitansi"))return [{key:"bill",label:"Tagihan"},{key:"account",label:"Kas / Rekening"},{key:"method",label:"Metode pembayaran"},{key:"amount",label:"Nominal",type:"number"},{key:"receipt",label:"Nomor kuitansi"}];
 if(active==="finance")return [{key:"title",label:"Data keuangan"},{key:"detail",label:"Kategori / Akun"},{key:"amount",label:"Nominal",type:"number"}];
 if(active==="payroll")return [{key:"employee",label:"Pegawai"},{key:"period",label:"Periode"},{key:"base",label:"Gaji pokok",type:"number"},{key:"allowance",label:"Tunjangan",type:"number"},{key:"deduction",label:"Potongan",type:"number"},{key:"bank",label:"Bank / Rekening"}];
 if(active==="access")return [{key:"name",label:"Nama / Email"},{key:"role",label:"Peran",type:"select",options:["Kepala Sekolah","Wakil Kepala Sekolah","Guru","Guru BK","Bendahara","SDM / HR","Staf","Viewer"]},{key:"notes",label:"Catatan akses",type:"textarea",wide:true}];
 if(active==="settings"&&feature==="Branding")return [
  {key:"schoolName",label:"Nama sekolah",wide:true},{key:"npsn",label:"NPSN"},{key:"address",label:"Alamat sekolah",wide:true},{key:"city",label:"Kabupaten / Kota"},{key:"province",label:"Provinsi"},
  {key:"principal",label:"Nama kepala sekolah"},{key:"principalNip",label:"NIP kepala sekolah"},{key:"phone",label:"Telepon"},{key:"email",label:"Email sekolah"},{key:"website",label:"Website"},
  {key:"logoUrl",label:"URL logo sekolah",wide:true},{key:"signatureUrl",label:"URL scan tanda tangan",wide:true},{key:"stampUrl",label:"URL stempel sekolah",wide:true},
  {key:"signerTitle",label:"Jabatan penandatangan"},{key:"classificationCode",label:"Kode klasifikasi dokumen"},{key:"showWebsite",label:"Tampilkan website",type:"select",options:["Tidak","Ya"]},{key:"showStamp",label:"Tampilkan stempel",type:"select",options:["Tidak","Ya"]}
 ];
 if(active==="settings")return [{key:"name",label:"Nama / Nilai pengaturan"},{key:"category",label:"Kategori"},{key:"notes",label:"Keterangan",type:"textarea",wide:true}];
 return [{key:"title",label:"Judul"},{key:"detail",label:"Detail"},{key:"notes",label:"Keterangan",type:"textarea",wide:true}];
}
function labelOf(fields:Record<string,string>){return fields.name||fields.title||fields.student||fields.employee||fields.activity||fields.person||Object.values(fields).find(Boolean)||"Data";}
function dateOf(fields:Record<string,string>){return fields.date||fields.deadline||fields.due||fields.hireDate||""}

function Dashboard({feature}:{feature:string}){
 const attendance=[31,36,39,37,40,38,39],tasks=[8,5,2],finance=[72,48,61,55,80,74];
 if(feature==="Analitik Sekolah")return <div className="demo-dashboard-stack"><div className="demo-panels"><section><div className="demo-section-title"><div><h3>Tren Kehadiran SDM 7 Hari</h3><p>Grafik utama operasional: cepat terlihat bila kehadiran menurun.</p></div><span className="demo-badge">Prioritas</span></div><div className="demo-bars">{attendance.map((n,i)=><div key={i}><i style={{height:(n/42*100)+"%"}}/><b>{n}</b><small>{["Kam","Jum","Sen","Sel","Rab","Kam","Jum"][i]}</small></div>)}</div></section><section><div className="demo-section-title"><div><h3>Status Program & Deadline</h3><p>Memisahkan pekerjaan aktif, berjalan, dan terlambat.</p></div></div>{["Belum mulai","Berjalan","Terlambat"].map((x,i)=><div className="demo-hbar" key={x}><span>{x}</span><i><b style={{width:(tasks[i]/8*100)+"%"}}/></i><strong>{tasks[i]}</strong></div>)}</section></div><section><div className="demo-section-title"><div><h3>Arus Kas 6 Bulan</h3><p>Ringkasan tren keuangan tanpa membuka detail transaksi sensitif.</p></div></div><div className="demo-bars wide">{finance.map((n,i)=><div key={i}><i style={{height:n+"%"}}/><b>{n}jt</b><small>{["Apr","Mei","Jun","Jul","Agu","Sep"][i]}</small></div>)}</div></section></div>;
 if(feature==="Agenda & Deadline")return <div className="demo-panels"><section><h3>Agenda 31 Hari ke Depan</h3>{["Rapat Kurikulum · 1 Okt 09.00","Supervisi VIII A · 2 Okt 08.00","Pelatihan Guru · 4 Okt 10.00"].map(x=><div className="demo-row" key={x}><CalendarDays size={16}/><b>{x}</b><small>Terjadwal</small></div>)}</section><section><h3>Deadline yang Perlu Tindakan</h3>{["Bukti Program Literasi · hari ini","Review RKT · 2 hari","Rekap Tagihan · 4 hari"].map((x,i)=><div className="demo-row" key={x}><AlertTriangle size={16}/><b>{x}</b><small>{i===0?"Prioritas":"Aktif"}</small></div>)}</section></div>;
 return <><div className="demo-grid"><div className="demo-stat"><small>Siswa Aktif</small><strong>486</strong><span>18 kelas</span></div><div className="demo-stat"><small>Guru & Staf</small><strong>42</strong><span>39 hadir hari ini</span></div><div className="demo-stat"><small>Kehadiran Hari Ini</small><strong>93%</strong><span>3 perlu verifikasi</span></div><div className="demo-stat"><small>Tugas Aktif</small><strong>8</strong><span>2 melewati tenggat</span></div></div><div className="demo-panels"><section><h3>Fokus Hari Ini</h3>{["39 SDM sudah presensi","2 tugas melewati tenggat","3 agenda sekolah hari ini"].map(x=><div className="demo-row" key={x}><CheckCircle2 size={16}/><b>{x}</b><small>Realtime</small></div>)}</section><section><h3>Agenda Terdekat</h3>{["Rapat Kurikulum · 09.00","Supervisi VIII A · besok","Pelatihan Guru · 4 Okt"].map(x=><div className="demo-row" key={x}><CalendarDays size={16}/><b>{x}</b><small>Terjadwal</small></div>)}</section></div></>;
}


function demoReportIdentity(saved:Record<string,Saved[]>):ReportIdentity{
 const b=saved["settings::Branding"]?.[0]?.fields||{};
 return {
  name:b.schoolName||"SMP Negeri Demo School Control",npsn:b.npsn||"20500001",address:b.address||"Jl. Pendidikan No. 1",academic_year:"2026/2027",education_level:"SMP",
  principal_name:b.principal||"Drs. Budi Santoso",principal_nip:b.principalNip||"197805122005011008",phone:b.phone||"(031) 555-0101",email:b.email||"sekolah.demo@example.sch.id",
  website:b.website||"https://sekolah.example.sch.id",province:b.province||"Jawa Timur",city:b.city||"Surabaya",postal_code:"60200",logo_url:b.logoUrl||null,
  signature_url:b.signatureUrl||null,stamp_url:b.stampUrl||null,report_settings:{layout:"formal",show_logo:true,show_npsn:true,show_phone:true,show_email:true,
   show_website:b.showWebsite==="Ya",show_signature:true,show_stamp:b.showStamp==="Ya",signer_title:b.signerTitle||"Kepala Sekolah",classification_code:b.classificationCode||""}
 };
}
const demoMoney=(v:unknown)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(v)||0);
const demoItems=(saved:Record<string,Saved[]>,key:string)=>saved[key]||[];

function buildDemoReport(active:Key,feature:string,saved:Record<string,Saved[]>):OfficialReportModel{
 if(active==="academic"){
  const attendance=demoItems(saved,"academic::Presensi Siswa"),grades=demoItems(saved,"academic::Lembar Nilai"),journals=demoItems(saved,"academic::Jurnal Mengajar");
  return {moduleKey:"buku_kerja",documentType:"laporan_buku_kerja_demo",prefix:"BKJ",title:feature==="Laporan Kelas"?"Laporan Kelas":"Laporan Buku Kerja Guru",subtitle:"Presensi, penilaian dan jurnal mengajar · Demo School Control",orientation:"landscape",status:"approved",
   metrics:[{label:"Presensi",value:String(attendance.length)},{label:"Nilai",value:String(grades.length)},{label:"Jurnal",value:String(journals.length)},{label:"Tahun Pelajaran",value:"2026/2027"}],
   sections:[
    {title:"Rekap Presensi",columns:["Tanggal","Siswa","Kelas","Pelajaran","Status","Catatan"],rows:attendance.map(x=>[x.fields.date||"—",x.fields.student||"—",x.fields.class||"—",x.fields.lesson||"—",x.fields.status||"—",x.fields.notes||"—"])},
    {title:"Rekap Nilai",columns:["Tanggal","Siswa","Kelas","Mapel","Penilaian","Nilai"],rows:grades.map(x=>[x.fields.date||"—",x.fields.student||"—",x.fields.class||"—",x.fields.subject||"—",x.fields.assessment||"—",x.fields.score||"—"])},
    {title:"Jurnal Mengajar",columns:["Tanggal","Kelas","Mapel","Topik/Kegiatan","Refleksi & Tindak Lanjut"],rows:journals.map(x=>[x.fields.date||"—",x.fields.class||"—",x.fields.subject||"—",x.fields.title||"—",x.fields.notes||"—"])}
   ]};
 }
 if(active==="student"){
  const groups=["Pelanggaran","Prestasi","Pembinaan"].flatMap(k=>demoItems(saved,"student::"+k));
  return {moduleKey:"disiplin",documentType:"rekap_disiplin_prestasi_demo",prefix:"DIS-REKAP",title:"Laporan Rekap Disiplin & Prestasi Siswa",subtitle:"Rekap kejadian, pembinaan, tindak lanjut dan prestasi peserta didik",orientation:"landscape",confidentiality:"restricted",status:"approved",
   metrics:[{label:"Total catatan",value:String(groups.length)},{label:"Pelanggaran",value:String(groups.filter(x=>x.fields.category==="Pelanggaran").length)},{label:"Prestasi",value:String(groups.filter(x=>x.fields.category==="Prestasi").length)},{label:"Pembinaan",value:String(groups.filter(x=>x.fields.category==="Pembinaan").length)}],
   sections:[{title:"Rincian Catatan Siswa",columns:["Tanggal","Siswa","Jenis","Kejadian/Prestasi","Kronologi & Tindak Lanjut"],rows:groups.map(x=>[x.fields.date||"—",x.fields.student||"—",x.fields.category||"—",x.fields.title||"—",x.fields.followup||"—"])}]};
 }
 if(active==="counseling"){
  const keys=["Pemetaan Kebutuhan","Kasus","Konseling Individu","Konseling Kelompok","Layanan Klasikal","RPL","Kunjungan Rumah","Rujukan","Karier","Tindak Lanjut"],items=keys.flatMap(k=>demoItems(saved,"counseling::"+k));
  return {moduleKey:"bk",documentType:"laporan_bk_demo",prefix:"BK",title:"Laporan Layanan Bimbingan dan Konseling",subtitle:"Ringkasan layanan BK pada mode demo",orientation:"landscape",confidentiality:"confidential",status:"approved",
   metrics:[{label:"Layanan tercatat",value:String(items.length)},{label:"Individu",value:String(items.filter(x=>x.fields.kind==="Konseling Individu").length)},{label:"Kelompok",value:String(items.filter(x=>x.fields.kind==="Konseling Kelompok").length)},{label:"Tindak lanjut",value:String(items.filter(x=>x.fields.followDate).length)}],
   notes:["Mode demo tetap menunjukkan prinsip privasi: catatan sesi sensitif tidak ditampilkan pada ringkasan manajemen."],
   sections:[{title:"Rekap Layanan",columns:["Tanggal","Sasaran","Jenis","Bidang","Tindak Lanjut"],rows:items.map(x=>[x.fields.date||"—",x.fields.student||"—",x.fields.kind||"—",x.fields.domain||"—",x.fields.followDate||"—"])}]};
 }
 if(active==="execution"){
  const items=["Program Kerja","PIC","Tugas","Deadline","Progres","Kendala","Hasil Rapat","Agenda","Bukti Kegiatan"].flatMap(k=>demoItems(saved,"execution::"+k));
  return {moduleKey:"command",documentType:"laporan_program_demo",prefix:"PROG",title:"Laporan Program Kerja dan Progres Sekolah",subtitle:"Program, PIC, deadline, kendala, hasil dan bukti · mode demo",orientation:"landscape",status:"approved",
   metrics:[{label:"Catatan program/tugas",value:String(items.length)},{label:"Selesai",value:String(items.filter(x=>x.fields.status==="Selesai").length)},{label:"Terhambat",value:String(items.filter(x=>x.fields.status==="Terhambat").length)},{label:"Memiliki PIC",value:String(items.filter(x=>x.fields.pic).length)}],
   sections:[{title:"Program & Tugas",columns:["Program/Tugas","PIC","Deadline","Status","Kendala","Hasil/Bukti"],rows:items.map(x=>[x.fields.title||"—",x.fields.pic||"—",x.fields.deadline||"—",x.fields.status||"—",x.fields.problem||"—",x.fields.result||"—"])}]};
 }
 if(active==="finance"){
  const income=demoItems(saved,"finance::Pemasukan"),expense=demoItems(saved,"finance::Pengeluaran"),budget=demoItems(saved,"finance::Anggaran"),bills=demoItems(saved,"finance::Tagihan Siswa"),payments=demoItems(saved,"finance::Pembayaran");
  if(feature==="Buku Kas Umum")return {moduleKey:"sikas",documentType:"buku_kas_umum_demo",prefix:"BKU",title:"Buku Kas Umum",subtitle:"Rekap penerimaan dan pengeluaran kas sekolah · mode demo",orientation:"landscape",status:"approved",
   metrics:[{label:"Pemasukan",value:demoMoney(income.reduce((n,x)=>n+Number(x.fields.amount||0),0))},{label:"Pengeluaran",value:demoMoney(expense.reduce((n,x)=>n+Number(x.fields.amount||0),0))},{label:"Transaksi",value:String(income.length+expense.length)},{label:"Kas/Rekening",value:String(new Set([...income,...expense].map(x=>x.fields.account).filter(Boolean)).size)}],
   sections:[{title:"Buku Kas Umum",columns:["Tanggal","Kas/Rekening","Jenis","Kategori","Kegiatan","Uraian","Nominal"],rows:[...income.map(x=>[x.fields.date||"—",x.fields.account||"—","Pemasukan",x.fields.category||"—",x.fields.activity||"—",x.fields.description||"—",demoMoney(x.fields.amount)]),...expense.map(x=>[x.fields.date||"—",x.fields.account||"—","Pengeluaran",x.fields.category||"—",x.fields.activity||"—",x.fields.description||"—",demoMoney(x.fields.amount)])]}]};
  if(feature==="Realisasi Anggaran")return {moduleKey:"sikas",documentType:"realisasi_anggaran_demo",prefix:"REAL",title:"Laporan Realisasi Anggaran",subtitle:"Perbandingan pagu dan realisasi internal · mode demo",orientation:"landscape",status:"approved",
   metrics:[{label:"Baris anggaran",value:String(budget.length)},{label:"Total pagu",value:demoMoney(budget.reduce((n,x)=>n+Number(x.fields.amount||0),0))},{label:"Total pengeluaran",value:demoMoney(expense.reduce((n,x)=>n+Number(x.fields.amount||0),0))},{label:"Status",value:"Pendamping"}],
   notes:["Dokumen demo ini menggambarkan laporan internal pendamping dan tidak menggantikan sistem pelaporan resmi pemerintah."],
   sections:[{title:"Anggaran",columns:["Tahun","Kegiatan/Kategori","Pagu","Catatan"],rows:budget.map(x=>[x.fields.year||"—",x.fields.category||"—",demoMoney(x.fields.amount),x.fields.notes||"—"])}]};
  return {moduleKey:"sikas",documentType:"laporan_keuangan_demo",prefix:"KEU",title:"Laporan Keuangan Sekolah",subtitle:"Ringkasan transaksi, tagihan dan pembayaran · mode demo",orientation:"landscape",confidentiality:"restricted",status:"approved",
   metrics:[{label:"Pemasukan",value:demoMoney(income.reduce((n,x)=>n+Number(x.fields.amount||0),0))},{label:"Pengeluaran",value:demoMoney(expense.reduce((n,x)=>n+Number(x.fields.amount||0),0))},{label:"Tagihan",value:String(bills.length)},{label:"Pembayaran",value:String(payments.length)}],
   sections:[{title:"Transaksi",columns:["Tanggal","Jenis","Kas/Rekening","Kategori","Keterangan","Nominal"],rows:[...income.map(x=>[x.fields.date||"—","Pemasukan",x.fields.account||"—",x.fields.category||"—",x.fields.description||"—",demoMoney(x.fields.amount)]),...expense.map(x=>[x.fields.date||"—","Pengeluaran",x.fields.account||"—",x.fields.category||"—",x.fields.description||"—",demoMoney(x.fields.amount)])]},{title:"Tagihan Siswa",columns:["Siswa","Tagihan","Periode","Jatuh Tempo","Nominal"],rows:bills.map(x=>[x.fields.student||"—",x.fields.title||"—",x.fields.period||"—",x.fields.due||"—",demoMoney(x.fields.amount)])},{title:"Pembayaran",columns:["Tagihan","Metode","No. Kuitansi","Nominal"],rows:payments.map(x=>[x.fields.bill||"—",x.fields.method||"—",x.fields.receipt||"—",demoMoney(x.fields.amount)])}]};
 }
 const payroll=demoItems(saved,"payroll::Draft Payroll");
 return {moduleKey:"gajian",documentType:feature==="Laporan HR"?"laporan_hr_demo":"rekap_payroll_demo",prefix:feature==="Laporan HR"?"HR":"PAY",title:feature==="Laporan HR"?"Laporan SDM dan Operasional":"Rekap Payroll Sekolah",subtitle:"Ringkasan SDM/payroll · mode demo",orientation:"landscape",confidentiality:"confidential",status:"approved",
  metrics:[{label:"Pegawai",value:String(payroll.length)},{label:"Gaji pokok",value:demoMoney(payroll.reduce((n,x)=>n+Number(x.fields.base||0),0))},{label:"Tunjangan",value:demoMoney(payroll.reduce((n,x)=>n+Number(x.fields.allowance||0),0))},{label:"Potongan",value:demoMoney(payroll.reduce((n,x)=>n+Number(x.fields.deduction||0),0))}],
  sections:[{title:"Rincian",columns:["Pegawai","Periode","Gaji Pokok","Tunjangan","Potongan","Netto","Bank/Rekening"],rows:payroll.map(x=>[x.fields.employee||"—",x.fields.period||"—",demoMoney(x.fields.base),demoMoney(x.fields.allowance),demoMoney(x.fields.deduction),demoMoney(Number(x.fields.base||0)+Number(x.fields.allowance||0)-Number(x.fields.deduction||0)),x.fields.bank||"—"])}]};
}
function isDemoReportFeature(active:Key,feature:string){
 return (active==="academic"&&["Rekap Bulanan","Laporan Kelas","Laporan Lengkap"].includes(feature))||
  (active==="student"&&["Rekap & Laporan","Template Laporan"].includes(feature))||
  (active==="counseling"&&feature==="Laporan BK")||(active==="execution"&&feature==="Laporan Program")||
  (active==="finance"&&["Buku Kas Umum","Realisasi Anggaran","Laporan"].includes(feature))||
  (active==="payroll"&&["Rekap Payroll","Laporan HR"].includes(feature));
}
function DemoReportPanel({active,feature,saved,onArchived}:{active:Key;feature:string;saved:Record<string,Saved[]>;onArchived:(x:Saved)=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const identity=demoReportIdentity(saved),model=buildDemoReport(active,feature,saved),number="DEMO/"+model.prefix+"/0001/2026";
 async function act(kind:"preview"|"pdf"|"docx"|"xlsx"){
  setBusy(true);setMessage("");try{
   if(kind==="preview")previewOfficialReport(identity,{...model,status:"draft"});
   if(kind==="pdf")printOfficialReport(identity,{...model,status:"issued"},number);
   if(kind==="docx")await downloadOfficialDocx(identity,{...model,status:"issued"},number);
   if(kind==="xlsx")await downloadOfficialExcel({...model,status:"issued"},number);
   if(kind!=="preview"){onArchived({id:crypto.randomUUID(),fields:{title:model.title,number,format:kind.toUpperCase(),module:active,date:new Date().toLocaleString("id-ID")}});setMessage("Ekspor demo dibuat dan dicatat ke Arsip Laporan demo.")}
  }finally{setBusy(false)}
 }
 return <section><div className="demo-section-title"><div><h3>{model.title}</h3><p>{model.subtitle} · preview memakai watermark DRAFT, sedangkan ekspor memakai nomor dokumen simulasi.</p></div><span className="demo-badge">Report Engine</span></div>
  <div className="demo-grid">{(model.metrics||[]).map(m=><div className="demo-stat" key={m.label}><small>{m.label}</small><strong style={{fontSize:20}}>{m.value}</strong><span>Data demo</span></div>)}</div>
  <div className="demo-toolbar-live" style={{marginTop:16}}><button disabled={busy} onClick={()=>void act("preview")}><Search size={15}/> Preview A4 Draft</button><button disabled={busy} onClick={()=>void act("xlsx")}><Download size={15}/> Excel</button><button disabled={busy} onClick={()=>void act("docx")}><Download size={15}/> Word .docx</button><button className="demo-primary" disabled={busy} onClick={()=>void act("pdf")}><Download size={15}/> PDF / Cetak</button></div>
  {message&&<div className="banner success" style={{marginTop:14}}>{message}</div>}
  <div className="banner" style={{marginTop:14}}><strong>Template sekolah aktif</strong><p className="hint">{identity.name} · NPSN {identity.npsn||"—"} · penandatangan {identity.principal_name||"—"}. Ubah contoh identitas melalui Pengaturan Sekolah → Branding.</p></div>
 </section>
}

function CalendarPreview({items,onPick,onEdit}:{items:Saved[];onPick:(d:string)=>void;onEdit:(x:Saved)=>void}){
 const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),1),offset=(first.getDay()+6)%7;
 const cells=Array.from({length:42},(_,i)=>new Date(now.getFullYear(),now.getMonth(),i-offset+1));
 return <section><div className="demo-section-title"><div><h3>{now.toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</h3><p>Klik tanggal untuk membuka popup agenda. Klik agenda yang sudah ada untuk mengedit.</p></div></div><div className="demo-calendar-week">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=><span key={x}>{x}</span>)}</div><div className="demo-calendar">{cells.map(d=>{const key=d.toLocaleDateString("en-CA"),events=items.filter(x=>dateOf(x.fields)===key);return <div key={key} className={"demo-calendar-cell "+(d.getMonth()===now.getMonth()?"":"outside")}><button className="demo-calendar-date" onClick={()=>onPick(key)}><b>{d.getDate()}</b><span>{events.length?events.length+" agenda":""}</span></button>{events.slice(0,2).map(x=><button className="demo-calendar-event" key={x.id} onClick={()=>onEdit(x)}>{x.fields.start?x.fields.start+" ":""}{labelOf(x.fields)}</button>)}</div>})}</div></section>
}

export default function DemoWorkspace(){
 const firstFeature=menu[0][3][0];
 const [active,setActive]=useState<Key>("overview"),[expanded,setExpanded]=useState<Key|null>("overview"),[feature,setFeature]=useState<string>(firstFeature),[saved,setSaved]=useState<Record<string,Saved[]>>({});
 const [ready,setReady]=useState(false),[theme,setTheme]=useState<"light"|"dark">("light"),[query,setQuery]=useState(""),[modal,setModal]=useState(false),[editing,setEditing]=useState<string|null>(null),[form,setForm]=useState<Record<string,string>>({});
 useEffect(()=>{if(sessionStorage.getItem("sc_internal_review")!=="1"){window.location.replace("/masuk");return}const t=localStorage.getItem("school-control-theme")==="dark"?"dark":"light";setTheme(t);document.body.dataset.theme=t;try{setSaved(JSON.parse(localStorage.getItem("sc_internal_workspace_data_v4")||"{}"))}catch{}setReady(true)},[]);
 const current=useMemo(()=>menu.find(x=>x[0]===active)!,[active]);
 if(!ready)return null;
 const storageKey=active+"::"+feature,defs=fieldsFor(active,feature),rows=saved[storageKey]||[];
 function choose(k:Key){const m=menu.find(x=>x[0]===k)!;setActive(k);setExpanded(k);setFeature(m[3][0]);setModal(false);setEditing(null);setForm({})}
 function chooseFeature(k:Key,x:string){setActive(k);setExpanded(k);setFeature(x);setModal(false);setEditing(null);setForm({})}
 function toggleTheme(){const next=theme==="light"?"dark":"light";setTheme(next);localStorage.setItem("school-control-theme",next);document.body.dataset.theme=next}
 function persist(next:Record<string,Saved[]>){setSaved(next);localStorage.setItem("sc_internal_workspace_data_v4",JSON.stringify(next))}
 function blank(dateValue=today()){const next:Record<string,string>={};for(const f of defs)next[f.key]=f.type==="date"?dateValue:f.type==="time"&&f.key==="start"?"07:00":f.options?.[0]||"";return next}
 function openNew(dateValue=today()){setEditing(null);setForm(blank(dateValue));setModal(true)}
 function openEdit(item:Saved){setEditing(item.id);setForm({...item.fields});setModal(true)}
 function save(){const key=defs[0]?.key;if(key&&!String(form[key]||"").trim())return;const item:Saved={id:editing||crypto.randomUUID(),fields:{...form}};const next=editing?rows.map(x=>x.id===editing?item:x):[item,...rows];persist({...saved,[storageKey]:next});setModal(false);setEditing(null);setForm({})}
 function del(id:string){if(confirm("Hapus data demo ini?"))persist({...saved,[storageKey]:rows.filter(x=>x.id!==id)})}
 function logout(){sessionStorage.removeItem("sc_internal_review");window.location.replace("/masuk")}
 function downloadTemplate(){const header=defs.map(f=>f.label),sample=defs.map(f=>f.type==="date"?today():f.options?.[0]||"Contoh");const csv=[header,sample].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="template-"+active+"-"+feature.toLowerCase().replaceAll(" ","-")+".csv";a.click();URL.revokeObjectURL(a.href)}
 const importFeature=feature.toLowerCase().includes("import");
 const calendarFeature=active==="calendar";
 const attendanceFeature=active==="attendance"&&feature==="Check-in/Check-out";
 const filtered=rows.filter(x=>Object.values(x.fields).join(" ").toLowerCase().includes(query.toLowerCase()));
 return <div className="demo-shell"><aside><div className="demo-brand"><img src="/school-control-mark.svg" width={38} height={38} alt=""/><span><b>School Control</b><small>Demo · akses setara paket aktif</small></span></div><nav>{menu.map(([k,label,Icon,features])=><div className="demo-navitem" key={k}><button className={active===k?"active":""} onClick={()=>choose(k)}><Icon size={18}/>{label}<ChevronRight className={expanded===k?"open":""} size={15}/></button>{expanded===k&&<div className="demo-navchildren">{features.map(x=><button key={x} className={active===k&&feature===x?"selected":""} onClick={()=>chooseFeature(k,x)}>{x}</button>)}</div>}</div>)}</nav><button className="demo-exit" onClick={logout}><LogOut size={17}/> Keluar</button></aside>
 <main><header><div><span className="demo-kicker">SCHOOL CONTROL / DEMO AKSES PENUH</span><h1>{feature}</h1><p>{current[1]} · input sekarang memakai popup seperti akun produksi.</p></div><div className="demo-head-actions"><button className="demo-theme" onClick={toggleTheme}>{theme==="light"?<Moon size={16}/>:<Sun size={16}/>} {theme==="light"?"Gelap":"Terang"}</button><label className="demo-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari data halaman ini"/></label></div></header><div className="demo-content">
  {active==="overview"?<Dashboard feature={feature}/>:<>
   {calendarFeature&&<CalendarPreview items={rows} onPick={openNew} onEdit={openEdit}/>}
   {attendanceFeature&&<section className="demo-realtime"><div><span className="demo-live-dot"/><b>Presensi realtime aktif</b><small>Demo meniru waktu server dan izin lokasi perangkat.</small></div><button className="demo-primary" onClick={()=>{navigator.geolocation?.getCurrentPosition(()=>{},()=>{});openNew()}}><MapPin size={15}/> Ambil Lokasi & Absen</button></section>}
   {active==="planning"&&feature==="Arsip Laporan"?<section><div className="demo-section-title"><div><h3>Arsip Laporan Resmi · Demo</h3><p>Setiap ekspor final dari menu laporan demo dicatat sebagai snapshot simulasi.</p></div><span className="demo-badge">Arsip</span></div>{(saved["report::__archive__"]||[]).map(x=><div className="demo-row" key={x.id}><FileText size={16}/><b>{x.fields.number} · {x.fields.title}<small style={{display:"block"}}>{x.fields.module} · {x.fields.format} · {x.fields.date}</small></b></div>)}{!(saved["report::__archive__"]||[]).length&&<div className="demo-empty">Belum ada laporan demo yang diekspor.</div>}</section>:
   isDemoReportFeature(active,feature)?<DemoReportPanel active={active} feature={feature} saved={saved} onArchived={item=>persist({...saved,"report::__archive__":[item,...(saved["report::__archive__"]||[])]})}/>:
   importFeature?<section><div className="demo-section-title"><div><h3>Import / Export</h3><p>Gunakan template agar kolom konsisten. Excel dan CSV dapat dipilih; sheet kosong pada import lengkap dilewati.</p></div></div><div className="demo-toolbar-live"><button onClick={downloadTemplate}><Download size={15}/> Unduh Template CSV</button><label><Upload size={15}/> Pilih Excel / CSV<input hidden type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={e=>{const file=e.currentTarget.files?.[0];if(file){setForm({file:file.name,status:"Siap diperiksa"});setModal(true)}}}/></label></div></section>:
    <section><div className="demo-section-title"><div><h3>Data {feature}</h3><p>{rows.length} data tersimpan di demo ini. Form tidak lagi memenuhi bagian atas halaman.</p></div><button className="demo-primary" onClick={()=>openNew()}><Plus size={15}/> Tambah Data</button></div></section>}
   {!importFeature&&!isDemoReportFeature(active,feature)&&!(active==="planning"&&feature==="Arsip Laporan")&&<section>{filtered.map(x=><div className="demo-row" key={x.id}><span className="dot"/><b>{labelOf(x.fields)}<small style={{display:"block"}}>{dateOf(x.fields)} · {Object.entries(x.fields).filter(([k,v])=>v&&!["name","title","date"].includes(k)).slice(0,3).map(([,v])=>v).join(" · ")}</small></b><div className="flow"><button onClick={()=>openEdit(x)} aria-label="Edit"><Pencil size={14}/></button><button onClick={()=>del(x.id)} aria-label="Hapus"><Trash2 size={14}/></button></div></div>)}{!filtered.length&&<div className="demo-empty">Belum ada data. Tekan Tambah Data atau klik tanggal kalender.</div>}</section>}
  </>}
 </div></main>
 <DataEntryModal open={modal} onClose={()=>setModal(false)} title={(editing?"Edit ":"Tambah ")+feature} subtitle="Popup demo memakai struktur field yang disesuaikan dengan modul asal." wide={defs.length>6}>
  {importFeature?<div className="banner"><strong>{form.file||"File belum dipilih"}</strong><p className="hint">{form.status||"Pilih file dari halaman Import / Export."}</p></div>:<div className="fields">{defs.map(f=><label className={"field "+(f.wide?"full":"")} key={f.key}>{f.label}{f.type==="select"?<select value={form[f.key]||""} onChange={e=>setForm(v=>({...v,[f.key]:e.target.value}))}><option value="">Pilih</option>{f.options?.map(o=><option key={o}>{o}</option>)}</select>:f.type==="textarea"?<textarea rows={5} value={form[f.key]||""} onChange={e=>setForm(v=>({...v,[f.key]:e.target.value}))}/>:<input type={f.type||"text"} value={form[f.key]||""} onChange={e=>setForm(v=>({...v,[f.key]:e.target.value}))}/>}</label>)}</div>}
  <div className="modal-actions"><button className="button secondary" onClick={()=>setModal(false)}>Batal</button>{!importFeature&&<button className="button" onClick={save}>Simpan Data</button>}</div>
 </DataEntryModal>
 </div>;
}
