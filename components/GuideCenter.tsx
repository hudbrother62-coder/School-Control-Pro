"use client";
import {useEffect,useMemo,useState} from "react";
import {AlertTriangle,BookOpen,CheckCircle2,ChevronDown,CircleHelp,Search,ShieldCheck,Target} from "lucide-react";
import {modules,visibleFeatures,ROLE_LABELS,type Role,type ModuleKey} from "@/lib/modules";
import {guideFor,resolveWorkspaceRoute,type WorkspaceRoute} from "@/lib/workspace-navigation";
import {taskHelp} from "@/lib/workspace-help";

type Guide={id:string;feature:string;title:string;basis:string;summary:string;before:string[];steps:{title:string;detail:string;result:string}[];success:string[];problems:{problem:string;fix:string}[]};
const guides:Guide[]=[
 {id:"start",feature:"Mulai dari Sini",title:"Urutan penggunaan School Control",basis:"Gabungan semua aplikasi",summary:"Gunakan urutan ini agar satu data dipakai oleh semua modul dan tidak terjadi input ulang.",before:["Pastikan akun sekolah dan role pengguna sudah benar.","Isi Data Induk sebelum masuk ke modul operasional."],steps:[
  {title:"1. Lengkapi identitas sekolah",detail:"Buka Pengaturan Sekolah dan isi profil, kontak, lokasi, akademik, branding, serta memori sekolah yang aman untuk AI.",result:"Dokumen dan laporan memakai identitas sekolah yang sama."},
  {title:"2. Lengkapi Data Induk",detail:"Masukkan kelas, siswa, guru, tenaga kependidikan, mata pelajaran, dan penugasan guru. Gunakan template Excel bila datanya banyak.",result:"Dropdown di modul lain mengambil sumber yang sama."},
  {title:"3. Atur akses",detail:"Buat pengguna sesuai jabatan: kepala sekolah, wakasek, guru, guru BK, bendahara, HR, staf, atau viewer.",result:"Setiap pengguna hanya melihat pekerjaan yang relevan."},
  {title:"4. Jalankan modul operasional",detail:"Gunakan Agenda, Pembelajaran, Disiplin, BK, Program, Keuangan, Presensi SDM dan Payroll sesuai kebutuhan.",result:"Aktivitas tercatat pada satu sekolah dan satu periode."},
  {title:"5. Gunakan rekap dan laporan",detail:"Periksa periode, filter kelas/tingkat, dan data sumber sebelum ekspor atau finalisasi.",result:"Laporan konsisten dengan data operasional."}
 ],success:["Dropdown menampilkan data dari Data Induk.","Tidak ada kelas/siswa/guru ganda untuk orang yang sama.","Laporan mengambil data dari modul sumber."],problems:[{problem:"Pilihan kelas/guru/mapel kosong.",fix:"Lengkapi Data Induk dan Penugasan Guru terlebih dahulu."},{problem:"Pengguna tidak melihat menu tertentu.",fix:"Periksa role di Akses & Peran."}]},
 {id:"master",feature:"Data Induk",title:"Data Induk & import Excel",basis:"Buku Kerja Digital · Disiplin Pro · BK Pro · Gajian Pro",summary:"Data siswa dan SDM adalah sumber utama; jangan membuat ulang data yang sama di modul lain.",before:["Siapkan daftar kelas, siswa, guru/staf, dan mata pelajaran.","Jika memakai Excel, unduh template dari aplikasi agar nama kolom benar."],steps:[
  {title:"1. Buat kelas dan mata pelajaran",detail:"Isi nama kelas, jenjang/tingkat, tahun ajaran, kode dan nama mata pelajaran.",result:"Kelas dan mapel tersedia pada dropdown modul lain."},
  {title:"2. Tambah/import siswa",detail:"Isi nama, NIS, NISN, gender, kelas, wali/orang tua, WhatsApp wali, dan status. Data massal dapat diimport.",result:"Siswa muncul di Absensi, Nilai, Disiplin dan BK."},
  {title:"3. Tambah guru/staf",detail:"Lengkapi ID pegawai, kontak, unit, jabatan, status kerja, tanggal bergabung, pendidikan, rekening, pajak/BPJS, serta shift.",result:"Data yang sama dipakai Presensi SDM dan Payroll."},
  {title:"4. Buat Penugasan Guru",detail:"Hubungkan akun guru dengan kelas, mata pelajaran, dan jenis penugasan.",result:"Guru hanya mendapat kelas yang memang ditugaskan."}
 ],success:["Satu siswa memiliki satu identitas utama.","Kelas/mapel muncul di jurnal dan penilaian.","Guru terhubung dengan akun dan penugasan."],problems:[{problem:"Import tidak terbaca.",fix:"Unduh template resmi, jangan ubah nama kolom, lalu coba Excel/CSV kembali."},{problem:"Data muncul ganda.",fix:"Gunakan NIS/NISN atau ID pegawai yang konsisten dan edit data lama, bukan menambah ulang."}]},
 {id:"agenda",feature:"Agenda & Absensi",title:"Agenda sekolah & absensi siswa",basis:"BK Pro Absensi · Command Pro",summary:"Kalender menunjukkan tanda hanya pada tanggal yang memiliki agenda; absensi menunjukkan status lengkap/sebagian/belum.",before:["Kelas dan siswa aktif sudah tersedia.","Untuk agenda per tingkat, jenjang/tingkat pada kelas sudah diisi."],steps:[
  {title:"1. Tambah agenda",detail:"Klik tanggal atau tombol Tambah Agenda. Isi judul, sasaran sekolah/tingkat/kelas/pengguna, waktu, lokasi dan peserta.",result:"Tanggal agenda mendapat tanda kecil pada kalender."},
  {title:"2. Lihat rekap bulanan",detail:"Pilih bulan lalu/bulan sekarang. Rekap dipisah per tingkat; agenda umum tidak dicampur dengan agenda kelas/tingkat.",result:"Setiap tingkat mempunyai daftar agenda sendiri."},
  {title:"3. Buka Absensi Siswa",detail:"Pilih kelas, tanggal dan jenis/mata pelajaran. Gunakan cari siswa atau Tandai Semua Hadir.",result:"Status siswa dapat dicatat cepat."},
  {title:"4. Buka riwayat tanggal",detail:"Klik tanggal kalender absensi. Tanda kalender menunjukkan Lengkap, Sebagian atau Belum Diabsen.",result:"Guru tahu hari mana yang belum selesai diabsen."}
 ],success:["Tanggal kosong tidak memiliki tanda agenda.","Rekap agenda terpisah per tingkat.","Catatan opsional absensi tersimpan bersama status."],problems:[{problem:"Tanggal agenda tidak bisa diklik.",fix:"Pastikan kalender sudah selesai memuat; klik angka tanggal atau tombol Tambah Agenda."},{problem:"Siswa tidak muncul di absensi.",fix:"Periksa status aktif siswa, kelasnya, dan Penugasan Guru."}]},
 {id:"guruai",feature:"Perangkat Ajar AI",title:"Perangkat Ajar AI dari satu Project Builder",basis:"BantuBeres Guru AI",summary:"Isi konteks proyek sekali; Modul Ajar, LKPD, asesmen, bahan ajar, rubrik dan alat lain memakai konteks yang sama.",before:["Tentukan jenjang, kelas, mata pelajaran dan topik.","Isi karakter siswa dan kondisi sekolah agar hasil tidak generik."],steps:[
  {title:"1. Isi Project Builder",detail:"Isi nama proyek, jenjang, kelas, mata pelajaran, topik, jumlah/durasi pertemuan, kesulitan siswa, metode, karakter siswa, sumber daya, target dan instruksi.",result:"Konteks proyek tersimpan."},
  {title:"2. Pilih alat",detail:"Buka Modul Ajar, LKPD, Asesmen, Strategi, Bahan Ajar, Rubrik, Presentasi atau Peta Konsep.",result:"Muncul pertanyaan tambahan khusus alat tersebut."},
  {title:"3. Periksa Standar Output",detail:"Sebelum generate, baca daftar bagian wajib. Sistem mengirim standar itu bersama konteks proyek.",result:"Hasil lebih lengkap dan konsisten."},
  {title:"4. Generate dan tinjau",detail:"Periksa CP/TP, sintaks model, asesmen, rumus dan fakta sekolah. Bagian resmi yang tidak diketahui harus diverifikasi guru.",result:"Draf siap diedit dan disimpan ke riwayat."}
 ],success:["Mata pelajaran dapat dicari atau diketik sendiri.","Setiap alat memiliki input tambahan berbeda.","Output memiliki struktur wajib, bukan paragraf generik."],problems:[{problem:"Jawaban terlalu umum.",fix:"Lengkapi karakter siswa, sumber daya, target, metode, dan input khusus alat."},{problem:"CP/TP meragukan.",fix:"Jangan langsung gunakan. Cocokkan dengan dokumen kurikulum sekolah yang berlaku."}]},
 {id:"journal",feature:"Jurnal & Penilaian",title:"Jurnal Mengajar, nilai, dan rekap",basis:"Buku Kerja Digital",summary:"Guru memilih data yang sudah terdaftar; dropdown dapat dicari dan sebagian pilihan dapat ditulis sendiri.",before:["Data guru, kelas, siswa dan mata pelajaran tersedia.","Penugasan guru sudah dibuat bila akses dibatasi per kelas."],steps:[
  {title:"1. Tulis jurnal",detail:"Pilih guru, tanggal, kelas, mata pelajaran, topik, aktivitas pembelajaran, refleksi dan tindak lanjut.",result:"Riwayat jurnal tersimpan dengan snapshot guru/kelas."},
  {title:"2. Input nilai",detail:"Pilih kelas, siswa, mapel, nama asesmen, kategori, tanggal, nilai, nilai maksimum dan catatan.",result:"Nilai terhubung ke siswa yang benar."},
  {title:"3. Gunakan rekap",detail:"Pilih bulan dan kelas untuk melihat presensi serta rerata nilai.",result:"Rekap kelas dapat diekspor."}
 ],success:["Jurnal menampilkan aktivitas, refleksi dan tindak lanjut secara terpisah.","Guru bisa mencari pilihan tanpa menggulir daftar panjang."],problems:[{problem:"Mapel tidak ada.",fix:"Ketik nama baru pada dropdown fleksibel atau tambahkan ke Data Induk."},{problem:"Kelas tidak tersedia.",fix:"Tambahkan di Data Induk lalu pastikan penugasan guru sesuai."}]},
 {id:"discipline",feature:"Disiplin & Prestasi",title:"Pelanggaran, prestasi, pembinaan & tindak lanjut",basis:"Disiplin Pro",summary:"Poin dan kategori berasal dari Master Data; guru tidak perlu mengetik ulang standar pelanggaran.",before:["Siswa aktif sudah tersedia.","Siapkan Master Pelanggaran, Prestasi dan Sanksi atau import template."],steps:[
  {title:"1. Siapkan Master Data",detail:"Buat jenis pelanggaran/prestasi dengan kategori dan poin; buat sanksi dengan rentang poin.",result:"Standar sekolah siap dipakai semua pencatat."},
  {title:"2. Catat kejadian",detail:"Cari siswa, cari jenis kejadian, tentukan tanggal/waktu, kronologi dan pencatat. Jika item belum ada, ketik baru dan simpan langsung ke master.",result:"Snapshot kategori dan poin tersimpan pada kejadian."},
  {title:"3. Catat pembinaan",detail:"Isi alasan, bentuk pembinaan, hasil, catatan, tindak lanjut, petugas dan status.",result:"Riwayat pembinaan dapat dilacak."},
  {title:"4. Buat tindak lanjut",detail:"Pilih sanksi/tindakan dari master, tentukan target selesai dan catatan.",result:"Status tindak lanjut dapat dipantau hingga selesai."},
  {title:"5. Buka rekap",detail:"Pilih bulan dan kelas untuk melihat pelanggaran, prestasi, poin dan pembinaan.",result:"Laporan berasal dari kejadian aktual."}
 ],success:["Poin otomatis mengikuti master.","Jenis baru dapat ditambahkan saat pencatatan.","Pembinaan dan sanksi tidak dicampur dengan kejadian utama."],problems:[{problem:"Jenis pelanggaran tidak ditemukan.",fix:"Cari lewat dropdown atau ketik jenis baru; lengkapi kategori dan poin."},{problem:"Poin salah.",fix:"Perbaiki Master Data sebelum mencatat kejadian baru; riwayat lama mempertahankan snapshot."}]},
 {id:"bk",feature:"Bimbingan Konseling",title:"Administrasi BK & privasi kasus",basis:"BK Pro",summary:"Kasus, konseling, RPL, kunjungan rumah dan rujukan memakai data siswa yang sama dengan Data Induk.",before:["Siswa tersedia di Data Induk.","Akun Guru BK memiliki role konselor."],steps:[
  {title:"1. Buka Kasus",detail:"Pilih siswa, bidang, topik, ringkasan asesmen dan tanggal tindak lanjut.",result:"Kasus mempunyai status dan konselor penanggung jawab."},
  {title:"2. Catat layanan",detail:"Pilih jenis layanan, sasaran, bidang, tanggal, tujuan/metode/hasil dan tindak lanjut.",result:"Riwayat layanan tersimpan."},
  {title:"3. Gunakan laporan agregat",detail:"Untuk kepala sekolah, gunakan ringkasan tanpa membuka isi sesi rahasia.",result:"Privasi siswa tetap dijaga."}
 ],success:["Catatan sensitif dibatasi untuk role berwenang.","Riwayat siswa menggabungkan kasus dan layanan yang relevan."],problems:[{problem:"Kepala sekolah tidak melihat detail sesi.",fix:"Itu memang pembatasan privasi; gunakan ringkasan agregat."},{problem:"Siswa tidak muncul.",fix:"Pastikan siswa aktif di Data Induk."}]},
 {id:"command",feature:"Program & Tugas",title:"Program kerja, PIC, tugas, rapat dan bukti",basis:"Sekolah Command Pro",summary:"Program menjadi induk tugas; PIC, deadline, kendala, hasil rapat dan bukti berada dalam alur yang sama.",before:["Guru/staf dan akun sudah terhubung.","Agenda sekolah tersedia untuk jadwal bersama."],steps:[
  {title:"1. Buat Program Kerja",detail:"Isi nama program, PIC dan deadline.",result:"Program aktif mempunyai penanggung jawab."},
  {title:"2. Pecah menjadi tugas",detail:"Hubungkan tugas ke program, beri PIC dan tenggat.",result:"Progress dapat dipantau per tugas."},
  {title:"3. Catat kendala dan hasil",detail:"Perbarui status tugas, kendala dan hasil aktual.",result:"Manajemen melihat kondisi kerja tanpa chat terpisah."},
  {title:"4. Dokumentasikan rapat & bukti",detail:"Simpan notula/keputusan serta unggah bukti pada program atau tugas.",result:"Jejak pelaksanaan lengkap."}
 ],success:["Setiap tugas mempunyai program induk.","PIC dan deadline terlihat jelas.","Bukti terkait langsung dengan pekerjaan."],problems:[{problem:"PIC tidak muncul.",fix:"Hubungkan akun pengguna dengan data guru/staf."},{problem:"Bukti tidak dapat dibuka.",fix:"Pastikan file selesai diunggah; sistem memakai tautan sementara untuk berkas privat."}]},
 {id:"finance",feature:"Keuangan",title:"Kas, anggaran, tagihan dan pembayaran",basis:"SIKAS Pro",summary:"Transaksi harus terhubung ke kas/rekening dan laporan dibentuk dari transaksi aktual.",before:["Buat minimal satu kas/rekening.","Isi saldo awal dengan benar."],steps:[
  {title:"1. Buat Kas/Rekening",detail:"Pilih jenis tunai, bank, e-wallet atau lainnya.",result:"Sumber dana tersedia."},
  {title:"2. Catat pemasukan/pengeluaran",detail:"Pilih rekening, tanggal, kategori, kegiatan, nominal dan uraian.",result:"Saldo dan laporan ikut berubah."},
  {title:"3. Kelola anggaran",detail:"Masukkan tahun, kategori/kegiatan, pagu dan catatan.",result:"Anggaran dapat dibandingkan dengan realisasi."},
  {title:"4. Tagihan & pembayaran",detail:"Terbitkan tagihan siswa; saat pembayaran pilih kas, nominal dan nomor kuitansi.",result:"Pembayaran masuk buku kas dan sisa tagihan berkurang."},
  {title:"5. Import/Export",detail:"Gunakan template Excel/CSV untuk transaksi massal.",result:"Format data tetap konsisten."}
 ],success:["Saldo kas berasal dari saldo awal + transaksi.","Pembayaran menghasilkan kuitansi dan mengurangi piutang."],problems:[{problem:"Kas tidak muncul saat transaksi.",fix:"Buat Kas/Rekening terlebih dahulu."},{problem:"Import gagal.",fix:"Samakan nama Kas_Rekening dengan data aplikasi dan gunakan template."}]},
 {id:"payroll",feature:"SDM & Payroll",title:"Presensi SDM, izin/cuti dan payroll",basis:"Gajian Pro",summary:"Data pegawai, shift, kehadiran, izin dan komponen gaji harus benar sebelum payroll difinalkan.",before:["Data pegawai lengkap dan akun terhubung.","Shift/jam masuk serta komponen gaji sudah ditentukan."],steps:[
  {title:"1. Atur shift & kehadiran",detail:"Tentukan jam masuk dan toleransi. Pegawai melakukan check-in/check-out dengan akun sendiri.",result:"Riwayat kehadiran tersedia."},
  {title:"2. Kelola izin/cuti",detail:"Pegawai mengajukan; manajemen/HR meninjau dan memutuskan.",result:"Status pengajuan terdokumentasi."},
  {title:"3. Isi komponen gaji",detail:"Atur gaji pokok, tunjangan dan potongan per pegawai.",result:"Dasar payroll tersedia."},
  {title:"4. Generate & review payroll",detail:"Buat periode, periksa angka, ajukan review/approval, lalu kunci hanya setelah benar.",result:"Payroll final tidak berubah sembarangan."}
 ],success:["Satu pegawai memakai satu identitas SDM.","Payroll hanya dikunci setelah review."],problems:[{problem:"Pegawai tidak masuk payroll.",fix:"Periksa status aktif, komponen gaji dan periode."},{problem:"Presensi pribadi kosong.",fix:"Pastikan akun terhubung dengan data SDM."}]},
 {id:"access",feature:"Akses & Pengaturan",title:"Role, akun, dan pengaturan sekolah",basis:"School Control",summary:"Hak akses mengikuti pekerjaan; jangan memberi role lebih tinggi hanya agar menu terlihat.",before:["Tentukan siapa pemilik akun utama.","Siapkan daftar role yang benar."],steps:[
  {title:"1. Tambah pengguna",detail:"Buat kode undangan dan pilih role awal.",result:"Pengguna bergabung ke sekolah yang benar."},
  {title:"2. Hubungkan data SDM",detail:"Pastikan akun guru/staf menunjuk pada identitas pegawai yang sama.",result:"Presensi, agenda dan payroll tidak terpecah."},
  {title:"3. Lengkapi Pengaturan",detail:"Isi profil, lokasi, akademik, branding dan memori sekolah.",result:"Dokumen dan AI memakai konteks sekolah."}
 ],success:["Pengguna hanya melihat menu sesuai role.","Satu sekolah mempunyai ruang data sendiri."],problems:[{problem:"Menu terlalu sedikit.",fix:"Periksa role akun; jangan mengubah data hanya untuk membuka akses."},{problem:"Akun dan pegawai terasa ganda.",fix:"Gunakan hubungan akun–data SDM, bukan membuat pegawai baru."}]}
];

