import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"School Control | Satu Sistem, Semua Urusan Sekolah",description:"Satu sistem manajemen sekolah terintegrasi: Guru AI, Kepsek AI, Buku Kerja Digital, Disiplin Pro, BK Pro, Command Pro, keuangan dan penggajian. Uji coba gratis 3 hari.",robots:{index:true,follow:true},openGraph:{title:"School Control — Satu Sistem, Semua Urusan Sekolah",description:"Administrasi dan manajemen sekolah terhubung. Coba gratis 3 hari.",type:"website"}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="id"><body>{children}</body></html>}
