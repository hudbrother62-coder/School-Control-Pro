import {modules,canAccess,type ModuleKey,type Role} from "./modules";
type Route={module:ModuleKey;label:string;reason:string;keywords:string[]};
const routes:Route[]=[
 {module:"payslip",label:"Slip Gaji Saya",reason:"Membuka riwayat slip pribadi yang sudah dikunci atau dibayar.",keywords:["slip gaji saya","slip","payslip"]},
 {module:"attendance",label:"Presensi, Jadwal & Cuti",reason:"Kehadiran masuk/pulang, jadwal, izin dan cuti menggunakan identitas pegawai sendiri.",keywords:["absen guru","absen pribadi","check in","check out","presensi guru","kehadiran guru","cuti","izin guru","jadwal guru","shift"]},
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
 {module:"settings",label:"Pengaturan Sekolah",reason:"Profil sekolah, memori, undangan tim, akses dan langganan.",keywords:["langganan","trial","undang tim","akun sekolah","profil sekolah","pengaturan","hak akses"]}
];
export type Orchestration={module:ModuleKey;label:string;reason:string;permitted:boolean;matched:string[]};
export function orchestrate(input:string,role:Role):Orchestration{
 const text=input.toLocaleLowerCase("id-ID").normalize("NFKC").replace(/[^\p{L}\p{N}\s-]/gu," ").replace(/\s+/g," ").trim();
 const candidates=routes.map((r,index)=>{const matched=r.keywords.filter(k=>text.includes(k));const score=matched.length?Math.max(...matched.map(x=>x.length))+matched.length*2+(r.module==="master"?-8:0)+(r.module==="kepsek_ai"&&matched.some(k=>["rkt","rkjm","ksp","kosp","pbd","eds","rkas"].includes(k))?18:0):0;return {...r,matched,score,index}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
 const pick=candidates[0]||{module:"overview" as ModuleKey,label:"Beranda",reason:"Jelaskan pekerjaan yang ingin dilakukan, lalu sistem akan memilih fitur yang paling sesuai.",matched:[]};
 const mod=modules.find(m=>m.key===pick.module);
 return {module:pick.module,label:pick.label,reason:pick.reason,permitted:!!mod&&canAccess(mod,role),matched:pick.matched};
}
