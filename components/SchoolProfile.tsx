"use client";
import {useEffect,useMemo,useState} from "react";
import {browserDb} from "@/lib/supabase";
import {isAdmin,type Role} from "@/lib/modules";
type Fact={key:string;value:string;updated_at:string};
type Profile={
 name:string;npsn:string;address:string;academic_year:string;timezone:string;school_type:string;education_level:string;accreditation:string;
 principal_name:string;phone:string;email:string;website:string;province:string;city:string;district:string;village:string;postal_code:string;
 semester:string;motto:string;logo_url:string
};
const blank:Profile={name:"",npsn:"",address:"",academic_year:"2026/2027",timezone:"Asia/Jakarta",school_type:"",education_level:"",accreditation:"",principal_name:"",phone:"",email:"",website:"",province:"",city:"",district:"",village:"",postal_code:"",semester:"Ganjil",motto:"",logo_url:""};

export default function SchoolProfile({schoolId,role,focus}:{schoolId:string;role:Role;focus?:string}){
 const db=useMemo(()=>browserDb(),[]),admin=isAdmin(role);
 const [profile,setProfile]=useState<Profile>(blank),[facts,setFacts]=useState<Fact[]>([]),[key,setKey]=useState(""),[value,setValue]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState("");
 const f=(focus||"").toLowerCase();
 async function load(){if(!db)return;const cols="name,npsn,address,academic_year,timezone,school_type,education_level,accreditation,principal_name,phone,email,website,province,city,district,village,postal_code,semester,motto,logo_url";const [{data:p},{data:fs}]=await Promise.all([db.from("sc_schools").select(cols).eq("id",schoolId).maybeSingle(),db.from("sc_school_facts").select("key,value,updated_at").eq("school_id",schoolId).order("key")]);if(p)setProfile({...blank,...p} as Profile);setFacts((fs||[]) as Fact[])}
 useEffect(()=>{void load()},[db,schoolId]);
 async function run(fn:()=>Promise<void>){setError("");setOk("");setBusy(true);try{await fn();await load();setOk("Pengaturan sekolah tersimpan.")}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function rpc(fn:string,args:Record<string,unknown>){if(!db)throw Error("Database belum siap.");const {error}=await db.rpc(fn,args);if(error)throw error}
 function set<K extends keyof Profile>(k:K,v:Profile[K]){setProfile(p=>({...p,[k]:v}))}
 const input=(k:keyof Profile,label:string,placeholder="")=><label className="field">{label}<input value={profile[k]} onChange={e=>set(k,e.target.value)} placeholder={placeholder} disabled={!admin}/></label>;
 const save=<button className="button" disabled={!admin||busy||profile.name.trim().length<3} onClick={()=>void run(()=>rpc("sc_edit_school_details",{p_school:schoolId,p_payload:profile}))}>Simpan Pengaturan</button>;
 const showGeneral=!f||f.includes("profil");
 const showContact=!f||f.includes("identitas")||f.includes("kontak");
 const showLocation=!f||f.includes("lokasi");
 const showAcademic=!f||f.includes("akademik");
 const showBrand=!f||f.includes("branding");
 const showFacts=!f||f.includes("memori");
 return <>
  {showGeneral&&<section className="panel"><div className="sectionhead"><div><h2>Profil Sekolah</h2><p className="muted">Identitas dasar dipakai oleh laporan, kuitansi, dokumen dan template sekolah.</p></div></div><div className="fields">{input("name","Nama Sekolah")}{input("npsn","NPSN")}{input("school_type","Status / Jenis Sekolah","Negeri / Swasta")}{input("education_level","Jenjang","SD / SMP / SMA / SMK")}{input("accreditation","Akreditasi")}{input("principal_name","Nama Kepala Sekolah")}</div><div style={{marginTop:14}}>{save}</div></section>}
  {showContact&&<section className="panel"><h2>Identitas & Kontak</h2><div className="fields">{input("phone","Telepon / WhatsApp")}{input("email","Email Sekolah")}{input("website","Website")}{input("principal_name","Kepala Sekolah")}</div><div style={{marginTop:14}}>{save}</div></section>}
  {showLocation&&<section className="panel"><h2>Lokasi Sekolah</h2><div className="fields"><label className="field full">Alamat lengkap<textarea value={profile.address} onChange={e=>set("address",e.target.value)} disabled={!admin}/></label>{input("province","Provinsi")}{input("city","Kabupaten / Kota")}{input("district","Kecamatan")}{input("village","Kelurahan / Desa")}{input("postal_code","Kode Pos")}{input("timezone","Zona Waktu")}</div><div style={{marginTop:14}}>{save}</div></section>}
  {showAcademic&&<section className="panel"><h2>Pengaturan Akademik</h2><div className="fields">{input("academic_year","Tahun Ajaran")}{input("semester","Semester")}{input("education_level","Jenjang")}</div><div style={{marginTop:14}}>{save}</div></section>}
  {showBrand&&<section className="panel"><h2>Branding Dokumen</h2><p className="muted">Identitas ini dapat dipakai oleh template laporan Disiplin, BK, keuangan, supervisi dan slip.</p><div className="fields">{input("logo_url","URL Logo Sekolah")}{input("motto","Motto / Tagline")}{input("principal_name","Nama Penandatangan Utama")}</div>{profile.logo_url&&<div className="school-logo-preview"><img src={profile.logo_url} alt="Logo sekolah"/></div>}<div style={{marginTop:14}}>{save}</div></section>}
  {showFacts&&<section className="panel"><h2>Memori Sekolah untuk AI</h2><p className="muted">Simpan visi, misi, karakteristik, program prioritas dan fakta sekolah yang sudah diverifikasi. Jangan memasukkan catatan BK rahasia.</p>{admin&&<div className="fields"><label className="field">Topik<input value={key} onChange={e=>setKey(e.target.value)} placeholder="Contoh: Visi Sekolah"/></label><label className="field full">Informasi<textarea value={value} onChange={e=>setValue(e.target.value)}/></label><button className="button" disabled={busy||key.trim().length<2||!value.trim()} onClick={()=>void run(async()=>{await rpc("sc_save_school_fact",{p_school:schoolId,p_key:key,p_value:value});setKey("");setValue("")})}>Simpan Fakta</button></div>}{facts.map(x=><div className="entry" key={x.key}><div><strong>{x.key}</strong><small>{x.value}</small></div>{admin&&<div className="flow"><button className="button secondary" onClick={()=>{setKey(x.key);setValue(x.value)}}>Edit</button><button className="button danger" onClick={()=>{if(confirm("Hapus informasi ini?"))void run(()=>rpc("sc_delete_school_fact",{p_school:schoolId,p_key:x.key}))}}>Hapus</button></div>}</div>)}{!facts.length&&<div className="empty">Belum ada memori sekolah.</div>}</section>}
  {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </>;
}
