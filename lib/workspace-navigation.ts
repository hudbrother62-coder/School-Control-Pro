import {modules,canAccess,visibleFeatures,type ModuleKey,type Role} from "./modules";
export type WorkspaceRoute={module:ModuleKey;feature:string};
const aliases:Record<string,WorkspaceRoute>={
 "overview::Analitik Sekolah":{module:"overview",feature:"Ringkasan Operasional"},
 "overview::Agenda & Deadline":{module:"calendar",feature:"Kalender Sekolah"},
 "attendance::Check-in/check-out":{module:"attendance",feature:"Presensi Saya"},
 "attendance::Riwayat kehadiran":{module:"attendance",feature:"Riwayat Kehadiran"},
 "attendance::Jadwal/shift":{module:"attendance",feature:"Jadwal & Shift"},
 "attendance::Koreksi beralasan":{module:"attendance",feature:"Koreksi Presensi"},
 "attendance::Izin":{module:"attendance",feature:"Izin & Cuti"},
 "attendance::Cuti":{module:"attendance",feature:"Izin & Cuti"},
 "performance::Kehadiran":{module:"attendance",feature:"Riwayat Kehadiran"},
 "performance::Partisipasi program":{module:"performance",feature:"Bukti Kinerja & Pengembangan"},
 "performance::Pelatihan":{module:"performance",feature:"Bukti Kinerja & Pengembangan"},
 "performance::Bukti capaian":{module:"performance",feature:"Bukti Kinerja & Pengembangan"},
 "gajian::Jadwal Kerja":{module:"attendance",feature:"Jadwal & Shift"},
 "gajian::Lokasi Presensi":{module:"attendance",feature:"Lokasi Presensi"},
 "gajian::Kehadiran Tim":{module:"attendance",feature:"Kehadiran Tim"},
 "reports::SDM & Payroll":{module:"reports",feature:"Ringkasan Laporan"},
 "calendar::Agenda Pengguna":{module:"calendar",feature:"Rekap Agenda"},
 "journals::Jurnal Mengajar":{module:"buku_kerja",feature:"Jurnal Mengajar"},
 "guru_ai::Ngobrol AI":{module:"assistant",feature:"Asisten Guru"},
 "kepsek_ai::Asisten Kepsek":{module:"assistant",feature:"Asisten Kepala Sekolah"},
 "assistant::Rencana Pekerjaan":{module:"assistant",feature:"Universal AI Orchestrator"},
 "buku_kerja::Asisten Kelas":{module:"assistant",feature:"Asisten Kelas"},
 "kepsek_ai::Arsip Laporan":{module:"reports",feature:"Arsip Laporan"},
 "command::Agenda":{module:"calendar",feature:"Kalender Sekolah"},
 "buku_kerja::Agenda Mengajar":{module:"calendar",feature:"Agenda Mengajar"},
 "buku_kerja::Laporan Kelas":{module:"buku_kerja",feature:"Rekap Bulanan"},
 "sikas::Kuitansi":{module:"sikas",feature:"Pembayaran"},
 "sikas::Bukti Transaksi":{module:"sikas",feature:"Pemasukan"},
 "sikas::Riwayat Pembayaran":{module:"sikas",feature:"Pembayaran"},
 "sikas::Realisasi Anggaran":{module:"sikas",feature:"Laporan Keuangan"},
 "sikas::Buku Kas Umum":{module:"sikas",feature:"Laporan Keuangan"},
 "sikas::Laporan":{module:"sikas",feature:"Laporan Keuangan"},
 "reports::Keuangan":{module:"sikas",feature:"Laporan Keuangan"},
 ...Object.fromEntries(["Draft Payroll","Review","Approval","Kunci Periode","Rekap Payroll"].map(feature=>["gajian::"+feature,{module:"gajian" as ModuleKey,feature:"Proses Payroll"}])),
 ...Object.fromEntries(["Tunjangan","Potongan"].map(feature=>["gajian::"+feature,{module:"gajian" as ModuleKey,feature:"Komponen Gaji"}])),
 "payslip::Riwayat Slip":{module:"gajian",feature:"Slip Gaji Saya"},
 "payslip::Cetak Slip":{module:"gajian",feature:"Slip Gaji Saya"},
 "access::Struktur Peran":{module:"access",feature:"Struktur Peran & Hak Akses"},
 "access::Hak Akses Fitur":{module:"access",feature:"Struktur Peran & Hak Akses"},
 "settings::Undang anggota":{module:"access",feature:"Tambah Pengguna"},
 "settings::Identitas & Kontak":{module:"settings",feature:"Profil sekolah"},
 "settings::Riwayat pembayaran":{module:"settings",feature:"Langganan"},
 "settings::Riwayat Langganan":{module:"settings",feature:"Langganan"},
};
export function resolveWorkspaceRoute(module:string,feature:string,role:Role):WorkspaceRoute|null{
 const target=aliases[module+"::"+feature]||{module:module as ModuleKey,feature};
 const item=modules.find(m=>m.key===target.module);
 if(!item||!canAccess(item,role))return null;
 const features=visibleFeatures(item,role);
 if(!features.length)return null;
 if(!target.feature)return {module:item.key,feature:features[0]};
 if(!features.includes(target.feature))return null;
 return {module:item.key,feature:target.feature};
}
export function routeHash(route:WorkspaceRoute){return "#"+new URLSearchParams({menu:route.module,fitur:route.feature}).toString()}
export function readRouteHash(hash:string,role:Role){const params=new URLSearchParams(hash.replace(/^#/,""));return resolveWorkspaceRoute(params.get("menu")||"overview",params.get("fitur")||"",role)}
export function guideFor(module:ModuleKey){return ({journals:"Jurnal & Penilaian",notes:"Mulai dari Sini",overview:"Mulai dari Sini",master:"Data Induk",calendar:"Agenda & Absensi",reports:"Laporan & Arsip",attendance:"Presensi Guru & Staf",performance:"Kinerja & Pengembangan",guru_ai:"Perangkat Ajar AI",assistant:"Asisten AI",buku_kerja:"Jurnal & Penilaian",disiplin:"Disiplin & Prestasi",bk:"Bimbingan Konseling",library:"Perpustakaan",sarpras:"Sarana & Prasarana",kepsek_ai:"Perencanaan & Supervisi",command:"Program & Tugas",sikas:"Keuangan",gajian:"SDM & Payroll",payslip:"SDM & Payroll",access:"Akses & Pengaturan",settings:"Akses & Pengaturan",help:"Mulai dari Sini"})[module]}
