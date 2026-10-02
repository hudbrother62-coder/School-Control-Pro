# Navigasi, panduan dan mobile — 2 Oktober 2026

## Perubahan

- Asisten AI memiliki navigasi sendiri; chat guru, kepala sekolah, kelas, rencana pekerjaan dan koneksi berada di satu tempat sesuai akses.
- Menu yang menampilkan pekerjaan sama digabung: proses payroll, komponen gaji dasar, riwayat/cetak slip, profil/kontak sekolah, struktur peran/izin fitur. Agenda dan arsip diarahkan ke sumber utama. Navigasi pelacakan lapangan yang tidak diperlukan di sekolah disembunyikan tanpa menghapus datanya.
- Sidebar menjadi komponen stabil. Pergantian fitur mereset state lokal layar; URL, tombol kembali dan reload mempertahankan rute yang valid menurut peran.
- Mobile mendapat pilihan submenu, tombol navigasi bawah, drawer di atas header, fokus/Escape/scroll lock, modal di body dan layout 320–1366 px.
- Jadwal kerja, lokasi presensi, komponen payroll dinamis dan rekrutmen dipulihkan ke formulir yang benar. Sebelumnya jadwal menampilkan rekrutmen dan tiga menu lain jatuh ke laporan HR.
- Dashboard keuangan berbeda dari kas/rekening; persetujuan dokumen hanya menampilkan review; konteks pembelajaran tersedia dari setiap generator; dokumen tidak lagi diduplikasi di setiap alat AI.
- Rencana pekerjaan memeriksa rute dan peran; parsing Bearer yang menghalangi API diperbaiki. Rencana tidak mengeksekusi perubahan data otomatis.
- Bantuan mengikuti layar dan peran, menyediakan tautan langsung dan panduan lengkap yang dapat diunduh dari `/panduan-school-control.md`.

## Bukti pengujian

- TypeScript, build produksi dan 10 suite regresi lulus, termasuk pendaftaran, Excel, validasi SDM, Midtrans, isolasi akses, navigasi dan API rencana pekerjaan.
- 1.076 kombinasi peran/rute, alias lama, hash dan bantuan diperiksa oleh `verify-navigation.cjs`.
- Browser membuka 174 layar: seluruh fitur pemilik yang terlihat dan fitur BK konselor. Tidak ditemukan error JavaScript atau overflow halaman desktop.
- Sepuluh rute representatif diuji pada 320, 390, 768 dan 1366 px; drawer, modal portal, Escape, tautan bantuan, kembali browser dan pergantian layar diuji.
- Uji formulir SDM memastikan jadwal mengirim ke `sc_hr_work_schedules`, GPS/radius ke `sc_hr_locations`, komponen gaji ke `sc_payroll_component_catalog`, dan lowongan draft ke `sc_recruitment_openings`.
- Hasil terstruktur ada di `docs/qa/workspace-browser-results.json`. Script browser dapat dijalankan dengan `CHROMIUM_EXECUTABLE_PATH` menuju Chromium lokal.

## Batas verifikasi

Browser menggunakan identitas sintetis dan API yang diintersepsi. Tidak ada login baru, perubahan data sekolah asli, pembayaran merchant atau panggilan AI berbayar dalam pengujian ini. Hasil ini membuktikan rendering, navigasi, validasi tertentu dan tujuan permintaan; belum merupakan pengesahan E2E seluruh operasi terhadap layanan produksi. Tidak ada migrasi database pada perubahan ini.
