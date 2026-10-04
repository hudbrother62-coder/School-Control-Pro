# Agenda dan tampilan — 4 Oktober 2026

## Perubahan
- Detail pelanggan Super Admin serta notifikasi/pencarian global berada dalam dialog portal terpusat dengan fokus, Escape dan gulir internal.
- Enam lampiran ditinjau: detail inline, notifikasi, ruang kerja, dua tampilan prestasi dan navigasi agenda. Jarak tombol/nomor, kolom checkbox–ikon–isi–aksi, dropdown gelap serta overflow admin mobile diperbaiki.
- Landing page baru: komposisi biru/ink, preview produk, alur kerja, fitur, harga dan FAQ; transisi halus, tema gelap/terang, reduced-motion dan layout mobile.
- Navigasi dikelompokkan dalam accordion. Analitik menyatu di Ringkasan Operasional; Agenda & Deadline menuju Kalender Sekolah; Agenda Pengguna menyatu di filter pengguna Rekap Agenda. Tautan lama tetap diarahkan.
- Kalender sekolah menampilkan kegiatan sekolah non-pembelajaran; mengajar menampilkan jadwal mingguan kanonis dan kegiatan pembelajaran; pribadi hanya milik pengguna; rekap memiliki periode/kategori/pengguna; kehadiran hanya agenda yang mewajibkan pengguna tersebut.
- Pengelola memilih peran ATAU anggota wajib, terpisah dari sasaran tampilan agenda. Pembuat tidak otomatis wajib hadir. Agenda pribadi tidak memiliki presensi wajib.
- Alamat dan titik koordinat diatur pada agenda; lokasi tersimpan dapat disalin. Radius tetap 100 m, tanpa penambahan toleransi berdasarkan akurasi GPS. Server memeriksa anggota, hak akses, langganan, waktu sekolah, GPS, akurasi dan jarak; menolak penulisan presensi langsung.
- Tanggal awal mengikuti zona waktu sekolah, bukan perangkat. Posisi perangkat selalu diminta baru.
- Template/import/export Excel agenda memuat konfigurasi sasaran dan lokasi; baris gagal tetap dapat diperbaiki/dicoba kembali. Panduan pengguna diperbarui.

## Verifikasi
- Build produksi, lint, 16 suite unit/regresi dan 1.124 kombinasi navigasi/peran lulus.
- Uji SQL transaksional rollback: sasaran peran/pengguna, pembuat non-sasaran, antar-sekolah, viewer, tanpa GPS, akurasi buruk, waktu masa depan, batas 100 m, idempotensi dan hak akses presensi lulus.
- Browser integrasi menguji 180 layar menu serta lebar 320/390/768/1366. Pemeriksaan fokus/popup, prestasi dan detail admin mobile dilakukan ulang setelah koreksi.
- Alur Auth/database nyata menggunakan sekolah internal sementara. Koordinat perangkat disimulasikan melalui API browser, sementara validasi jarak/waktu dan pencatatan dilakukan server nyata. Hasil rinci berada di agenda-live-results.json; fixture dibersihkan setelah uji produksi.

## Batas cakupan
Agenda lama yang belum mempunyai alamat/koordinat perlu dilengkapi pengelola sebelum presensi. Uji ini tidak mengklaim verifikasi hardware GPS semua perangkat, transaksi gateway pembayaran atau keluaran model AI eksternal.

## Hasil website publik
Deployment aplikasi a9f18ff8c7f7758a4ceaf4cfd60a9702c70ba0ce READY pada https://school-control-pro.vercel.app/.
Uji Auth/database/browser pada domain publik lulus delapan pemeriksaan dalam agenda-production-results.json. Landing page baru, anchor dan lebar 320/390/768/1366 juga lulus. Direktori tim diperbaiki dengan cast email varchar ke text sehingga pilihan anggota dan tabel pemantauan terisi.
Sekolah internal sementara, tiga akun, agenda, presensi serta sinyal perubahan sudah dihapus; seluruh hitungan terkait kembali nol. Fixture lokal berisi kredensial dihapus.
