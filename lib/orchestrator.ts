import {modules,canAccess,type ModuleKey,type Role} from "./modules";

export type WorkflowStep={module:ModuleKey;feature:string;title:string;instruction:string;permitted:boolean;matched:string[]};
export type WorkflowPlan={title:string;reason:string;steps:WorkflowStep[]};

type Route={module:ModuleKey;label:string;keywords:string[]};
const routes:Route[]=[
 {module:"payslip",label:"Slip Gaji Saya",keywords:["slip gaji saya","slip gaji","payslip"]},
 {module:"master",label:"Data Induk",keywords:["data siswa","data guru","kelas","mata pelajaran","master data","import siswa","penugasan guru"]},
 {module:"calendar",label:"Agenda Sekolah",keywords:["agenda","kalender","jadwal kegiatan","pertemuan","rapat"]},
 {module:"attendance",label:"Presensi Realtime",keywords:["absen pribadi","absen guru","presensi guru","check in","check out","kehadiran guru","cuti","izin guru"]},
 {module:"guru_ai",label:"Perangkat Ajar AI",keywords:["modul ajar","bahan ajar","lkpd","rpp","soal","asesmen","perangkat ajar"]},
 {module:"buku_kerja",label:"Pembelajaran & Penilaian",keywords:["jurnal mengajar","nilai siswa","presensi siswa","rekap kelas","agenda mengajar","penilaian"]},
 {module:"disiplin",label:"Disiplin & Prestasi",keywords:["disiplin","pelanggaran","prestasi siswa","pembinaan","sanksi","surat panggilan"]},
 {module:"bk",label:"Bimbingan Konseling",keywords:["konseling","kasus bk","rpl","kunjungan rumah","rujukan","karier siswa"]},
 {module:"kepsek_ai",label:"Perencanaan & Supervisi",keywords:["rkt","rkjm","ksp","kosp","pbd","eds","rkas","supervisi","sop","pkks"]},
 {module:"command",label:"Program, Tugas & Agenda",keywords:["program kerja","pic","tugas sekolah","deadline","hasil rapat","notula","bukti program","kendala","progres"]},
 {module:"sikas",label:"Keuangan",keywords:["keuangan","rekening sekolah","kas sekolah","tagihan","spp","anggaran","bosp","pemasukan","pengeluaran","kuitansi"]},
 {module:"gajian",label:"SDM & Payroll",keywords:["payroll","gaji","tunjangan","potongan","lembur","kasbon","reimburse","rekrutmen","lokasi kerja"]},
 {module:"performance",label:"Kinerja",keywords:["kinerja guru","evaluasi guru","pelatihan","pengembangan diri"]},
 {module:"access",label:"Akses & Peran",keywords:["hak akses","role","peran pengguna","akses guru","akses staf"]},
 {module:"settings",label:"Pengaturan",keywords:["langganan","trial","profil sekolah","branding","pengaturan"]}
];

