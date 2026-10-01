e
 {key:"help",label:"Panduan Penggunaan",section:"Sistem",roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","staff","viewer"],features:["Mulai dari Sini","Data Induk","Agenda & Absensi","Perangkat Ajar AI","Jurnal & Penilaian","Disiplin & Prestasi","Bimbingan Konseling","Program & Tugas","Keuangan","SDM & Payroll","Akses & Pengaturan"]},xport type Role = "owner"|"principal"|"vice_principal"|"teacher"|"counselor"|"hr"|"treasurer"|"staff"|"viewer";
export type ModuleKey = "overview"|"master"|"calendar"|"attendance"|"performance"|"guru_ai"|"kepsek_ai"|"buku_kerja"|"disiplin"|"bk"|"command"|"sikas"|"gajian"|"payslip"|"access"|"settings"|"help";
export type School = {id:string;name:string;timezone:string};
export type Membership = {school_id:string;role:Role};
export type Staff = {id:string;school_id:string;user_id:string|null;name:string;position:string|null;shift_start:string|null;late_tolerance_minutes?:number|null;staff_type?:string|null};
export type FeatureModule={key:ModuleKey;label:string;section:string;description:string;features:string[];roles?:Role[]};
export const ROLE_LABELS:Record<Role,string>={
 owner:"Pemilik Akun",principal:"Kepala Sekolah",vice_principal:"Wakil Kepala Sekolah",teacher:"Guru",counselor:"Guru BK",hr:"SDM / HR",treasurer:"Bendahara",staff:"Staf",viewer:"Viewer"
};
export const ADMIN_ROLES:Role[] = ["owner","principal","vice_principal"];
export const modules:FeatureModule[] = [
 {key:"overview",label:"Beranda",section:"Utama",description:"Ringkasan operasional sekolah.",features:["Ringkasan Operasional","Analitik Sekolah","Agenda & Deadline"]},
 {key:"master",label:"Data Induk",section:"Utama",description:"Sumber data utama seluruh sistem.",features:["Siswa","Kelas","Guru","Tenaga Kependidikan","Mata Pelajaran","Penugasan Guru","Import Excel Keseluruhan"]},
 {key:"calendar",label:"Agenda Sekolah",section:"Utama",description:"Kalender sekolah dan agenda setiap pengguna.",features:["Kalender Sekolah","Rekap Agenda","Agenda Pribadi","Agenda Pengguna","Kehadiran Agenda"]},
 {key:"guru_ai",label:"Perangkat Ajar AI",section:"Pembelajaran",description:"Workspace perangkat pembelajaran berbasis proyek.",features:["Proyek Pembelajaran","Modul Ajar","RPP","LKPD","Asesmen Soal","Strategi Pembelajaran","Bahan Ajar","Rubrik Penilaian","Panduan Presentasi","Peta Konsep","Ngobrol AI","Riwayat draf"],roles:["owner","principal","vice_principal","teacher"]},
 {key:"buku_kerja",label:"Pembelajaran & Penilaian",section:"Pembelajaran",description:"Administrasi kelas, penilaian dan laporan guru.",features:["Presensi Siswa","Lembar Nilai","Jurnal Mengajar","Agenda Mengajar","Rekap Bulanan","Laporan Kelas","Import/Export Excel"],roles:["owner","principal","vice_principal","teacher"]},
 {key:"disiplin",label:"Disiplin & Prestasi",section:"Kesiswaan",description:"Pelanggaran, prestasi, pembinaan, tindak lanjut dan laporan.",features:["Pelanggaran","Prestasi","Pembinaan","Tindak Lanjut","Master Data","Rekap & Laporan","Template Laporan"],roles:["owner","principal","vice_principal","teacher","counselor"]},
 {key:"bk",label:"Bimbingan Konseling",section:"Kesiswaan",description:"Administrasi BK dengan privasi konselor.",features:["Pemetaan Kebutuhan","Kasus","Konseling Individu","Konseling Kelompok","Layanan Klasikal","RPL","Kunjungan Rumah","Rujukan","Karier","Riwayat Siswa","Tindak Lanjut"],roles:["owner","principal","counselor"]},
 {key:"kepsek_ai",label:"Perencanaan & Supervisi",section:"Manajemen",description:"Perencanaan sekolah, dokumen dan supervisi akademik.",features:["PBD/EDS","KSP/KOSP","RKJM","RKT","RKAS","SOP","Supervisi guru","Pusat dokumen","Persetujuan dokumen"],roles:["owner","principal","vice_principal"]},
 {key:"command",label:"Program, Tugas & Agenda",section:"Manajemen",description:"Eksekusi program dari PIC sampai bukti.",features:["Program Kerja","PIC","Tugas","Deadline","Progres","Kendala","Hasil Rapat","Agenda","Bukti Kegiatan"]},
 {key:"attendance",label:"Presensi Realtime",section:"SDM",description:"Presensi berbasis waktu server dan lokasi perangkat.",features:["Check-in/check-out","Jadwal/shift","Riwayat kehadiran","Koreksi beralasan","Izin","Cuti"]},
 {key:"performance",label:"Kinerja & Pengembangan",section:"SDM",description:"Rekap kinerja dan pengembangan berbasis bukti.",features:["Kehadiran","Partisipasi program","Pelatihan","Bukti capaian","Evaluasi","Tanggapan guru"]},
 {key:"gajian",label:"Payroll & Kompensasi",section:"SDM",description:"Komponen gaji sampai penguncian periode.",features:["Komponen Gaji","Tunjangan","Potongan","Draft Payroll","Review","Approval","Kunci Periode","Rekap Payroll"],roles:["owner","hr"]},
 {key:"payslip",label:"Slip Gaji Saya",section:"SDM",description:"Riwayat slip gaji pribadi.",features:["Riwayat Slip","Cetak Slip"],roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","staff"]},
 {key:"sikas",label:"Keuangan, Anggaran & Tagihan",section:"Keuangan",description:"Kas, anggaran, tagihan, kuitansi dan laporan.",features:["Dashboard Keuangan","Kas/Rekening","Pemasukan","Pengeluaran","Anggaran","Tagihan Siswa","Pembayaran","Kuitansi","Laporan","Import/Export"],roles:["owner","principal","treasurer"]},
 {key:"access",label:"Akses & Peran",section:"Sistem",description:"Anggota, undangan dan hak akses.",features:["Tambah Pengguna","Anggota Tim","Struktur Peran","Hak Akses Fitur"],roles:["owner","principal"]},
 {key:"settings",label:"Pengaturan Sekolah",section:"Sistem",description:"Identitas sekolah, memori dan langganan.",features:["Profil sekolah","Identitas & Kontak","Lokasi Sekolah","Akademik","Branding","Memori sekolah","Langganan","Riwayat pembayaran"],roles:["owner","principal"]}
];
export const isAdmin=(role:Role)=>ADMIN_ROLES.includes(role);
export const canAccess=(m:FeatureModule,role:Role)=>!m.roles||m.roles.includes(role);
