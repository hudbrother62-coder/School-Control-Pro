const assert=require("node:assert/strict");
const fs=require("node:fs"),ts=require("typescript"),Module=require("module");
const input=fs.readFileSync(require("node:path").join(__dirname,"../lib/bulk-import.ts"),"utf8");
const js=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const m=new Module("bulk-import-test");m.filename="bulk-import-test.js";m.paths=module.paths;m._compile(js,m.filename);
const {required,numeric,day,importPreparedRows}=m.exports;
assert.equal(required({Nama:"Siswa"},"Nama"),"Siswa");
assert.throws(()=>required({Nama:"Contoh Siswa"},"Nama"),/contoh/i);
assert.throws(()=>numeric({Jumlah:"-1"},"Jumlah"),/angka/);
assert.throws(()=>day({Tanggal:"2026-02-30"},"Tanggal"),/tidak valid/);
(async()=>{
 const accepted=[];
 const rows=[{Nama:"A"},{Nama:"B"},{Nama:"A"},{Nama:"C"}];
 const result=await importPreparedRows(rows,r=>({key:required(r,"Nama"),payload:{name:r.Nama}}),async batch=>{
  if(batch.some(x=>x.name==="B"))throw Error("server reject B");
  accepted.push(...batch.map(x=>x.name));
 },["already"]);
 assert.deepEqual(accepted,["A","C"]);
 assert.equal(result.imported,2);
 assert.equal(result.errors.length,2);
 assert.deepEqual(result.errors.map(x=>x.row),[3,4]);
 console.log("PASS: import template validation, duplicate protection, per-row fallback, partial failure report");
})().catch(e=>{console.error(e);process.exitCode=1});
