const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../lib/error-message.ts'),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exported={};new Function('exports',output)(exported);
for(const error of [{message:'Judul agenda minimal 3 karakter',code:'P0001'},new Error('Judul agenda minimal 3 karakter'),'Judul agenda minimal 3 karakter']) {
 assert.equal(exported.errorMessage(error),'Judul agenda minimal 3 karakter');
}
for(const error of [null,{},undefined,42,{message:''}]) {
 assert.equal(exported.errorMessage(error),'Permintaan belum berhasil. Silakan coba kembali.');
}
console.log('PASS: database validation messages and unknown-error fallback.');
