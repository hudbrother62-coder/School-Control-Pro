'use client';
import {useRealtimeRefresh} from '@/lib/school-realtime';
import {useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase';
import {isAdmin,type Role} from '@/lib/modules';
import {inspectTemplate,templateFields,type SchoolTemplate} from '@/lib/report-template';
import {errorMessage} from '@/lib/error-message';
import {downloadOfficialDocx,type ReportIdentity} from '@/lib/report-engine';
import {resolveReportAssets} from '@/lib/report-template-client';
import ReportTemplatePreview from '@/components/ReportTemplatePreview';
import {AlertCircle,ArrowUpRight,FileDown,FileText,School2,Save,SlidersHorizontal,UploadCloud,UserRound} from 'lucide-react';
const scopes=[['default','Semua laporan / dokumen'],['journals','Jurnal harian & bulanan'],['library','Perpustakaan'],['sarpras','Sarana & prasarana'],['guru_ai','Perangkat ajar AI'],['buku_kerja','Akademik & kehadiran'],['disiplin','Disiplin & prestasi'],['bk','Bimbingan konseling'],['command','Program & tugas'],['sikas','Keuangan'],['gajian','SDM & payroll'],['kepsek_ai','Supervisi & perencanaan']];
export default function ReportTemplateManager({schoolId,role}:{schoolId:string;role:Role}){
 const db=useMemo(()=>browserDb(),[]),admin=isAdmin(role);
 const [identity,setIdentity]=useState<any>(null),[scope,setScope]=useState('default'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useRealtimeRefresh(schoolId,()=>load());
 async function load(){const {data,error}=await db.from('sc_schools').select('*').eq('id',schoolId).single();if(error)throw error;setIdentity(await resolveReportAssets(data,schoolId));}
 useEffect(()=>{load().catch(e=>setError(errorMessage(e)));},[schoolId,db]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await fn();await load();setMessage('Pengaturan laporan tersimpan.')}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 async function save(patch:any){const {error}=await db.rpc('sc_configure_report_templates',{p_school:schoolId,p_patch:patch});if(error)throw error;}
 async function upload(file:File,asset?:string){
  await run(async()=>{
   if(asset){if(!['image/png','image/jpeg'].includes(file.type)||file.size>2*1024*1024)throw Error('Gunakan PNG/JPG maksimal 2 MB.');}
   else{if(!file.name.toLowerCase().endsWith('.docx'))throw Error('Gunakan file DOCX.');inspectTemplate(await file.arrayBuffer());}
   if(!asset&&!/^[A-Za-z0-9_-]{1,80}$/.test(scope))throw Error('Kode laporan hanya huruf, angka, _ atau - (maksimal 80 karakter).');
   const path=schoolId+'/'+(asset?'images':'templates')+'/'+crypto.randomUUID()+'.'+(asset?(file.type==='image/png'?'png':'jpg'):'docx');
   const {error}=await db.storage.from('sc-report-assets').upload(path,file,{contentType:asset?file.type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',upsert:false});if(error)throw error;
   try{await save(asset?{asset_paths:{[asset]:path},...(asset==='signature'?{show_signature:true}:asset==='stamp'?{show_stamp:true}:{show_logo:true})}:{templates:{[scope]:{path,name:file.name,updated_at:new Date().toISOString()}}});}catch(e){await db.storage.from('sc-report-assets').remove([path]);throw e;}
  });
 }
 async function sample(){
  const {Document,Packer,Paragraph,TextRun,Header,Footer,Table,TableRow,TableCell,WidthType,AlignmentType}=await import('docx');
  const borders:any={top:{style:'nil'},bottom:{style:'nil'},left:{style:'nil'},right:{style:'nil'},insideHorizontal:{style:'nil'},insideVertical:{style:'nil'}};
  const out=new Document({styles:{default:{document:{run:{font:'Times New Roman',size:24},paragraph:{spacing:{after:120}}}}},sections:[{properties:{page:{margin:{top:1900,bottom:1134,left:1417,right:1134}}},headers:{default:new Header({children:[new Table({width:{size:100,type:WidthType.PERCENTAGE},borders,rows:[new TableRow({children:[new TableCell({width:{size:20,type:WidthType.PERCENTAGE},borders,children:[new Paragraph('{@logo}')]}),new TableCell({width:{size:80,type:WidthType.PERCENTAGE},borders,children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'{school_name}',bold:true,size:30})]}),new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'{address}',size:18})]}),new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'NPSN {npsn} · {phone} · {email}',size:18})]})]})]})]})]})},footers:{default:new Footer({children:[new Paragraph('{school_name} · {confidentiality} · {status}')]})},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'{report_title}',bold:true,size:26})]}),new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun('{report_subtitle}')]}),new Paragraph('Nomor: {document_number} | Periode: {period} | Tahun Pelajaran: {academic_year}'),new Paragraph('{@report_body}'),new Paragraph('{@signatories}')]}]});
  download(await Packer.toBlob(out),'Template-Laporan-Sekolah.docx');
 }
 function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 const settings=identity?.report_settings||{},templates:Record<string,SchoolTemplate>=settings.templates||{};
 const readiness=identity?[
  {label:'Nama sekolah',ok:!!String(identity.name||'').trim()},
  {label:'NPSN',ok:!!String(identity.npsn||'').trim()},
  {label:'Alamat sekolah',ok:!!String(identity.address||'').trim()},
  {label:'Tahun pelajaran',ok:!!String(identity.academic_year||'').trim()},
  {label:'Nama kepala sekolah',ok:!!String(identity.principal_name||'').trim()},
  {label:'Kota/kabupaten penandatangan',ok:!!String(settings.letter_city||identity.city||'').trim()},
  {label:'Logo sekolah (jika ditampilkan)',ok:settings.show_logo===false||!!identity.logo_url},
  {label:'Tanda tangan (jika diaktifkan)',ok:settings.show_signature===false||!!identity.signature_url},
  {label:'Stempel (jika diaktifkan)',ok:settings.show_stamp!==true||!!identity.stamp_url}
 ]:[];
 const missing=readiness.filter(item=>!item.ok);
 return <div className="rt-page">
  <header className="rt-page-head">
   <div><span className="eyebrow">PUSAT LAPORAN • TEMPLATE SEKOLAH</span><h2>Template & Dokumen Sekolah</h2><p>Atur identitas dan format sekali, lalu gunakan pada laporan dari setiap modul. Pratinjau A4 diperbarui langsung.</p></div>
   <button type="button" className="button secondary" onClick={()=>void sample()}><FileDown size={16}/> Unduh contoh Word</button>
  </header>
  <div className="rt-workspace">
   <div className="rt-configuration">
    <section className="rt-config-card">
     <div className="rt-card-title"><span className="rt-card-icon"><School2 size={20}/></span><div><h3>Identitas & Kop Sekolah</h3><p>Identitas resmi otomatis diambil dari profil sekolah.</p></div></div>
     <div className="rt-school-summary"><strong>{identity?.name||"Memuat nama sekolah…"}</strong><span>{[identity?.address,identity?.city,identity?.province].filter(Boolean).join(", ")||"Alamat sekolah belum dilengkapi"}</span></div>
     <div className="rt-identity-grid">
      <div><small>NPSN</small><strong>{identity?.npsn||"Belum diisi"}</strong></div><div><small>Tahun Pelajaran</small><strong>{identity?.academic_year||"Belum diisi"}</strong></div>
      <div><small>Kepala Sekolah</small><strong>{identity?.principal_name||"Belum diisi"}</strong></div><div><small>Kontak Sekolah</small><strong>{identity?.phone||identity?.email||"Belum diisi"}</strong></div>
     </div>
     <a className="rt-inline-link" href="#menu=settings&fitur=Profil+sekolah">Lengkapi identitas di Profil Sekolah <ArrowUpRight size={15}/></a>
     <div className="rt-asset-grid">
      {(["logo","signature","stamp"] as const).map((key,i)=><label className="rt-upload" key={key}>
       <span className="rt-upload-icon">{identity?.[key+"_url"]?<img src={identity[key+"_url"]} alt={key==="logo"?"Logo sekolah":key==="signature"?"Tanda tangan":"Stempel sekolah"}/>:<UploadCloud size={24}/>}</span>
       <strong>{["Logo Sekolah","Tanda Tangan","Stempel Sekolah"][i]}</strong>
       <small>{identity?.[key+"_url"]?"Gambar tersimpan • ganti berkas":"PNG/JPG, maks. 2 MB"}</small>
       {admin&&<input type="file" aria-label={"Unggah "+["logo sekolah","tanda tangan","stempel sekolah"][i]} accept="image/png,image/jpeg" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void upload(file,key);}}/>}
      </label>)}
     </div>
     {!admin&&<p className="hint">Hanya pengelola sekolah yang dapat mengganti aset dokumen.</p>}
    </section>
    <section className="rt-config-card">
     <div className="rt-card-title"><span className="rt-card-icon"><UserRound size={20}/></span><div><h3>Pengesahan & Penandatangan</h3><p>Menggunakan kepala sekolah dari profil, ditempatkan di kanan dokumen.</p></div></div>
     <div className="rt-identity-grid"><div><small>Nama Penandatangan</small><strong>{identity?.principal_name||"Belum diisi"}</strong></div><div><small>NIP (jika ada)</small><strong>{identity?.principal_nip||"—"}</strong></div></div>
     <div className="rt-switch-list">
      {([["show_logo","Tampilkan logo sekolah"],["show_signature","Tampilkan gambar tanda tangan"],["show_stamp","Tampilkan stempel sekolah"]] as const).map(([key,label])=><label key={key} className="rt-switch"><span>{label}</span><input type="checkbox" disabled={!admin||busy} checked={key==="show_stamp"?settings[key]===true:settings[key]!==false} onChange={e=>setIdentity({...identity,report_settings:{...settings,[key]:e.target.checked}})}/></label>)}
     </div>
    </section>
    <section className="rt-config-card">
     <div className="rt-card-title"><span className="rt-card-icon"><FileText size={20}/></span><div><h3>Format sesuai Jenis Laporan</h3><p>Pilih modul, kemudian periksa dokumen contoh atau laporan tersimpan di sebelah kanan.</p></div></div>
     <label className="field">Jenis laporan<select value={scopes.some(x=>x[0]===scope)?scope:"custom"} onChange={e=>setScope(e.target.value==="custom"?"":e.target.value)}>{scopes.map(([v,label])=><option key={v} value={v}>{label}</option>)}<option value="custom">Jenis dokumen khusus…</option></select></label>
     {!scopes.some(x=>x[0]===scope)&&<label className="field" style={{marginTop:12}}>Kode dokumen khusus<input value={scope} placeholder="Contoh: RKT, rekap_nilai, laporan_rapat" onChange={e=>setScope(e.target.value)}/></label>}
     <p className="hint">Jenis jurnal, akademik, disiplin, BK, keuangan, sarpras, perpustakaan, dan supervisi memiliki contoh tabel masing-masing. Laporan nyata tetap berasal dari modul sumber.</p>
     {admin&&<label className="rt-template-upload"><UploadCloud size={19}/><span><strong>Unggah template Word untuk kategori ini</strong><small>DOCX maksimal 5 MB • opsional</small></span><input type="file" accept=".docx" disabled={busy||!scope.trim()} onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void upload(f);}}/></label>}
     <details className="rt-details"><summary>Template Word yang sudah tersimpan ({Object.keys(templates).length})</summary>
      {Object.entries(templates).map(([key,t])=><div className="entry" key={key}><div><strong>{scopes.find(x=>x[0]===key)?.[1]||key}</strong><small>{t.name} · {new Date(t.updated_at).toLocaleDateString("id-ID")}</small></div><div className="flow"><button className="button secondary" disabled={busy} onClick={()=>void run(async()=>{const {data,error}=await db.storage.from("sc-report-assets").download(t.path);if(error||!data)throw error;download(data,t.name);})}>Unduh</button>{admin&&<button className="button danger" disabled={busy} onClick={()=>{if(confirm("Lepas template ini? Laporan kembali ke format bawaan."))void run(()=>save({templates:{[key]:null}}));}}>Lepas</button>}</div></div>)}
      {!Object.keys(templates).length&&<p className="muted">Belum ada DOCX kustom. Semua laporan memakai format resmi bawaan.</p>}
     </details>
    </section>
    <section className="rt-config-card">
     <div className="rt-card-title"><span className="rt-card-icon"><SlidersHorizontal size={20}/></span><div><h3>Pengaturan Dokumen</h3><p>Font isi untuk laporan Word dan ketentuan dokumen formal.</p></div></div>
     <div className="fields">
      <label className="field">Font dokumen<input value={settings.body_font||"Times New Roman"} disabled={!admin||busy} onChange={e=>setIdentity({...identity,report_settings:{...settings,body_font:e.target.value}})}/></label>
      <label className="field">Ukuran (pt)<input type="number" min="8" max="18" value={settings.body_font_size||11} disabled={!admin||busy} onChange={e=>setIdentity({...identity,report_settings:{...settings,body_font_size:Number(e.target.value)}})}/></label>
     </div>
     <p className="hint">Kop surat dan tanda tangan dipakai di Word dan cetak PDF. Template DOCX kustom hanya mengubah tata letak Word; isi data tetap mengikuti modul asal.</p>
     {admin&&<button className="button rt-save" disabled={busy||!identity} onClick={()=>void run(()=>save({show_logo:settings.show_logo!==false,show_signature:settings.show_signature!==false,show_stamp:settings.show_stamp===true,body_font:settings.body_font||"Times New Roman",body_font_size:settings.body_font_size||11}))}><Save size={17}/>{busy?"Menyimpan…":"Simpan Perubahan Template"}</button>}
     {message&&<div className="banner success" role="status">{message}</div>}{error&&<div className="banner error" role="alert">{error}</div>}
     {missing.length>0&&<p className="rt-alert"><AlertCircle size={16}/> Identitas belum lengkap: {missing.map(x=>x.label).join(", ")}.</p>}
     <details className="rt-details"><summary>Pengaturan lanjutan & uji ekspor</summary>
      <button className="button secondary" disabled={busy||!identity} onClick={()=>void run(async()=>{const selected=templates[scope]||templates.default;const test={...identity,report_settings:{...settings,templates:selected?{default:selected}:{}}} as ReportIdentity;await downloadOfficialDocx(test,{moduleKey:"reports",documentType:"template_test",prefix:"UJI",title:"Uji Format Laporan Sekolah",periodLabel:"Contoh periode",status:"draft",metrics:[{label:"Jumlah data contoh",value:"2"}],sections:[{title:"Data Uji",columns:["Nama","Kelas","Hasil"],rows:[["Peserta Didik A","VII A","Contoh"],["Peserta Didik B","VII B","Periksa tabel dan pengesahan"]]}]});})}>Uji ekspor DOCX</button>
      <p className="hint">Placeholder: {templateFields.filter(x=>!["report_body","signatories","logo","signature","stamp"].includes(x)).map(x=>"{"+x+"}").join(", ")}. Wajib gunakan {"{@report_body}"}; opsional {"{@signatories}"}, {"{@logo}"}, {"{@signature}"}, {"{@stamp}"}. Gambar tanda tangan bukan tanda tangan elektronik tersertifikasi.</p>
     </details>
    </section>
   </div>
   <ReportTemplatePreview schoolId={schoolId} scope={scope} identity={identity as ReportIdentity|null}/>
  </div>
 </div>;
}
