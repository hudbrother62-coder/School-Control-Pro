"use client";
import {AlertCircle,CalendarClock,CheckCircle2,LockKeyhole,RefreshCw,ShieldCheck} from "lucide-react";
import FormulirPayment from "@/components/FormulirPayment";
import "./paywall.css";

type Props={
 schoolId:string;schoolName:string;trialEnd:string;status:string;owner:boolean;
 paused?:boolean;onCheckout:(plan:"monthly")=>void;busy:boolean;onRefresh:()=>void;
};
const formattedDate=(value:string)=>{
 const time=Date.parse(value);
 return Number.isFinite(time)?new Date(time).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"}):null;
};

export default function PaymentWall({schoolId,schoolName,trialEnd,status,owner,paused,busy,onRefresh}:Props){
 const demoExpired=!paused&&status==="trial";
 const headline=paused?"Akses Sekolah Sedang Dinonaktifkan":demoExpired?"Masa Demo Sekolapro Telah Berakhir":"Masa Berlangganan Telah Berakhir";
 const reason=paused
  ?"Akses sekolah sedang dinonaktifkan oleh Super Admin. Login tetap tersedia, tetapi modul dan perubahan data dibatasi sampai akun diaktifkan."
  :demoExpired
   ?"Demo gratis sekolah Anda sudah selesai. Untuk melanjutkan, lakukan pembayaran melalui formulir Sekolapro."
   :"Masa aktif sekolah sudah selesai atau belum diaktifkan. Perpanjang langganan agar seluruh fitur dapat digunakan kembali.";
 const deadline=demoExpired?formattedDate(trialEnd):null;
 return <main className="paywall paywall-recovery" aria-labelledby="paywall-title">
  <div className="paywall-top">
   <span className={"paywall-status "+(paused?"is-paused":"is-expired")}><AlertCircle size={15}/>{paused?"AKUN DINONAKTIFKAN":demoExpired?"DEMO SELESAI":"LANGGANAN BERAKHIR"}</span>
   <div className="paywall-mark"><LockKeyhole size={27}/></div>
   <span className="paywall-kicker">SEKOLAPRO · PENGELOLAAN AKSES SEKOLAH</span>
   <h1 id="paywall-title">{headline}</h1>
   <p className="paywall-lead">{reason}</p>
   <div className="paywall-school"><span>AKUN SEKOLAH</span><strong>{schoolName}</strong>{deadline&&<small>Demo berakhir pada {deadline}</small>}</div>
  </div>
  <section className="paywall-next" aria-label="Langkah berikutnya">
   <div className="paywall-next-heading"><CheckCircle2 size={20}/><div><strong>{paused?"Hubungi Super Admin untuk aktivasi kembali":"Aktifkan kembali akses Sekolapro"}</strong><span>{paused?"Status akses hanya bisa diperbarui oleh pengelola.":"Pembayaran dilakukan melalui formulir resmi; aktivasi tetap diverifikasi manual."}</span></div></div>
   {!paused&&<>
    <div className="paywall-payment-summary">
     <span><CalendarClock size={16}/> Langganan bulanan</span>
     <strong>Rincian harga dan metode pembayaran tersedia di formulir</strong>
    </div>
    {owner?<FormulirPayment schoolName={schoolName}/>:<p className="paywall-owner-note">Hanya pemilik akun sekolah yang dapat melakukan pemesanan. Hubungi pemilik sekolah atau Customer Service Sekolapro.</p>}
   </>}
   <div className="paywall-verification"><ShieldCheck size={19}/><p><strong>{paused?"Menunggu keputusan Super Admin.":"Setelah pembayaran, tunggu verifikasi."}</strong> {paused?"Pengaktifan kembali tidak dilakukan oleh pengguna.":"Customer Service akan mencocokkan transaksi, lalu Super Admin mengaktifkan langganan sekolah. Membuka formulir atau mengunggah bukti tidak otomatis membuka akses."}</p></div>
   <button type="button" className="paywall-refresh" disabled={busy} onClick={onRefresh}><RefreshCw size={16}/> {busy?"Memeriksa status…":"Periksa Status Akun"}</button>
  </section>
  <div className="paywall-perks"><span><ShieldCheck size={16}/> Data sekolah tidak dihapus</span><span><CalendarClock size={16}/> Login tetap dapat digunakan</span></div>
  <small className="paywall-note">Penguncian fitur dan masa aktif mengikuti waktu serta izin dari server, bukan tanggal perangkat.</small>
 </main>;
}
