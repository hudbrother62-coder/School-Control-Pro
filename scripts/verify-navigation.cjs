const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
function load(file,deps={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync('lib/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',js)(name=>deps[name]||require(name),module,module.exports);return module.exports}
const catalog=load('modules.ts');const nav=load('workspace-navigation.ts',{'./modules':catalog});const help=load('workspace-help.ts');
let routes=0;
for(const role of Object.keys(catalog.ROLE_LABELS))for(const module of catalog.modules){for(const feature of catalog.visibleFeatures(module,role)){
 const target=nav.resolveWorkspaceRoute(module.key,feature,role);assert.deepEqual(target,{module:module.key,feature});assert.deepEqual(nav.readRouteHash(nav.routeHash(target),role),target);
 const instructions=help.taskHelp(module.key,feature);assert.ok(instructions.purpose&&instructions.before&&instructions.result);assert.ok(instructions.steps.length>=3);assert.ok(catalog.modules.find(m=>m.key==='help').features.includes(nav.guideFor(module.key)));routes++;
}}
assert.deepEqual(nav.resolveWorkspaceRoute('guru_ai','Ngobrol AI','teacher'),{module:'assistant',feature:'Asisten Guru'});
assert.deepEqual(nav.resolveWorkspaceRoute('command','Agenda','teacher'),{module:'calendar',feature:'Kalender Sekolah'});
for(const feature of ['Draft Payroll','Review','Approval','Kunci Periode','Rekap Payroll'])assert.deepEqual(nav.resolveWorkspaceRoute('gajian',feature,'owner'),{module:'gajian',feature:'Proses Payroll'});
assert.equal(nav.resolveWorkspaceRoute('gajian','Proses Payroll','teacher'),null);
assert.equal(nav.resolveWorkspaceRoute('assistant','Asisten Kepala Sekolah','teacher'),null);
assert.equal(nav.resolveWorkspaceRoute('bk','Konseling Individu','principal'),null);
assert.deepEqual(nav.resolveWorkspaceRoute('bk','','principal'),{module:'bk',feature:'Analitik BK'});
assert.equal(nav.resolveWorkspaceRoute('assistant','','viewer'),null);
assert.equal(nav.resolveWorkspaceRoute('sikas','Pembayaran','teacher'),null);
assert.equal(nav.resolveWorkspaceRoute('invalid','bad','owner'),null);
assert.equal(nav.resolveWorkspaceRoute('master','bad','owner'),null);
console.log('PASS: '+routes+' role/menu routes, canonical legacy redirects, hash roundtrips, per-menu help and private-feature navigation restrictions.');