const has=(text:string,...keys:string[])=>keys.some(k=>text.includes(k));
function featureFor(module:ModuleKey,text:string){
 switch(module){
  case "master": return has(text,"guru","staf","sdm")?"Guru":has(text,"kelas")?"Kelas":has(text,"mata pelajaran","mapel")?"Mata Pelajaran":has(text,"import")?"Import Excel Keseluruhan":"Siswa";
  case "calendar": return has(text,"pribadi")?"Agenda Pribadi":has(text,"rekap")?"Rekap Agenda":"Kalender Sekolah";
  case "attendance": return has(text,"cuti")?"Cuti":has(text,"izin")?"Izin":has(text,"jadwal","shift")?"Jadwal/shift":"Check-in/check-out";
  case "guru_ai": return has(text,"lkpd")?"LKPD":has(text,"rpp")?"RPP":has(text,"bahan ajar")?"Bahan Ajar":has(text,"soal","asesmen")?"Asesmen Soal":"Modul Ajar";
  case "buku_kerja": return has(text,"jurnal")?"Jurnal Mengajar":has(text,"nilai","penilaian")?"Lembar Nilai":has(text,"agenda")?"Agenda Mengajar":has(text,"rekap","laporan")?"Laporan Lengkap":"Presensi Siswa";
  case "disiplin": return has(text,"surat","panggilan")?"Surat & Dokumen":has(text,"pembinaan")?"Pembinaan":has(text,"tindak lanjut","sanksi")?"Tindak Lanjut":has(text,"prestasi")?"Prestasi":"Pelanggaran";
  case "bk": return has(text,"kunjungan")?"Kunjungan Rumah":has(text,"rujukan")?"Rujukan":has(text,"karier")?"Perencanaan Karier":has(text,"tindak lanjut")?"Tindak Lanjut":has(text,"kasus")?"Kasus & Asesmen":"Konseling Individu";
  case "kepsek_ai": return has(text,"kosp","ksp")?"KSP/KOSP":has(text,"rkjm")?"RKJM":has(text,"rkt")?"RKT":has(text,"rkas")?"RKAS":has(text,"pbd","eds")?"PBD/EDS":has(text,"sop")?"SOP":has(text,"supervisi")?"Supervisi guru":"PBD/EDS";
  case "command": return has(text,"rapat","notula")?"Tindak Lanjut Rapat":has(text,"bukti")?"Verifikasi Bukti":has(text,"tugas","deadline")?"Tugas":"Program Kerja";
  case "sikas": return has(text,"tagihan","spp")?"Tagihan Siswa":has(text,"anggaran")?"Realisasi Anggaran":has(text,"pemasukan")?"Pemasukan":has(text,"pengeluaran")?"Pengeluaran":has(text,"kuitansi")?"Riwayat Pembayaran":"Buku Kas Umum";
  case "gajian": return has(text,"lembur")?"Lembur":has(text,"kasbon")?"Kasbon":has(text,"reimburse")?"Reimburse":has(text,"rekrut")?"Rekrutmen":has(text,"lokasi")?"Lokasi Presensi":has(text,"payroll","gaji")?"Draft Payroll":"Pengajuan SDM";
  case "performance": return has(text,"evaluasi")?"Evaluasi":has(text,"pelatihan")?"Pelatihan":"Bukti capaian";
  case "payslip": return "Riwayat Slip";
  case "access": return "Hak Akses Fitur";
  case "settings": return has(text,"langganan","trial")?"Langganan":"Profil sekolah";
  default:return "";
 }
}
function step(module:ModuleKey,feature:string,title:string,instruction:string,role:Role,matched:string[]=[]):WorkflowStep{
 const mod=modules.find(m=>m.key===module);
 return {module,feature,title,instruction,permitted:!!mod&&canAccess(mod,role),matched};
}

