# Data besar, Excel dan pilihan massal — 3 Oktober 2026

Perubahan mengikuti permintaan pengguna untuk mengurangi scroll dan mengelola banyak data.

- Baris submenu/pemilih navigasi di bawah header dihapus dari semua layar. Sidebar dan drawer tetap menampilkan seluruh subfitur sesuai peran.
- Import/template Data Induk berada sebelum daftar. Import agenda berada sebelum kalender, termasuk rekap. Import transaksi berada sebelum ringkasan keuangan. Pratinjau import nilai dipindah sebelum tabel; toolbar yang sebelumnya sudah di atas dipertahankan.
- Data Induk, program/tugas/rapat, dokumen, master SDM/rekrutmen, keuangan, kasus/layanan BK, nilai, jurnal, kejadian disiplin, izin/cuti dan bukti kinerja mendapatkan kontrol daftar sesuai fungsinya: pencarian, filter yang relevan, 25/50/100 baris, serta pilihan massal pada data yang boleh diubah.
- Siswa/penugasan dan BK mempunyai filter kelas. Siswa, dokumen, program dan SDM mempunyai filter status. Nilai/jurnal/disiplin mempertahankan filter kelas/mapel/pencarian yang sudah ada.
- 104 dropdown field dikonversi menjadi pilihan yang dapat dicari. Data referensi menyimpan ID sebenarnya. Kelas/mapel baru di Data Induk dibuat melalui RPC yang sudah dilindungi, sedangkan status kerja dan metode pembayaran menerima teks khusus. Enum/role/status proses tetap menggunakan nilai sah.
- Pilihan massal memiliki konfirmasi, jumlah pilihan dan laporan sukses/gagal per ID. Pilih halaman ini hanya memilih baris yang boleh ditindak pada halaman yang terlihat. Data yang ditolak tetap dipilih. Siswa aktif diarsipkan dulu; dokumen disahkan, bukti terverifikasi, pengajuan final dan data terkait akun dilindungi.
- Query koleksi utama mengambil halaman yang diizinkan secara eksplisit agar batas respons Supabase 1.000 baris tidak memotong hasil pencarian. Urutan memakai kolom identitas yang benar, termasuk `student_id` untuk kontak dan `user_id` untuk anggota.
- Tidak ada migrasi database atau perubahan data sekolah asli. Definisi RPC profil siswa diperiksa secara read-only untuk memastikan arsip massal mempertahankan seluruh field profil yang ditulis fungsi tersebut.

## Verifikasi

TypeScript, build produksi dan 11 suite regresi diperiksa. Suite baru menguji pencarian multi-kata/NIS, kombinasi filter kelas/status, batch tanpa duplikasi, kegagalan parsial serta pembacaan 2.101 baris melalui tiga halaman API.

Browser memakai 61 siswa sintetis dengan dua kelas. Pemeriksaan mencakup posisi Excel sebelum tabel, pencarian NIS, filter kelas, 50/11 baris pada dua halaman, arsip dua siswa dengan satu kegagalan yang tetap dipilih, serta kelas manual yang dibuat sebagai record dan dihubungkan ke siswa dengan UUID. Seluruh 174 layar dan layout representatif pada 320/390/768/1366 px diperiksa oleh `scripts/verify-workspace-browser.cjs`.

Bukti terstruktur: `docs/qa/workspace-browser-results.json`. Browser menggunakan API yang diintersepsi; hasilnya tidak merupakan pengesahan seluruh operasi terhadap database produksi atau pembayaran merchant.
