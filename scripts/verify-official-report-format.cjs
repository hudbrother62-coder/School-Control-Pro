// Regression checks for school-specific official report metadata and safe letter assets.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const PizZip=require('pizzip');
function load(file,deps){
 const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports',output)(name=>deps[name]||require(name),mod,mod.exports);
 return mod.exports;
}
let exported,generatedWord;
const engine=load('lib/report-engine.ts',{
 '@/lib/report-template-client':{templateBlob:async blob=>{generatedWord=blob;return blob;},resolveReportAssets:async x=>x},
 '@/lib/excel':{downloadExcel:async(name,sheets)=>{exported={name,sheets};}}
});
const identity={
 name:'SD Negeri Contoh',npsn:'12345678',address:'Jalan Pendidikan 1',
 academic_year:'2026/2027',education_level:'SD',principal_name:'Rina & Putri',principal_nip:'198801012011012001',
 phone:'0341123456',email:'info@example.sch.id',website:null,province:'Jawa Timur',city:'Malang',
 postal_code:'65100',logo_url:'https://example.sch.id/logo.png',signature_url:'https://example.sch.id/signature.png',
 stamp_url:'https://example.sch.id/stamp.png',
 report_settings:{letter_city:'Batu',signer_title:'Kepala Satuan Pendidikan',
 show_logo:false,show_signature:false,show_stamp:false,show_phone:true}
};
const model={
 moduleKey:'buku_kerja',documentType:'rekap_kehadiran',prefix:'AKD',
 title:'Laporan Kehadiran Siswa',status:'issued',periodLabel:'Semester Ganjil',
 issuedAt:'2026-10-07T17:15:00.000Z',
 sections:[{title:'Daftar Hadir',columns:['Nama','Hadir'],rows:[['Anak & Rekan',20]]}]
};
const html=engine.officialReportHtml(identity,model,'AKD/001/2026');
assert.match(html,/Batu, 08 Oktober 2026/,'date and city must follow school settings and WIB');
assert.match(html,/Kepala Satuan Pendidikan/);
assert.match(html,/Rina &amp; Putri/,'identities must be escaped in HTML');
assert.match(html,/AKD\/001\/2026/);
assert.ok(!html.includes('https://example.sch.id/logo.png')&&!html.includes('https://example.sch.id/signature.png'),'disabled image assets must not appear');
assert.ok(!html.includes('SekolaPro · Dokumen sekolah'),'official document footer must identify the school');
const story=engine.narrativeDocumentHtml(identity,{title:'Surat Keterangan',kind:'OTHER',content:'Isi surat',revision:1,status:'approved'});
assert.match(story,/Batu, /); // narrative documents use the configured signing city
assert.match(story,/Kepala Satuan Pendidikan/);
assert.ok(!story.includes('https://example.sch.id/logo.png')&&!story.includes('https://example.sch.id/signature.png'));
(async()=>{
 await engine.downloadOfficialExcel(model,'AKD/001/2026',identity);
 assert.match(exported.name,/\.xlsx$/);
 const summary=Object.fromEntries(exported.sheets[0].rows.map(row=>[row.Bagian,row.Nilai]));
 assert.equal(summary.Sekolah,'SD Negeri Contoh');
 assert.equal(summary.NPSN,'12345678');
 assert.equal(summary['Tanggal Terbit'],'08 Oktober 2026');
 assert.equal(summary['Nomor Dokumen'],'AKD/001/2026');
 assert.equal(exported.sheets[1].rows[0].Nama,'Anak & Rekan');
 // Real DOCX ZIP roundtrip: verify formal kop/logo column and school-specific signature/date.
 global.document={createElement:()=>({set href(v){},set download(v){},click(){}})};
 await engine.downloadOfficialDocx(identity,model,'AKD/001/2026');
 assert.ok(generatedWord,'DOCX generator should produce binary output');
 const archive=new PizZip(await generatedWord.arrayBuffer());
 const docXml=archive.file('word/document.xml').asText();
 assert.ok(docXml.includes('<w:tbl>'),'default Word document should include a two-column school letterhead');
 assert.match(docXml,/SD Negeri Contoh/);
 assert.match(docXml,/Batu, 08 Oktober 2026/,'Word sign-off must preserve original issue date in WIB');
 assert.match(docXml,/Kepala Satuan Pendidikan/);
 assert.match(docXml,/w:val="double"/,'school letterhead must carry a formal double border');
 console.log('PASS: date/authority, asset visibility, HTML escaping, official letter identity, Excel issue metadata and real DOCX ZIP roundtrip.');
})().catch(err=>{console.error(err);process.exit(1);});
