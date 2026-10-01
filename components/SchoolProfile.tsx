"use client";
import {useEffect,useMemo,useState} from "react";
import SmartSelect from "@/components/SmartSelect";
import {browserDb} from "@/lib/supabase";
import {isAdmin,type Role} from "@/lib/modules";
type Fact={key:string;value:string;updated_at:string};
type Profile={
 name:string;npsn:string;address:string;academic_year:string;timezone:string;school_type:string;education_level:string;accreditation:string;
 principal_name:string;phone:string;email:string;website:string;province:string;city:string;district:string;village:string;postal_code:string;
 semester:string;motto:string;logo_url:string;principal_nip:string;signature_url:string;stamp_url:string;report_settings:Record<string,unknown>
};
const blank:Profile={name:"",npsn:"",address:"",academic_year:"2026/2027",timezone:"Asia/Jakarta",school_type:"",education_level:"",accreditation:"",principal_name:"",phone:"",email:"",website:"",province:"",city:"",district:"",village:"",postal_code:"",semester:"Ganjil",motto:"",logo_url:"",principal_nip:"",signature_url:"",stamp_url:"",report_settings:{layout:"formal",show_signature:true,show_stamp:false,document_prefix:"LAP"}};
const educationOptions=[
 {value:"PAUD",label:"PAUD",subtitle:"Pendidikan anak usia dini"},
 {value:"TK",label:"TK",subtitle:"Taman Kanak-kanak"},
 {value:"SD",label:"SD",subtitle:"Kelas 1–6"},
 {value:"MI",label:"MI",subtitle:"Kelas 1–6"},
 {value:"SMP",label:"SMP",subtitle:"Kelas 7–9"},
 {value:"MTs",label:"MTs",subtitle:"Kelas 7–9"},
 {value:"SMA",label:"SMA",subtitle:"Kelas 10–12"},
 {value:"MA",label:"MA",subtitle:"Kelas 10–12"},
 {value:"SMK",label:"SMK",subtitle:"Kelas 10–12 / konsentrasi keahlian"},
 {value:"SLB",label:"SLB",subtitle:"Jenjang khusus"},
 {value:"PKBM",label:"PKBM",subtitle:"Pendidikan nonformal"}
];

