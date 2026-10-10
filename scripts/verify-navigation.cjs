const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
function load(file,deps={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync('lib/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',js)(name=>deps[name]||require(name),module,module.exports);return module.exports}
const catalog=load('modules.ts');const nav=load('workspace-navigation.ts',{'./modules':catalog});const help=load('workspace-help.ts');
const principal=load('principal-workspace.ts');
let routes=0;
for(const role of Object.keys(catalog.ROLE_LABELS))for(const module of catalog.modules){for(const feature of catalog.navigationFeatures(module,role)){
 const target=nav.resolveWorkspaceRoute(module.key,feature,role);assert.deepEqual(target,{module:module.key,feature});assert.deepEqual(nav.readRouteHash(nav.routeHash(target),role),target);
 const instructions=help.taskHelp(module.key,feature);assert.ok(instructions.purpose&&instructions.before&&instructions.result);assert.ok(instructions.steps.length>=3);assert.ok(catalog.modules.find(m=>m.key==='help').features.includes(nav.guideFor(module.key)));routes++;
}}
assert.deepEqual(nav.resolveWorkspaceRoute('guru_ai','Ngobrol AI','teacher'),{module:'assistant',feature:'Asisten Guru'});
assert.deepEqual(nav.resolveWorkspaceRoute('assistant','Rencana Pekerjaan','teacher'),{module:'assistant',feature:'Universal AI Orchestrator'});
assert.deepEqual(nav.resolveWorkspaceRoute('assistant','Universal AI Orchestrator','teacher'),{module:'assistant',feature:'Universal AI Orchestrator'});
assert.deepEqual(nav.resolveWorkspaceRoute('command','Agenda','teacher'),{module:'calendar',feature:'Kalender Sekolah'});
assert.deepEqual(nav.resolveWorkspaceRoute('attendance','Check-in/check-out','teacher'),{module:'attendance',feature:'Presensi Saya'});
assert.deepEqual(nav.resolveWorkspaceRoute('attendance','Izin','teacher'),{module:'attendance',feature:'Izin & Cuti'});
assert(!catalog.navigationFeatures(catalog.modules.find(m=>m.key==='attendance'),'teacher').includes('Riwayat Kehadiran'));
assert.deepEqual(nav.resolveWorkspaceRoute('attendance','Riwayat Kehadiran','teacher'),{module:'attendance',feature:'Riwayat Kehadiran'});
assert.deepEqual(nav.resolveWorkspaceRoute('performance','Kehadiran','teacher'),{module:'attendance',feature:'Riwayat Kehadiran'});
assert.deepEqual(nav.resolveWorkspaceRoute('performance','Pelatihan','teacher'),{module:'performance',feature:'Bukti Kinerja & Pengembangan'});
assert.deepEqual(nav.resolveWorkspaceRoute('gajian','Jadwal Kerja','owner'),{module:'attendance',feature:'Jadwal & Shift'});
assert.deepEqual(nav.resolveWorkspaceRoute('gajian','Lokasi Presensi','owner'),{module:'attendance',feature:'Lokasi Presensi'});
assert.deepEqual(nav.resolveWorkspaceRoute('gajian','Kehadiran Tim','supervisor'),{module:'attendance',feature:'Kehadiran Tim'});
assert.deepEqual(nav.resolveWorkspaceRoute('reports','SDM & Payroll','owner'),{module:'reports',feature:'Ringkasan Laporan'});
assert.deepEqual(nav.resolveWorkspaceRoute('settings','Riwayat pembayaran','owner'),{module:'settings',feature:'Langganan'});
assert.deepEqual(nav.resolveWorkspaceRoute('settings','Riwayat Langganan','owner'),{module:'settings',feature:'Langganan'});
assert.deepEqual(nav.resolveWorkspaceRoute('payslip','Riwayat Slip','teacher'),{module:'gajian',feature:'Slip Gaji Saya'});
assert.deepEqual(catalog.navigationFeatures(catalog.modules.find(m=>m.key==='payslip'),'teacher'),[]);
assert(!catalog.navigationFeatures(catalog.modules.find(m=>m.key==='gajian'),'owner').includes('Lembur'));
assert(!catalog.navigationFeatures(catalog.modules.find(m=>m.key==='journals'),'teacher').includes('Jurnal Mengajar'));
assert.deepEqual(catalog.navigationFeatures(catalog.modules.find(m=>m.key==='reports'),'owner'),['Ringkasan Laporan','Template Laporan Sekolah','Arsip Laporan']);
for(const feature of ['Draft Payroll','Review','Approval','Kunci Periode','Rekap Payroll'])assert.deepEqual(nav.resolveWorkspaceRoute('gajian',feature,'owner'),{module:'gajian',feature:'Proses Payroll'});
assert.equal(nav.resolveWorkspaceRoute('gajian','Proses Payroll','teacher'),null);
assert.equal(nav.resolveWorkspaceRoute('assistant','Asisten Kepala Sekolah','teacher'),null);
assert.equal(nav.resolveWorkspaceRoute('bk','Konseling Individu','principal'),null);
assert.deepEqual(nav.resolveWorkspaceRoute('bk','','principal'),{module:'bk',feature:'Analitik BK'});
assert.equal(nav.resolveWorkspaceRoute('assistant','','viewer'),null);
assert.equal(nav.resolveWorkspaceRoute('attendance','','viewer'),null);
assert.equal(nav.resolveWorkspaceRoute('calendar','Agenda Pribadi','viewer'),null);
assert.equal(nav.resolveWorkspaceRoute('calendar','Kehadiran Agenda','viewer'),null);
assert.equal(nav.resolveWorkspaceRoute('calendar','Kalender Sekolah','viewer'),null);
assert.deepEqual(nav.resolveWorkspaceRoute('library','Koleksi Buku','teacher'),{module:'library',feature:'Koleksi Buku'});
assert.deepEqual(nav.resolveWorkspaceRoute('sarpras','Inventaris','teacher'),{module:'sarpras',feature:'Inventaris'});
assert.equal(catalog.navigationFeatures(catalog.modules.find(m=>m.key==='sarpras'),'owner').length,5);
const kp=catalog.modules.find(m=>m.key==='kepsek_ai');
assert.deepEqual(catalog.navigationFeatures(kp,'owner'),principal.principalGroups.map(g=>g.name));
assert.equal(catalog.navigationFeatures(kp,'teacher').length,0);
assert.equal(principal.principalGroups.reduce((n,g)=>n+g.items.length,0),13);
const oldFeatures=principal.principalGroups.flatMap(g=>g.items.map(i=>i.feature));
assert.equal(new Set(oldFeatures).size,oldFeatures.length);
for(const g of principal.principalGroups){
 assert.ok(g.description.length>20);
 assert.deepEqual(nav.resolveWorkspaceRoute('kepsek_ai',g.name,'owner'),{module:'kepsek_ai',feature:g.name});
 for(const item of g.items){
  assert.ok(item.description.length>15);
  assert.equal(principal.principalGroupForFeature(item.feature)?.name,g.name);
  assert.ok(principal.principalSearchText(g.name).includes(item.feature));
  assert.deepEqual(nav.resolveWorkspaceRoute('kepsek_ai',item.feature,'principal'),{module:'kepsek_ai',feature:item.feature});
  assert.ok(!catalog.navigationFeatures(kp,'owner').includes(item.feature));
 }
}
assert.equal(nav.resolveWorkspaceRoute('library','Koleksi Buku','viewer'),null);
assert.equal(nav.resolveWorkspaceRoute('sikas','Pembayaran','teacher'),null);
assert.equal(nav.resolveWorkspaceRoute('invalid','bad','owner'),null);
assert.equal(nav.resolveWorkspaceRoute('master','bad','owner'),null);
console.log('PASS: '+routes+' role/menu routes, canonical legacy redirects, hash roundtrips, per-menu help and private-feature navigation restrictions.');
