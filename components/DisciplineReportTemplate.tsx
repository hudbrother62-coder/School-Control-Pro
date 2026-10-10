"use client";
import {useRealtimeRefresh} from "@/lib/school-realtime";
import SearchableSelect from "@/components/SearchableSelect";
import {errorMessage} from "@/lib/error-message";
import {useEffect,useMemo,useState} from "react";
import {Eye,Save} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {loadReportIdentity,previewOfficialReport,type OfficialReportModel,type ReportIdentity} from "@/lib/report-engine";
import {isAdmin,type Role} from "@/lib/modules";

type Form={
 title:string;subtitle:string;signerTitle:string;letterCity:string;footer:string;classificationCode:string;
 showLogo:boolean;showNpsn:boolean;showPhone:boolean;showEmail:boolean;showWebsite:boolean;showSignature:boolean;showStamp:boolean;
 layout:"formal"|"minimal"
};
const blank:Form={title:"LAPORAN DISIPLIN & PRESTASI SISWA",subtitle:"Rekap kejadian, pembinaan, tindak lanjut dan prestasi",signerTitle:"Kepala Sekolah",letterCity:"",footer:"SekolaPro · Dokumen kesiswaan",classificationCode:"",showLogo:true,showNpsn:true,showPhone:true,showEmail:true,showWebsite:false,showSignature:true,showStamp:false,layout:"formal"};

