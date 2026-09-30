export const aiTemplates={
 guru_ai:[
  {key:"modul_ajar",label:"Modul Ajar",prompt:"Susun modul ajar lengkap berdasarkan konteks proyek: identitas, tujuan, kebutuhan murid, alokasi waktu, materi, langkah pembelajaran, asesmen, diferensiasi, remedial, pengayaan, refleksi dan sumber yang perlu diverifikasi."},
  {key:"rpp",label:"RPP",prompt:"Susun rencana pembelajaran ringkas dan operasional dengan tujuan terukur, alur aktivitas, media, asesmen, refleksi dan tindak lanjut."},
  {key:"lkpd",label:"LKPD",prompt:"Susun LKPD siap pakai: tujuan, instruksi siswa, aktivitas bertahap, ruang jawaban, asesmen, diferensiasi dan tindak lanjut."},
  {key:"asesmen",label:"Asesmen Soal",prompt:"Susun kisi-kisi, soal bervariasi, kunci, indikator, rubrik dan analisis ketercapaian yang selaras dengan tujuan pembelajaran."},
  {key:"strategi",label:"Strategi Pembelajaran",prompt:"Berikan beberapa strategi pembelajaran yang sesuai konteks kelas, jelaskan kapan dipakai, langkah pelaksanaan, risiko, adaptasi dan indikator keberhasilan."},
  {key:"materi",label:"Bahan Ajar",prompt:"Susun bahan ajar yang runtut, akurat, mudah dipahami, berisi contoh bertahap, latihan dan sumber yang perlu diverifikasi."},
  {key:"rubrik",label:"Rubrik Penilaian",prompt:"Susun rubrik penilaian dengan kriteria, level performa, deskriptor objektif, bobot bila diperlukan, dan panduan penggunaan."},
  {key:"presentasi",label:"Panduan Presentasi",prompt:"Susun alur presentasi pembelajaran, struktur slide, poin narasi, aktivitas interaktif dan tips penyampaian."},
  {key:"peta_konsep",label:"Peta Konsep",prompt:"Susun peta konsep tekstual yang memperlihatkan hubungan konsep utama, prasyarat, contoh, miskonsepsi dan urutan belajar."},
  {key:"chat",label:"Ngobrol AI",prompt:"Bertindak sebagai partner berpikir guru. Bahas masalah kelas, alternatif keputusan, kritik rencana, risiko dan langkah praktis tanpa mengarang fakta sekolah."}
 ],
 kepsek_ai:[
  {key:"PBD",label:"PBD / EDS",prompt:"Susun kerangka perencanaan berbasis data: data masukan, masalah, akar masalah, prioritas, program, indikator, PIC, waktu dan bukti. Jangan mengarang data Rapor Pendidikan."},
  {key:"KSP",label:"KSP / KOSP",prompt:"Susun draf KSP/KOSP dengan karakteristik satuan pendidikan, visi-misi, pengorganisasian pembelajaran, perencanaan, pendampingan, evaluasi, kalender dan lampiran."},
  {key:"RKJM",label:"RKJM",prompt:"Susun RKJM dengan tujuan, sasaran, strategi per tahun, indikator keberhasilan, penanggung jawab, risiko, sumber daya dan evaluasi."},
  {key:"RKT",label:"RKT",prompt:"Susun rencana kerja tahunan: prioritas, program, kegiatan, PIC, waktu, target, indikator, bukti dan evaluasi."},
  {key:"RKAS",label:"Pendamping RKAS",prompt:"Susun rancangan RKAS sebagai draf kerja berdasarkan kegiatan, kebutuhan, estimasi dan justifikasi, dengan daftar hal yang wajib diverifikasi terhadap aturan BOSP dan sistem resmi."},
  {key:"SOP",label:"SOP Sekolah",prompt:"Susun SOP lengkap: tujuan, ruang lingkup, dasar kebijakan yang perlu diverifikasi, pihak terkait, tahapan, SLA, kontrol mutu, bukti dan revisi."},
  {key:"SUPERVISION",label:"Supervisi Guru",prompt:"Susun rencana supervisi akademik, instrumen observasi, tindak lanjut, jadwal, ruang umpan balik dan pengembangan guru."}
 ]
} as const;
export type AiModule=keyof typeof aiTemplates;
