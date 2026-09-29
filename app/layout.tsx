import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"School Control | Satu Sistem, Semua Urusan Sekolah",description:"Sistem manajemen sekolah SaaS terintegrasi dengan presensi guru, kinerja, akademik, keuangan, BK dan AI."};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="id"><body>{children}</body></html>}
