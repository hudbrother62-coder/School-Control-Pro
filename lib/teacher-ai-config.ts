export const subjectDefaults:Record<string,string[]>={
 "SD 1":["Bahasa Indonesia","Matematika","Pendidikan Pancasila","IPAS","Seni dan Budaya","PJOK","Bahasa Inggris"],
 "SD 2":["Bahasa Indonesia","Matematika","Pendidikan Pancasila","IPAS","Seni dan Budaya","PJOK","Bahasa Inggris"],
 "SD 3":["Bahasa Indonesia","Matematika","Pendidikan Pancasila","IPAS","Seni dan Budaya","PJOK","Bahasa Inggris"],
 "SD 4":["Bahasa Indonesia","Matematika","Pendidikan Pancasila","IPAS","Seni dan Budaya","PJOK","Bahasa Inggris"],
 "SD 5":["Bahasa Indonesia","Matematika","Pendidikan Pancasila","IPAS","Seni dan Budaya","PJOK","Bahasa Inggris"],
 "SD 6":["Bahasa Indonesia","Matematika","Pendidikan Pancasila","IPAS","Seni dan Budaya","PJOK","Bahasa Inggris"],
 "SMP 7":["Bahasa Indonesia","Matematika","IPA","IPS","Bahasa Inggris","Pendidikan Pancasila","Informatika","Seni Budaya","PJOK"],
 "SMP 8":["Bahasa Indonesia","Matematika","IPA","IPS","Bahasa Inggris","Pendidikan Pancasila","Informatika","Seni Budaya","PJOK"],
 "SMP 9":["Bahasa Indonesia","Matematika","IPA","IPS","Bahasa Inggris","Pendidikan Pancasila","Informatika","Seni Budaya","PJOK"],
 "SMA 10":["Bahasa Indonesia","Matematika","Bahasa Inggris","Fisika","Kimia","Biologi","Ekonomi","Geografi","Sosiologi","Sejarah","Informatika","Pendidikan Pancasila"],
 "SMA 11":["Bahasa Indonesia","Matematika","Bahasa Inggris","Fisika","Kimia","Biologi","Ekonomi","Geografi","Sosiologi","Sejarah","Informatika","Pendidikan Pancasila"],
 "SMA 12":["Bahasa Indonesia","Matematika","Bahasa Inggris","Fisika","Kimia","Biologi","Ekonomi","Geografi","Sosiologi","Sejarah","Informatika","Pendidikan Pancasila"],
 "SMK 10":["Bahasa Indonesia","Matematika","Bahasa Inggris","Pendidikan Pancasila","Informatika","Dasar-dasar Program Keahlian","Projek Kreatif dan Kewirausahaan","Pendidikan Agama","PJOK"],
 "SMK 11":["Bahasa Indonesia","Matematika","Bahasa Inggris","Pendidikan Pancasila","Informatika","Konsentrasi Keahlian","Projek Kreatif dan Kewirausahaan","Pendidikan Agama","PJOK"],
 "SMK 12":["Bahasa Indonesia","Matematika","Bahasa Inggris","Pendidikan Pancasila","Informatika","Konsentrasi Keahlian","Projek Kreatif dan Kewirausahaan","Pendidikan Agama","PJOK"]
};

export type ToolField={key:string;label:string;type?:"text"|"textarea"|"number"|"select";options?:string[];placeholder?:string};