const extraGuides:{id:string;feature:string;module:ModuleKey;features:string[]}[]=[
 {id:"assistant",feature:"Asisten AI",module:"assistant",features:["Asisten Guru","Asisten Kepala Sekolah","Asisten Kelas","Rencana Pekerjaan"]},
 {id:"attendance",feature:"Presensi Guru & Staf",module:"attendance",features:["Check-in/check-out","Riwayat kehadiran","Izin","Cuti"]},
 {id:"planning",feature:"Perencanaan & Supervisi",module:"kepsek_ai",features:["PBD/EDS","Pusat dokumen","Persetujuan dokumen","Supervisi guru"]},
 {id:"performance",feature:"Kinerja & Pengembangan",module:"performance",features:["Kehadiran","Bukti capaian","Evaluasi","Tanggapan guru"]},
 {id:"reports",feature:"Laporan & Arsip",module:"reports",features:["Ringkasan Laporan","Akademik","Keuangan","Arsip Laporan"]},
];
for(const g of extraGuides){const h=taskHelp(g.module,"");guides.push({id:g.id,feature:g.feature,title:g.feature,basis:"School Control",summary:h.purpose,before:[h.before],steps:h.steps.map((detail,i)=>({title:String(i+1)+". "+(g.features[i]||g.feature),detail,result:h.result})),success:[h.result],problems:[{problem:"Fitur atau data tidak muncul.",fix:"Periksa peran akun, data prasyarat dan pesan validasi. Gunakan tombol Buka fitur yang tersedia untuk peran Anda."}]})}
const stepRoutes:Record<string,[ModuleKey,string][]>={
 start:[["settings","Profil sekolah"],["master","Kelas"],["access","Tambah Pengguna"],["calendar","Kalender Sekolah"],["reports","Ringkasan Laporan"]],
 master:[["master","Kelas"],["master","Siswa"],["master","Guru"],["master","Penugasan Guru"]],
 agenda:[["calendar","Kalender Sekolah"],["calendar","Rekap Agenda"],["buku_kerja","Presensi Siswa"],["buku_kerja","Presensi Siswa"]],
 guruai:[["guru_ai","Modul Ajar"],["guru_ai","LKPD"],["guru_ai","Asesmen Soal"],["guru_ai","Riwayat draf"]],
 journal:[["buku_kerja","Jurnal Mengajar"],["buku_kerja","Lembar Nilai"],["buku_kerja","Rekap Bulanan"]],
 discipline:[["disiplin","Master Data"],["disiplin","Pelanggaran"],["disiplin","Pembinaan"],["disiplin","Tindak Lanjut"],["disiplin","Rekap & Laporan"]],
 bk:[["bk","Kasus & Asesmen"],["bk","Konseling Individu"],["bk","Laporan BK"]],
 command:[["command","Program Kerja"],["command","Tugas"],["command","Hasil Rapat"],["command","Bukti Kegiatan"]],
 finance:[["sikas","Kas/Rekening"],["sikas","Pemasukan"],["sikas","Tagihan Siswa"],["sikas","Pembayaran"],["sikas","Laporan"]],
 payroll:[["gajian","Tim SDM"],["gajian","Jadwal Kerja"],["gajian","Komponen Gaji"],["gajian","Proses Payroll"]],
 access:[["access","Tambah Pengguna"],["gajian","Tim SDM"],["settings","Profil sekolah"]],
 ...Object.fromEntries(extraGuides.map(g=>[g.id,g.features.map(f=>[g.module,f])])),
};
const quickStart:[ModuleKey,string,string,string][]=[
 ["settings","Profil sekolah","Lengkapi identitas sekolah","Isi profil, jenjang, tahun ajaran dan branding."],
 ["master","Kelas","Siapkan kelas dan data siswa","Buat kelas, lalu tambah/import siswa dari template."],
 ["access","Tambah Pengguna","Undang guru dan staf","Pilih peran lalu bagikan kode undangan secara pribadi."],
 ["calendar","Kalender Sekolah","Lihat agenda hari ini","Pilih tanggal dan periksa waktu serta peserta."],
 ["attendance","Check-in/check-out","Absen kerja","Catat masuk/pulang sesuai ketentuan sekolah."],
 ["buku_kerja","Presensi Siswa","Isi presensi siswa","Pilih kelas dan tanggal; simpan status siswa."],
 ["buku_kerja","Jurnal Mengajar","Isi jurnal mengajar","Catat topik, aktivitas, refleksi dan tindak lanjut."],
 ["bk","Kasus & Asesmen","Catat layanan BK","Gunakan kasus dan layanan dengan privasi konselor."],
 ["sikas","Pemasukan","Catat keuangan","Siapkan kas dan catat transaksi pada tanggal yang tepat."],
 ["assistant","Rencana Pekerjaan","Minta panduan urutan pekerjaan","Tulis tujuan; asisten membantu memilih langkah dan fitur."],
 ["reports","Ringkasan Laporan","Periksa hasil dan laporan","Pilih laporan, periode dan pratinjau sebelum ekspor."],
];

