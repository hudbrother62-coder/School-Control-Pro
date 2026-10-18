"use client";

import {useEffect,useMemo,useState} from "react";
import {FileSpreadsheet,FileText,Printer,RefreshCw,SlidersHorizontal} from "lucide-react";
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
 gajian:{title:"Laporan SDM",subtitle:"Rekap administrasi kepegawaian",columns:["Nama","Unit","Status"],row:["Contoh Pegawai","Sekolah","Aktif"]},
 guru_ai:{title:"Laporan Perangkat Ajar",subtitle:"Daftar modul, RPP dan bahan ajar guru",columns:["Guru","Mapel","Dokumen","Status"],row:["Contoh Guru","Matematika","RPP Semester","Ditinjau"]},
 calendar:{title:"Laporan Kegiatan dan Agenda",subtitle:"Rekap agenda, pelaksanaan dan hasil kegiatan",columns:["Tanggal","Kegiatan","Penanggung jawab","Pelaksanaan","Keterangan"],row:["01-10-2026","Rapat sekolah","Contoh PIC","Selesai","Notulensi tersedia"]}
};
function exampleReport(scope:string):OfficialReportModel{
 const x=previewCatalog[scope]||previewCatalog.default;
 return {moduleKey:scope==="default"?"reports":scope,documentType:"template_preview",prefix:"UJI",
  title:x.title,subtitle:x.subtitle,periodLabel:"Contoh periode",status:"draft",orientation:x.columns.length>4?"landscape":"portrait",
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
 },[original,identity?.principal_name,identity?.principal_nip,identity?.city,identity?.report_settings?.letter_city,identity?.report_settings?.signer_title]);

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

 return <section className="rt-preview" aria-label="Pratinjau interaktif laporan">
   <div className="rt-preview-toolbar">
    <div><span className="eyebrow">PREVIEW A4 • LANGSUNG</span><h3>{model.title||"Pratinjau Dokumen"}</h3><p>{selected?"Berdasarkan arsip yang dipilih (salinan draf)":"Data ilustrasi, bukan data sekolah sebenarnya"} · {editor.orientation==="portrait"?"A4 potret":"A4 lanskap"}</p></div>
    <div className="rt-preview-actions"><button className="button secondary" disabled={!identity||busy} onClick={print}><Printer size={15}/> Cetak / PDF</button><button className="button secondary" disabled={!identity||busy} onClick={()=>void exportAs("docx")}><FileText size={15}/> Word</button><button className="button secondary" disabled={!identity||busy} onClick={()=>void exportAs("xlsx")}><FileSpreadsheet size={15}/> Excel</button></div>
   </div>
   <div className="rt-source-strip">
    <label className="field">Sumber isi dokumen
     <select value={sourceId} disabled={loading} onChange={e=>setSourceId(e.target.value)}>
      <option value="">Contoh format ({previewCatalog[scope]?.title||"Laporan Sekolah"})</option>
      {sources.map(source=><option key={source.id} value={source.id}>{source.document_number+" · "+source.title}</option>)}
     </select>
    </label>
    <label className="field">Kertas
     <select value={editor.orientation} onChange={e=>update("orientation",e.target.value)}><option value="portrait">A4 Potret</option><option value="landscape">A4 Lanskap</option></select>
    </label>
   </div>
   <details className="rt-preview-editor"><summary><SlidersHorizontal size={15}/> Sesuaikan judul, periode, dan pengesahan</summary>
    <div className="fields">
     <label className="field full">Judul laporan<input value={editor.title} onChange={e=>update("title",e.target.value)}/></label>
     <label className="field full">Subjudul<input value={editor.subtitle} onChange={e=>update("subtitle",e.target.value)}/></label>
     <label className="field">Periode laporan<input value={editor.period} onChange={e=>update("period",e.target.value)}/></label>
     <label className="field">Kota penerbit<input value={editor.letterCity} onChange={e=>update("letterCity",e.target.value)}/></label>
     <label className="field">Jabatan penandatangan<input value={editor.signerTitle} onChange={e=>update("signerTitle",e.target.value)}/></label>
     <label className="field">Nama penandatangan<input value={editor.signerName} onChange={e=>update("signerName",e.target.value)}/></label>
     <label className="field full">Catatan kaki<input value={editor.footer} onChange={e=>update("footer",e.target.value)}/></label>
    </div>
    <button className="button secondary" onClick={()=>{setSourceId("");setMessage("Pratinjau kembali menggunakan data contoh.")}}><RefreshCw size={15}/> Kembali ke contoh</button>
    <p className="hint">Perubahan pada bagian ini berlaku untuk draf pratinjau dan ekspor saat ini. Arsip dan nomor dokumen yang sudah diterbitkan tidak diubah.</p>
   </details>
   <div className="rt-sheet-surround">
    {identity?<iframe title={"Pratinjau A4 "+model.title} sandbox="" referrerPolicy="no-referrer" srcDoc={html} className={"rt-preview-frame "+(editor.orientation==="landscape"?"landscape":"")}/>:<div className="empty">Memuat identitas sekolah dan pratinjau dokumen…</div>}
   </div>
   <div className="rt-preview-footer">
    <span>{selected?"Sumber: "+selected.document_number+" (draf tanpa nomor asli)":"Contoh format "+(scope==="default"?"umum":scope)+" • "+rows+" baris simulasi"}</span>
    <small>{loading?"Memuat arsip…":sources.length+" arsip tersedia pada kategori ini"}</small>
   </div>
   {error&&<div className="banner error" role="alert">{error}</div>}{message&&<div className="banner success" role="status">{message}</div>}
  </section>;
}
