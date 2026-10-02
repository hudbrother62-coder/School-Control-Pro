# Inventaris setiap submenu School Control

> Catatan 2 Oktober 2026: inventaris di bawah adalah checkpoint sebelum penyederhanaan navigasi. Registry aktif ada di `lib/modules.ts`; daftar layar aktif yang telah diuji ada di `docs/qa/workspace-browser-results.json`, dan panduan pengguna terbaru ada di `public/panduan-school-control.md`. Detail perubahan dan batas QA ada di `docs/NAVIGATION_MOBILE_QA_20261002.md`.

Daftar diambil dari seluruh registry navigasi dan dipetakan ke komponen yang dipanggil router. Ini adalah inventaris kode, bukan klaim bahwa semua alur telah lulus E2E. Kolom Excel hanya mendeteksi adanya pembaca/penulis Excel dalam komponen; belum membuktikan bahwa setiap submenu memiliki import sendiri. Semua baris tetap membutuhkan verifikasi formulir, otorisasi, CRUD/arsip, template, import/export, laporan dan tampilan responsif yang berlaku.

## Beranda

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Ringkasan Operasional | DashboardOverview | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Analitik Sekolah | DashboardOverview | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Agenda & Deadline | DashboardOverview + SchoolCalendar | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |

## Data Induk

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Siswa | MasterHubV2 | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Kelas | MasterHubV2 | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Guru | MasterHubV2 | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Tenaga Kependidikan | MasterHubV2 | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Mata Pelajaran | MasterHubV2 | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Penugasan Guru | MasterHubV2 | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Import Excel Keseluruhan | MasterHubV2 | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |

## Agenda Sekolah

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Kalender Sekolah | SchoolCalendar | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Rekap Agenda | SchoolCalendar | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Agenda Pribadi | SchoolCalendar | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Agenda Pengguna | SchoolCalendar | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Kehadiran Agenda | SchoolCalendar | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |

## Pusat Laporan

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Ringkasan Laporan | ReportCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Akademik | ReportCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Kehadiran | ReportCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Disiplin | ReportCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| BK | ReportCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Program & Tugas | ReportCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Keuangan | ReportCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| SDM & Payroll | ReportCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Supervisi | ReportCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Arsip Laporan | ReportArchive | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |

## Perangkat Ajar AI

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Proyek Pembelajaran | AIProjectManager | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Modul Ajar | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| RPP | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| LKPD | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Asesmen Soal | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Strategi Pembelajaran | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Bahan Ajar | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Rubrik Penilaian | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Panduan Presentasi | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Peta Konsep | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Ngobrol AI | AIProjectManager | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Riwayat draf | AIProjectManager | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Koneksi AI | AIProjectManager | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |

## Pembelajaran & Penilaian

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Mode Kerja Guru | AcademicLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Presensi Siswa | AcademicAdvanced | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Lembar Nilai | GradeBook | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Jurnal Mengajar | TeachingJournal | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Agenda Mengajar | SchoolData | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Jadwal Mingguan | AcademicLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Asisten Kelas | AcademicLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Rekap Bulanan | AcademicAdvanced | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Laporan Kelas | AcademicAdvanced | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Laporan Lengkap | AcademicLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Import/Export Excel | SchoolData | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |

## Disiplin & Prestasi

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Pelanggaran | DisciplinePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Prestasi | DisciplinePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Pembinaan | DisciplinePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Tindak Lanjut | DisciplinePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Master Data | DisciplinePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Rekap & Laporan | DisciplineLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Analitik Disiplin | DisciplineLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Arsip Siswa | DisciplineLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Import Riwayat | DisciplineLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Surat & Dokumen | DisciplineLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Template Laporan | DisciplineReportTemplate | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |

## Bimbingan Konseling

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Kasus & Asesmen | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Pemetaan Kebutuhan | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Konseling Individu | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Konseling Kelompok | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Layanan Klasikal | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| RPL Layanan | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Program BK | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Agenda BK | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Tindak Lanjut | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Kunjungan Rumah | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Rujukan | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Perencanaan Karier | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Dokumen BK | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Siswa 360° | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Analitik BK | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Laporan BK | BKPanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |

