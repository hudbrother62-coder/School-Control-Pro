"use client";
import {useEffect,useMemo,useState} from "react";
import {CalendarClock,CheckCircle2,Clock3,CreditCard,FileClock,RefreshCw,ShieldCheck,Wallet} from "lucide-react";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import {subscriptionTimeline} from "@/lib/subscription-timeline";
import {plans} from "@/lib/pricing";
import {browserDb} from "@/lib/supabase";
import "./billing.css";

type Order={order_id:string;gross_amount:number|null;period_days:number;status:string;paid_at:string|null;created_at:string;source:"manual"|"gateway";period_end:string|null};
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
   db.rpc("sc_school_subscription_history",{p_school:schoolId})
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
 const lastChange=sub?.updated_at||lastPayment?.paid_at||null;
 const activePaid=!!timeline?.active&&sub?.status==="active";
 const activeTemporary=!!timeline?.active&&sub?.status==="trial";
 const endDate=activePaid?sub?.current_period_end||null:activeTemporary?sub?.trial_ends_at||null:sub?.current_period_end||sub?.trial_ends_at||null;
 const statusLabel=loading?"Memuat…":activePaid?"Aktif":activeTemporary?"Akses sementara":"Nonaktif";
 const remaining=timeline?.active?(timeline.hoursLeft<24?timeline.hoursLeft+" jam":timeline.dueDays+" hari"):"0 hari";
 const periodStart=sub?.updated_at?Date.parse(sub.updated_at):NaN;
 const periodEnd=endDate?Date.parse(endDate):NaN;
 const progress=activePaid&&Number.isFinite(periodStart)&&Number.isFinite(periodEnd)&&periodEnd>periodStart
  ?Math.max(0,Math.min(100,100*(Date.now()-periodStart)/(periodEnd-periodStart))):0;
 return <section className="billing-page" aria-label="Langganan dan riwayat pembayaran">
  <header className="billing-heading">
   <div><span className="billing-eyebrow"><ShieldCheck size={15}/> SEKOLAPRO · AKUN SEKOLAH</span><h2>Langganan & Riwayat</h2><p>Status berlangganan, masa berlaku, perpanjangan, dan semua transaksi dalam satu tempat.</p></div>
   <button type="button" className="billing-refresh" disabled={loading} onClick={()=>{setLoading(true);void load()}}><RefreshCw size={16} className={loading?"billing-spin":""}/> {loading?"Memperbarui":"Perbarui status"}</button>
  </header>
  <div className="billing-summary">
   <div className="billing-summary-head"><div><div className="billing-plan-name"><Wallet size={18}/> SekolaPro Bulanan</div><strong>{rupiah(plans.monthly.price)}<span> / bulan</span></strong><p>Akses seluruh modul SekolaPro untuk satu sekolah dan akun anggotanya.</p></div><span className={"billing-status "+(activePaid?"is-active":activeTemporary?"is-temporary":"is-inactive")}>{activePaid?<CheckCircle2 size={15}/>:<Clock3 size={15}/>} {statusLabel}</span></div>
   <div className="billing-dates">
    <div><span><CalendarClock size={17}/> Masa aktif berakhir</span><strong>{date(endDate)}</strong><small>{timeline?.active?"Akses tersedia sampai tanggal tersebut.":"Memerlukan konfirmasi aktivasi atau perpanjangan."}</small></div>
    <div><span><RefreshCw size={17}/> Terakhir diperbarui</span><strong>{date(lastChange)}</strong><small>{"Sama dengan catatan pembaruan pada Super Admin."}</small></div>
    <div><span><Clock3 size={17}/> Jadwal perpanjangan</span><strong>{date(activePaid?sub?.current_period_end:null)}</strong><small>{activePaid?"Jatuh tempo sebelum masa aktif berakhir.":"Jadwal tersedia setelah langganan diaktifkan."}</small></div>
   </div>
   {activePaid&&<div className="billing-progress"><div><span>Sisa masa berlangganan</span><strong>{remaining}</strong></div><div className="billing-track" role="progressbar" aria-label="Masa yang telah berjalan sejak pembaruan terakhir" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{width:progress+"%"}}/></div></div>}
   <div className="billing-notice"><ShieldCheck size={19}/><div><strong>Perpanjangan dikelola Super Admin</strong><p>{activePaid?"Setelah pembayaran dikonfirmasi, masa aktif baru otomatis tampil di sini dan di dasbor Super Admin.":activeTemporary?"Akses sementara masih berjalan. Hubungi Super Admin SekolaPro untuk aktivasi berbayar.":"Hubungi Super Admin SekolaPro untuk konfirmasi pembayaran dan pengaktifan akses."} Data sekolah tetap tersimpan apabila masa akses berakhir.</p></div></div>
  </div>
  <section className="billing-history">
   <div className="billing-history-heading"><div><span className="billing-eyebrow"><FileClock size={15}/> CATATAN PEMBAYARAN</span><h3>Riwayat langganan</h3><p>Semua pembayaran yang tercatat untuk sekolah ini. Status hanya berubah setelah pembayaran terverifikasi atau dikonfirmasi Super Admin.</p></div><span className="billing-count">{orders.length} transaksi</span></div>
   <div className="billing-table-wrap"><table className="billing-table"><thead><tr><th>Tanggal transaksi</th><th>ID transaksi</th><th>Nominal</th><th>Masa</th><th>Status</th><th>Dikonfirmasi</th></tr></thead><tbody>{orders.map(o=><tr key={o.order_id}><td>{date(o.created_at)}</td><td className="billing-order-id">{o.order_id}<small className="billing-order-source">{o.source==="manual"?"Perpanjangan manual":"Gateway"}</small></td><td><strong>{o.gross_amount===null?"Dicatat Admin":rupiah(o.gross_amount)}</strong></td><td>{o.source==="manual"?"1 bulan":o.period_days+" hari"}</td><td><span className={"billing-payment-status "+o.status}>{paymentLabel(o.status)}</span></td><td>{date(o.paid_at)}</td></tr>)}</tbody></table>
   {!loading&&orders.length===0&&<div className="billing-empty"><CreditCard size={24}/><strong>Belum ada pembayaran yang tercatat</strong><p>Setelah pembayaran pertama dikonfirmasi, detailnya muncul otomatis di sini.</p></div>}
   {loading&&orders.length===0&&<div className="billing-empty">Memuat riwayat pembayaran…</div>}</div>
   <div className="billing-bottom"><span>{lastSync?"Pembaruan terakhir: "+date(lastSync):"Menunggu sinkronisasi data"} · Zona waktu WIB</span><span>{isOwner?"Akses pengelolaan akun utama":"Akses informasi kepala sekolah"}</span></div>
  </section>
  {error&&<div className="banner error" role="alert">{error}</div>}
 </section>;
}
