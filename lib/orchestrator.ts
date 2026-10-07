import {modules,canAccess,visibleFeatures,type ModuleKey,type Role} from "./modules";

export type WorkflowRisk="low"|"medium"|"high"|"critical";
export type AutonomyLevel="A0"|"A1"|"A2"|"A3"|"A4"|"A5";
export type ExecutionMode="simulation"|"guided";

export type WorkflowStep={
 module:ModuleKey;
 feature:string;
 title:string;
 instruction:string;
 permitted:boolean;
 matched:string[];
 action:string;
 risk:WorkflowRisk;
 requiresApproval:boolean;
 reversible:boolean;
 verification:string;
 precondition:string;
 impact:string;
};

export type WorkflowPlan={
 title:string;
 objective:string;
 reason:string;
 riskLevel:WorkflowRisk;
 autonomyLevel:AutonomyLevel;
 executionMode:ExecutionMode;
 acceptanceCriteria:string[];
 impact:string[];
 safeguards:string[];
 steps:WorkflowStep[];
};

type Route={module:ModuleKey;label:string;keywords:string[]};
const routes:Route[]=[
 {module:"journals",label:"Jurnal & Pemantauan",keywords:["jurnal harian","jurnal siswa","laporan jurnal","review jurnal","jurnal bulanan"]},
 {module:"payslip",label:"Slip Gaji Saya",keywords:["slip gaji saya","slip gaji","payslip"]},
 {module:"master",label:"Data Induk",keywords:["data siswa","data guru","kelas","mata pelajaran","master data","import siswa","penugasan guru"]},
 {module:"calendar",label:"Agenda Sekolah",keywords:["agenda","kalender","jadwal kegiatan","pertemuan","rapat"]},
 {module:"attendance",label:"Presensi Realtime",keywords:["absen pribadi","absen guru","presensi guru","check in","check out","kehadiran guru","cuti","izin guru"]},
 {module:"guru_ai",label:"Perangkat Ajar AI",keywords:["modul ajar","bahan ajar","lkpd","rpp","soal","asesmen","perangkat ajar"]},
 {module:"buku_kerja",label:"Pembelajaran & Penilaian",keywords:["jurnal mengajar","nilai siswa","presensi siswa","rekap kelas","agenda mengajar","penilaian"]},
 {module:"disiplin",label:"Disiplin & Prestasi",keywords:["disiplin","pelanggaran","prestasi siswa","pembinaan","sanksi","surat panggilan"]},
 {module:"bk",label:"Bimbingan Konseling",keywords:["konseling","kasus bk","rpl","kunjungan rumah","rujukan","karier siswa"]},
 {module:"library",label:"Perpustakaan",keywords:["perpustakaan","buku perpustakaan","koleksi buku","katalog buku","inventaris buku","eksemplar","barcode buku","peminjaman buku","pinjam buku","pengembalian buku","kunjungan perpustakaan","pengadaan buku","perawatan buku","literasi sekolah"]},
 {module:"kepsek_ai",label:"Perencanaan & Supervisi",keywords:["rkt","rkjm","ksp","kosp","pbd","eds","rkas","supervisi","sop","pkks"]},
 {module:"command",label:"Program, Tugas & Agenda",keywords:["program kerja","pic","tugas sekolah","deadline","hasil rapat","notula","bukti program","kendala","progres"]},
 {module:"sikas",label:"Keuangan",keywords:["keuangan","rekening sekolah","kas sekolah","tagihan","spp","anggaran","bosp","pemasukan","pengeluaran","kuitansi"]},
 {module:"gajian",label:"SDM & Payroll",keywords:["payroll","gaji","tunjangan","potongan","lembur","kasbon","reimburse","rekrutmen","lokasi kerja"]},
 {module:"performance",label:"Kinerja",keywords:["kinerja guru","evaluasi guru","pelatihan","pengembangan diri"]},
 {module:"access",label:"Akses & Peran",keywords:["hak akses","role","peran pengguna","akses guru","akses staf"]},
 {module:"settings",label:"Pengaturan",keywords:["langganan","trial","profil sekolah","branding","pengaturan"]}
];