export const teacherToolConfig:Record<string,{fields:ToolField[];standard:string[];instruction:string}>={
 modul_ajar:{
  fields:[
   {key:"allocation",label:"Alokasi waktu & struktur pertemuan",type:"textarea",placeholder:"Contoh: 3 pertemuan, masing-masing 2 × 45 menit"},
   {key:"cp",label:"CP / kompetensi yang sudah diketahui",type:"textarea",placeholder:"Jika belum tahu, tulis bantu tentukan"},
   {key:"differentiation",label:"Kebutuhan diferensiasi",type:"textarea",placeholder:"Kesiapan, proses, produk, dukungan khusus…"},
   {key:"school_context",label:"Konteks sekolah",type:"textarea",placeholder:"Fasilitas, lingkungan, karakter lokal, keterbatasan…"}
  ],
  standard:["Informasi umum & kompetensi awal","Tujuan pembelajaran terukur","Pemahaman bermakna & pertanyaan pemantik","Langkah pendahuluan–inti sesuai sintaks–penutup","Asesmen diagnostik, formatif, dan sumatif","Diferensiasi, remedial, pengayaan, refleksi & tindak lanjut"],
  instruction:"Susun Modul Ajar lengkap: informasi umum, kompetensi awal, profil/karakter murid, sarana prasarana, model, tujuan terukur, pemahaman bermakna, pertanyaan pemantik, langkah pendahuluan–inti sesuai sintaks–penutup, asesmen diagnostik-formatif-sumatif, refleksi, diferensiasi, remedial/pengayaan dan tindak lanjut."
 },
 rpp:{
  fields:[
   {key:"rpp_format",label:"Format RPP",type:"select",options:["Ringkas 1 halaman","Lengkap operasional","AI pilih sesuai kebutuhan"]},
   {key:"objective_focus",label:"Fokus tujuan pembelajaran",type:"textarea",placeholder:"Kompetensi/kemampuan yang ingin dicapai"},
   {key:"learning_evidence",label:"Bukti belajar yang diharapkan",type:"textarea"},
   {key:"class_condition",label:"Kondisi kelas yang perlu dipertimbangkan",type:"textarea"}
  ],
  standard:["Identitas dan konteks pembelajaran","Tujuan terukur","Materi/media/sumber","Langkah pendahuluan–inti–penutup","Asesmen selaras tujuan","Diferensiasi dan tindak lanjut","Refleksi guru"],
  instruction:"Susun RPP operasional yang ringkas tetapi lengkap: identitas, tujuan terukur, materi/media/sumber, langkah pembelajaran, asesmen, diferensiasi, tindak lanjut dan refleksi."
 },
 lkpd:{
  fields:[
   {key:"activity_type",label:"Jenis aktivitas utama",type:"select",options:["Eksperimen / praktik","Pemecahan masalah","Observasi","Proyek mini","Diskusi","Campuran"]},
   {key:"work_pattern",label:"Pola kerja siswa",type:"select",options:["Individu","Pasangan","Kelompok kecil","Campuran"]},
   {key:"tools",label:"Alat & bahan",type:"textarea"},
   {key:"product",label:"Produk / bukti belajar",type:"textarea"}
  ],
  standard:["Judul & tujuan","Petunjuk siswa","Materi singkat","Alat/bahan","Langkah kerja bertahap","Ruang jawaban & pertanyaan analisis","Kesimpulan, refleksi & kriteria keberhasilan"],
  instruction:"Susun LKPD siap pakai dengan judul, tujuan, petunjuk, materi singkat, alat/bahan, langkah kerja, ruang jawaban, pertanyaan analisis, kesimpulan, refleksi dan kriteria keberhasilan."
 },
 asesmen:{
  fields:[
   {key:"question_count",label:"Jumlah soal",type:"number",placeholder:"10"},
   {key:"format",label:"Format soal",type:"select",options:["Pilihan ganda","Isian","Uraian","Campuran","Benar-salah"]},
   {key:"cognitive",label:"Sebaran kognitif",type:"textarea",placeholder:"Contoh: 30% memahami, 50% menerapkan, 20% menalar"},
   {key:"answer_mode",label:"Kunci & pembahasan",type:"select",options:["Kunci saja","Kunci + pembahasan singkat","Kunci + pembahasan mendalam"]}
  ],
  standard:["Indikator / kisi-kisi ringkas","Soal bervariasi dan tidak ambigu","Kunci jawaban","Pembahasan sesuai pilihan","Pemetaan tingkat kognitif","Keterkaitan dengan tujuan pembelajaran"],
  instruction:"Susun asesmen dengan indikator/kisi-kisi ringkas, soal bervariasi, kunci, pembahasan sesuai permintaan dan pemetaan kognitif. Hindari soal ambigu."
 },
 strategi:{
  fields:[
   {key:"problem",label:"Masalah belajar yang sedang terjadi",type:"textarea"},
   {key:"class_dynamics",label:"Jumlah siswa & dinamika kelas",type:"textarea"},
   {key:"media",label:"Media yang tersedia",type:"textarea"},
   {key:"constraints",label:"Batasan",type:"textarea"}
  ],
  standard:["Analisis masalah","Beberapa opsi strategi","Perbandingan kelebihan/kekurangan","Risiko, waktu & sumber daya","Rekomendasi yang paling sesuai","Langkah pelaksanaan konkret"],
  instruction:"Analisis masalah pembelajaran, berikan beberapa opsi strategi, bandingkan kelebihan/kekurangan, risiko, waktu/sumber daya, pilih rekomendasi dan berikan langkah konkret."
 },
 materi:{
  fields:[
   {key:"material_form",label:"Bentuk bahan ajar",type:"select",options:["Ringkasan belajar","Handout","Materi mendalam","Modul siswa","Bahan bacaan interaktif"]},
   {key:"visual_need",label:"Kebutuhan visual",type:"select",options:["Minimal","Sedang","Banyak contoh / diagram"]},
   {key:"misconception",label:"Miskonsepsi yang perlu dicegah",type:"textarea"},
   {key:"context_examples",label:"Contoh kontekstual yang diinginkan",type:"textarea"}
  ],
  standard:["Tujuan","Konsep inti","Penjelasan bertahap","Contoh kontekstual","Miskonsepsi umum","Latihan singkat","Rangkuman & refleksi"],
  instruction:"Susun bahan ajar sesuai usia: tujuan, konsep inti, penjelasan bertahap, contoh kontekstual, miskonsepsi umum, latihan singkat, rangkuman dan refleksi."
 },
 rubrik:{
  fields:[
   {key:"product",label:"Tugas / produk yang dinilai",type:"textarea"},
   {key:"aspects",label:"Aspek penilaian",type:"textarea"},
   {key:"weights",label:"Bobot",type:"textarea",placeholder:"Contoh: isi 40%, proses 30%, presentasi 30%"},
   {key:"scale",label:"Skala",type:"select",options:["4 level (4–1)","5 level","100 poin","AI pilih"]}
  ],
  standard:["Aspek penilaian","Indikator yang dapat diamati","Deskriptor tiap level","Bobot","Cara perhitungan","Interpretasi hasil"],
  instruction:"Susun rubrik dengan indikator observable, deskriptor level yang tidak tumpang tindih, bobot, cara menghitung dan interpretasi. Untuk 4 level gunakan 4 Sangat Baik, 3 Baik, 2 Cukup, 1 Perlu Bimbingan."
 },
 presentasi:{
  fields:[
   {key:"duration",label:"Durasi presentasi",type:"text",placeholder:"Contoh: 25 menit"},
   {key:"slides",label:"Jumlah slide",type:"number",placeholder:"12"},
   {key:"style",label:"Gaya",type:"select",options:["Interaktif","Visual & ringkas","Formal","Storytelling","Praktik / demo"]},
   {key:"interaction",label:"Interaksi siswa",type:"textarea"}
  ],
  standard:["Tujuan presentasi","Urutan slide","Isi inti tiap slide","Narasi pembicara","Pertanyaan interaksi","Transisi","Manajemen waktu & tips engagement"],
  instruction:"Susun panduan presentasi: tujuan, urutan slide, isi inti per slide, narasi pembicara, pertanyaan interaksi, transisi, manajemen waktu dan tips engagement."
 },
 peta_konsep:{
  fields:[
   {key:"scope",label:"Cakupan konsep",type:"textarea"},
   {key:"prerequisite",label:"Prasyarat",type:"textarea"},
   {key:"sequence",label:"Urutan belajar",type:"select",options:["Dari konkret ke abstrak","Dari sederhana ke kompleks","Masalah → konsep → aplikasi","AI tentukan"]},
   {key:"map_format",label:"Format peta",type:"select",options:["Hierarki","Alur sebab-akibat","Hubungan konsep","Timeline pembelajaran"]}
  ],
  standard:["Konsep & subkonsep","Hubungan antarkonsep","Prasyarat","Urutan sederhana → kompleks","Kontribusi setiap pertemuan","Diagram Mermaid bila memang membantu"],
  instruction:"Susun peta konsep yang memperlihatkan konsep/subkonsep, relasi, prasyarat, urutan belajar dan kontribusi setiap pertemuan. Gunakan Mermaid hanya jika menambah nilai."
 }
};

