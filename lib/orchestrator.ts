import {modules,canAccess,type ModuleKey,type Role} from "./modules";
type Route={module:ModuleKey;label:string;reason:string;keywords:string[]};
const routes:Route[]=[
 {module:"payslip",label:"Slip gaji pribadi",reason:"Slip hanya tersedia untuk pegawai pemilik akun setelah periode terkunci.",keywords:["slip gaji saya","slip","payslip"]},
 {module:"attendance",label:"Presensi guru",reason:"Presensi masuk/pulang menggunakan waktu server dan identitas pegawai sendiri.",keywords:["absen guru","absen pribadi","check in","check out","presensi guru","kehadiran guru","cuti","izin guru"]},
 {module:"performance",label:"Kinerja guru",reason:"Menggabungkan bukti kehadiran, pelatihan, program sekolah dan verifikasi.",keywords:["kinerja guru","evaluasi guru","supervisi kinerja","pelatihan guru","partisipasi guru"]},
 {module:"guru_ai",label:"Guru AI",reason:"Generator perangkat ajar, bahan ajar, LKPD, soal dan asesmen.",keywords:["modul ajar","bahan ajar","lkpd","rpp","soal","asesmen","guru ai"]},
 {module:"buku_kerja",label:"Buku Kerja Digital",reason:"Presensi siswa, nilai, jurnal dan rekap yang mengambil data induk sekolah.",keywords:["jurnal mengajar","buku kerja","nilai siswa","presensi siswa","rekap kelas","agenda mengajar"]},
 {module:"disiplin",label:"Disiplin Pro",reason:"Catat pelanggaran, prestasi, pembinaan dan tindak lanjut siswa.",keywords:["disiplin","pelanggaran","prestasi murid","prestasi siswa","pembinaan siswa"]},
 {module:"bk",label:"BK Pro privat",reason:"Kasus dan layanan bersifat terbatas untuk konselor penanggung jawab.",keywords:["konseling","bimbingan konseling","bk pro","kasus bk","rpl bk","kunjungan rumah"]},
 {module:"kepsek_ai",label:"Kepsek AI",reason:"Draf PBD, KSP/KOSP, RKJM, RKT, RKAS, SOP dan supervisi.",keywords:["rkt","rkjm","ksp","kosp","pbd","eds","rkas","kepsek","supervisi","sop sekolah"]},
 {module:"command",label:"Command Pro",reason:"Rencana program, PIC, tenggat, tugas, notula dan bukti.",keywords:["program kerja","pic","tugas sekolah","deadline","hasil rapat","notula","agenda sekolah","bukti program"]},
 {module:"sikas",label:"SIKAS Pro",reason:"Kelola rekening, anggaran, tagihan siswa, pembayaran, dan buku kas.",keywords:["keuangan","rekening sekolah","kas sekolah","tagihan","iuran","spp","anggaran","bosp","pemasukan","pengeluaran"]},
 {module:"gajian",label:"Gajian Pro",reason:"Kelola pegawai, komponen gaji, periode, approval dan pembayaran.",keywords:["payroll","gajian","gaji pegawai","komponen gaji","penggajian"]},
 {module:"master",label:"Data Induk",reason:"Satu sumber untuk siswa, kelas, tahun ajaran, mata pelajaran dan guru.",keywords:["data siswa","tambah kelas","nama kelas","tahun ajaran","data guru","import siswa","ekspor siswa","master"]},
 {module:"settings",label:"Pengaturan",reason:"Profil sekolah, memori, undangan tim dan langganan.",keywords:["langganan","trial","undang tim","akun sekolah","profil sekolah","pengaturan"]}
];
export type Orchestration={module:ModuleKey;label:string;reason:string;permitted:boolean;matched:string[]};
export function orchestrate(input:string,role:Role):Orchestration{
 const text=input.toLocaleLowerCase("id-ID").normalize("NFKC").replace(/[^\p{L}\p{N}\s-]/gu," ").replace(/\s+/g," ").trim();
 const candidates=routes.map((r,index)=>{const matched=r.keywords.filter(k=>text.includes(k));const score=matched.length?Math.max(...matched.map(x=>x.length))+matched.length*2:0;return {...r,matched,score,index}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
 const pick=candidates[0]||{module:"overview" as ModuleKey,label:"Beranda Sekolah",reason:"Pilih modul tujuan dari menu atau jelaskan tugas dengan lebih spesifik.",matched:[]};
 const mod=modules.find(m=>m.key===pick.module);
 return {module:pick.module,label:pick.label,reason:pick.reason,permitted:!!mod&&canAccess(mod,role),matched:pick.matched};
}