const flow:Record<string,string[]>={
 owner:["Lengkapi Pengaturan Sekolah","Isi Data Induk","Atur Akses & Peran","Pantau Agenda/Program/Keuangan","Tinjau laporan"],
 principal:["Tinjau Beranda & Agenda","Pantau Program dan Supervisi","Gunakan Perencanaan & Dokumen","Tinjau laporan sekolah"],
 teacher:["Cek Penugasan & Agenda","Absensi siswa","Isi Jurnal/Nilai","Gunakan Perangkat Ajar AI","Catat disiplin bila diperlukan"],
 counselor:["Cek siswa & agenda","Kelola kasus/layanan BK","Catat tindak lanjut","Gunakan laporan agregat"],
 hr:["Lengkapi SDM & shift","Pantau presensi/izin","Kelola komponen gaji","Review payroll"],
 treasurer:["Siapkan kas/rekening","Catat transaksi","Kelola anggaran/tagihan","Buat laporan"],
 staff:["Cek agenda","Lakukan presensi pribadi","Kerjakan tugas/PIC","Ajukan izin bila perlu"],
 viewer:["Baca informasi yang dibagikan","Gunakan agenda/rekap yang diizinkan"]
};

export default function GuideCenter({role,focus,onRoute}:{role:Role;focus?:string;onRoute?:(m:ModuleKey,f?:string)=>void}){
 const [query,setQuery]=useState(""),[open,setOpen]=useState("start");
 useEffect(()=>{setQuery("");setOpen(guides.find(g=>g.feature===focus)?.id||"start")},[focus]);
 const selected=useMemo(()=>{const q=(focus||"").toLowerCase();return guides.filter(g=>(!q||q.includes("mulai")||g.feature.toLowerCase()===q||g.feature.toLowerCase().includes(q)||q.includes(g.feature.toLowerCase()))&&(g.title+" "+g.summary+" "+g.basis+" "+g.steps.map(s=>s.detail).join(" ")).toLowerCase().includes(query.toLowerCase()))},[focus,query]);
 const shortcuts=quickStart.filter(([m,f])=>!!resolveWorkspaceRoute(m,f,role));
 const featureLinks=modules.filter(m=>m.key!=="help"&&(!focus||focus==="Mulai dari Sini"||guideFor(m.key)===focus)).flatMap(m=>visibleFeatures(m,role).map(f=>({module:m.key,feature:f,label:m.label,help:taskHelp(m.key,f)}))).filter(x=>(x.label+" "+x.feature+" "+x.help.purpose).toLowerCase().includes(query.toLowerCase()));
 return <section className="guide-center">
  <div className="guide-hero-pro"><div><span className="eyebrow">BUKU PANDUAN LANGKAH DEMI LANGKAH</span><h2>Panduan School Control</h2><p>Pilih pekerjaan Anda, ikuti langkahnya, lalu buka fitur langsung dari panduan. Mulai dengan data yang dibutuhkan; tidak perlu mengisi semua menu sekaligus.</p></div><div className="guide-role-pro"><ShieldCheck size={20}/><span>Akses Anda</span><b>{ROLE_LABELS[role]}</b><a className="button secondary" href="/panduan-school-control.md" download>Unduh panduan</a></div></div>
  {(focus==="Mulai dari Sini"||!focus)&&<section className="panel guide-flow-pro"><div><Target size={19}/><h3>Urutan cepat untuk {ROLE_LABELS[role]}</h3></div><div>{(flow[role]||flow.staff).map((x,i)=><span key={x}><b>{i+1}</b>{x}</span>)}</div></section>}
  {(focus==="Mulai dari Sini"||!focus)&&<section className="panel"><h3>Mulai dengan pekerjaan berikut</h3><div className="guide-launch-grid">{shortcuts.map(([m,f,title,detail])=><button key={m+f} onClick={()=>onRoute?.(m,f)}><strong>{title}</strong><small>{detail}</small><span className="text-action">Buka {f} →</span></button>)}</div></section>}
  <label className="guide-search-pro"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Cari petunjuk" placeholder="Cari: import, agenda, absensi, jurnal, payroll, laporan…"/></label>
  <div className="guide-list-pro">{selected.map((g,i)=><article className={"panel guide-card-pro "+(open===g.id?"open":"")} key={g.id}><button className="guide-toggle-pro" aria-expanded={open===g.id} onClick={()=>setOpen(open===g.id?"":g.id)}><span>{String(i+1).padStart(2,"0")}</span><div><small>{g.feature}</small><strong>{g.title}</strong><em>{g.summary}</em></div><ChevronDown size={18}/></button>{open===g.id&&<div className="guide-body-pro">
   <section><h4><CircleHelp size={16}/> Sebelum mulai</h4>{g.before.map(x=><p key={x}><CheckCircle2 size={14}/>{x}</p>)}</section>
   <section><h4><BookOpen size={16}/> Langkah satu per satu</h4>{g.steps.map((s,index)=>{const r=stepRoutes[g.id]?.[index];const route=r?resolveWorkspaceRoute(r[0],r[1],role):null;return <div className="guide-step-pro" key={s.title}><b>{s.title}</b><p>{s.detail}</p><small>Hasil: {s.result}</small>{route&&<button className="button secondary" onClick={()=>onRoute?.(route.module,route.feature)}>Buka {route.feature}</button>}</div>})}</section>
   <section><h4><CheckCircle2 size={16}/> Tanda berhasil</h4>{g.success.map(x=><p key={x}><CheckCircle2 size={14}/>{x}</p>)}</section>
   <section><h4><AlertTriangle size={16}/> Kalau gagal, cek ini</h4>{g.problems.map(x=><div className="guide-problem-pro" key={x.problem}><b>{x.problem}</b><p>{x.fix}</p></div>)}</section>
  </div>}</article>)}</div>
  {!selected.length&&!featureLinks.length&&<div className="empty guide-empty">Tidak ada petunjuk yang cocok. Coba nama fitur atau pekerjaan lain.</div>}
  <section className="panel"><h3>Petunjuk per menu</h3><p className="muted">Hanya fitur sesuai akses Anda yang ditampilkan.</p>{featureLinks.map(x=><details className="task-help" key={x.module+x.feature}><summary>{x.feature} · {x.label}</summary><p>{x.help.purpose}</p><p><b>Sebelum mulai:</b> {x.help.before}</p><ol>{x.help.steps.map(s=><li key={s}>{s}</li>)}</ol><p><b>Hasil:</b> {x.help.result}</p><button className="button secondary" onClick={()=>onRoute?.(x.module,x.feature)}>Buka {x.feature}</button></details>)}</section>
 </section>;
}
