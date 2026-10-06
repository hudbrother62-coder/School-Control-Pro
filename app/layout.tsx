import type { Metadata } from "next";
import "./globals.css";
import "./sekola-pro-v2.css";
export const metadata:Metadata={title:"SekolaPro | Satu Sistem, Semua Urusan Sekolah",applicationName:"SekolaPro",description:"Satu sistem manajemen sekolah terintegrasi: Guru AI, Kepsek AI, Buku Kerja Digital, Disiplin Pro, BK Pro, Command Pro, keuangan, penggajian dan Universal AI Orchestrator.",icons:{icon:"/sekola-pro-mark.svg",shortcut:"/sekola-pro-mark.svg",apple:"/sekola-pro-mark.svg"},robots:{index:true,follow:true},openGraph:{title:"SekolaPro — Satu Sistem, Semua Urusan Sekolah",description:"Administrasi dan manajemen sekolah terhubung dalam satu control plane.",type:"website"}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="id"><body>{children}</body></html>}
