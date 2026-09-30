import {modules,canAccess,type ModuleKey,type Role} from "./modules";
type Route={module:ModuleKey;label:string;reason:string;keywords:string[]};
const routes:Route[]=[
 {module:"payslip",label:"Slip Gaji Saya",reason:"Membuka riwayat slip pribadi yang sudah dikunci atau dibayar.",keywords:["slip gaji saya","slip","payslip"]},
 {module:"calendar",label:"Agenda Sekolah",reason:"Menampilkan agenda bersama dalam kalender bulanan.",keywords:["agenda sekolah","kalender sekolah","agenda besok","bulan depan","jadwal kegiatan","kalender agenda"]},
 {module:"attendance",label:"Presensi Realtime",reason:"Kehadiran masuk/pulang, jadwal, izin dan cuti menggunakan identitas pegawai sendiri.",keywords:["absen guru","absen staf","absen karyawan","absen pribadi","check in","check out","presensi guru","presensi staf","kehadiran guru","cuti","izin guru","jadwal guru","shift"]},
 {module:"performance",label:"Kinerja & Pengembangan",reason:"Menggabungkan bukti kehadiran, program sekolah, pelatihan, capaian dan verifikasi.",keywords:["kinerja guru","evaluasi guru","supervisi kinerja","pelatihan guru","partisipasi guru","pengembangan diri"]},
 {module:"guru_ai",label:"Perangkat Ajar AI",reason:"Generator modul ajar, bahan ajar, LKPD, soal dan asesmen.",keywords:["modul ajar","bahan ajar","lkpd","rpp","soal","asesmen","perangkat ajar"]},
 {module:"buku_kerja",label:"Pembelajaran & Penilaian",reason:"Presensi siswa, nilai, jurnal, agenda dan rekap mengambil data induk sekolah.",keywords:["jurnal mengajar","buku kerja","nilai siswa","presensi siswa","rekap kelas","agenda mengajar","penilaian"]},
 {module:"disiplin",label:"Disiplin & Prestasi",reason:"Catat pelanggaran, prestasi, pembinaan dan tindak lanjut siswa.",keywords:["disiplin","pelanggaran","prestasi murid","prestasi siswa","pembinaan siswa"]},
 {module:"bk",label:"Bimbingan Konseling",reason:"Kasus dan layanan konseling dibatasi kepada konselor penanggung jawab.",keywords:["konseling","bimbingan konseling","kasus bk","rpl bk","kunjungan rumah","rujukan","karier siswa"]},
 {module:"kepsek_ai",label:"Perencanaan & Supervisi",reason:"Menyusun PBD, KSP/KOSP, RKJM, RKT, RKAS, SOP, dokumen dan supervisi.",keywords:["rkt","rkjm","ksp","kosp","pbd","eds","rkas","supervisi","sop sekolah","perencanaan sekolah"]},
 {module:"command",label:"Program, Tugas & Agenda",reason:"Kelola program, PIC, tenggat, tugas, notula, kendala, progres dan bukti.",keywords:["program kerja","pic","tugas sekolah","deadline","hasil rapat","notula","agenda sekolah","bukti program","kendala program","progres"]},
 {module:"sikas",label:"Keuangan, Anggaran & Tagihan",reason:"Kelola kas, rekening, anggaran, tagihan siswa, pembayaran dan laporan.",keywords:["keuangan","rekening sekolah","kas sekolah","tagihan","iuran","spp","anggaran","bosp","pemasukan","pengeluaran","kuitansi"]},
 {module:"gajian",label:"Payroll & Kompensasi",reason:"Kelola komponen gaji, tunjangan, potongan, review, approval dan pembayaran.",keywords:["payroll","gajian","gaji pegawai","komponen gaji","penggajian","tunjangan","potongan gaji"]},
 {module:"master",label:"Data Induk",reason:"Satu sumber untuk sekolah, siswa, kelas, tahun ajaran, mata pelajaran dan SDM.",keywords:["data siswa","tambah kelas","nama kelas","tahun ajaran","data guru","import siswa","ekspor siswa","master data","mata pelajaran"]},
 {module:"access",label:"Akses & Peran",reason:"Mengatur struktur peran dan hak akses pengguna.",keywords:["hak akses","role","peran pengguna","akses guru","akses staf","akses kepala sekolah","struktur akses"]},
 {module:"settings",label:"Pengaturan Sekolah",reason:"Profil sekolah, memori, undangan tim dan langganan.",keywords:["langganan","trial","undang tim","akun sekolah","profil sekolah","pengaturan"]}
];
function featureFor(module:ModuleKey,text:string){
 const has=(...x:string[])=>x.some(k=>text.includes(k));
 switch(module){
  case "master": return has("import","ekspor")?"Import/export data":has("mata pelajaran","mapel")?"Mata pelajaran":has("kelas")?"Kelas":has("guru","staf","sdm")?"Guru & tenaga kependidikan":has("penugasan")?"Penugasan guru":"Siswa";
  case "calendar": return has("besok")?"Agenda besok":has("bulan depan")?"Agenda bulan depan":has("tambah","buat agenda")?"Tambah agenda":"Kalender bulan";
  case "attendance": return has("jadwal","shift")?"Jadwal/shift":has("koreksi","manual")?"Koreksi beralasan":has("cuti")?"Cuti":has("izin")?"Izin":has("riwayat")?"Riwayat kehadiran":"Check-in/check-out";
  case "performance": return has("tanggapan","respon")?"Tanggapan guru":has("evaluasi")?"Evaluasi":has("pelatihan","pengembangan diri")?"Pelatihan":has("program")?"Partisipasi program":has("bukti","capaian")?"Bukti capaian":"Kehadiran";
  case "guru_ai": return has("lkpd")?"LKPD":has("rpp")?"RPP/rencana pembelajaran":has("bahan ajar")?"Bahan ajar":has("soal","asesmen")?"Soal & asesmen":has("riwayat","draf")?"Riwayat draf":"Modul ajar";
  case "buku_kerja": return has("import","ekspor")?"Import/export Excel":has("nilai","penilaian")?"Nilai":has("jurnal")?"Jurnal mengajar":has("agenda")?"Agenda":has("rekap")?"Rekap bulanan":has("laporan")?"Laporan kelas":"Presensi siswa";
  case "disiplin": return has("prestasi")?"Prestasi":has("pembinaan")?"Pembinaan":has("tindak lanjut")?"Tindak lanjut":has("rekap","ekspor")?"Rekap & ekspor":has("filter","kelas")?"Filter kelas":"Pelanggaran";
  case "bk": return has("kebutuhan")?"Pemetaan kebutuhan":has("kelompok")?"Konseling kelompok":has("klasikal")?"Layanan klasikal":has("rpl")?"RPL":has("kunjungan","home visit")?"Kunjungan rumah":has("rujukan")?"Rujukan":has("karier")?"Karier":has("tindak lanjut")?"Tindak lanjut":has("kasus")?"Kasus":"Konseling individu";
  case "kepsek_ai": return has("kosp","ksp")?"KSP/KOSP":has("rkjm")?"RKJM":has("rkt")?"RKT":has("rkas")?"RKAS":has("pbd","eds")?"PBD/EDS":has("sop")?"SOP":has("supervisi")?"Supervisi guru":has("persetujuan")?"Persetujuan dokumen":has("dokumen")?"Pusat dokumen":"PBD/EDS";
  case "command": return has("pic")?"PIC":has("deadline")?"Deadline":has("kendala")?"Kendala":has("progres")?"Progres":has("rapat","notula")?"Hasil rapat":has("agenda")?"Agenda":has("bukti")?"Bukti kegiatan":has("tugas")?"Tugas":"Program kerja";
  case "sikas": return has("rekening","kas")?"Kas/rekening":has("pemasukan")?"Pemasukan":has("pengeluaran")?"Pengeluaran":has("anggaran","bosp")?"Anggaran":has("tagihan","spp","iuran")?"Tagihan siswa":has("kuitansi")?"Kuitansi":has("pembayaran")?"Pembayaran":has("ekspor")?"Ekspor":"Laporan";
  case "gajian": return has("tunjangan")?"Tunjangan":has("potongan")?"Potongan":has("review")?"Review":has("approval","setujui")?"Approval":has("kunci")?"Kunci periode":has("rekap")?"Rekap payroll":has("draft")?"Draft payroll":"Komponen gaji";
  case "payslip": return has("cetak")?"Cetak slip":"Riwayat slip";
  case "access": return has("anggota","tim")?"Anggota tim":has("fitur")?"Hak akses fitur":"Struktur peran";
  case "settings": return has("undang")?"Undang anggota":has("memori")?"Memori sekolah":has("riwayat","pembayaran")?"Riwayat pembayaran":has("langganan","trial")?"Langganan":"Profil sekolah";
  default:return "";
 }
}
export type Orchestration={module:ModuleKey;feature:string;label:string;reason:string;permitted:boolean;matched:string[]};
export function orchestrate(input:string,role:Role):Orchestration{
 const text=input.toLocaleLowerCase("id-ID").normalize("NFKC").replace(/[^\p{L}\p{N}\s-]/gu," ").replace(/\s+/g," ").trim();
 const candidates=routes.map((r,index)=>{const matched=r.keywords.filter(k=>text.includes(k));const score=matched.length?Math.max(...matched.map(x=>x.length))+matched.length*2+(r.module==="master"?-8:0)+(r.module==="kepsek_ai"&&matched.some(k=>["rkt","rkjm","ksp","kosp","pbd","eds","rkas"].includes(k))?18:0):0;return {...r,matched,score,index}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
 const pick=candidates[0]||{module:"overview" as ModuleKey,label:"Beranda",reason:"Jelaskan pekerjaan yang ingin dilakukan, lalu sistem akan memilih fitur yang paling sesuai.",matched:[]};
 const mod=modules.find(m=>m.key===pick.module);
 return {module:pick.module,feature:featureFor(pick.module,text),label:pick.label,reason:pick.reason,permitted:!!mod&&canAccess(mod,role),matched:pick.matched};
}