export const teacherSystemStandard="Anda adalah Asisten Guru Profesional Indonesia di School Control. Hubungkan CP, TP, ATP, Modul Ajar, aktivitas belajar dan asesmen secara konsisten. Jangan menghasilkan dokumen generik. Gunakan bahasa profesional yang tetap mudah dipakai guru. Tujuan harus terukur dengan kata kerja operasional. Aktivitas siswa harus detail dan selaras dengan model pembelajaran. Sertakan asesmen diagnostik, formatif, dan sumatif bila relevan. Gunakan diferensiasi berdasarkan kesiapan, proses, produk, atau dukungan. Sesuaikan jenjang, kelas/fase, mata pelajaran, konteks sekolah, karakter siswa dan sumber daya. Bila memakai PBL, PjBL, Discovery, Inquiry, atau Cooperative, gunakan sintaks model yang benar. Jangan mengarang CP/TP resmi; tandai bagian yang perlu diverifikasi guru. Jika materi membutuhkan persamaan, tulis LaTeX MathJax dengan \\\\( ... \\\\) atau \\\\[ ... \\\\]. Jika diagram alur/peta konsep/timeline benar-benar membantu, gunakan blok Mermaid yang sederhana dan valid. Output harus detail, terstruktur, kontekstual dan siap digunakan guru, bukan teori umum.";

