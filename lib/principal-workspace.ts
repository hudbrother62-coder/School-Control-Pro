export type PrincipalFeature={feature:string;description:string};
export type PrincipalGroup={name:string;description:string;items:readonly PrincipalFeature[]};
/** Empat pintu kerja. Rute detail lama tetap tersimpan dalam katalog modul. */
export const principalGroups:readonly PrincipalGroup[]=[
{name:"Rencana & Anggaran",description:"Evaluasi mutu, kurikulum, rencana kerja, anggaran, dan SOP sekolah.",items:[
{feature:"PBD/EDS",description:"Analisis data mutu dan evaluasi diri sekolah untuk menentukan prioritas."},
{feature:"KSP/KOSP",description:"Susun kurikulum operasional sesuai karakteristik sekolah."},
{feature:"RKJM",description:"Rencanakan sasaran dan program sekolah untuk empat tahun."},
{feature:"RKT",description:"Tetapkan kegiatan, indikator, dan target tahunan."},
{feature:"RKAS",description:"Rencanakan anggaran dan pembiayaan kegiatan sekolah."},
{feature:"SOP",description:"Susun prosedur baku untuk layanan dan kegiatan sekolah."}]},
{name:"Supervisi & Kinerja",description:"Evaluasi kinerja kepala sekolah, supervisi guru, dan tindak lanjut.",items:[
{feature:"Supervisi guru",description:"Jadwalkan observasi, isi instrumen, dan catat tindak lanjut guru."},
{feature:"Kinerja Kepala Sekolah",description:"Kelola bukti kerja dan evaluasi capaian kepala sekolah."}]},
{name:"Dokumen & Referensi",description:"Kelola dokumen, bahan rujukan, dan contoh format resmi.",items:[
{feature:"Pusat dokumen",description:"Simpan, sunting, dan pantau dokumen kerja sekolah."},
{feature:"Sumber Dokumen",description:"Sediakan data pendukung, referensi, dan dokumen sumber."},
{feature:"Pustaka Format",description:"Temukan contoh struktur serta format dokumen sekolah."}]},
{name:"Alur & Persetujuan",description:"Pantau proses review dan keputusan persetujuan dokumen.",items:[
{feature:"Workflow Dokumen",description:"Pantau tahapan draf, peninjauan, dan penyelesaian dokumen."},
{feature:"Persetujuan dokumen",description:"Periksa dokumen yang diajukan lalu putuskan persetujuannya."}]}
];
export function principalGroupForFeature(feature:string):PrincipalGroup|undefined{
return principalGroups.find(g=>g.name===feature||g.items.some(i=>i.feature===feature));
}
export function principalSearchText(feature:string):string{
const g=principalGroupForFeature(feature);return g?[g.name,g.description,...g.items.flatMap(i=>[i.feature,i.description])].join(" "):feature;
}
