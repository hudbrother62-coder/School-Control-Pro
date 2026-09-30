export type Role = "owner"|"principal"|"vice_principal"|"teacher"|"counselor"|"hr"|"treasurer"|"staff"|"viewer";
export type ModuleKey = "overview"|"master"|"calendar"|"attendance"|"performance"|"guru_ai"|"kepsek_ai"|"buku_kerja"|"disiplin"|"bk"|"command"|"sikas"|"gajian"|"payslip"|"access"|"settings";
export type School = {id:string;name:string;timezone:string};
export type Membership = {school_id:string;role:Role};
export type Staff = {id:string;school_id:string;user_id:string|null;name:string;position:string|null;shift_start:string|null;late_tolerance_minutes?:number|null};
export type FeatureModule={key:ModuleKey;label:string;section:string;description:string;features:string[];roles?:Role[]};
export const ADMIN_ROLES:Role[] = ["owner","principal","vice_principal"];
export const modules:FeatureModule[] = [
  {key:"overview",label:"Beranda",section:"Utama",description:"Ringkasan sekolah.",features:["Ringkasan aktivitas","Universal AI Orchestrator","Status langganan"]},
  {key:"master",label:"Data Induk",section:"Utama",description:"Data utama sekolah.",features:["Siswa","Kelas","Guru & tenaga kependidikan","Mata pelajaran","Penugasan guru","Import/export data"]},
  {key:"calendar",label:"Agenda Sekolah",section:"Utama",description:"Kalender agenda bersama.",features:["Kalender bulan","Agenda besok","Agenda bulan depan","Tambah agenda"]},
  {key:"guru_ai",label:"Perangkat Ajar AI",section:"Pembelajaran",description:"Penyusunan perangkat dan bahan pembelajaran dengan AI.",features:["Modul ajar","RPP/rencana pembelajaran","LKPD","Bahan ajar","Soal & asesmen","Riwayat draf"],roles:["owner","principal","vice_principal","teacher"]},
  {key:"buku_kerja",label:"Pembelajaran & Penilaian",section:"Pembelajaran",description:"Administrasi kelas dan pembelajaran harian.",features:["Presensi siswa","Nilai","Jurnal mengajar","Agenda","Rekap bulanan","Laporan kelas","Import/export Excel"],roles:["owner","principal","vice_principal","teacher"]},
  {key:"disiplin",label:"Disiplin & Prestasi",section:"Kesiswaan",description:"Catatan perilaku, prestasi, pembinaan dan tindak lanjut.",features:["Pelanggaran","Prestasi","Pembinaan","Tindak lanjut","Filter kelas","Rekap & ekspor"],roles:["owner","principal","vice_principal","teacher","counselor"]},
  {key:"bk",label:"Bimbingan Konseling",section:"Kesiswaan",description:"Layanan konseling dan tindak lanjut dengan privasi peran.",features:["Pemetaan kebutuhan","Kasus","Konseling individu","Konseling kelompok","Layanan klasikal","RPL","Kunjungan rumah","Rujukan","Karier","Tindak lanjut"],roles:["owner","principal","counselor"]},
  {key:"kepsek_ai",label:"Perencanaan & Supervisi",section:"Manajemen",description:"Perencanaan sekolah, dokumen manajemen dan supervisi akademik.",features:["PBD/EDS","KSP/KOSP","RKJM","RKT","RKAS","SOP","Supervisi guru","Pusat dokumen","Persetujuan dokumen"],roles:["owner","principal","vice_principal"]},
  {key:"command",label:"Program, Tugas & Agenda",section:"Manajemen",description:"Eksekusi program sekolah dari rencana sampai bukti.",features:["Program kerja","PIC","Tugas","Deadline","Progres","Kendala","Hasil rapat","Agenda","Bukti kegiatan"]},
  {key:"attendance",label:"Presensi Realtime",section:"SDM",description:"Absen, jadwal dan cuti.",features:["Check-in/check-out","Jadwal/shift","Riwayat kehadiran","Koreksi beralasan","Izin","Cuti"]},
  {key:"performance",label:"Kinerja & Pengembangan",section:"SDM",description:"Rekap bukti kinerja untuk evaluasi dan pembinaan.",features:["Kehadiran","Partisipasi program","Pelatihan","Bukti capaian","Evaluasi","Tanggapan guru"]},
  {key:"gajian",label:"Payroll & Kompensasi",section:"SDM",description:"Penggajian sekolah dari komponen sampai pembayaran.",features:["Komponen gaji","Tunjangan","Potongan","Draft payroll","Review","Approval","Kunci periode","Rekap payroll"],roles:["owner","hr"]},
  {key:"payslip",label:"Slip Gaji Saya",section:"SDM",description:"Slip gaji pribadi setelah periode dikunci.",features:["Riwayat slip","Cetak slip"],roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","staff"]},
  {key:"sikas",label:"Keuangan, Anggaran & Tagihan",section:"Keuangan",description:"Kas sekolah, anggaran dan penagihan dalam satu pembukuan.",features:["Kas/rekening","Pemasukan","Pengeluaran","Anggaran","Tagihan siswa","Pembayaran","Kuitansi","Laporan","Ekspor"],roles:["owner","principal","treasurer"]},
  {key:"access",label:"Akses & Peran",section:"Sistem",description:"Struktur akses pengguna.",features:["Struktur peran","Hak akses fitur","Anggota tim"],roles:["owner","principal"]},
  {key:"settings",label:"Pengaturan Sekolah",section:"Sistem",description:"Profil dan langganan.",features:["Profil sekolah","Undang anggota","Memori sekolah","Langganan","Riwayat pembayaran"],roles:["owner","principal"]},
];
export const isAdmin=(role:Role)=>ADMIN_ROLES.includes(role);
export const canAccess=(m:FeatureModule, role:Role)=>!m.roles || m.roles.includes(role);
