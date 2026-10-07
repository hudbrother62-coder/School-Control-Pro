import type { Metadata } from "next";
import "./globals.css";
import "./sekola-pro-v2.css";
export const metadata:Metadata={title:"SekolaPro | Satu Sekolah, Semua Terkelola",applicationName:"SekolaPro",description:"Kelola pembelajaran, kesiswaan, agenda, keuangan, pegawai, dan laporan sekolah dalam satu ruang kerja dengan akses sesuai peran.",icons:{icon:"/sekola-pro-mark.svg",shortcut:"/sekola-pro-mark.svg",apple:"/sekola-pro-mark.svg"},robots:{index:true,follow:true},openGraph:{title:"SekolaPro — Satu Sekolah, Semua Terkelola",description:"Guru, kepala sekolah, dan tim bekerja dari data yang saling terhubung.",type:"website"}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="id"><body>{children}</body></html>}