const has=(text:string,...keys:string[])=>keys.some(k=>text.includes(k));
const slug=(value:string)=>value.toLocaleLowerCase("id-ID").normalize("NFKC").replace(/[^a-z0-9]+/g,".").replace(/^\.+|\.+$/g,"")||"main";

function featureFor(module:ModuleKey,text:string){
 switch(module){
  case "journals":return has(text,"bulanan","laporan","rekap")?"Rekap Bulanan":has(text,"review")?"Review Jurnal":has(text,"siswa")?"Jurnal Siswa":"Jurnal Harian";
  case "master":return has(text,"penugasan")?"Penugasan Guru":has(text,"staf","tenaga kependidikan")?"Tenaga Kependidikan":has(text,"guru","sdm")?"Guru":has(text,"kelas")?"Kelas":has(text,"mata pelajaran","mapel")?"Mata Pelajaran":has(text,"import")?"Import Excel Keseluruhan":"Siswa";
  case "calendar":return has(text,"pribadi")?"Agenda Pribadi":has(text,"rekap")?"Rekap Agenda":"Kalender Sekolah";
  case "attendance":return has(text,"cuti")?"Cuti":has(text,"izin")?"Izin":has(text,"jadwal","shift")?"Jadwal/shift":"Check-in/check-out";
  case "guru_ai":return has(text,"lkpd")?"LKPD":has(text,"rpp")?"RPP":has(text,"bahan ajar")?"Bahan Ajar":has(text,"soal","asesmen")?"Asesmen Soal":"Modul Ajar";
  case "buku_kerja":return has(text,"jurnal")?"Jurnal Mengajar":has(text,"nilai","penilaian")?"Lembar Nilai":has(text,"agenda")?"Agenda Mengajar":has(text,"rekap","laporan")?"Laporan Lengkap":"Presensi Siswa";
  case "disiplin":return has(text,"surat","panggilan")?"Surat & Dokumen":has(text,"pembinaan")?"Pembinaan":has(text,"tindak lanjut","sanksi")?"Tindak Lanjut":has(text,"prestasi")?"Prestasi":"Pelanggaran";
  case "bk":return has(text,"kunjungan")?"Kunjungan Rumah":has(text,"rujukan")?"Rujukan":has(text,"karier")?"Perencanaan Karier":has(text,"tindak lanjut")?"Tindak Lanjut":has(text,"kasus")?"Kasus & Asesmen":"Konseling Individu";
  case "library":return has(text,"pengembalian","kembali buku")?"Pengembalian":has(text,"peminjaman","pinjam buku")?"Peminjaman":has(text,"kunjungan")?"Kunjungan":has(text,"pengadaan")?"Pengadaan":has(text,"perawatan","rusak")?"Perawatan":has(text,"inventaris","barcode","eksemplar")?"Eksemplar & Inventaris":has(text,"anggota")?"Anggota Perpustakaan":has(text,"literasi","program")?"Program & Literasi":has(text,"laporan","statistik")?"Laporan & Statistik":has(text,"koleksi","katalog","buku")?"Koleksi Buku":"Dashboard Perpustakaan";
  case "kepsek_ai":return has(text,"kosp","ksp")?"KSP/KOSP":has(text,"rkjm")?"RKJM":has(text,"rkt")?"RKT":has(text,"rkas")?"RKAS":has(text,"pbd","eds")?"PBD/EDS":has(text,"sop")?"SOP":has(text,"supervisi")?"Supervisi guru":"PBD/EDS";
  case "command":return has(text,"rapat","notula")?"Tindak Lanjut Rapat":has(text,"bukti")?"Verifikasi Bukti":has(text,"tugas","deadline")?"Tugas":"Program Kerja";
  case "sikas":return has(text,"tagihan","spp")?"Tagihan Siswa":has(text,"anggaran")?"Realisasi Anggaran":has(text,"pemasukan")?"Pemasukan":has(text,"pengeluaran")?"Pengeluaran":has(text,"kuitansi")?"Riwayat Pembayaran":"Buku Kas Umum";
  case "gajian":return has(text,"lembur")?"Lembur":has(text,"kasbon")?"Kasbon":has(text,"reimburse")?"Reimburse":has(text,"rekrut")?"Rekrutmen":has(text,"lokasi")?"Lokasi Presensi":has(text,"payroll","gaji")?"Proses Payroll":"Pengajuan SDM";
  case "performance":return has(text,"evaluasi")?"Evaluasi":has(text,"pelatihan")?"Pelatihan":"Bukti capaian";
  case "payslip":return "Riwayat Slip";
  case "access":return "Struktur Peran & Hak Akses";
  case "settings":return has(text,"langganan","trial")?"Langganan":"Profil sekolah";
  default:return "";
 }
}