// Additional subject-aware quality guidance for every SekolaPro teacher generator.
export const teacherQualityGuidance=[
  "Prioritaskan kebenaran konsep dan keselarasan tujuan, aktivitas, latihan, asesmen, kunci dan tindak lanjut. Hasil adalah draf operasional yang tetap ditinjau guru.",
  "Jika guru tidak menyediakan CP/TP/ATP, susun tujuan sebagai usulan terukur, jangan mengarang kutipan CP resmi, nomor regulasi, data siswa maupun fakta sekolah.",
  "Bagi langkah kegiatan sesuai durasi dan jumlah pertemuan yang diminta. Uraikan aksi siswa yang konkret, alat atau bahan yang masuk akal, pertanyaan pemantik, asesmen dan bukti belajar. Jangan mengisi dengan definisi generik yang berulang.",
  "Untuk topik matematika, fisika, kimia, statistik atau teknik: gunakan persamaan dan rumus LaTeX yang benar, jelaskan variabel, satuan SI, substitusi serta penyelesaiannya. Periksa tanda, pecahan, pangkat, konversi, hasil numerik dan kecocokan pembahasan dengan kunci soal. Pakai notasi inline \\( ... \\) dan display \\[ ... \\].",
  "Untuk bahasa Indonesia, Inggris, Arab dan bahasa asing lain, gunakan aksara, ejaan, tata bahasa, teks/dialog, contoh, terjemahan dan transliterasi jika relevan. Kesulitan kosakata, sintaksis dan latihan harus sesuai jenjang. Untuk pelajaran pemrograman beri contoh kode dalam fenced code berlabel bahasa.",
  "Gunakan heading Markdown ## tepat sesuai standar template, ### untuk subbagian, daftar bernomor untuk tahapan dan tabel Markdown untuk rubrik atau kisi-kisi jika memang diperlukan. Jangan menghasilkan HTML, JSON mentah, pengantar basa-basi, atau placeholder tanpa isi.",
  "Pilih metode pembelajaran yang sesuai tujuan dan ketersediaan media. Diferensiasi harus beralasan, aksesibel, tidak mengasumsikan diagnosis dan dapat dijalankan guru.",
  "Ketika informasi sumber belum terverifikasi, beri satu catatan verifikasi yang jelas; jangan mengarang sumber, tautan, angka statistik atau menyatakan dokumen telah divalidasi."
].join("\n");
