"use client";

import {useEffect,useMemo,useState} from "react";
import {Eye,FileSpreadsheet,FileText,Printer,RefreshCw} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {errorMessage} from "@/lib/error-message";
import {
 downloadOfficialDocx,downloadOfficialExcel,officialReportHtml,printOfficialReport,
 type OfficialReportModel,type ReportIdentity
} from "@/lib/report-engine";

type ArchivedSource={
 id:string;title:string;document_number:string;document_type:string;module_key:string;
 issued_at:string;content_snapshot:unknown;
};
type Editor={title:string;subtitle:string;period:string;footer:string;signerTitle:string;signerName:string;letterCity:string;orientation:"portrait"|"landscape"};
const previewCatalog:Record<string,{title:string;subtitle:string;columns:string[];row:(string|number)[]}> = {
 default:{title:"Laporan Administrasi Sekolah",subtitle:"Rekap kegiatan dan data sekolah",columns:["No.","Uraian","Keterangan"],row:[1,"Contoh kegiatan sekolah","Data simulasi untuk uji format"]},
 journals:{title:"Laporan Jurnal",subtitle:"Rekap aktivitas pembelajaran dan jurnal harian",columns:["Tanggal","Pengguna","Kegiatan","Keterangan"],row:["01-10-2026","Contoh Guru","Jurnal pembelajaran","Contoh"]},
 buku_kerja:{title:"Laporan Akademik dan Kehadiran",subtitle:"Rekap nilai, kehadiran dan kelas",columns:["Nama siswa","Kelas","Nilai","Kehadiran"],row:["Contoh Siswa","VIII A",85,"Hadir"]},
 disiplin:{title:"Laporan Disiplin dan Prestasi",subtitle:"Kejadian, pembinaan dan tindak lanjut",columns:["Tanggal","Siswa","Kejadian","Tindak lanjut"],row:["01-10-2026","Contoh Siswa","Catatan pembinaan","Pemantauan"]},
 bk:{title:"Laporan Bimbingan Konseling",subtitle:"Rekap layanan sesuai kewenangan akses",columns:["Tanggal","Jenis layanan","Jumlah","Keterangan"],row:["01-10-2026","Layanan klasikal",1,"Data contoh, bukan data konseling nyata"]},
 command:{title:"Laporan Program Kerja",subtitle:"Program, penanggung jawab dan progres",columns:["Program","PIC","Progres","Status"],row:["Contoh Program","Contoh PIC","50%","Berjalan"]},
 sikas:{title:"Laporan Keuangan",subtitle:"Rekap transaksi, anggaran dan realisasi",columns:["Tanggal","Uraian","Pemasukan","Pengeluaran"],row:["01-10-2026","Transaksi contoh",100000,0]},
 library:{title:"Laporan Perpustakaan",subtitle:"Koleksi, sirkulasi dan inventaris",columns:["Kode buku","Judul","Jumlah","Keterangan"],row:["BK-001","Buku Contoh",2,"Tersedia"]},
 sarpras:{title:"Laporan Sarana dan Prasarana",subtitle:"Inventaris, kondisi dan pemeliharaan",columns:["Kode inventaris","Nama barang","Jumlah","Kondisi"],row:["INV-001","Meja Contoh",10,"Baik"]},
 kepsek_ai:{title:"Laporan Supervisi",subtitle:"Hasil supervisi dan tindak lanjut guru",columns:["Tanggal","Guru","Aspek","Tindak lanjut"],row:["01-10-2026","Contoh Guru","Pembelajaran","Pendampingan"]},
 gajian:{title:"Laporan SDM",subtitle:"Rekap administrasi kepegawaian",columns:["Nama","Unit","Status"],row:["Contoh Pegawai","Sekolah","Aktif"]}
};
function exampleReport(scope:string):OfficialReportModel{
 const x=previewCatalog[scope]||previewCatalog.default;
 return {moduleKey:scope==="default"?"reports":scope,documentType:"template_preview",prefix:"UJI",
  title:x.title,subtitle:x.subtitle,periodLabel:"Contoh periode",status:"draft",orientation:"portrait",
  notes:["DATA CONTOH — hanya untuk menguji desain template; bukan catatan sekolah sebenarnya."],
  metrics:[{label:"Baris data contoh",value:"1"}],
  sections:[{title:"Contoh Tabel Laporan",columns:x.columns,rows:[x.row]}]};
}
function extractModel(source:ArchivedSource|null,scope:string):OfficialReportModel{
 if(!source)return exampleReport(scope);
 const snapshot=source.content_snapshot as Record<string,unknown>|null;
 const data=(snapshot?.model||snapshot) as OfficialReportModel|null;
 if(!data||!Array.isArray(data.sections)||!data.title)return exampleReport(scope);
 // An archived document is immutable. Editing here produces a fresh, unnumbered draft only.
 return {...data,documentType:data.documentType||source.document_type,moduleKey:data.moduleKey||source.module_key,status:"draft",issuedAt:null};
}

