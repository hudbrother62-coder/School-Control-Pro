export const aiTemplates={
 guru_ai:[
  {key:"modul_ajar",label:"Modul Ajar",prompt:"Susun draf modul ajar lengkap: identitas, capaian dan tujuan pembelajaran, profil kebutuhan murid, alokasi waktu, materi, langkah pembukaan-inti-penutup, asesmen diagnostik/formatif/sumatif, diferensiasi, remedial, pengayaan, refleksi, dan daftar sumber yang harus diverifikasi. Sertakan kolom konteks yang belum diberikan."},
  {key:"lkpd",label:"LKPD",prompt:"Susun LKPD yang siap ditinjau: tujuan, instruksi siswa, tugas bertahap, ruang jawaban, rubrik asesmen, diferensiasi, dan tindak lanjut. Jangan mengarang identitas kelas atau referensi."},
  {key:"soal",label:"Soal & Kunci",prompt:"Susun kisi-kisi, soal bervariasi, kunci, rubrik dan analisis ketercapaian yang selaras tujuan pembelajaran, tanpa klaim bahwa soal pasti sesuai standar resmi terbaru."},
  {key:"rpp",label:"Rencana Pembelajaran",prompt:"Susun rencana pembelajaran dengan tujuan terukur, strategi, alur aktivitas, alat/media, asesmen, refleksi, dan tindak lanjut."},
  {key:"materi",label:"Bahan Ajar",prompt:"Susun materi ajar yang akurat, mudah dipahami, contoh bertahap, latihan, ilustrasi tekstual, dan daftar rujukan yang perlu diverifikasi."}
 ],
 kepsek_ai:[
  {key:"PBD",label:"PBD / EDS",prompt:"Susun kerangka perencanaan berbasis data: data masukan yang dibutuhkan, identifikasi masalah, analisis akar masalah, prioritas, program peningkatan, indikator, PIC, waktu dan bukti. Jangan mengarang data Rapor Pendidikan."},
  {key:"KSP",label:"KSP / KOSP",prompt:"Susun draf KSP/KOSP dengan karakteristik satuan pendidikan, visi-misi, pengorganisasian pembelajaran, perencanaan, pendampingan, evaluasi, kalender, lampiran. Tandai data dan ketentuan yang perlu verifikasi sekolah."},
  {key:"RKJM",label:"RKJM",prompt:"Susun RKJM dengan tujuan, sasaran, strategi per tahun, indikator keberhasilan, penanggung jawab, risiko, sumber daya dan evaluasi. Bedakan asumsi dari data nyata sekolah."},
  {key:"RKT",label:"RKT",prompt:"Susun rencana kerja tahunan: prioritas PBD, program, kegiatan, PIC, waktu, target, indikator, bukti dan evaluasi. Jangan membuat angka anggaran tanpa data."},
  {key:"RKAS",label:"Pendamping RKAS",prompt:"Susun rancangan RKAS sebagai draf kerja berdasarkan kegiatan, kebutuhan, estimasi dan justifikasi, dengan daftar verifikasi terhadap aturan BOSP dan sistem resmi yang berlaku. Tidak mengklaim input otomatis ke ARKAS."},
  {key:"SOP",label:"SOP Sekolah",prompt:"Susun SOP operasional lengkap: tujuan, ruang lingkup, dasar kebijakan yang perlu diverifikasi, pihak terkait, tahapan, SLA, kontrol mutu, bukti dan revisi."},
  {key:"SUPERVISION",label:"Supervisi Guru",prompt:"Susun rencana supervisi akademik, instrumen observasi, tindak lanjut, jadwal, ruang umpan balik, dan pengembangan guru; hindari keputusan kompetensi otomatis."}
 ]
} as const;
export type AiModule=keyof typeof aiTemplates;