export default function DisciplineReportTemplate({schoolId,role}:{schoolId:string;role:Role}){
 const admin=isAdmin(role);
 const db=useMemo(()=>browserDb(),[]);
 const [identity,setIdentity]=useState<ReportIdentity|null>(null),[form,setForm]=useState<Form>(blank),[busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState("");
 const [uploading,setUploading]=useState<"logo"|"signature"|"stamp"|null>(null);
 useRealtimeRefresh(schoolId,async()=>{if(db)setIdentity(await loadReportIdentity(db,schoolId));});
 async function load(){if(!db)return;try{const i=await loadReportIdentity(db,schoolId),s=i.report_settings||{};setIdentity(i);setForm({
  title:String(s.discipline_title||blank.title),subtitle:String(s.discipline_subtitle||blank.subtitle),signerTitle:String(s.signer_title||blank.signerTitle),letterCity:String(s.letter_city||i.city||""),
  footer:String(s.discipline_footer||blank.footer),classificationCode:String(s.classification_code||""),showLogo:s.show_logo!==false,showNpsn:s.show_npsn!==false,showPhone:s.show_phone!==false,
  showEmail:s.show_email!==false,showWebsite:s.show_website===true,showSignature:s.show_signature!==false,showStamp:s.show_stamp===true,layout:s.layout==="minimal"?"minimal":"formal"
 })}catch(e){setError(errorMessage(e))}}
 useEffect(()=>{void load()},[db,schoolId]);
 function set<K extends keyof Form>(k:K,v:Form[K]){setForm(x=>({...x,[k]:v}))}
 async function save(){if(!db)return;setBusy(true);setError("");setOk("");try{
  const patch={discipline_title:form.title,discipline_subtitle:form.subtitle,discipline_footer:form.footer,signer_title:form.signerTitle,letter_city:form.letterCity,classification_code:form.classificationCode,
   show_logo:form.showLogo,show_npsn:form.showNpsn,show_phone:form.showPhone,show_email:form.showEmail,show_website:form.showWebsite,show_signature:form.showSignature,show_stamp:form.showStamp,layout:form.layout};
  const {error}=await db.rpc("sc_update_report_settings",{p_school:schoolId,p_patch:patch});if(error)throw error;
  await load();setOk("Template dokumen tersimpan di database sekolah dan berlaku lintas perangkat.");
 }catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 async function uploadAsset(file:File|undefined,key:"logo"|"signature"|"stamp"){
  if(!file||!db||!admin)return;
  setUploading(key);setError("");setOk("");
  try{
   if(!["image/png","image/jpeg"].includes(file.type)||file.size>2*1024*1024)throw Error("Gunakan file PNG/JPG maksimal 2 MB.");
   const path=schoolId+"/images/"+crypto.randomUUID()+"."+(file.type==="image/png"?"png":"jpg");
   const {error:uploadError}=await db.storage.from("sc-report-assets").upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   try{
    const {error:saveError}=await db.rpc("sc_configure_report_templates",{p_school:schoolId,p_patch:{asset_paths:{[key]:path},["show_"+key]:true}});
    if(saveError)throw saveError;
   }catch(e){await db.storage.from("sc-report-assets").remove([path]);throw e;}
   await load();setOk((key==="logo"?"Logo":key==="signature"?"Tanda tangan":"Stempel")+" sekolah berhasil diunggah dan dipakai dalam laporan.");
  }catch(e){setError(errorMessage(e))}finally{setUploading(null)}
 }
 function preview(){if(!identity)return;const i={...identity,report_settings:{...(identity.report_settings||{}),signer_title:form.signerTitle,letter_city:form.letterCity,classification_code:form.classificationCode,show_logo:form.showLogo,show_npsn:form.showNpsn,show_phone:form.showPhone,show_email:form.showEmail,show_website:form.showWebsite,show_signature:form.showSignature,show_stamp:form.showStamp,layout:form.layout}};const model:OfficialReportModel={moduleKey:"disiplin",documentType:"template_preview",prefix:"DIS",title:form.title,subtitle:form.subtitle,orientation:"portrait",confidentiality:"restricted",status:"draft",footer:form.footer,metrics:[{label:"Nama siswa",value:"Contoh Peserta Didik"},{label:"NIS",value:"12345"},{label:"Kelas",value:"VIII A"},{label:"Catatan terkait",value:"3"}],sections:[{title:"Contoh Rekap",columns:["Tanggal","Jenis/Kejadian","Kategori","Poin","Tindak Lanjut"],rows:[["01-10-2026","Contoh catatan","Kedisiplinan",10,"Pembinaan dan pemantauan"]]}],signatures:[{role:"Mengetahui / Menetapkan · "+form.signerTitle,name:i.principal_name||form.signerTitle,identifier:i.principal_nip?"NIP. "+i.principal_nip:null}]};previewOfficialReport(i,model)}
 return <section className="panel"><div className="sectionhead"><div><h2>Template Dokumen Disiplin & Prestasi</h2><p className="muted">Template sekarang tersimpan pada workspace sekolah, bukan browser lokal. Pengaturan kop dan pengesahan dipakai oleh Report Engine bersama.</p></div></div>
 <div className="fields">
  <label className="field full">Judul default<input value={form.title} onChange={e=>set("title",e.target.value)}/></label>
  <label className="field full">Subjudul<input value={form.subtitle} onChange={e=>set("subtitle",e.target.value)}/></label>
  <label className="field">Jabatan penandatangan<input value={form.signerTitle} onChange={e=>set("signerTitle",e.target.value)}/></label>
  <label className="field">Kota pada dokumen<input value={form.letterCity} onChange={e=>set("letterCity",e.target.value)}/></label>
  <label className="field">Kode klasifikasi<input value={form.classificationCode} onChange={e=>set("classificationCode",e.target.value)} placeholder="Opsional, sesuai tata naskah sekolah/dinas"/></label>
  <label className="field">Gaya dokumen<SearchableSelect label="Gaya dokumen" value={form.layout} onChange={e=>set("layout",e.target.value as Form["layout"])}><option value="formal">Formal Indonesia</option><option value="minimal">Formal Minimal</option></SearchableSelect></label>
  <label className="field full">Footer<input value={form.footer} onChange={e=>set("footer",e.target.value)}/></label>
 </div>
 <h3 style={{marginTop:22}}>Identitas dan pengesahan laporan</h3>
 <p className="muted">Unggah aset sekolah sekali; logo ditempatkan pada kop surat, sedangkan tanda tangan dan stempel ditempatkan pada pengesahan laporan. File tersimpan privat pada sekolah ini.</p>
 <div className="fields">
  {([
   ["logo","Logo sekolah (kop surat)"],
   ["signature","Tanda tangan kepala sekolah"],
   ["stamp","Stempel sekolah (opsional)"]
  ] as const).map(([key,label])=><div className="field" key={key}>
   <strong>{label}</strong>
   {identity?.[key+"_url" as "logo_url"|"signature_url"|"stamp_url"]?<img src={identity[key+"_url" as "logo_url"|"signature_url"|"stamp_url"]||""} alt={label} style={{display:"block",height:88,maxWidth:180,objectFit:"contain",background:"#fff",border:"1px solid #d5dbe5",borderRadius:10,padding:8,margin:"9px 0"}}/>:<small className="hint">Belum ada gambar. Unggah PNG/JPG untuk menampilkannya di dokumen.</small>}
   <input type="file" accept="image/png,image/jpeg" aria-label={"Unggah "+label} disabled={!admin||busy||uploading!==null} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value="";void uploadAsset(file,key)}}/>
   {uploading===key&&<small role="status">Mengunggah dan menyimpan…</small>}
  </div>)}
 </div>
 <div className="report-template-options">
  {([
   ["showLogo","Logo sekolah"],["showNpsn","NPSN"],["showPhone","Telepon"],["showEmail","Email"],["showWebsite","Website"],["showSignature","Scan tanda tangan"],["showStamp","Stempel sekolah"]
  ] as const).map(([key,label])=><label className="field" key={key}><span>{label}</span><input type="checkbox" checked={form[key]} disabled={!admin} onChange={e=>set(key,e.target.checked)}/></label>)}
 </div>
 <div className="banner"><strong>Data penandatangan</strong><p className="hint">Nama kepala sekolah dan NIP berasal dari Pengaturan Sekolah → Profil / Branding. Lengkapi identitas tersebut agar pengesahan tidak menampilkan nama kosong. Tanda tangan berupa gambar tidak menggantikan tanda tangan elektronik tersertifikasi.</p></div>
 <div className="flow" style={{marginTop:14}}><button className="button secondary" disabled={!identity} onClick={preview}><Eye size={15}/> Preview A4 Draft</button><button className="button" disabled={!admin||busy||form.title.trim().length<3} onClick={()=>void save()}><Save size={15}/>{busy?"Menyimpan…":"Simpan Template"}</button></div>
 {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success" role="status">{ok}</div>}
 </section>;
}
