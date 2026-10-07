"use client";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import {useEffect,useMemo,useState} from "react";
import {browserDb} from "@/lib/supabase";

type Order={order_id:string;gross_amount:number;period_days:number;status:string;paid_at:string|null;created_at:string};
type Sub={status:string;current_period_end:string|null};
const rupiah=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(v)||0);
const date=(s:string|null)=>s?new Date(s).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"}):"—";
export default function BillingPanel({schoolId,focus}:{schoolId:string;isOwner:boolean;busy:boolean;onCheckout:(p:"monthly"|"yearly")=>void;focus?:string}){
 const db=useMemo(()=>browserDb(),[]),[sub,setSub]=useState<Sub|null>(null),[orders,setOrders]=useState<Order[]>([]),[error,setError]=useState("");
 async function load(){const [s,o]=await Promise.all([db.from("sc_subscriptions").select("status,current_period_end").eq("school_id",schoolId).maybeSingle(),db.from("sc_payment_orders").select("order_id,gross_amount,period_days,status,paid_at,created_at").eq("school_id",schoolId).order("created_at",{ascending:false}).limit(30)]);if(s.error)setError(s.error.message);if(o.error)setError(o.error.message);setSub(s.data||null);setOrders((o.data||[]) as Order[]);}
 useRealtimeRefresh(schoolId,()=>load());
 useEffect(()=>{void load()},[schoolId]);
 const historyOnly=(focus||"").toLowerCase().includes("riwayat");
 return <section className="panel"><div className="flow" style={{justifyContent:"space-between"}}><div><h2>Langganan SekolaPro</h2><p className="muted">Masa aktif bulanan dan pembaruan akun dikelola Super Admin. Hubungi pengelola untuk pembayaran dan konfirmasi perpanjangan.</p></div><span className="pill">{sub?.status==="active"&&!!sub.current_period_end&&Date.parse(sub.current_period_end)>Date.now()?"Aktif":"Nonaktif"}</span></div>
 {!historyOnly&&<div className="grid"><div className="card"><label>Akses berlaku sampai</label><strong style={{fontSize:15}}>{date(sub?.current_period_end||null)}</strong></div><div className="card"><label>Perpanjangan</label><strong style={{fontSize:15}}>Konfirmasi melalui Super Admin</strong></div></div>}
 <h3 style={{marginTop:25}}>Riwayat Pembayaran Gateway</h3><p className="muted">Riwayat transaksi otomatis terpisah dari konfirmasi perpanjangan manual oleh Super Admin.</p><div className="tablewrap"><table className="data-table"><thead><tr><th>Tanggal</th><th>Order ID</th><th>Nominal</th><th>Durasi</th><th>Status</th></tr></thead><tbody>{orders.map(o=><tr key={o.order_id}><td>{date(o.created_at)}</td><td><small>{o.order_id}</small></td><td>{rupiah(o.gross_amount)}</td><td>{o.period_days} hari</td><td><span className="pill">{o.status}</span></td></tr>)}</tbody></table>{orders.length===0&&<div className="empty">Belum ada transaksi melalui gateway.</div>}</div><button className="button secondary" onClick={()=>void load()} style={{marginTop:15}}>Segarkan status</button>{error&&<div className="banner error" role="alert">{error}</div>}</section>;
}
