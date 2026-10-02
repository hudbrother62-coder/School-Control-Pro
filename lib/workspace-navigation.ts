import {modules,canAccess,visibleFeatures,type ModuleKey,type Role} from "./modules";
export type WorkspaceRoute={module:ModuleKey;feature:string};
const aliases:Record<string,WorkspaceRoute>={
 "guru_ai::Ngobrol AI":{module:"assistant",feature:"Asisten Guru"},
 "guru_ai::Koneksi AI":{module:"assistant",feature:"Koneksi AI"},
 "kepsek_ai::Asisten Kepsek":{module:"assistant",feature:"Asisten Kepala Sekolah"},
 "buku_kerja::Asisten Kelas":{module:"assistant",feature:"Asisten Kelas"},
 "kepsek_ai::Arsip Laporan":{module:"reports",feature:"Arsip Laporan"},
 "command::Agenda":{module:"calendar",feature:"Kalender Sekolah"},
 "buku_kerja::Agenda Mengajar":{module:"calendar",feature:"Agenda Mengajar"},
 "buku_kerja::Laporan Kelas":{module:"buku_kerja",feature:"Rekap Bulanan"},
 "sikas::Kuitansi":{module:"sikas",feature:"Riwayat Pembayaran"},
 ...Object.fromEntries(["Draft Payroll","Review","Approval","Kunci Periode","Rekap Payroll"].map(feature=>["gajian::"+feature,{module:"gajian" as ModuleKey,feature:"Proses Payroll"}])),
 ...Object.fromEntries(["Tunjangan","Potongan"].map(feature=>["gajian::"+feature,{module:"gajian" as ModuleKey,feature:"Komponen Gaji"}])),
 "payslip::Cetak Slip":{module:"payslip",feature:"Riwayat Slip"},
 "access::Struktur Peran":{module:"access",feature:"Struktur Peran & Hak Akses"},
 "access::Hak Akses Fitur":{module:"access",feature:"Struktur Peran & Hak Akses"},
 "settings::Undang anggota":{module:"access",feature:"Tambah Pengguna"},
 "settings::Identitas & Kontak":{module:"settings",feature:"Profil sekolah"},
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
export function guideFor(module:ModuleKey){return ({overview:"Mulai dari Sini",master:"Data Induk",calendar:"Agenda & Absensi",reports:"Laporan & Arsip",attendance:"Presensi Guru & Staf",performance:"Kinerja & Pengembangan",guru_ai:"Perangkat Ajar AI",assistant:"Asisten AI",buku_kerja:"Jurnal & Penilaian",disiplin:"Disiplin & Prestasi",bk:"Bimbingan Konseling",kepsek_ai:"Perencanaan & Supervisi",command:"Program & Tugas",sikas:"Keuangan",gajian:"SDM & Payroll",payslip:"SDM & Payroll",access:"Akses & Pengaturan",settings:"Akses & Pengaturan",help:"Mulai dari Sini"})[module]}
