export type Role = "owner"|"principal"|"vice_principal"|"teacher"|"counselor"|"hr"|"treasurer"|"finance_staff"|"supervisor"|"staff"|"viewer";
export type ModuleKey = "overview"|"master"|"calendar"|"reports"|"attendance"|"performance"|"guru_ai"|"assistant"|"kepsek_ai"|"buku_kerja"|"disiplin"|"bk"|"library"|"command"|"sikas"|"gajian"|"payslip"|"access"|"settings"|"help"|"journals";
export type School = {id:string;name:string;timezone:string};
export type Membership = {school_id:string;role:Role};
export type Staff = {id:string;school_id:string;user_id:string|null;name:string;position:string|null;shift_start:string|null;late_tolerance_minutes?:number|null;staff_type?:string|null};
export type FeatureModule={key:ModuleKey;label:string;section:string;description:string;features:string[];roles?:Role[]};
export const ROLE_LABELS:Record<Role,string>={
 owner:"Pemilik Akun",principal:"Kepala Sekolah",vice_principal:"Wakil Kepala Sekolah",teacher:"Guru",counselor:"Guru BK",hr:"SDM / HR",treasurer:"Bendahara",finance_staff:"Staf Keuangan",supervisor:"Supervisor",staff:"Staf",viewer:"Viewer"
};
export const ADMIN_ROLES:Role[]=["owner","principal","vice_principal"];
export const modules:FeatureModule[]=[
 {key:"overview",label:"Beranda",section:"Utama",description:"Ringkasan operasional sekolah.",features:["Ringkasan Operasional","Ruang Kerja"]},
 {key:"master",label:"Data Induk",section:"Utama",description:"Sumber data utama seluruh sistem.",features:["Siswa","Kelas","Guru","Tenaga Kependidikan","Mata Pelajaran","Penugasan Guru","Import Excel Keseluruhan"]},
 {key:"calendar",label:"Agenda Sekolah",section:"Utama",description:"Kalender sekolah dan agenda setiap pengguna.",features:["Kalender Sekolah","Rekap Agenda","Agenda Mengajar","Agenda Pribadi","Kehadiran Agenda"]},
 {key:"journals",label:"Jurnal & Pemantauan",section:"Utama",description:"Jurnal kegiatan harian, pengamatan siswa dan rekap bulanan sesuai akses.",features:["Jurnal Harian","Jurnal Siswa","Jurnal Mengajar","Rekap Bulanan","Review Jurnal","Arsip Jurnal"],roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","finance_staff","supervisor","staff"]},
 {key:"reports",label:"Pusat Laporan",section:"Utama",description:"Semua laporan resmi sekolah, template standar, ekspor dan arsip.",features:["Ringkasan Laporan","Akademik","Kehadiran","Disiplin","BK","Program & Tugas","Keuangan","Perpustakaan","Supervisi","Jurnal","Template Laporan Sekolah","Arsip Laporan"],roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","finance_staff","supervisor","staff"]},
 {key:"guru_ai",label:"Perangkat Ajar AI",section:"Pembelajaran",description:"Workspace perangkat pembelajaran berbasis proyek dan versi.",features:["Proyek Pembelajaran","Modul Ajar","RPP","LKPD","Asesmen Soal","Strategi Pembelajaran","Bahan Ajar","Rubrik Penilaian","Panduan Presentasi","Peta Konsep","Riwayat draf","Dokumen Pembelajaran"],roles:["owner","principal","vice_principal","teacher"]},
 {key:"assistant",label:"Asisten AI",section:"Asisten AI",description:"Bantuan mengajar, pengelolaan kelas, kepala sekolah dan Universal AI Orchestrator lintas modul.",features:["Asisten Guru","Asisten Kepala Sekolah","Asisten Kelas","Universal AI Orchestrator","Koneksi AI"],roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","finance_staff","supervisor","staff"]},
 {key:"buku_kerja",label:"Pembelajaran & Penilaian",section:"Pembelajaran",description:"Administrasi kelas, penilaian, agenda dan laporan guru.",features:["Mode Kerja Guru","Presensi Siswa","Lembar Nilai","Jurnal Mengajar","Jadwal Mingguan","Rekap Bulanan","Laporan Lengkap","Import/Export Excel"],roles:["owner","principal","vice_principal","teacher"]},
 {key:"disiplin",label:"Disiplin & Prestasi",section:"Kesiswaan",description:"Pelanggaran, prestasi, pembinaan, tindak lanjut, surat dan analitik.",features:["Pelanggaran","Prestasi","Pembinaan","Tindak Lanjut","Master Data","Rekap & Laporan","Analitik Disiplin","Arsip Siswa","Import Riwayat","Surat & Dokumen","Template Laporan"],roles:["owner","principal","vice_principal","teacher","counselor"]},
 {key:"bk",label:"Bimbingan Konseling",section:"Kesiswaan",description:"Administrasi BK lengkap dengan privasi konselor.",features:["Kasus & Asesmen","Pemetaan Kebutuhan","Konseling Individu","Konseling Kelompok","Layanan Klasikal","RPL Layanan","Program BK","Agenda BK","Tindak Lanjut","Kunjungan Rumah","Rujukan","Perencanaan Karier","Dokumen BK","Siswa 360°","Analitik BK","Laporan BK"],roles:["owner","principal","counselor"]},
 {key:"library",label:"Perpustakaan",section:"Layanan Sekolah",description:"Koleksi, inventaris, anggota, sirkulasi, kunjungan, pengadaan, perawatan, program literasi dan laporan.",features:["Dashboard Perpustakaan","Koleksi Buku","Eksemplar & Inventaris","Anggota Perpustakaan","Peminjaman","Pengembalian","Kunjungan","Pengadaan","Perawatan","Program & Literasi","Laporan & Statistik"],roles:["owner","principal","vice_principal","teacher","counselor","staff","hr","treasurer","finance_staff","supervisor"]},
 {key:"kepsek_ai",label:"Perencanaan & Supervisi",section:"Manajemen",description:"Perencanaan sekolah, dokumen, pustaka, kinerja kepala sekolah dan supervisi.",features:["PBD/EDS","KSP/KOSP","RKJM","RKT","RKAS","SOP","Kinerja Kepala Sekolah","Supervisi guru","Pusat dokumen","Workflow Dokumen","Sumber Dokumen","Pustaka Format","Persetujuan dokumen"],roles:["owner","principal","vice_principal"]},
 {key:"command",label:"Program & Tugas",section:"Manajemen",description:"Eksekusi program dari PIC sampai bukti terverifikasi dan laporan.",features:["Program Kerja","PIC","Tugas","Deadline","Progres","Kendala","Hasil Rapat","Tindak Lanjut Rapat","Bukti Kegiatan","Verifikasi Bukti","Laporan Program"]},
 {key:"attendance",label:"Presensi & Kehadiran",section:"SDM",description:"Satu pusat presensi kerja, riwayat, tim, jadwal, lokasi, koreksi, izin dan cuti.",features:["Presensi Saya","Riwayat Kehadiran","Kehadiran Tim","Jadwal & Shift","Lokasi Presensi","Koreksi Presensi","Izin & Cuti","Check-in/check-out","Jadwal/shift","Riwayat kehadiran","Koreksi beralasan","Izin","Cuti"],roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","finance_staff","supervisor","staff"]},
 {key:"performance",label:"Kinerja & Pengembangan",section:"SDM",description:"Bukti kinerja, pengembangan, evaluasi dan tanggapan guru.",features:["Bukti Kinerja & Pengembangan","Evaluasi","Tanggapan guru","Kehadiran","Partisipasi program","Pelatihan","Bukti capaian"]},
 {key:"gajian",label:"SDM, Payroll & Kompensasi",section:"SDM",description:"Pengajuan pegawai, tim, jadwal, lokasi presensi, payroll dan rekrutmen sekolah.",features:["Pengajuan SDM","Lembur","Kasbon","Reimburse","Tim SDM","Tim Saya","Kehadiran Tim","Approval Tim","Rekap Tim","Jadwal Kerja","Lokasi Presensi","Komponen Dinamis","Komponen Gaji","Proses Payroll","Rekrutmen"],roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","finance_staff","supervisor","staff"]},
 {key:"payslip",label:"Slip Gaji Saya",section:"SDM",description:"Riwayat slip gaji pribadi.",features:["Riwayat Slip"],roles:["owner","principal","vice_principal","teacher","counselor","hr","treasurer","finance_staff","supervisor","staff"]},
 {key:"sikas",label:"Keuangan, Anggaran & Tagihan",section:"Keuangan",description:"Kas, anggaran, tagihan, bukti transaksi, kuitansi dan laporan.",features:["Dashboard Keuangan","Kas/Rekening","Pemasukan","Pengeluaran","Bukti Transaksi","Anggaran","Realisasi Anggaran","Tagihan Siswa","Pembayaran","Riwayat Pembayaran","WhatsApp Tagihan","Buku Kas Umum","Laporan","Import/Export","Tim Keuangan"],roles:["owner","principal","treasurer","finance_staff"]},
 {key:"access",label:"Akses & Peran",section:"Sistem",description:"Anggota, undangan dan hak akses.",features:["Tambah Pengguna","Anggota Tim","Struktur Peran & Hak Akses"],roles:["owner","principal"]},
 {key:"settings",label:"Pengaturan Sekolah",section:"Sistem",description:"Identitas sekolah, memori dan langganan.",features:["Profil sekolah","Lokasi Sekolah","Akademik","Branding","Memori sekolah","Langganan","Riwayat pembayaran"],roles:["owner","principal"]},
 {key:"help",label:"Panduan Penggunaan",section:"Sistem",description:"Panduan kerja langkah demi langkah berdasarkan modul aplikasi asal.",features:["Mulai dari Sini","Data Induk","Agenda & Absensi","Presensi Guru & Staf","Perangkat Ajar AI","Asisten AI","Jurnal & Penilaian","Disiplin & Prestasi","Bimbingan Konseling","Perpustakaan","Perencanaan & Supervisi","Program & Tugas","Keuangan","SDM & Payroll","Kinerja & Pengembangan","Laporan & Arsip","Akses & Pengaturan"]}
];
export const isAdmin=(role:Role)=>ADMIN_ROLES.includes(role);
export const canAccess=(m:FeatureModule,role:Role)=>!m.roles||m.roles.includes(role);

const teachingRoles:Role[]=["owner","principal","vice_principal","teacher"];
const managerRoles:Role[]=["owner","principal","vice_principal","hr"];
const payrollRoles:Role[]=["owner","hr"];
export function visibleFeatures(m:FeatureModule,role:Role):string[]{
 if(!canAccess(m,role))return [];
 return m.features.filter(f=>{
  if(m.key==="journals"){if(f==="Review Jurnal")return isAdmin(role);if(f==="Jurnal Siswa")return [...teachingRoles,"counselor"].includes(role);if(f==="Jurnal Mengajar")return teachingRoles.includes(role);}
  if(m.key==="bk"&&role!=="counselor")return ["Analitik BK","Laporan BK"].includes(f);
  if(m.key==="assistant"){
   if(["Asisten Guru","Asisten Kelas"].includes(f))return teachingRoles.includes(role);
   if(f==="Asisten Kepala Sekolah")return ADMIN_ROLES.includes(role);
   if(f==="Koneksi AI")return teachingRoles.includes(role);
  }
  if(m.key==="calendar"&&f==="Agenda Mengajar")return teachingRoles.includes(role);
  if(m.key==="calendar"&&["Agenda Pribadi","Kehadiran Agenda"].includes(f))return role!=="viewer";
  if(m.key==="attendance"&&["Koreksi beralasan","Koreksi Presensi","Lokasi Presensi"].includes(f))return managerRoles.includes(role);
  if(m.key==="attendance"&&f==="Kehadiran Tim")return [...managerRoles,"supervisor"].includes(role);
  if(m.key==="gajian"){
   if(["Komponen Gaji","Komponen Dinamis","Proses Payroll"].includes(f))return payrollRoles.includes(role);
   if(["Jadwal Kerja","Lokasi Presensi","Rekrutmen"].includes(f))return managerRoles.includes(role);
   if(f==="Tim SDM")return payrollRoles.includes(role);
   if(["Tim Saya","Kehadiran Tim","Approval Tim","Rekap Tim"].includes(f))return [...managerRoles,"supervisor"].includes(role);
  }
  return true;
 });
}


const NAV_HIDDEN:Partial<Record<ModuleKey,Set<string>>>={
 journals:new Set(["Jurnal Mengajar"]),
 reports:new Set(["Akademik","Kehadiran","Disiplin","BK","Program & Tugas","Keuangan","Perpustakaan","Supervisi","Jurnal"]),
 performance:new Set(["Kehadiran","Partisipasi program","Pelatihan","Bukti capaian"]),
 gajian:new Set(["Lembur","Kasbon","Reimburse","Kehadiran Tim","Jadwal Kerja","Lokasi Presensi"]),
 command:new Set(["PIC","Deadline","Progres","Kendala"]),
 attendance:new Set(["Check-in/check-out","Jadwal/shift","Riwayat kehadiran","Koreksi beralasan","Izin","Cuti"])
};
/** Sidebar/menu representation only. Hidden legacy routes remain resolvable so saved links and workflows do not lose functionality. */
export function navigationFeatures(m:FeatureModule,role:Role):string[]{
 const hidden=NAV_HIDDEN[m.key];
 return visibleFeatures(m,role).filter(f=>!hidden?.has(f));
}