function riskFor(module:ModuleKey,title:string,instruction:string):WorkflowRisk{
 const text=(title+" "+instruction).toLocaleLowerCase("id-ID");
 if(has(text,"hapus massal","hapus semua","publikasi final","kunci periode","dibayar","refund"))return "critical";
 if(["gajian","sikas","access","settings"].includes(module)||has(text,"setujui","terbitkan","kirim","bayar","kunci","undang","ubah akses","surat"))return "high";
 if(["disiplin","bk","attendance","command"].includes(module)||has(text,"simpan","ubah","catat","buat"))return "medium";
 return "low";
}
function approvalFor(risk:WorkflowRisk,title:string,instruction:string){
 const text=(title+" "+instruction).toLocaleLowerCase("id-ID");
 return risk==="high"||risk==="critical"||has(text,"setujui","terbitkan","kirim","kunci","bayar","hapus");
}
function reversibleFor(title:string,instruction:string){
 const text=(title+" "+instruction).toLocaleLowerCase("id-ID");
 return !has(text,"kirim","terbitkan","dibayar","kunci periode","hapus permanen");
}
function verificationFor(module:ModuleKey,feature:string,title:string){
 if(module==="sikas")return "Cocokkan tagihan/transaksi, kas tujuan, nominal, periode dan bukti sebelum menandai selesai.";
 if(module==="gajian")return "Periksa status payroll, komponen, periode, approval dan snapshot slip pada database.";
 if(module==="calendar")return "Pastikan agenda muncul pada kalender pihak yang dituju dengan tanggal, peserta dan lokasi yang benar.";
 if(module==="master")return "Pastikan entitas tersimpan sekali, relasinya benar dan tidak ada duplikasi identitas.";
 if(module==="library")return "Pastikan judul, eksemplar, anggota dan status sirkulasi konsisten; peminjaman/pengembalian harus tercermin pada status eksemplar.";
 if(module==="disiplin"||module==="bk")return "Periksa siswa, kronologi, hak akses dan jejak tindak lanjut tanpa membuka data di luar kewenangan.";
 return "Periksa hasil pada fitur "+feature+" dan pastikan keadaan aktual sesuai tujuan langkah "+title+".";
}
function preconditionFor(index:number){
 return index===0?"Sumber data, sekolah aktif dan hak akses pengguna telah tersedia.":"Langkah sebelumnya sudah diverifikasi dan tidak meninggalkan konflik.";
}
function impactFor(module:ModuleKey,feature:string){
 const map:Partial<Record<ModuleKey,string>>={
  master:"Mempengaruhi data induk yang dipakai banyak modul.",
  calendar:"Mempengaruhi jadwal dan peserta kegiatan.",
  attendance:"Mempengaruhi riwayat kehadiran.",
  disiplin:"Mempengaruhi arsip pembinaan/ketertiban siswa.",
  bk:"Mempengaruhi catatan layanan BK sesuai pembatasan akses.",
  library:"Mempengaruhi koleksi, inventaris, sirkulasi, kunjungan atau layanan perpustakaan.",
  command:"Mempengaruhi program, tugas, bukti dan progres.",
  sikas:"Mempengaruhi kas, tagihan atau laporan keuangan.",
  gajian:"Mempengaruhi pengajuan SDM atau periode payroll.",
  access:"Mempengaruhi siapa yang dapat melihat dan mengubah data.",
  settings:"Mempengaruhi konfigurasi sekolah."
 };
 return map[module]||("Mempengaruhi ruang kerja "+feature+".");
}
function step(module:ModuleKey,feature:string,title:string,instruction:string,role:Role,matched:string[]=[],index=0):WorkflowStep{
 const mod=modules.find(m=>m.key===module),risk=riskFor(module,title,instruction);
 return {
  module,feature,title,instruction,
  permitted:!!mod&&canAccess(mod,role)&&visibleFeatures(mod,role).includes(feature),
  matched,
  action:module+"."+slug(feature),
  risk,
  requiresApproval:approvalFor(risk,title,instruction),
  reversible:reversibleFor(title,instruction),
  verification:verificationFor(module,feature,title),
  precondition:preconditionFor(index),
  impact:impactFor(module,feature)
 };
}
function riskMax(steps:WorkflowStep[]):WorkflowRisk{
 const score:Record<WorkflowRisk,number>={low:0,medium:1,high:2,critical:3};
 return steps.reduce<WorkflowRisk>((max,s)=>score[s.risk]>score[max]?s.risk:max,"low");
}
function autonomyFor(risk:WorkflowRisk):AutonomyLevel{
 return risk==="low"?"A3":risk==="medium"?"A3":risk==="high"?"A2":"A1";
}
function buildPlan(title:string,objective:string,reason:string,steps:WorkflowStep[]):WorkflowPlan{
 const riskLevel=riskMax(steps);
 const impact=Array.from(new Set(steps.map(s=>s.impact))).slice(0,6);
 const safeguards=[
  "Sumber eksternal diperlakukan sebagai data, bukan instruksi eksekusi.",
  "Setiap langkah memeriksa hak akses dan dependensi sebelum perubahan.",
  "Langkah berisiko tinggi memerlukan approval eksplisit.",
  "Langkah irreversible memakai kompensasi/koreksi, bukan klaim rollback palsu.",
  "Workflow baru dianggap selesai setelah hasil aktual diverifikasi."
 ];
 const acceptanceCriteria=[
  "Semua langkah wajib selesai atau diberi alasan skipped yang dapat diaudit.",
  "Tidak ada langkah yang melampaui akses peran aktif.",
  "Perubahan utama terlihat pada modul sumber dan modul turunannya.",
  "Langkah berisiko tinggi sudah mendapat approval.",
  "Verifikasi akhir tidak menemukan konflik atau duplikasi baru."
 ];
 return {title,objective,reason,riskLevel,autonomyLevel:autonomyFor(riskLevel),executionMode:"guided",acceptanceCriteria,impact,safeguards,steps};
}

