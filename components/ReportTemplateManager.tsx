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
 return <section className="panel"><div className="sectionhead"><div><h2>Template Laporan Sekolah</h2><p className="muted">Atur format Word milik sekolah. Excel tetap berupa tabel terpisah untuk pengolahan data.</p></div><button className="button secondary" onClick={()=>void sample()}>Unduh contoh DOCX</button></div>
 <div className="banner"><strong>Mulai dengan 3 langkah</strong><p>Unduh contoh → sesuaikan kop, margin, font dan tata letak di Word → unggah lalu uji hasilnya. Pertahankan placeholder agar isi diganti otomatis. Template khusus jenis laporan diprioritaskan, lalu modul, lalu template semua laporan. Tanpa unggahan, format formal bawaan dipakai.</p><p>Format DOCX yang diunggah berlaku untuk ekspor Word. Preview/cetak PDF memakai layout formal aplikasi dengan identitas yang sama.</p></div>
 <div className="banner" role="status"><strong>Pemeriksaan identitas dokumen: {readiness.length-missing.length}/{readiness.length} lengkap</strong>
  <p>{missing.length?'Lengkapi unsur berikut sebelum menerbitkan dokumen resmi: '+missing.map(item=>item.label).join(', ')+'.':'Identitas dasar dan aset yang diaktifkan sudah tersedia. Periksa kembali kewenangan penandatangan, ketentuan dinas setempat, dan kebenaran isi sebelum disahkan.'}</p>
  <p className="hint">Foto tanda tangan/stempel bukan tanda tangan elektronik tersertifikasi. NIP dicantumkan jika penandatangan memilikinya. Template Word kustom tidak otomatis menjadi tampilan PDF; gunakan ekspor Word dan konversi untuk hasil yang identik.</p>
 </div>
 <div className="fields"><label className="field">Berlaku untuk<select value={scope} onChange={e=>setScope(e.target.value)}>{scopes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="field">Atau kode jenis laporan/dokumen<input value={scope} onChange={e=>setScope(e.target.value)} placeholder="Misal: buku_kas_umum atau RKT"/><small className="hint">Gunakan kode jenis dari arsip laporan atau jenis dokumen AI. Kosongkan untuk memilih kembali dari daftar.</small></label>{admin&&<label className="field">Upload template DOCX (maks. 5 MB)<input type="file" accept=".docx" disabled={busy||!scope.trim()} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/></label>}</div>
 <div className="fields">{['logo','signature','stamp'].map((key,i)=><label className="field" key={key}>{['Logo','Tanda tangan','Stempel'][i]} (PNG/JPG, 2 MB){identity?.[key+'_url']&&<img src={identity[key+'_url']} alt={key} style={{maxWidth:110,maxHeight:80,objectFit:'contain'}}/>}{admin&&<input type="file" accept="image/png,image/jpeg" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file,key);}}/>}</label>)}</div>
 {admin&&<div className="fields"><label className="field">Font isi laporan<input value={settings.body_font||'Times New Roman'} onChange={e=>setIdentity({...identity,report_settings:{...settings,body_font:e.target.value}})}/></label><label className="field">Ukuran font isi (pt)<input type="number" min="8" max="18" value={settings.body_font_size||11} onChange={e=>setIdentity({...identity,report_settings:{...settings,body_font_size:Number(e.target.value)}})}/></label><button className="button" disabled={busy||!identity} onClick={()=>void run(()=>save({body_font:settings.body_font||'Times New Roman',body_font_size:settings.body_font_size||11}))}>Simpan format isi</button></div>}
 <h3>Template aktif</h3>{Object.entries(templates).map(([key,t])=><div className="entry" key={key}><div><strong>{scopes.find(x=>x[0]===key)?.[1]||key}</strong><small>{t.name} · {new Date(t.updated_at).toLocaleString('id-ID')}</small></div><div className="flow"><button className="button secondary" disabled={busy} onClick={()=>void run(async()=>{const {data,error}=await db.storage.from('sc-report-assets').download(t.path);if(error||!data)throw error;download(data,t.name);})}>Unduh</button>{admin&&<button className="button danger" disabled={busy} onClick={()=>{if(confirm('Lepas template ini? Ekspor berikutnya memakai fallback modul / format bawaan.'))void run(()=>save({templates:{[key]:null}}));}}>Lepas</button>}</div></div>)}{!Object.keys(templates).length&&<p className="muted">Belum ada template unggahan. Seluruh laporan memakai format formal bawaan.</p>}
 <button className="button" disabled={busy||!identity} onClick={()=>void run(async()=>{const selected=templates[scope]||templates.default;const test={...identity,report_settings:{...settings,templates:selected?{default:selected}:{}}} as ReportIdentity;await downloadOfficialDocx(test,{moduleKey:'reports',documentType:'template_test',prefix:'UJI',title:'Uji Format Laporan Sekolah',periodLabel:'Contoh periode',status:'draft',metrics:[{label:'Jumlah data contoh',value:'2'}],sections:[{title:'Data Uji',columns:['Nama','Kelas','Hasil'],rows:[['Peserta Didik A','VII A','Contoh data untuk pemeriksaan format'],['Peserta Didik B','VII B','Periksa kop, tabel, tanda tangan, dan stempel']]}]});})}>Uji hasil DOCX</button>
 <details style={{marginTop:16}}><summary>Daftar placeholder dan aturan format</summary><p>Placeholder teks: {templateFields.filter(x=>!['report_body','signatories','logo','signature','stamp'].includes(x)).map(x=>'{'+x+'}').join(', ')}.</p><p>Isi laporan wajib: {'{@report_body}'}. Penanggung jawab laporan: {'{@signatories}'} mempertahankan semua nama/peran dari modul. Gambar opsional: {'{@logo}, {@signature}, {@stamp}'}. Setiap placeholder dengan @ harus berada dalam paragraf tersendiri. Gambar tetap di Word juga dipertahankan. Tidak perlu menyertakan data pribadi contoh dalam template.</p><p>Standar operasional bawaan: identitas, judul, periode, nomor/status, data per jenis laporan dan penanggung jawab. Kepala sekolah menetapkan format final; jenis laporan pemerintah mengikuti ketentuan instansi terkait.</p></details>
 {error&&<div className="banner error" role="alert">{error}</div>}{message&&<div className="banner success" role="status">{message}</div>}
 <ReportTemplatePreview schoolId={schoolId} scope={scope} identity={identity as ReportIdentity|null}/>
 </section>;
}