export default function ReportTemplatePreview({schoolId,scope,identity}:{schoolId:string;scope:string;identity:ReportIdentity|null}){
 const db=useMemo(()=>browserDb(),[]);
 const [sources,setSources]=useState<ArchivedSource[]>([]);
 const [sourceId,setSourceId]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [editor,setEditor]=useState<Editor>({title:"",subtitle:"",period:"",footer:"",signerTitle:"Kepala Sekolah",signerName:"",letterCity:"",orientation:"portrait"});

 useEffect(()=>{
  let active=true;
  setSourceId("");
  setSources([]);
  setError("");
  if(!db||!schoolId)return;
  setLoading(true);
  void (async()=>{
   try{
    const {data,error}=await db.from("sc_report_documents")
     .select("id,title,document_number,document_type,module_key,issued_at,content_snapshot")
     .eq("school_id",schoolId).order("issued_at",{ascending:false}).limit(40);
    if(error)throw error;
    if(!active)return;
    const allowed=(data||[]).filter((row:ArchivedSource)=>scope==="default"||row.module_key===scope||row.document_type===scope);
    setSources(allowed as ArchivedSource[]);
    setSourceId(allowed[0]?.id||"");
   }catch(e){if(active)setError("Tidak dapat mengambil laporan tersimpan: "+errorMessage(e)+". Pratinjau contoh tetap tersedia.");}
   finally{if(active)setLoading(false);}
  })();
  return ()=>{active=false;};
 },[db,schoolId,scope]);

 const selected=sources.find(s=>s.id===sourceId)||null;
 const original=useMemo(()=>extractModel(selected,scope),[selected,scope]);
 useEffect(()=>{
  setEditor({
   title:original.title,subtitle:original.subtitle||"",period:original.periodLabel||"",
   footer:original.footer||"",signerTitle:String(identity?.report_settings?.signer_title||"Kepala Sekolah"),
   signerName:identity?.principal_name||"",letterCity:String(identity?.report_settings?.letter_city||identity?.city||""),
   orientation:original.orientation||"portrait"
  });
 },[original,identity]);

 const displayIdentity=useMemo(()=>identity?{
  ...identity,report_settings:{...(identity.report_settings||{}),letter_city:editor.letterCity,signer_title:editor.signerTitle}
 }:null,[identity,editor.letterCity,editor.signerTitle]);
 const model=useMemo<OfficialReportModel>(()=>{
  const sourceModel={...original,title:editor.title.trim()||original.title,subtitle:editor.subtitle,
   periodLabel:editor.period,footer:editor.footer,orientation:editor.orientation,
   status:"draft" as const,issuedAt:null,
   signatures:[{role:"Mengetahui / Mengesahkan · "+(editor.signerTitle.trim()||"Kepala Sekolah"),
    name:editor.signerName.trim()||"........................",identifier:identity?.principal_nip?"NIP. "+identity.principal_nip:null}]
  };
  return sourceModel;
 },[original,editor,identity?.principal_nip]);
 const previewModel=useMemo<OfficialReportModel>(()=>({
  ...model,
  sections:model.sections.map(section=>({...section,rows:section.rows.slice(0,50)})),
  notes:[...(model.notes||[]),...model.sections.some(s=>s.rows.length>50)?
   ["Pratinjau dibatasi 50 baris per tabel agar cepat. Ekspor Word dan Excel memuat semua baris."] :[]]
 }),[model]);
 const html=useMemo(()=>displayIdentity?officialReportHtml(displayIdentity,previewModel):"",[displayIdentity,previewModel]);
 async function exportAs(format:"docx"|"xlsx"){
  if(!displayIdentity)return;
  setBusy(true);setError("");setMessage("");
  try{
   if(format==="docx")await downloadOfficialDocx(displayIdentity,model);
   else await downloadOfficialExcel(model,undefined,displayIdentity);
   setMessage("File "+(format==="docx"?"Word":"Excel")+" berhasil disiapkan dari "+(selected?"snapshot data laporan":"data contoh")+".");
  }catch(e){setError(errorMessage(e))}
  finally{setBusy(false);}
 }
 function print(){if(!displayIdentity)return;setError("");try{printOfficialReport(displayIdentity,model)}catch(e){setError(errorMessage(e))}}
 const update=(key:keyof Editor,value:string)=>setEditor(old=>({...old,[key]:value}));
 const rows=model.sections.reduce((n,s)=>n+s.rows.length,0);

 return <section className="panel" aria-label="Pratinjau interaktif laporan" style={{marginTop:16}}>
  <div className="sectionhead">
   <div><h2>Pratinjau laporan langsung di web</h2><p className="muted">Pilih dokumen berisi data sebenarnya atau lihat contoh. Isian template menyesuaikan data sumber tanpa menyalin ulang tabel.</p></div>
   <Eye size={22}/>
  </div>
  <div className="banner"><strong>{selected?"Snapshot laporan sekolah • "+rows+" baris":"Mode contoh template"}</strong>
   <p>{selected?"Data diambil dari laporan resmi yang tersedia sesuai hak akses. Perubahan format di sini hanya membuat draf baru, bukan mengubah arsip atau nomor dokumen.":"Belum memilih laporan sumber pada kategori ini. Pilih dokumen yang tersedia untuk melihat data sebenarnya, atau gunakan contoh untuk memeriksa desain."}</p>
   <p className="hint">Pratinjau A4 menggunakan format cetak aplikasi. Template DOCX unggahan digunakan saat mengunduh Word dan mungkin memiliki tata letak berbeda.</p>
  </div>
  <div className="fields">
   <label className="field full">Sumber isi laporan
    <select value={sourceId} disabled={loading} onChange={e=>setSourceId(e.target.value)}>
     <option value="">Data contoh untuk pratinjau template</option>
     {sources.map(source=><option key={source.id} value={source.id}>{source.document_number+" · "+source.title}</option>)}
    </select>
    <small className="hint">{loading?"Memuat laporan sesuai akses…":sources.length+" laporan sumber dapat dipilih pada kategori ini."}</small>
   </label>
   <label className="field full">Judul laporan<input value={editor.title} onChange={e=>update("title",e.target.value)}/></label>
   <label className="field full">Subjudul<input value={editor.subtitle} onChange={e=>update("subtitle",e.target.value)}/></label>
   <label className="field">Periode atau semester<input value={editor.period} onChange={e=>update("period",e.target.value)} placeholder="Contoh: Semester ganjil 2026/2027"/></label>
   <label className="field">Orientasi kertas
    <select value={editor.orientation} onChange={e=>update("orientation",e.target.value)}>
     <option value="portrait">A4 Potret</option><option value="landscape">A4 Lanskap (tabel lebar)</option>
    </select>
   </label>
   <label className="field">Jabatan penandatangan<input value={editor.signerTitle} onChange={e=>update("signerTitle",e.target.value)}/></label>
   <label className="field">Nama penandatangan<input value={editor.signerName} onChange={e=>update("signerName",e.target.value)}/></label>
   <label className="field">Kota surat<input value={editor.letterCity} onChange={e=>update("letterCity",e.target.value)}/></label>
   <label className="field full">Keterangan kaki dokumen<input value={editor.footer} onChange={e=>update("footer",e.target.value)}/></label>
  </div>
  <div className="flow" style={{margin:"12px 0"}}>
   <button className="button secondary" disabled={!identity} onClick={()=>{setSourceId("");setMessage("Pratinjau diatur ulang ke data contoh.")}}><RefreshCw size={15}/> Contoh</button>
   <button className="button secondary" disabled={!identity||busy} onClick={print}><Printer size={15}/> Cetak / PDF</button>
   <button className="button secondary" disabled={!identity||busy} onClick={()=>void exportAs("docx")}><FileText size={15}/> Word</button>
   <button className="button" disabled={!identity||busy} onClick={()=>void exportAs("xlsx")}><FileSpreadsheet size={15}/> Excel ({rows} baris)</button>
  </div>
  {identity?
   <div style={{border:"1px solid var(--border, #CBD5E1)",borderRadius:12,overflow:"hidden",background:"#fff"}}>
    <iframe title="Pratinjau dokumen A4 Sekolapro" sandbox="" referrerPolicy="no-referrer" srcDoc={html} style={{width:"100%",height:600,border:0,display:"block",background:"#fff"}}/>
   </div>:
   <div className="empty">Memuat identitas dan format sekolah untuk pratinjau.</div>}
  {selected&&<p className="hint">Sumber: {selected.document_number} · {new Date(selected.issued_at).toLocaleDateString("id-ID")}. Nomor laporan asli tidak dipakai pada draf ini.</p>}
  {error&&<div className="banner error" role="alert">{error}</div>}
  {message&&<div className="banner success" role="status">{message}</div>}
 </section>;
}
