const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const XLSX=require('xlsx');
const moduleUnderTest={exports:{}};
const source=fs.readFileSync(path.join(__dirname,'../lib/excel.ts'),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','module','exports',output)(require,moduleUnderTest,moduleUnderTest.exports);
(async()=>{
 const wb=XLSX.utils.book_new();
 const sheet=XLSX.utils.aoa_to_sheet([
  ['Tanggal','Jam_Mulai','Nilai','Nominal','Latitude','Keterangan'],
  [new Date(2026,9,2),new Date(1899,11,30,8,30),85,150000,-7.25,'Agenda sekolah'],
  [46297,0.5,90,0,112.75,'Angka serial Excel'],
  ['2026-10-03','09:45',0,5000,0,'Tanggal teks']
 ]);
 sheet.A2.z='dd/mm/yyyy';sheet.B2.z='hh:mm';
 XLSX.utils.book_append_sheet(wb,sheet,'Data');
 const file=new File([XLSX.write(wb,{type:'buffer',bookType:'xlsx'})],'qa.xlsx');
 const rows=await moduleUnderTest.exports.readExcel(file);
 assert.deepEqual(rows.map(r=>[r.Tanggal,r.Jam_Mulai]),[['2026-10-02','08:30'],['2026-10-02','12:00'],['2026-10-03','09:45']]);
 assert.deepEqual(rows.map(r=>[r.Nilai,r.Nominal,r.Latitude]),[[85,150000,-7.25],[90,0,112.75],[0,5000,0]]);
 console.log('PASS: real Excel date/time normalization; amounts, scores, coordinates preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
