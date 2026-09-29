export type Role = "owner"|"principal"|"vice_principal"|"teacher"|"counselor"|"hr"|"treasurer"|"staff"|"viewer";
export type ModuleKey = "overview"|"master"|"attendance"|"performance"|"guru_ai"|"kepsek_ai"|"buku_kerja"|"disiplin"|"bk"|"command"|"sikas"|"gajian"|"payslip"|"settings";
export type School = {id:string;name:string;timezone:string};
export type Membership = {school_id:string;role:Role};
export type Staff = {id:string;school_id:string;user_id:string|null;name:string;position:string|null;shift_start:string|null;late_tolerance_minutes?:number|null};
export const ADMIN_ROLES:Role[] = ["owner","principal","vice_principal"];
export const modules:{key:ModuleKey;label:string;section:string;description:string;roles?:Role[]}[] = [
  {key:"overview",label:"Beranda",section:"Utama",description:"Aktivitas sekolah secara terintegrasi."},
  {key:"master",label:"Data Induk",section:"Utama",description:"Identitas sekolah, guru, tenaga kependidikan, siswa dan kelas."},
  {key:"attendance",label:"Presensi Guru",section:"SDM",description:"Absen masuk dan pulang secara mandiri dengan waktu tercatat oleh server."},
  {key:"performance",label:"Kinerja Guru",section:"SDM",description:"Kehadiran, partisipasi program, pelatihan dan bukti yang tervalidasi."},
  {key:"guru_ai",label:"Guru AI",section:"Pembelajaran",description:"Perangkat ajar dan asisten penyusunan materi.",roles:["owner","principal","vice_principal","teacher"]},
  {key:"buku_kerja",label:"Buku Kerja Digital",section:"Pembelajaran",description:"Jurnal, penilaian, presensi siswa dan pelaporan.",roles:["owner","principal","vice_principal","teacher"]},
  {key:"disiplin",label:"Disiplin Pro",section:"Kesiswaan",description:"Kejadian, prestasi, pembinaan dan tindak lanjut.",roles:["owner","principal","vice_principal","teacher","counselor"]},
  {key:"bk",label:"BK Pro",section:"Kesiswaan",description:"Kasus dan konseling bersifat terbatas kepada konselor yang berwenang.",roles:["counselor"]},
  {key:"kepsek_ai",label:"Kepsek AI",section:"Manajemen",description:"PBD, KSP/KOSP, RKJM, RKT, RKAS assistant dan supervisi.",roles:["owner","principal","vice_principal"]},
  {key:"command",label:"Command Pro",section:"Manajemen",description:"Program sekolah, PIC, tugas, hasil rapat dan bukti pelaksanaan."},
  {key:"sikas",label:"SIKAS Pro",section:"Administrasi",description:"Pemasukan, pengeluaran, rekening, kegiatan dan laporan.",roles:["owner","principal","treasurer"]},
  {key:"gajian",label:"Gajian Pro",section:"Administrasi",description:"SDM, izin, cuti, lembur, payroll dan slip gaji.",roles:["owner","hr"]},
  {key:"payslip",label:"Slip Gaji Saya",section:"SDM",description:"Slip setelah periode dikunci.",roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","staff"]},
  {key:"settings",label:"Sekolah & Langganan",section:"Administrasi",description:"Pengaturan, akses tim, serta masa aktif sekolah.",roles:["owner","principal"]},
];
export const isAdmin=(role:Role)=>ADMIN_ROLES.includes(role);
export const canAccess=(m:(typeof modules)[number], role:Role)=>!m.roles || m.roles.includes(role);
