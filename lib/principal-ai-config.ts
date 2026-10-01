import type {ToolField} from "@/lib/teacher-ai-config";

type PrincipalTool={fields:ToolField[];standard:string[];instruction:string};

export const principalToolConfig:Record<string,PrincipalTool>={
 PBD:{
  fields:[
   {key:"data_period",label:"Periode / tahun data Rapor Pendidikan",placeholder:"Contoh: capaian 2025 untuk perencanaan 2026"},
   {key:"priority_indicators",label:"Indikator prioritas & capaian faktual",type:"textarea",placeholder:"Tempel indikator, nilai/capaian, warna/posisi bila tersedia. Jangan menebak."},
   {key:"root_causes",label:"Refleksi & akar masalah yang ditemukan",type:"textarea"},
   {key:"school_evidence",label:"Bukti/data internal pendukung",type:"textarea",placeholder:"Kehadiran, hasil belajar, supervisi, survei, observasi, dll."},
   {key:"capacity",label:"Kapasitas & batasan sekolah",type:"textarea",placeholder:"SDM, waktu, sarana, anggaran, kewenangan"},
   {key:"monitoring",label:"Cara monitoring yang diinginkan",type:"textarea"}
  ],
  standard:["Identifikasi indikator prioritas berbasis data","Refleksi dan akar masalah tanpa mengarang fakta","Prioritas pembenahan sesuai kapasitas sekolah","Rencana kegiatan, PIC, waktu dan sumber daya","Indikator keberhasilan & bukti","Monitoring perubahan sebelum–sesudah"],
  instruction:"Susun PBD/EDS dengan alur identifikasi, refleksi, pembenahan, implementasi dan monitoring. Bedakan data yang diberikan, analisis, asumsi, dan bagian yang wajib diverifikasi di Rapor Pendidikan."
 },
 KSP:{
  fields:[
   {key:"school_characteristics",label:"Karakteristik satuan pendidikan & murid",type:"textarea",placeholder:"Konteks sosial, kebutuhan murid, lingkungan, sumber daya, kekhasan sekolah"},
   {key:"vision_mission",label:"Visi, misi dan tujuan sekolah",type:"textarea"},
   {key:"curriculum_structure",label:"Struktur & pengorganisasian pembelajaran",type:"textarea",placeholder:"Intrakurikuler, kokurikuler, ekstrakurikuler, muatan/kekhasan lokal"},
   {key:"learning_planning",label:"Prinsip perencanaan pembelajaran",type:"textarea"},
   {key:"calendar",label:"Kalender pendidikan / kekhususan waktu",type:"textarea"},
   {key:"evaluation_development",label:"Evaluasi, pendampingan & pengembangan profesional",type:"textarea"}
  ],
  standard:["Analisis karakteristik satuan pendidikan","Visi, misi dan tujuan yang koheren","Pengorganisasian pembelajaran sesuai struktur berlaku","Perencanaan pembelajaran kontekstual","Kalender pendidikan dan pengaturan beban","Evaluasi, pendampingan & pengembangan profesional","Lampiran/komponen yang perlu diverifikasi"],
  instruction:"Susun draf KSP/KOSP kontekstual, bukan salinan sekolah lain. Gunakan karakteristik dan kebutuhan murid/sekolah sebagai dasar. Tandai ketentuan struktur kurikulum atau regulasi yang perlu diverifikasi terhadap sumber resmi terbaru."
 },
 RKJM:{
  fields:[
   {key:"period",label:"Periode RKJM",placeholder:"Contoh: 2026–2029"},
   {key:"baseline",label:"Kondisi awal / baseline sekolah",type:"textarea"},
   {key:"strategic_goals",label:"Tujuan & sasaran strategis",type:"textarea"},
   {key:"priority_programs",label:"Program prioritas lintas tahun",type:"textarea"},
   {key:"indicators",label:"Indikator & target bertahap",type:"textarea"},
   {key:"resources_risks",label:"Sumber daya, risiko & mitigasi",type:"textarea"}
  ],
  standard:["Baseline dan isu strategis","Tujuan dan sasaran jangka menengah","Strategi serta program prioritas per tahun","Indikator, baseline dan target","Penanggung jawab & kebutuhan sumber daya","Risiko, mitigasi, monitoring dan evaluasi"],
  instruction:"Susun RKJM sebagai peta jalan jangka menengah yang menurunkan hasil evaluasi/PBD menjadi sasaran, strategi, program bertahap dan indikator yang dapat dipantau."
 },
 RKT:{
  fields:[
   {key:"year",label:"Tahun rencana kerja",placeholder:"2026"},
   {key:"priorities",label:"Prioritas tahunan dari RKJM/PBD",type:"textarea"},
   {key:"activities",label:"Program & kegiatan yang direncanakan",type:"textarea"},
   {key:"pic_timeline",label:"PIC & waktu pelaksanaan",type:"textarea"},
   {key:"targets",label:"Target, indikator & bukti keberhasilan",type:"textarea"},
   {key:"resources",label:"Kebutuhan sumber daya / sumber dana",type:"textarea"}
  ],
  standard:["Prioritas tahunan yang terlacak ke RKJM/PBD","Program dan kegiatan rinci","PIC dan jadwal","Target & indikator terukur","Kebutuhan sumber daya/sumber dana","Bukti, risiko, monitoring dan evaluasi"],
  instruction:"Susun RKT operasional satu tahun. Setiap kegiatan harus punya kaitan dengan prioritas, PIC, jadwal, target, indikator, bukti, sumber daya dan cara evaluasi."
 },
 RKAS:{
  fields:[
   {key:"fiscal_year",label:"Tahun anggaran",placeholder:"2026"},
   {key:"source_fund",label:"Sumber dana",placeholder:"BOSP Reguler / sumber lain yang sah"},
   {key:"evaluation_basis",label:"Kebutuhan sekolah & dasar evaluasi/PBD",type:"textarea"},
   {key:"activities",label:"Kegiatan / komponen yang akan dibiayai",type:"textarea"},
   {key:"goods_services",label:"Rincian barang/jasa, volume, satuan & harga",type:"textarea"},
   {key:"budget_limit",label:"Pagu / batas anggaran yang tersedia",type:"text"},
   {key:"meeting_notes",label:"Catatan rapat/penyusunan & pihak yang terlibat",type:"textarea"}
  ],
  standard:["Kebutuhan dan dasar evaluasi diri/PBD","Komponen/kegiatan penggunaan dana","Rincian barang/jasa","Volume, satuan, harga dan jumlah","Sumber dana dan pagu","Justifikasi hubungan dengan prioritas mutu","Checklist verifikasi Juknis BOSP & ARKAS terbaru"],
  instruction:"Buat rancangan RKAS sebagai draf kerja, bukan pengganti ARKAS. Untuk BOSP 2026, rencana harus berbasis kebutuhan satuan pendidikan dan hasil evaluasi diri/profil pendidikan serta merinci komponen, barang/jasa, satuan harga dan volume. Jangan mengarang kode rekening atau batas persentase; tandai untuk verifikasi pada Juknis BOSP dan ARKAS yang berlaku."
 },
 SOP:{
  fields:[
   {key:"process_name",label:"Nama proses / layanan",placeholder:"Contoh: Penanganan keterlambatan siswa"},
   {key:"purpose_scope",label:"Tujuan & ruang lingkup",type:"textarea"},
   {key:"legal_basis",label:"Dasar kebijakan / aturan internal",type:"textarea",placeholder:"Masukkan sumber yang diketahui; yang belum pasti harus ditandai untuk verifikasi"},
   {key:"actors",label:"Pihak & kewenangan yang terlibat",type:"textarea"},
   {key:"steps",label:"Tahapan proses yang sekarang berlaku",type:"textarea"},
   {key:"sla",label:"Batas waktu / SLA",type:"textarea"},
   {key:"records_controls",label:"Form, bukti, kontrol mutu & titik persetujuan",type:"textarea"},
   {key:"risks",label:"Risiko, pengecualian & eskalasi",type:"textarea"}
  ],
  standard:["Identitas, tujuan dan ruang lingkup","Definisi & dasar kebijakan yang terverifikasi","Peran/RACI atau kewenangan","Tahapan kerja berurutan","SLA, input-output dan bukti","Kontrol mutu, risiko, pengecualian & eskalasi","Riwayat revisi"],
  instruction:"Susun SOP yang dapat dijalankan dan diaudit. Pisahkan aturan eksternal, kebijakan internal dan asumsi. Jangan membuat nomor regulasi bila tidak diberikan atau belum diverifikasi."
 },
 SUPERVISION:{
  fields:[
   {key:"objective",label:"Tujuan supervisi",type:"textarea"},
   {key:"teacher_context",label:"Konteks guru/mapel/kelas",type:"textarea"},
   {key:"observation_focus",label:"Fokus observasi",type:"textarea"},
   {key:"evidence",label:"Bukti yang akan dikumpulkan",type:"textarea"},
   {key:"schedule",label:"Jadwal & tindak lanjut",type:"textarea"}
  ],
  standard:["Tujuan dan fokus supervisi","Instrumen observasi berbasis bukti","Jadwal & tahapan pra-observasi–observasi–umpan balik","Catatan kekuatan & area pengembangan","Rencana tindak lanjut"],
  instruction:"Susun rencana supervisi akademik sebagai alat pembinaan berbasis bukti, bukan vonis otomatis."
 }
};