## Perencanaan & Supervisi

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| PBD/EDS | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| KSP/KOSP | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| RKJM | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| RKT | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| RKAS | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| SOP | AIWorkbench + DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Kinerja Kepala Sekolah | ManagementLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Supervisi guru | Supervision | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Pusat dokumen | DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Workflow Dokumen | ManagementLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Sumber Dokumen | ManagementLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Pustaka Format | ManagementLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Arsip Laporan | ReportArchive | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Asisten Kepsek | AIProjectManager | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Persetujuan dokumen | DocumentCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |

## Program, Tugas & Agenda

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Program Kerja | CommandBoard | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| PIC | CommandBoard | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Tugas | CommandBoard | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Deadline | CommandBoard | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Progres | CommandBoard | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Kendala | CommandBoard | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Hasil Rapat | CommandBoard | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Tindak Lanjut Rapat | CommandLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Agenda | CommandBoard | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Bukti Kegiatan | CommandBoard | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Verifikasi Bukti | CommandLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Laporan Program | CommandLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |

## Presensi Realtime

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Check-in/check-out | app/app/page | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Jadwal/shift | StaffWorkflows | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Riwayat kehadiran | app/app/page | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Koreksi beralasan | StaffWorkflows | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Izin | StaffWorkflows | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Cuti | StaffWorkflows | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |

## Kinerja & Pengembangan

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Kehadiran | app/app/page | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Partisipasi program | StaffWorkflows | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Pelatihan | StaffWorkflows | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Bukti capaian | StaffWorkflows | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Evaluasi | PerformanceReviews | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Tanggapan guru | PerformanceReviews | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |

## SDM, Payroll & Kompensasi

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Pengajuan SDM | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Lembur | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Kasbon | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Reimburse | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Tim SDM | SupervisorLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Tim Saya | SupervisorLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Kehadiran Tim | SupervisorLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Approval Tim | SupervisorLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Rekap Tim | SupervisorLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Jadwal Kerja | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Lokasi Presensi | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Komponen Dinamis | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Komponen Gaji | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Tunjangan | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Potongan | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Draft Payroll | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Review | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Approval | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Kunci Periode | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Rekap Payroll | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Rekrutmen | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Kunjungan Lapangan | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Pelacakan Lokasi | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Laporan HR | HRLegacyParity | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |

## Slip Gaji Saya

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Riwayat Slip | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Cetak Slip | PayrollPanel | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |

## Keuangan, Anggaran & Tagihan

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Dashboard Keuangan | FinancePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Kas/Rekening | FinancePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Pemasukan | FinancePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Pengeluaran | FinancePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Bukti Transaksi | FinanceLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Anggaran | FinancePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Realisasi Anggaran | FinanceLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Tagihan Siswa | FinancePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Pembayaran | FinancePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Riwayat Pembayaran | FinanceLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| WhatsApp Tagihan | FinanceLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Kuitansi | FinancePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Buku Kas Umum | FinanceLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Laporan | FinanceLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |
| Import/Export | FinancePanel | Pembaca tersedia; penulis tersedia | Belum disahkan E2E |
| Tim Keuangan | FinanceLegacyParity | Tidak ada pembaca langsung; penulis tersedia | Belum disahkan E2E |

## Akses & Peran

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Tambah Pengguna | AccessPanel | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Anggota Tim | AccessPanel | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Struktur Peran | AccessPanel | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Hak Akses Fitur | AccessPanel | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |

## Pengaturan Sekolah

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Profil sekolah | SchoolProfile | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Identitas & Kontak | SchoolProfile | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Lokasi Sekolah | SchoolProfile | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Akademik | SchoolProfile | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Branding | SchoolProfile | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Memori sekolah | SchoolProfile | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Langganan | BillingPanel + app/app/page | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Riwayat pembayaran | BillingPanel + app/app/page | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |

## Panduan Penggunaan

| Submenu | Implementasi | Indikasi Excel pada komponen | Verifikasi lengkap |
|---|---|---|---|
| Mulai dari Sini | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Data Induk | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Agenda & Absensi | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Perangkat Ajar AI | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Jurnal & Penilaian | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Disiplin & Prestasi | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Bimbingan Konseling | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Program & Tugas | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Keuangan | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| SDM & Payroll | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |
| Akses & Pengaturan | GuideCenter | Tidak ada pembaca langsung; tidak ada penulis langsung | Belum disahkan E2E |

Jumlah: 18 modul, 180 submenu. Tidak ada submenu registry yang dibuang dari inventaris.