export default function SchoolProfile({schoolId,role,focus}:{schoolId:string;role:Role;focus?:string}){
 const db=useMemo(()=>browserDb(),[]),admin=isAdmin(role);
 const [profile,setProfile]=useState<Profile>(blank),[facts,setFacts]=useState<Fact[]>([]),[key,setKey]=useState(""),[value,setValue]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState("");
 const f=(focus||"").toLowerCase();
 async function load(){if(!db)return;const cols="name,npsn,address,academic_year,timezone,school_type,education_level,accreditation,principal_name,principal_nip,phone,email,website,province,city,district,village,postal_code,semester,motto,logo_url,signature_url,stamp_url,report_settings";const [{data:p},{data:fs}]=await Promise.all([db.from("sc_schools").select(cols).eq("id",schoolId).maybeSingle(),db.from("sc_school_facts").select("key,value,updated_at").eq("school_id",schoolId).order("key")]);if(p)setProfile({...blank,...p} as Profile);setFacts((fs||[]) as Fact[])}
 useEffect(()=>{void load()},[db,schoolId]);
 async function run(fn:()=>Promise<void>){setError("");setOk("");setBusy(true);try{await fn();await load();setOk("Pengaturan sekolah tersimpan.")}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function rpc(fn:string,args:Record<string,unknown>){if(!db)throw Error("Database belum siap.");const {error}=await db.rpc(fn,args);if(error)throw error}
 function set<K extends keyof Profile>(k:K,v:Profile[K]){setProfile(p=>({...p,[k]:v}))}
 const input=(k:Exclude<keyof Profile,"report_settings">,label:string,placeholder="")=><label className="field">{label}<input value={String(profile[k]||"")} onChange={e=>setProfile(p=>({...p,[k]:e.target.value}))} placeholder={placeholder} disabled={!admin}/></label>;
 const setting=(k:string,fallback:unknown)=>profile.report_settings?.[k]??fallback;
 const setSetting=(k:string,v:unknown)=>setProfile(p=>({...p,report_settings:{...(p.report_settings||{}),[k]:v}}));
 const save=<button className="button" disabled={!admin||busy||profile.name.trim().length<3} onClick={()=>void run(()=>rpc("sc_edit_school_details",{p_school:schoolId,p_payload:profile}))}>Simpan Pengaturan</button>;
 const showGeneral=!f||f.includes("profil");
 const showContact=!f||f.includes("identitas")||f.includes("kontak");
 const showLocation=!f||f.includes("lokasi");
 const showAcademic=!f||f.includes("akademik");
 const showBrand=!f||f.includes("branding");
 const showFacts=!f||f.includes("memori");
 return <>
  {showGeneral&&<section className="panel"><div className="sectionhead"><div><h2>Profil Sekolah</h2><p className="muted">Identitas dasar dipakai oleh laporan, kuitansi, dokumen dan template sekolah.</p></div></div><div className="fields">{input("name","Nama Sekolah")}{input("npsn","NPSN")}{input("school_type","Status / Jenis Sekolah","Negeri / Swasta")}<div className="field"><SmartSelect label="Jenjang utama" value={profile.education_level} options={educationOptions} onChange={v=>set("education_level",v)} allowCustom customLabel="Gunakan jenjang ini" disabled={!admin}/><small className="hint">Jenjang ini menjadi default kelas, perangkat ajar AI, dan filter akademik. Pilihan di luar daftar tetap diperbolehkan.</small></div>{input("accreditation","Akreditasi")}{input("principal_name","Nama Kepala Sekolah")}</div><div style={{marginTop:14}}>{save}</div></section>}
  {showContact&&<section className="panel"><h2>Identitas & Kontak</h2><div className="fields">{input("phone","Telepon / WhatsApp")}{input("email","Email Sekolah")}{input("website","Website")}{input("principal_name","Kepala Sekolah")}</div><div style={{marginTop:14}}>{save}</div></section>}
  {showLocation&&<section className="panel"><h2>Lokasi Sekolah</h2><div className="fields"><label className="field full">Alamat lengkap<textarea value={profile.address} onChange={e=>set("address",e.target.value)} disabled={!admin}/></label>{input("province","Provinsi")}{input("city","Kabupaten / Kota")}{input("district","Kecamatan")}{input("village","Kelurahan / Desa")}{input("postal_code","Kode Pos")}{input("timezone","Zona Waktu")}</div><div style={{marginTop:14}}>{save}</div></section>}
  {showAcademic&&<section className="panel"><h2>Pengaturan Akademik</h2><div className="fields">{input("academic_year","Tahun Ajaran")}{input("semester","Semester")}<div className="field"><SmartSelect label="Jenjang" value={profile.education_level} options={educationOptions} onChange={v=>set("education_level",v)} allowCustom customLabel="Gunakan jenjang ini" disabled={!admin}/></div></div><div style={{marginTop:14}}>{save}</div></section>}
  {showBrand&&<section className="panel"><div className="sectionhead"><div><h2>Template & Identitas Dokumen Resmi</h2><p className="muted">Dipakai bersama oleh laporan pembelajaran, disiplin, BK, program, keuangan, supervisi, HR/payroll dan slip gaji.</p></div></div><div className="fields">
 {input("logo_url","URL Logo Sekolah")}
 {input("principal_name","Nama Penandatangan Utama")}
 {input("principal_nip","NIP / Identitas Penandatangan","Opsional")}
 {input("signature_url","URL Scan Tanda Tangan","PNG transparan disarankan")}
 {input("stamp_url","URL Stempel Sekolah","Opsional")}
 {input("motto","Motto / Tagline")}
 <label className="field">Gaya dokumen<select value={String(setting("layout","formal"))} onChange={e=>setSetting("layout",e.target.value)} disabled={!admin}><option value="formal">Formal Indonesia</option><option value="minimal">Formal Minimal</option></select></label>
 <label className="field">Prefix nomor laporan<input value={String(setting("document_prefix","LAP"))} onChange={e=>setSetting("document_prefix",e.target.value.toUpperCase())} disabled={!admin} placeholder="LAP"/></label>
 <label className="field"><span>Tampilkan tanda tangan pada dokumen</span><input type="checkbox" checked={Boolean(setting("show_signature",true))} onChange={e=>setSetting("show_signature",e.target.checked)} disabled={!admin}/></label>
 <label className="field"><span>Tampilkan stempel pada dokumen</span><input type="checkbox" checked={Boolean(setting("show_stamp",false))} onChange={e=>setSetting("show_stamp",e.target.checked)} disabled={!admin}/></label>
 </div>
 <div className="banner"><strong>Standar dokumen bersama</strong><p className="hint">Nomor dokumen diterbitkan saat file final diekspor. Preview sebelum terbit menggunakan watermark DRAFT. Dokumen yang diterbitkan masuk arsip sekolah sebagai snapshot agar tidak berubah ketika data sumber diperbarui.</p></div>
 {profile.logo_url&&<div className="school-logo-preview"><img src={profile.logo_url} alt="Logo sekolah"/></div>}<div style={{marginTop:14}}>{save}</div></section>}
  {showFacts&&<section className="panel"><h2>Memori Sekolah untuk AI</h2><p className="muted">Simpan visi, misi, karakteristik, program prioritas dan fakta sekolah yang sudah diverifikasi. Jangan memasukkan catatan BK rahasia.</p>{admin&&<div className="fields"><label className="field">Topik<input value={key} onChange={e=>setKey(e.target.value)} placeholder="Contoh: Visi Sekolah"/></label><label className="field full">Informasi<textarea value={value} onChange={e=>setValue(e.target.value)}/></label><button className="button" disabled={busy||key.trim().length<2||!value.trim()} onClick={()=>void run(async()=>{await rpc("sc_save_school_fact",{p_school:schoolId,p_key:key,p_value:value});setKey("");setValue("")})}>Simpan Fakta</button></div>}{facts.map(x=><div className="entry" key={x.key}><div><strong>{x.key}</strong><small>{x.value}</small></div>{admin&&<div className="flow"><button className="button secondary" onClick={()=>{setKey(x.key);setValue(x.value)}}>Edit</button><button className="button danger" onClick={()=>{if(confirm("Hapus informasi ini?"))void run(()=>rpc("sc_delete_school_fact",{p_school:schoolId,p_key:x.key}))}}>Hapus</button></div>}</div>)}{!facts.length&&<div className="empty">Belum ada memori sekolah.</div>}</section>}
  {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </>;
}