export function planWorkflow(input:string,role:Role):WorkflowPlan{
 const text=input.toLocaleLowerCase("id-ID").normalize("NFKC").trim().split(" ").filter(Boolean).join(" ");
 if(!text)return buildPlan("Jelaskan pekerjaan","Belum ada tujuan yang dapat dikunci.","Tulis tujuan yang ingin diselesaikan.",[]);

 if(has(text,"jurnal harian","jurnal siswa","jurnal bulanan","laporan jurnal","review jurnal")){
  const student=has(text,"jurnal siswa");
  const steps=[
   step(student?"master":"calendar",student?"Penugasan Guru":"Kalender Sekolah","Periksa sumber kegiatan","Pastikan kelas/penugasan atau agenda kegiatan sudah tersedia.",role,[],0),
   step("journals",student?"Jurnal Siswa":"Jurnal Harian","Catat jurnal faktual","Hubungkan jurnal dengan kelas/siswa atau agenda/tugas, lalu simpan draf dan kirim untuk review.",role,[],1),
   step("journals","Review Jurnal","Review oleh manajemen","Pengelola lain meninjau kiriman, memberi catatan dan meminta revisi bila perlu.",role,[],2),
   step("journals","Rekap Bulanan","Pantau dan laporkan","Pilih bulan, pengguna, kelas dan tanggal bila membutuhkan laporan harian. Periksa draf sebelum ekspor.",role,[],3),
   step("overview","Ringkasan Operasional","Lihat tren jurnal","Baca indikator operasional setelah jurnal dan review tersimpan.",role,[],4)
  ];
  return buildPlan("Jurnal sampai laporan bulanan","Menyelesaikan jurnal dari sumber kegiatan sampai review, rekap dan pemantauan.","Kegiatan mengikuti data sumber, lalu penulis mengirim dan manajemen meninjau sebelum pemantauan bulanan.",steps);
 }
 if(has(text,"sering alpa","sering tidak hadir")&&has(text,"pembinaan","pelanggaran","surat panggilan")){
  const steps=[
   step("buku_kerja","Presensi Siswa","Periksa riwayat kehadiran","Pastikan tanggal dan status Alpa benar sebelum membuat tindak lanjut.",role,["alpa"],0),
   step("disiplin","Pelanggaran","Catat / verifikasi kejadian","Hubungkan kejadian dengan siswa dan master pelanggaran.",role,["pelanggaran"],1),
   step("disiplin","Pembinaan","Catat pembinaan","Simpan bentuk pembinaan, hasil dan pencatat.",role,["pembinaan"],2),
   step("disiplin","Tindak Lanjut","Tetapkan tindakan berikutnya","Tetapkan PIC, target selesai dan status tindakan.",role,["tindak lanjut"],3),
   step("disiplin","Surat & Dokumen","Terbitkan surat orang tua","Buat surat dari snapshot riwayat yang sudah diverifikasi.",role,["surat panggilan"],4),
   step("calendar","Kalender Sekolah","Jadwalkan pertemuan","Masukkan pertemuan orang tua ke kalender pihak yang terlibat.",role,["agenda"],5)
  ];
  return buildPlan("Penanganan siswa dari kehadiran sampai tindak lanjut","Menyelesaikan kasus ketidakhadiran berulang sampai komunikasi dan agenda tindak lanjut.","Data kehadiran perlu dibaca lebih dulu sebelum pembinaan dan komunikasi orang tua.",steps);
 }
 if(has(text,"pbd","eds")&&has(text,"rkt","program")){
  const steps=[
   step("kepsek_ai","PBD/EDS","Analisis prioritas mutu","Pastikan indikator dan masalah prioritas sudah terverifikasi.",role,["pbd"],0),
   step("kepsek_ai","RKT","Susun RKT","Turunkan prioritas menjadi kegiatan dan indikator hasil.",role,["rkt"],1),
   step("command","Program Kerja","Buat program kerja","Hubungkan kegiatan RKT dengan program dan PIC.",role,["program"],2),
   step("command","Tugas","Turunkan ke tugas","Buat tugas, deadline dan penanggung jawab.",role,["tugas"],3),
   step("calendar","Kalender Sekolah","Jadwalkan kegiatan","Masukkan tanggal pelaksanaan ke kalender.",role,["agenda"],4),
   step("command","Verifikasi Bukti","Verifikasi hasil","Pastikan bukti program diverifikasi sebelum status selesai.",role,["bukti"],5),
   step("command","Laporan Program","Siapkan laporan","Ekspor progres, hasil dan bukti terverifikasi.",role,["laporan"],6)
  ];
  return buildPlan("Dari PBD sampai laporan program","Menurunkan prioritas mutu menjadi rencana, program, pelaksanaan, bukti dan laporan.","Prioritas mutu diturunkan menjadi rencana, program, tugas dan bukti.",steps);
 }
 if(has(text,"tagihan")&&has(text,"pembayaran","kuitansi","kas")){
  const steps=[
   step("sikas","Tagihan Siswa","Buat / periksa tagihan","Pastikan siswa, periode, jatuh tempo dan nominal benar.",role,["tagihan"],0),
   step("sikas","Pembayaran","Catat pembayaran","Catat metode, kas tujuan dan nominal pembayaran.",role,["pembayaran"],1),
   step("sikas","Riwayat Pembayaran","Verifikasi kuitansi dan bukti","Periksa nomor kuitansi serta lampiran pembayaran.",role,["kuitansi"],2),
   step("sikas","Buku Kas Umum","Periksa BKU","Pastikan transaksi masuk pada periode yang benar.",role,["kas"],3),
   step("sikas","Laporan","Ekspor laporan","Buat laporan periode setelah data sesuai.",role,["laporan"],4)
  ];
  return buildPlan("Tagihan sampai laporan keuangan","Menyelesaikan alur tagihan tanpa input ganda sampai kas, kuitansi dan laporan.","Pembayaran siswa harus mengalir ke kas dan laporan tanpa input ulang.",steps);
 }
 if(has(text,"izin","lembur","reimburse","kasbon")&&has(text,"payroll","gaji")){
  const steps=[
   step("gajian","Pengajuan SDM","Periksa pengajuan","Pastikan jenis, waktu, nominal dan alasan lengkap.",role,[],0),
   step("gajian","Pengajuan SDM","Setujui / tolak","Manajemen memberi keputusan dan catatan.",role,[],1),
   step("attendance","Riwayat kehadiran","Periksa kehadiran","Gunakan catatan kehadiran sebagai data pendukung, bukan potongan otomatis.",role,[],2),
   step("gajian","Proses Payroll","Hitung draft","Buat draft payroll dari komponen aktif.",role,[],3),
   step("gajian","Proses Payroll","Review rincian","Periksa komponen dan penyesuaian tiap pegawai.",role,[],4),
   step("gajian","Proses Payroll","Kunci periode","Kunci setelah disetujui agar slip stabil.",role,[],5),
   step("payslip","Riwayat Slip","Terbitkan slip","Pegawai dapat melihat slip periode terkunci.",role,[],6)
  ];
  return buildPlan("Pengajuan SDM sampai payroll","Menyelesaikan pengajuan SDM sampai payroll final dan slip yang stabil.","Pengajuan perlu diputuskan sebelum periode payroll dikunci.",steps);
 }

 const scored=routes.map((r,index)=>{const matched=r.keywords.filter(k=>text.includes(k));const score=matched.reduce((n,k)=>n+k.length,0)+matched.length*6-index/100;return {...r,matched,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 const picks=scored.slice(0,4);
 if(!picks.length)return buildPlan("Pekerjaan belum terpetakan",input.trim()||"Belum ada tujuan spesifik.","Tambahkan objek pekerjaan, misalnya siswa, program, agenda, tagihan, payroll atau dokumen.",[]);
 const steps=picks.map((r,i)=>step(r.module,featureFor(r.module,text),r.label,i===0?"Mulai dari sumber data atau tindakan utama yang paling relevan.":"Lanjutkan setelah langkah sebelumnya selesai dan diverifikasi.",role,r.matched,i));
 return buildPlan(picks.length>1?"Workflow lintas modul":"Buka ruang kerja yang sesuai",input.trim(),picks.length>1?"Permintaan menyentuh beberapa sumber data; kerjakan berurutan agar tidak ada input ganda.":"Permintaan cocok dengan satu ruang kerja utama.",steps);
}

export type Orchestration={module:ModuleKey;feature:string;label:string;reason:string;permitted:boolean;matched:string[]};
export function orchestrate(input:string,role:Role):Orchestration{
 const plan=planWorkflow(input,role),first=plan.steps[0];
 if(!first)return {module:"overview",feature:"",label:"Beranda",reason:plan.reason,permitted:true,matched:[]};
 return {module:first.module,feature:first.feature,label:first.title,reason:first.instruction,permitted:first.permitted,matched:first.matched};
}
