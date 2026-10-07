"use client";
import {useEffect,useMemo,useState} from "react";
import {CalendarClock,CheckCircle2,Clock3,CreditCard,FileClock,RefreshCw,ShieldCheck,Wallet} from "lucide-react";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import {subscriptionTimeline} from "@/lib/subscription-timeline";
import {browserDb} from "@/lib/supabase";
import "./billing.css";

type Order={order_id:string;gross_amount:number;period_days:number;status:string;paid_at:string|null;created_at:string};
type Sub={status:string;trial_ends_at:string|null;current_period_end:string|null;updated_at:string|null};
const rupiah=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value)||0);
const date=(value:string|null|undefined)=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString("id-ID",{dateStyle:"long",timeStyle:"short",timeZone:"Asia/Jakarta"})+" WIB":"—";
const paymentLabel=(value:string)=>({paid:"Lunas",pending:"Menunggu",failed:"Gagal",expired:"Kedaluwarsa"} as Record<string,string>)[value]||value;

export default function BillingPanel({schoolId,isOwner}:{schoolId:string;isOwner:boolean}){
 const db=useMemo(()=>browserDb(),[]);
 const [sub,setSub]=useState<Sub|null>(null);
 const [orders,setOrders]=useState<Order[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [lastSync,setLastSync]=useState<string|null>(null);
 async function load(){
  if(!db||!schoolId){setLoading(false);return;}
  setError("");
  const [subscription,payments]=await Promise.all([
   db.from("sc_subscriptions").select("status,trial_ends_at,current_period_end,updated_at").eq("school_id",schoolId).maybeSingle(),
   db.from("sc_payment_orders").select("order_id,gross_amount,period_days,status,paid_at,created_at").eq("school_id",schoolId).order("created_at",{ascending:false}).limit(100)
  ]);
  if(subscription.error||payments.error)setError(subscription.error?.message||payments.error?.message||"Data tidak dapat dimuat.");
  if(!subscription.error)setSub(subscription.data as Sub|null);
  if(!payments.error)setOrders((payments.data||[]) as Order[]);
  setLastSync(new Date().toISOString());
  setLoading(false);
 }
 useEffect(()=>{setSub(null);setOrders([]);setLoading(true);void load();},[db,schoolId]);
 useRealtimeRefresh(schoolId,()=>{void load()});
 const timeline=sub?subscriptionTimeline({status:sub.status,trial_ends_at:sub.trial_ends_at,current_period_end:sub.current_period_end,updated_at:sub.updated_at}):null;
 const paidOrders=orders.filter(o=>o.status==="paid"&&o.paid_at);
 const lastPayment=paidOrders.reduce<Order|null>((current,order)=>!current||Date.parse(order.paid_at!)>Date.parse(current.paid_at!)?order:current,null);
 const lastChange=lastPayment?.paid_at||sub?.updated_at||null;
 const activePaid=!!timeline?.active&&sub?.status==="active";
 
 const endDate=sub?.current_period_end||null;
 const statusLabel=loading?"Memuat…":activePaid?"Aktif":"Nonaktif";
 const remaining=timeline?.active?(timeline.hoursLeft<24?timeline.hoursLeft+" jam":timeline.dueDays+" hari"):"0 hari";
 const daysPassed=endDate&&Number.isFinite(Date.parse(endDate))?Math.max(0,30-(Date.parse(endDate)-Date.now())/86400000):0;
 const progress=activePaid?Math.max(0,Math.min(100,(daysPassed/30)*100)):0;
 return <section className="billing-page" aria-label="Langganan dan riwayat pembayaran">
  <header className="billing-heading">
   <div><span className="billing-eyebrow"><ShieldCheck size={15}/> SEKOLAPRO · AKUN SEKOLAH</span><h2>Langganan & Riwayat</h2><p>Status berlangganan, masa berlaku, perpanjangan, dan semua transaksi dalam satu tempat.</p></div>
   <button type="button" className="billing-refresh" disabled={loading} onClick={()=>{setLoading(true);void load()}}><RefreshCw size={16} className={loading?"billing-spin":""}/> {loading?"Memperbarui":"Perbarui status"}</button>
  </header>
  <div className="billing-summary">
   <div className="billing-summary-head"><div><div className="billing-plan-name"><Wallet size={18}/> SekolaPro Bulanan</div><strong>1 bulan<span> / periode</span></strong><p>Akses seluruh modul SekolaPro untuk satu sekolah dan akun anggotanya.</p></div><span className={"billing-status "+(activePaid?"is-active":"is-inactive")}>{activePaid?<CheckCircle2 size={15}/>:<Clock3 size={15}/>} {statusLabel}</span></div>
   <div className="billing-dates">
    <div><span><CalendarClock size={17}/> Masa aktif berakhir</span><strong>{date(endDate)}</strong><small>{timeline?.active?"Akses tersedia sampai tanggal tersebut.":"Memerlukan konfirmasi aktivasi atau perpanjangan."}</small></div>
    <div><span><RefreshCw size={17}/> Terakhir diperbarui</span><strong>{date(lastChange)}</strong><small>{lastPayment?"Berdasarkan pembayaran yang terkonfirmasi.":"Berdasarkan pembaruan status akun oleh sistem."}</small></div>
    <div><span><Clock3 size={17}/> Jadwal perpanjangan</span><strong>{date(activePaid?sub?.current_period_end:null)}</strong><small>{activePaid?"Jatuh tempo sebelum masa aktif berakhir.":"Jadwal tersedia setelah langganan diaktifkan."}</small></div>
   </div>
   {activePaid&&<div className="billing-progress"><div><span>Sisa masa berlangganan</span><strong>{remaining}</strong></div><div className="billing-track" role="progressbar" aria-label="Perjalanan masa langganan 30 hari" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{width:progress+"%"}}/></div></div>}
   <div className="billing-notice"><ShieldCheck size={19}/><div><strong>Perpanjangan dikelola Super Admin</strong><p>{activePaid?"Perpanjangan berlaku setelah Super Admin mencatat konfirmasi pembayaran.":"Hubungi Super Admin SekolaPro untuk konfirmasi pembayaran dan pengaktifan akses."} Data sekolah tetap tersimpan apabila masa akses berakhir.</p></div></div>
  </div>
  <section className="billing-history">
   <div className="billing-history-heading"><div><span className="billing-eyebrow"><FileClock size={15}/> CATATAN PEMBAYARAN</span><h3>Riwayat langganan</h3><p>Transaksi gateway yang tercatat untuk sekolah ini. Konfirmasi perpanjangan manual dilakukan oleh Super Admin dan tidak selalu muncul sebagai transaksi gateway.</p></div><span className="billing-count">{orders.length} transaksi</span></div>
   <div className="billing-table-wrap"><table className="billing-table"><thead><tr><th>Tanggal transaksi</th><th>ID transaksi</th><th>Nominal</th><th>Masa</th><th>Status</th><th>Dikonfirmasi</th></tr></thead><tbody>{orders.map(o=><tr key={o.order_id}><td>{date(o.created_at)}</td><td className="billing-order-id">{o.order_id}</td><td><strong>{rupiah(o.gross_amount)}</strong></td><td>{o.period_days} hari</td><td><span className={"billing-payment-status "+o.status}>{paymentLabel(o.status)}</span></td><td>{date(o.paid_at)}</td></tr>)}</tbody></table>
   {!loading&&orders.length===0&&<div className="billing-empty"><CreditCard size={24}/><strong>Belum ada pembayaran yang tercatat</strong><p>Belum ada transaksi dari gateway. Pembayaran yang dikonfirmasi manual dikelola Super Admin.</p></div>}
   {loading&&orders.length===0&&<div className="billing-empty">Memuat riwayat pembayaran…</div>}</div>
   <div className="billing-bottom"><span>{lastSync?"Pembaruan terakhir: "+date(lastSync):"Menunggu sinkronisasi data"} · Zona waktu WIB</span><span>{isOwner?"Akses pengelolaan akun utama":"Akses informasi kepala sekolah"}</span></div>
  </section>
  {error&&<div className="banner error" role="alert">{error}</div>}
 </section>;
}
