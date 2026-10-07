"use client";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import {errorMessage} from "@/lib/error-message";
import {useCallback,useEffect,useMemo,useState} from "react";
import {browserDb} from "@/lib/supabase";
import {ROLE_LABELS,type Role} from "@/lib/modules";

type Row={user_id:string;email:string|null;role:string;staff_name:string|null;is_active:boolean};
const roles:Role[]=["principal","vice_principal","teacher","counselor","hr","treasurer","finance_staff","supervisor","staff","viewer"];
export default function TeamAccess({schoolId,role}:{schoolId:string;role:Role}){
 const db=useMemo(()=>browserDb(),[]);
 const [rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState(""),[myId,setMyId]=useState("");
 const load=useCallback(async()=>{if(!db)return;const [dir,members]=await Promise.all([db.rpc("sc_team_directory",{p_school:schoolId}),db.from("sc_members").select("user_id,is_active").eq("school_id",schoolId)]);
  if(dir.error||members.error){setError(dir.error?.message||members.error?.message||"Gagal membaca anggota");return}
  const active=new Map((members.data||[]).map(x=>[x.user_id,x.is_active!==false]));
  setRows(((dir.data||[]) as Omit<Row,"is_active">[]).map(x=>({...x,is_active:active.get(x.user_id)??false})));
 },[db,schoolId]);
 useRealtimeRefresh(schoolId,()=>load());
 useEffect(()=>{void load();void db.auth.getUser().then(({data})=>setMyId(data.user?.id||""))},[db,load]);
 async function run(action:()=>Promise<void>,message:string){setBusy(true);setError("");setOk("");try{await action();await load();setOk(message)}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 async function rpc(name:string,args:Record<string,unknown>){const {error}=await db.rpc(name,args);if(error)throw error}
 const canManage=(item:Row)=>item.role!=="owner"&&item.user_id!==myId&&(role==="owner"||role==="principal"&&item.role!=="principal");
 const attendance=rows.filter(x=>x.is_active&&x.role!=="viewer");
 return <section className="panel">
  <div className="sectionhead"><div><h2>Anggota, akun & hak akses</h2><p className="muted">Setiap akun aktif selain Viewer tercatat sebagai personel yang dapat melakukan presensi. Menonaktifkan login tidak menghapus data dan riwayat kehadiran.</p></div></div>
  <div className="flow" style={{marginBottom:14}}><span className="pill">{rows.length} akun sekolah</span><span className="pill">{attendance.length} berhak presensi</span><span className="pill">{rows.filter(x=>!x.is_active).length} nonaktif</span></div>
  <div className="tablewrap"><table className="data-table"><thead><tr><th>Nama anggota</th><th>Email login</th><th>Peran</th><th>Status</th><th>Tindakan</th></tr></thead><tbody>{rows.map(x=><tr key={x.user_id}>
   <td>{x.staff_name||"Profil belum dilengkapi"}</td><td>{x.email||"—"}</td><td><span className="pill">{ROLE_LABELS[x.role as Role]||x.role}</span></td>
   <td><span className="pill">{x.is_active?"Aktif":"Nonaktif"}</span></td>
   <td>{canManage(x)?<div className="flow" style={{gap:8,flexWrap:"wrap"}}>
    <select aria-label={"Ubah peran "+(x.email||x.user_id)} value={x.role} disabled={busy} onChange={e=>void run(()=>rpc("sc_change_member_role",{p_school:schoolId,p_user:x.user_id,p_role:e.target.value}),"Peran berhasil diperbarui.")}>
     {roles.filter(r=>role==="owner"||r!=="principal").map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
    </select>
    <button className="button secondary" disabled={busy} onClick={()=>{const next=!x.is_active;if(confirm(next?"Aktifkan kembali akses akun ini?":"Nonaktifkan akun ini dari seluruh modul dan presensi?"))void run(()=>rpc("sc_set_member_active",{p_school:schoolId,p_user:x.user_id,p_active:next}),next?"Akses akun aktif kembali.":"Akses akun dinonaktifkan.")}}>{x.is_active?"Nonaktifkan":"Aktifkan"}</button>
    {role==="owner"&&<button className="button danger" disabled={busy} onClick={()=>{if(confirm("Cabut akses permanen dari sekolah? Profil kepegawaian dan catatan sebelumnya tetap dilindungi."))void run(()=>rpc("sc_remove_member",{p_school:schoolId,p_user:x.user_id}),"Anggota dilepas dari sekolah.")}}>Cabut Akses</button>}
   </div>:<span className="hint">Dilindungi / akun sendiri</span>}</td>
  </tr>)}</tbody></table>{!rows.length&&<div className="empty">Belum ada akun anggota sekolah.</div>}</div>
  <p className="hint" style={{marginTop:14}}>Akun viewer hanya dapat membaca sesuai pembatasan modul. Guru yang hanya dicatat namanya sebagai wali kelas tidak memperoleh login atau presensi otomatis.</p>
  {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </section>;
}