export function planWorkflow(input:string,role:Role):WorkflowPlan{
 const text=input.toLocaleLowerCase("id-ID").normalize("NFKC").trim().split(" ").filter(Boolean).join(" ");
 if(!text)return {title:"Jelaskan pekerjaan",reason:"Tulis tujuan yang ingin diselesaikan.",steps:[]};

 if(has(text,"sering alpa","sering tidak hadir")&&has(text,"pembinaan","pelanggaran","surat panggilan")){
  return {title:"Penanganan siswa dari kehadiran sampai tindak lanjut",reason:"Data kehadiran perlu dibaca lebih dulu sebelum pembinaan dan komunikasi orang tua.",steps:[
   step("buku_kerja","Presensi Siswa","Periksa riwayat kehadiran","Pastikan tanggal dan status Alpa benar sebelum membuat tindak lanjut.",role,["alpa"]),
   step("disiplin","Pelanggaran","Catat / verifikasi kejadian","Hubungkan kejadian dengan siswa dan master pelanggaran.",role,["pelanggaran"]),
   step("disiplin","Pembinaan","Catat pembinaan","Simpan bentuk pembinaan, hasil dan pencatat.",role,["pembinaan"]),
   step("disiplin","Tindak Lanjut","Tetapkan tindakan berikutnya","Tetapkan PIC, target selesai dan status tindakan.",role,["tindak lanjut"]),
   step("disiplin","Surat & Dokumen","Terbitkan surat orang tua","Buat surat dari snapshot riwayat yang sudah diverifikasi.",role,["surat panggilan"]),
   step("calendar","Kalender Sekolah","Jadwalkan pertemuan","Masukkan pertemuan orang tua ke kalender pihak yang terlibat.",role,["agenda"])
  ]};
 }

 if(has(text,"pbd","eds")&&has(text,"rkt","program")){
  return {title:"Dari PBD sampai laporan program",reason:"Prioritas mutu diturunkan menjadi rencana, program, tugas dan bukti.",steps:[
   step("kepsek_ai","PBD/EDS","Analisis prioritas mutu","Pastikan indikator dan masalah prioritas sudah terverifikasi.",role,["pbd"]),
   step("kepsek_ai","RKT","Susun RKT","Turunkan prioritas menjadi kegiatan dan indikator hasil.",role,["rkt"]),
   step("command","Program Kerja","Buat program kerja","Hubungkan kegiatan RKT dengan program dan PIC.",role,["program"]),
   step("command","Tugas","Turunkan ke tugas","Buat tugas, deadline dan penanggung jawab.",role,["tugas"]),
   step("calendar","Kalender Sekolah","Jadwalkan kegiatan","Masukkan tanggal pelaksanaan ke kalender.",role,["agenda"]),
   step("command","Verifikasi Bukti","Verifikasi hasil","Pastikan bukti program diverifikasi sebelum status selesai.",role,["bukti"]),
   step("command","Laporan Program","Siapkan laporan","Ekspor progres, hasil dan bukti terverifikasi.",role,["laporan"])
  ]};
 }

 if(has(text,"tagihan")&&has(text,"pembayaran","kuitansi","kas")){
  return {title:"Tagihan sampai laporan keuangan",reason:"Pembayaran siswa harus mengalir ke kas dan laporan tanpa input ulang.",steps:[
   step("sikas","Tagihan Siswa","Buat / periksa tagihan","Pastikan siswa, periode, jatuh tempo dan nominal benar.",role,["tagihan"]),
   step("sikas","Pembayaran","Catat pembayaran","Catat metode, kas tujuan dan nominal pembayaran.",role,["pembayaran"]),
   step("sikas","Riwayat Pembayaran","Verifikasi kuitansi dan bukti","Periksa nomor kuitansi serta lampiran pembayaran.",role,["kuitansi"]),
   step("sikas","Buku Kas Umum","Periksa BKU","Pastikan transaksi masuk pada periode yang benar.",role,["kas"]),
   step("sikas","Laporan","Ekspor laporan","Buat laporan periode setelah data sesuai.",role,["laporan"])
  ]};
 }

 if(has(text,"izin","lembur","reimburse","kasbon")&&has(text,"payroll","gaji")){
  return {title:"Pengajuan SDM sampai payroll",reason:"Pengajuan perlu diputuskan sebelum periode payroll dikunci.",steps:[
   step("gajian","Pengajuan SDM","Periksa pengajuan","Pastikan jenis, waktu, nominal dan alasan lengkap.",role),
   step("gajian","Approval","Setujui / tolak","Manajemen memberi keputusan dan catatan.",role),
   step("attendance","Riwayat kehadiran","Periksa kehadiran","Gunakan catatan kehadiran sebagai data pendukung, bukan potongan otomatis.",role),
   step("gajian","Draft Payroll","Hitung draft","Buat draft payroll dari komponen aktif.",role),
   step("gajian","Review","Review rincian","Periksa komponen dan penyesuaian tiap pegawai.",role),
   step("gajian","Kunci Periode","Kunci periode","Kunci setelah disetujui agar slip stabil.",role),
   step("payslip","Riwayat Slip","Terbitkan slip","Pegawai dapat melihat slip periode terkunci.",role)
  ]};
 }

 const scored=routes.map((r,index)=>{const matched=r.keywords.filter(k=>text.includes(k));const score=matched.reduce((n,k)=>n+k.length,0)+matched.length*6-index/100;return {...r,matched,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 const picks=scored.slice(0,4);
 if(!picks.length)return {title:"Pekerjaan belum terpetakan",reason:"Tambahkan objek pekerjaan, misalnya siswa, program, agenda, tagihan, payroll atau dokumen.",steps:[]};
 return {title:picks.length>1?"Workflow lintas modul":"Buka ruang kerja yang sesuai",reason:picks.length>1?"Permintaan menyentuh beberapa sumber data; kerjakan berurutan agar tidak ada input ganda.":"Permintaan cocok dengan satu ruang kerja utama.",steps:picks.map((r,i)=>step(r.module,featureFor(r.module,text),r.label,i===0?"Mulai dari sumber data atau tindakan utama yang paling relevan.":"Lanjutkan setelah langkah sebelumnya selesai.",role,r.matched))};
}

export type Orchestration={module:ModuleKey;feature:string;label:string;reason:string;permitted:boolean;matched:string[]};
export function orchestrate(input:string,role:Role):Orchestration{
 const plan=planWorkflow(input,role),first=plan.steps[0];
 if(!first)return {module:"overview",feature:"",label:"Beranda",reason:plan.reason,permitted:true,matched:[]};
 return {module:first.module,feature:first.feature,label:first.title,reason:first.instruction,permitted:first.permitted,matched:first.matched};
}
