const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
const e={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/url-validation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(e);
assert.equal(e.validHttpUrl(' https://example.org/document '),'https://example.org/document');assert.equal(e.validHttpUrl(''),null);
for(const url of ['javascript:alert(1)','data:text/html,test','file:///etc/passwd','not-a-url','https://user:password@example.org'])assert.throws(()=>e.validHttpUrl(url));
console.log('PASS document URL validation rejects executable schemes, file paths, malformed and credential-bearing URLs.');
