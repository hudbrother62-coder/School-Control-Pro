"use client";
import {useMemo,useState} from "react";
import {browserDb} from "@/lib/supabase";
import DataEntryModal from "@/components/DataEntryModal";
import {plans,rupiah} from "@/lib/pricing";

type School={id:string;name:string;is_paused?:boolean;is_lifetime?:boolean;subscription_status:string;current_period_end:string|null;updated_at?:string|null};
type Account={user_id:string;school_id:string|null;school_name?:string|null;account_name:string;email:string;role:string;banned_until:string|null};
const roles=[["principal","Kepala Sekolah"],["vice_principal","Wakil Kepala Sekolah"],["teacher","Guru"],["counselor","Guru BK"],["hr","SDM"],["treasurer","Bendahara"],["staff","Staf"],["viewer","Viewer"]] as const;
const fmt=(value:string|null)=>value?new Date(value).toLocaleDateString("id-ID",{dateStyle:"long",timeZone:"Asia/Jakarta"}):"—";
const hold=(a:Account)=>!!a.banned_until&&Date.parse(a.banned_until)>Date.now();

export default function PlatformCustomerControls({schools,accounts,onRefresh}:{schools:School[];accounts:Account[];onRefresh:()=>Promise<void>}){
 const db=useMemo(()=>browserDb(),[]);
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[name,setName]=useState(""),[schoolName,setSchoolName]=useState("");
 const [schoolId,setSchoolId]=useState(""),[role,setRole]=useState("staff"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [newSchoolPlan,setNewSchoolPlan]=useState<"monthly"|"lifetime">("monthly"),[planChoices,setPlanChoices]=useState<Record<string,"monthly"|"lifetime">>({});
 const [search,setSearch]=useState(""),[deleteTarget,setDeleteTarget]=useState<Account|null>(null),[verifyEmail,setVerifyEmail]=useState(""),[verifyPhrase,setVerifyPhrase]=useState("");
 async function send(body:Record<string,unknown>){
  const {data:{session}}=await db.auth.getSession();
  if(!session?.access_token)throw Error("Sesi habis, silakan masuk kembali.");
  const response=await fetch("/api/admin/customers",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify(body),cache:"no-store"});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||"Perubahan tidak berhasil.");
  return data;
 }
 async function act(body:Record<string,unknown>,success:string){
  setBusy(true);setError("");setNotice("");
  try{const data=await send(body);setNotice(success+(data.expires_at?" · Aktif sampai "+fmt(data.expires_at):""));await onRefresh();return data;}
  catch(err){setError(err instanceof Error?err.message:"Gagal memproses permintaan.");return null;}
  finally{setBusy(false);}
 }
 async function createAccount(e:React.FormEvent){
  e.preventDefault();
  const result=await act({action:"create",email,password,name,school_name:schoolName,school_id:schoolId||null,role:schoolId?role:"owner"},"Akun berhasil dibuat. Berikan email dan kata sandi melalui saluran pribadi.");
  if(result){
   if(!schoolId&&result.school_id){
    setPlanChoices(prev=>({...prev,[result.school_id]:newSchoolPlan}));
    setNotice("Akun sekolah dibuat. Pilihan "+(newSchoolPlan==="lifetime"?"sekali beli":"bulanan")+" disiapkan di Kontrol Paket. Setelah pembayaran diverifikasi, konfirmasikan paket di tabel.");
   }
   setEmail("");setPassword("");setName("");setSchoolName("");
  }
 }
 async function toggleAccount(a:Account){
  const next=!hold(a);
  if(!window.confirm(next?"Nonaktifkan login akun "+a.email+"?":"Aktifkan kembali akun "+a.email+"?"))return;
  await act({action:"account_status",user_id:a.user_id,disabled:next},next?"Akun dinonaktifkan sementara.":"Akun diaktifkan kembali.");
 }
 async function toggleSchool(s:School){
  const next=!s.is_paused;
  if(!window.confirm(next?"Hentikan akses SEMUA anggota "+s.name+" untuk sementara?":"Buka kembali akses sekolah "+s.name+"?"))return;
  await act({action:"school_status",school_id:s.id,paused:next},next?"Sekolah dijeda sementara.":"Sekolah dibuka kembali, selama periode berlangganan belum habis.");
 }
 async function confirmPlan(s:School){
  if(s.is_lifetime)return;
  const plan=planChoices[s.id]||"monthly";
  const reference=window.prompt("Nomor referensi pembayaran "+(plan==="lifetime"?"Sekali Beli":"Bulanan")+" untuk "+s.name+":","");
  if(reference===null)return;
  const normalized=reference.trim();
  if(!/^[A-Za-z0-9-]{8,85}$/.test(normalized)){setError("Referensi harus 8–85 karakter huruf, angka atau tanda hubung.");return;}
  const note=window.prompt("Catatan pembayaran (opsional):","");
  if(note===null)return;
  if(note.trim().length>500){setError("Catatan maksimal 500 karakter.");return;}
  const amount=plan==="lifetime"?plans.lifetime.price:plans.monthly.price;
  const message=plan==="lifetime"
   ?"Mutasi "+s.name+" ke paket SEKALI BELI setelah pembayaran "+rupiah(amount)+" telah benar-benar diverifikasi? Seluruh data sekolah tetap tersimpan."
   :"Konfirmasi pembayaran "+rupiah(amount)+" dan tambah satu bulan masa aktif untuk "+s.name+"?";
  if(!window.confirm(message))return;
  const result=await act({action:plan==="lifetime"?"lifetime":"renew",school_id:s.id,confirmation_ref:normalized,note:note.trim()},
   plan==="lifetime"?"Sekolah berhasil dimutasi ke akses selamanya.":"Paket bulanan diperpanjang.");
  if(result)setPlanChoices(prev=>({...prev,[s.id]:plan}));
 }

 async function deleteAccount(){
  if(!deleteTarget||verifyEmail.trim().toLowerCase()!==deleteTarget.email.toLowerCase()||verifyPhrase.trim()!=="HAPUS")return;
  const result=await act({action:"delete_account",user_id:deleteTarget.user_id,confirm_email:verifyEmail.trim(),confirm_phrase:verifyPhrase.trim()},"Akun berhasil dihapus. Histori sekolah tetap tersimpan.");
  if(result){setDeleteTarget(null);setVerifyEmail("");setVerifyPhrase("");}
 }
 function prepareDelete(a:Account){setError("");setNotice("");setDeleteTarget(a);setVerifyEmail("");setVerifyPhrase("");}
 const deleteValidated=!!deleteTarget&&verifyEmail.trim().toLowerCase()===deleteTarget.email.toLowerCase()&&verifyPhrase.trim()==="HAPUS";
 const filtered=accounts.filter(a=>(a.email+" "+a.account_name+" "+(a.school_name||"")).toLowerCase().includes(search.toLowerCase()));
 return <div className="platform-customer-control">
  {error&&<div role="alert" className="platform-error">{error}</div>}
  {notice&&<div role="status" className="banner success">{notice}</div>}
  <section className="platform-panel"><div className="platform-panel-header"><div><h2>Buat Akun Pelanggan</h2><p>Hanya Super Admin yang bisa membuat akun. Sekolah baru diaktifkan hanya setelah pembayaran paket dikonfirmasi.</p></div></div>
   <form onSubmit={e=>void createAccount(e)} className="platform-customer-form">
    <label>Penempatan akun<select value={schoolId} onChange={e=>setSchoolId(e.target.value)}><option value="">Sekolah baru (akun pemilik)</option>{schools.map(s=><option key={s.id} value={s.id}>Anggota: {s.name}</option>)}</select></label>
    {schoolId?<label>Peran akun<select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>:<><label>Nama sekolah baru<input required minLength={3} maxLength={120} value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="Nama sekolah pelanggan"/></label><label>Rencana paket<select aria-label="Paket sekolah baru" value={newSchoolPlan} onChange={e=>setNewSchoolPlan(e.target.value as "monthly"|"lifetime")}><option value="monthly">Bulanan · {rupiah(plans.monthly.price)}/bulan</option><option value="lifetime">Sekali Beli · {rupiah(plans.lifetime.price)}</option></select></label></>}
    <label>Nama pengguna<input maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Nama pemilik atau anggota"/></label>
    <label>Email login<input type="email" autoComplete="off" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="pelanggan@sekolah.sch.id"/></label>
    <label>Kata sandi awal<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter"/></label>
    <button type="submit" disabled={busy}>{busy?"Memproses…":"Buat Akun & Aktifkan Akses"}</button>
   </form>
  </section>
  <section className="platform-panel"><div className="platform-panel-header"><div><h2>Kontrol Paket & Masa Aktif Sekolah</h2><p>Pilih paket bulanan atau mutasi ke sekali beli. Setiap aktivasi membutuhkan referensi dan verifikasi pembayaran. Paket sekali beli tidak memiliki jatuh tempo bulanan.</p></div></div>
   <div className="platform-table-wrap"><table><thead><tr><th>Sekolah</th><th>Paket Saat Ini</th><th>Batas Akses</th><th>Terakhir Diperbarui</th><th>Status</th><th>Pilih & Konfirmasi Paket</th></tr></thead><tbody>{schools.map(s=>{
    const ms=s.current_period_end?Date.parse(s.current_period_end)-Date.now():0;
    const days=Math.max(0,Math.ceil(ms/86400000));
    const expired=!s.is_lifetime&&ms<=0;
    const active=s.subscription_status==="active"&&!expired;
    const plan=s.is_lifetime?"lifetime":planChoices[s.id]||"monthly";
    return <tr key={s.id}><td><b>{s.name}</b><small className="platform-school-contact">{accounts.filter(a=>a.school_id===s.id&&a.role==="owner").map(a=>a.email).filter((email,index,all)=>all.indexOf(email)===index).join(", ")||"Email pemilik belum tersedia"}</small></td><td><span className="platform-plan-label">{s.is_lifetime?"Sekali Beli · Selamanya":"Bulanan"}</span><small>{s.is_lifetime?"Tidak perlu perpanjangan":rupiah(plans.monthly.price)+" / bulan"}</small></td><td>{s.is_lifetime?"Tanpa batas waktu":fmt(s.current_period_end)}<small>{s.is_lifetime?"Akses permanen":expired?"Lewat tenggat":days<=7?"Tagih sekarang · "+days+" hari lagi":days+" hari tersisa"}</small></td><td>{fmt(s.updated_at||null)}<small>Tersinkron ke menu Langganan sekolah</small></td>
      <td><span className={"platform-status "+(s.is_paused||!active?"inactive":"active")}>{s.is_paused?"Dijeda manual":!active?"Nonaktif":"Aktif"}</span></td>
      <td><div className="platform-customer-buttons">{s.is_lifetime?<span className="platform-plan-locked">Paket sekali beli aktif</span>:<><select aria-label={"Pilih paket untuk "+s.name} className="platform-plan-select" value={plan} disabled={busy} onChange={e=>setPlanChoices(prev=>({...prev,[s.id]:e.target.value as "monthly"|"lifetime"}))}><option value="monthly">Bulanan · {rupiah(plans.monthly.price)}</option><option value="lifetime">Sekali Beli · {rupiah(plans.lifetime.price)}</option></select><button type="button" disabled={busy} onClick={()=>void confirmPlan(s)}>{plan==="lifetime"?"Konfirmasi Sekali Beli":"Konfirmasi +1 Bulan"}</button></>}<button type="button" disabled={busy} onClick={()=>void toggleSchool(s)}>{s.is_paused?"Buka Sekolah":"Jeda Sekolah"}</button></div></td>
     </tr>})}</tbody></table>{schools.length===0&&<div className="platform-empty">Belum ada sekolah.</div>}</div>
  </section>
  <section className="platform-panel"><div className="platform-panel-header"><div><h2>Kelola Status & Hapus Akun</h2><p>Periksa asal sekolah sebelum mengubah akses. Penghapusan memerlukan verifikasi dan tidak menghapus histori sekolah.</p></div><div className="platform-search"><input aria-label="Cari akun atau sekolah" placeholder="Cari nama, email, atau sekolah" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
   <div className="platform-table-wrap"><table><thead><tr><th>Akun / Email</th><th>Asal Sekolah</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{filtered.map(a=><tr key={(a.school_id||"unassigned")+":"+a.user_id}><td><b>{a.account_name||a.email}</b><small>{a.email}</small></td><td><span className={"platform-school-name "+(!a.school_id?"unassigned":"")}>{a.school_name||(a.school_id?schools.find(s=>s.id===a.school_id)?.name:"Belum terhubung ke sekolah")||"Sekolah tidak ditemukan"}</span></td><td>{roles.find(([value])=>value===a.role)?.[1]||(a.role==="owner"?"Pemilik sekolah":a.role==="belum_bergabung"?"Belum bergabung":a.role)}</td><td><span className={"platform-status "+(hold(a)?"inactive":"active")}>{hold(a)?"Dinonaktifkan":"Login diizinkan"}</span></td><td><div className="platform-account-actions"><button type="button" disabled={busy} onClick={()=>void toggleAccount(a)}>{hold(a)?"Aktifkan Akun":"Nonaktifkan Sementara"}</button><button type="button" className="platform-delete-trigger" disabled={busy} onClick={()=>prepareDelete(a)}>Hapus Akun</button></div></td></tr>)}</tbody></table>{filtered.length===0&&<div className="platform-empty">Tidak ada akun cocok.</div>}</div>
  </section>
  <DataEntryModal open={!!deleteTarget} title="Verifikasi Hapus Akun" subtitle="Aksi permanen. Periksa identitas akun sebelum melanjutkan." onClose={()=>{if(!busy)setDeleteTarget(null);}}>
   {deleteTarget&&<div className="platform-delete-dialog">
    <div className="platform-delete-summary"><strong>{deleteTarget.account_name||deleteTarget.email}</strong><span>{deleteTarget.email}</span><span>Sekolah: {deleteTarget.school_name||(deleteTarget.school_id?schools.find(s=>s.id===deleteTarget.school_id)?.name:"Belum terhubung")||"Tidak ditemukan"}</span></div>
    <p>Akun ini akan kehilangan akses login secara permanen. Catatan, dokumen, dan histori sekolah tetap tersimpan. Akun Super Admin dan pemilik terakhir sekolah tidak dapat dihapus.</p>
    <label>Tulis email akun untuk verifikasi<input type="email" autoComplete="off" value={verifyEmail} onChange={e=>setVerifyEmail(e.target.value)} placeholder={deleteTarget.email} disabled={busy}/></label>
    <label>Ketik <strong>HAPUS</strong> untuk konfirmasi<input type="text" autoComplete="off" value={verifyPhrase} onChange={e=>setVerifyPhrase(e.target.value)} placeholder="HAPUS" disabled={busy}/></label>
    <div className="platform-delete-dialog-actions"><button type="button" disabled={busy} onClick={()=>setDeleteTarget(null)}>Batal</button><button type="button" className="platform-delete-confirm" disabled={busy||!deleteValidated} onClick={()=>void deleteAccount()}>{busy?"Menghapus…":"Hapus Akun Permanen"}</button></div>
   </div>}
  </DataEntryModal>
 </div>;
}
