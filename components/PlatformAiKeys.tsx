"use client";
import {useEffect,useMemo,useState} from "react";
import {KeyRound,RefreshCw,Save,Trash2} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {errorMessage} from "@/lib/error-message";

type Slot={slot:number;configured:boolean;source:"vercel"|"admin"|"empty";admin_configured:boolean;vercel_configured:boolean;masked:string;updated_at:string|null};

export default function PlatformAiKeys(){
 const db=useMemo(()=>browserDb(),[]),[slots,setSlots]=useState<Slot[]>([]),[values,setValues]=useState<Record<number,string>>({}),[busy,setBusy]=useState<number|0>(0),[loading,setLoading]=useState(true),[error,setError]=useState(""),[ok,setOk]=useState("");
 async function authHeaders(){const {data:{session}}=await db.auth.getSession();if(!session)throw Error("Sesi Super Admin berakhir.");return {"Content-Type":"application/json",Authorization:"Bearer "+session.access_token}}
 async function load(){setLoading(true);setError("");try{const response=await fetch("/api/admin/ai-keys",{headers:await authHeaders(),cache:"no-store"}),j=await response.json();if(!response.ok)throw Error(j.error||"Gagal memuat API key.");setSlots(j.slots||[])}catch(e){setError(errorMessage(e))}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 async function save(slot:number){const key=(values[slot]||"").trim();if(!key){setError("Tempel API key pada slot "+slot+" terlebih dahulu.");return}setBusy(slot);setError("");setOk("");try{const response=await fetch("/api/admin/ai-keys",{method:"POST",headers:await authHeaders(),body:JSON.stringify({slot,key})}),j=await response.json();if(!response.ok)throw Error(j.error||"Gagal menyimpan API key.");setValues(v=>({...v,[slot]:""}));setOk("API key slot "+slot+" tersimpan terenkripsi.");await load()}catch(e){setError(errorMessage(e))}finally{setBusy(0)}}
 async function clear(slot:number){if(!confirm("Hapus API key yang disimpan dari menu admin pada slot "+slot+"?"))return;setBusy(slot);setError("");setOk("");try{const response=await fetch("/api/admin/ai-keys",{method:"DELETE",headers:await authHeaders(),body:JSON.stringify({slot})}),j=await response.json();if(!response.ok)throw Error(j.error||"Gagal menghapus API key.");setOk("API key admin pada slot "+slot+" dihapus.");await load()}catch(e){setError(errorMessage(e))}finally{setBusy(0)}}
 const configured=slots.filter(x=>x.configured).length;
 return <div className="platform-panel"><div className="platform-panel-header"><div><h2>API Key Pool AI</h2><p>Kelola sampai 7 Gemini API key milik platform. Pengguna sekolah tidak perlu dan tidak dapat memasukkan API key pribadi.</p></div><button onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/> {loading?"Memuat…":"Segarkan"}</button></div>
  <div className="platform-ai-key-summary"><KeyRound size={20}/><div><b>{configured}/7 slot aktif</b><small>Fallback otomatis berpindah ke slot berikutnya bila key gagal, tidak valid, atau terkena rate limit.</small></div></div>
  {error&&<div className="platform-error" role="alert">{error}</div>}{ok&&<div className="platform-success">{ok}</div>}
  <div className="platform-ai-key-grid">{slots.map(item=><article className="platform-ai-key-card" key={item.slot}><div className="platform-ai-key-title"><div><strong>Gemini API Key {item.slot}</strong><small>Vercel: GEMINI_API_KEY_{item.slot}{item.slot===1?" · alias lama GEMINI_API_KEY":""}</small></div><span className={"platform-ai-source "+item.source}>{item.source==="vercel"?"Vercel":item.source==="admin"?"Admin":"Kosong"}</span></div>
   <div className="platform-ai-key-status"><span>Status</span><b>{item.configured?item.masked||"Terkonfigurasi":"Belum diisi"}</b></div>
   {item.vercel_configured&&<p className="platform-ai-key-note">Key Vercel memprioritaskan slot ini. Key dari menu admin pada slot yang sama tetap dapat disimpan sebagai cadangan konfigurasi, tetapi baru dipakai jika env Vercel slot tersebut dikosongkan.</p>}
   <label className="platform-ai-key-input">Ganti / isi lewat Admin<input type="password" autoComplete="off" value={values[item.slot]||""} onChange={e=>setValues(v=>({...v,[item.slot]:e.target.value}))} placeholder="Tempel API key Gemini baru"/></label>
   <div className="platform-ai-key-actions"><button disabled={busy===item.slot} onClick={()=>void save(item.slot)}><Save size={15}/> {busy===item.slot?"Menyimpan…":"Simpan terenkripsi"}</button><button className="danger" disabled={busy===item.slot||!item.admin_configured} onClick={()=>void clear(item.slot)}><Trash2 size={15}/> Hapus key admin</button></div>
  </article>)}</div>
  {!loading&&!slots.length&&<div className="platform-empty">Konfigurasi API key belum dapat dibaca.</div>}
  <p className="platform-ai-key-footnote">API key tidak pernah ditampilkan utuh setelah disimpan dan tidak dikirim ke browser pengguna sekolah. Untuk rotasi tanpa menu admin, isi GEMINI_API_KEY_1 sampai GEMINI_API_KEY_7 pada Vercel Environment Variables.</p>
 </div>
}
