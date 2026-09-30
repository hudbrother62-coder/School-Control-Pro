"use client";
import {useEffect,useMemo,useState} from "react";
import {browserDb} from "@/lib/supabase";
import type {Role} from "@/lib/modules";
type Row={user_id:string;email:string|null;role:string;staff_name:string|null};
const roles=["principal","vice_principal","teacher","counselor","hr","treasurer","staff","viewer"];
export default function TeamAccess({schoolId,role}:{schoolId:string;role:Role}){
 const db=useMemo(()=>browserDb(),[]);const [rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState("");
 async function load(){if(!db)return;const {data,error}=await db.rpc("sc_team_directory",{p_school:schoolId});if(error)setError(error.message);else setRows((data||[]) as Row[])}
 useEffect(()=>{void load()},[db,schoolId]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError("");setOk("");try{await fn();await load();setOk("Hak akses tim diperbarui.")}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function rpc(name:string,args:Record<string,unknown>){if(!db)throw Error("Database belum siap");const {error}=await db.rpc(name,args);if(error)throw error}
 return <section className="panel"><h2>Anggota & Hak Akses</h2><p className="muted">Role menentukan menu dan data yang dapat dibaca/diubah. Menghapus akses tidak menghapus riwayat kerja anggota.</p><div className="tablewrap"><table className="data-table"><thead><tr><th>Anggota</th><th>Email</th><th>Peran</th><th>Aksi</th></tr></thead><tbody>{rows.map(x=><tr key={x.user_id}><td>{x.staff_name||"Belum ada profil SDM"}</td><td>{x.email||"—"}</td><td><span className="pill">{x.role}</span></td><td>{role==="owner"&&x.role!=="owner"?<div className="flow"><select defaultValue={x.role} aria-label={"Peran "+(x.email||x.user_id)} onChange={e=>void run(()=>rpc("sc_change_member_role",{p_school:schoolId,p_user:x.user_id,p_role:e.target.value}))}>{roles.map(r=><option key={r} value={r}>{r}</option>)}</select><button className="button danger" disabled={busy} onClick={()=>{if(confirm("Cabut akses anggota ini? Profil SDM dan riwayat lama tetap disimpan."))void run(()=>rpc("sc_remove_member",{p_school:schoolId,p_user:x.user_id}))}}>Cabut Akses</button></div>:<span className="hint">Dilindungi</span>}</td></tr>)}</tbody></table>{!rows.length&&<div className="empty">Belum ada anggota.</div>}</div>{error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}</section>;
}
