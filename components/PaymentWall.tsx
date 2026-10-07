"use client";
import {LockKeyhole,RefreshCw,CalendarClock,ShieldCheck} from "lucide-react";
import "./paywall.css";

export default function PaymentWall({schoolName,paused,busy,onRefresh}:{schoolName:string;trialEnd:string;status:string;owner:boolean;paused?:boolean;onCheckout:(p:"monthly"|"yearly")=>void;busy:boolean;onRefresh:()=>void}){
 return <main className="paywall"><div className="paywall-mark"><LockKeyhole size={28}/></div><span className="paywall-kicker">STATUS AKUN SEKOLAPRO</span><h1>{paused?"Akses sekolah dijeda.":"Masa aktif sekolah berakhir."}</h1>
 <p>{paused?"Super Admin telah menonaktifkan sementara akses sekolah":"Langganan bulanan untuk sekolah"} <b>{schoolName}</b>{paused?".": " telah mencapai tanggal jatuh tempo."} Data sekolah tetap tersimpan aman dan tidak dihapus.</p>
 <div className="paywall-perks"><span><ShieldCheck size={17}/> Data sekolah tetap tersimpan</span><span><CalendarClock size={17}/> Konfirmasi pembayaran hanya melalui Super Admin</span></div>
 <div className="paywall-info">Hubungi pengelola SekolaPro untuk konfirmasi pembayaran atau pembukaan kembali akun. Setelah pengelola mengaktifkan akses, Anda bisa melanjutkan pekerjaan dengan data sebelumnya.</div>
 <button className="paywall-refresh" disabled={busy} onClick={onRefresh}><RefreshCw size={16}/> Periksa ulang status akun</button>
 <small className="paywall-note">Status akses diverifikasi dari database server. Perubahan tanggal perangkat tidak memperpanjang akses.</small></main>;
}
