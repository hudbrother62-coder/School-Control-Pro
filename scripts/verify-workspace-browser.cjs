/* Local UI integration only: synthetic identity, intercepted APIs, no real login or database writes. */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=require(require.resolve('playwright',{paths:[runtime||process.cwd()]}));
function load(file,deps={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',js)(n=>deps[n]||require(n),module,module.exports);return module.exports}
const catalog=load('modules.ts');const nav=load('workspace-navigation.ts',{'./modules':catalog});
const testPort=3100+(process.pid%10000);const root=process.env.WORKSPACE_TEST_URL||'http://127.0.0.1:'+testPort;
const userId='11111111-1111-4111-8111-111111111111',schoolId='22222222-2222-4222-8222-222222222222',staffId='33333333-3333-4333-8333-333333333333',classId='44444444-4444-4444-8444-444444444444',studentId='55555555-5555-4555-8555-555555555555';
const date=new Date().toISOString().slice(0,10);const month=date.slice(0,7);
const user={id:userId,aud:'authenticated',role:'authenticated',email:'fixture@example.test',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
let role='owner';const writes=[];const errors=[];
const fixtures={
 sc_members:()=>[{school_id:schoolId,user_id:userId,role}],
 sc_schools:()=>[{id:schoolId,name:'Sekolah Pengujian Lokal',timezone:'Asia/Jakarta',education_level:'SMP',academic_year:'2026/2027',semester:'Ganjil',report_settings:{}}],
 sc_subscriptions:()=>[{status:'active',trial_ends_at:'2027-01-01T00:00:00Z',current_period_end:'2027-12-31T00:00:00Z'}],
 sc_staff:()=>[{id:staffId,school_id:schoolId,user_id:userId,name:'Guru Pengujian',position:'Guru',staff_type:'teacher',status:'active',shift_start:'07:00',late_tolerance_minutes:15}],
 sc_classes:()=>[{id:classId,school_id:schoolId,name:'VII A',grade:'7',academic_year:'2026/2027',status:'active'}],
 sc_students:()=>[{id:studentId,school_id:schoolId,class_id:classId,nis:'1001',name:'Siswa Pengujian',status:'active',gender:'L',parent_whatsapp:'628100000000'}],
 sc_subjects:()=>[{id:'66666666-6666-4666-8666-666666666666',name:'Matematika',code:'MTK'}],
 sc_teacher_assignments:()=>[{id:'77777777-7777-4777-8777-777777777777',teacher_id:userId,class_id:classId,subject_id:'66666666-6666-4666-8666-666666666666',mode:'mapel'}],
 sc_finance_accounts:()=>[{id:'88888888-8888-4888-8888-888888888888',name:'Kas Tunai',kind:'cash',opening_balance:0}],
 sc_student_bills:()=>[{id:'99999999-9999-4999-8999-999999999999',student_id:studentId,title:'SPP Oktober',amount_due:100000,due_on:date,period:month,status:'unpaid'}],
};
let testStudents=fixtures.sc_students();const secondStudent='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const secondClass='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
testStudents.push({...testStudents[0],id:secondStudent,name:'Siswa Kedua',nis:'1002',class_id:secondClass});for(let i=0;i<59;i++)testStudents.push({...testStudents[0],id:'cccccccc-cccc-4ccc-8ccc-'+String(i).padStart(12,'0'),name:'Siswa Massal '+String(i+1).padStart(2,'0'),nis:String(2000+i)});
fixtures.sc_students=()=>testStudents;const testClasses=fixtures.sc_classes();testClasses.push({...testClasses[0],id:secondClass,name:'VII B'});fixtures.sc_classes=()=>testClasses;
async function mock(route){const req=route.request(),url=new URL(req.url());const name=url.pathname.split('/').pop();let data;
 if(url.pathname==='/auth/v1/user')data=user;
 else if(url.pathname.includes('/auth/v1/'))data={};
 else if(url.pathname.includes('/rest/v1/rpc/')){
  if(name==='sc_master_save_student_profile'){
   const body=req.postDataJSON();writes.push({name,body});
   if(body.p_id===secondStudent)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({message:'Data siswa dilindungi dalam pengujian'})});
   const existing=testStudents.find(x=>x.id===body.p_id);if(existing)Object.assign(existing,body.p_payload);else testStudents.push({id:crypto.randomUUID(),...body.p_payload});data=body.p_id||testStudents.at(-1).id;
  }else if(name==='sc_master_save_class'){const body=req.postDataJSON();writes.push({name,body});const id=crypto.randomUUID();testClasses.push({id,name:body.p_name,grade:body.p_grade,academic_year:body.p_year});data=id;
  }else if(name==='sc_team_directory')data=[{user_id:userId,role,staff_name:'Guru Pengujian',email:'fixture@example.test'}];
  else if(name==='sc_is_platform_admin')data=false;
  else if(name==='sc_finance_summary')data={income:0,expense:0,opening:0,budget:0,billed:100000,paid:0};
  else if(name==='sc_performance_summary')data={present_days:0,late_days:0,programs:0,trainings:0,verified_events:0};
  else if(name==='sc_bk_aggregate')data={cases_total:0,records_total:0,open_cases:0,services_total:0,by_kind:[],by_domain:[],by_status:[]};
  else data=[];
  if(req.method()==='POST'&&!['sc_is_platform_admin','sc_finance_summary','sc_performance_summary','sc_bk_aggregate','sc_master_save_student_profile','sc_master_save_class'].includes(name))writes.push({name,body:req.postDataJSON()});
 }else{
  let rows=fixtures[name]?.()||[];
  if(req.method()!=='GET'&&req.method()!=='HEAD'){writes.push({name,body:req.postDataJSON()});rows=[{id:crypto.randomUUID(),...(req.postDataJSON()||{})}];}
  for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))rows=rows.filter(r=>r[key]===undefined||String(r[key])===value.slice(3));}
  data=req.headers().accept?.includes('vnd.pgrst.object')?(rows[0]||null):rows;
 }
 await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','content-range':'0-0/1'},body:req.method()==='HEAD'?'':JSON.stringify(data)});
}
(async()=>{
 let server;if(!process.env.WORKSPACE_TEST_URL){server=require('node:child_process').spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--port',String(testPort),'--hostname','127.0.0.1'],{cwd:path.join(__dirname,'..'),detached:true,stdio:['ignore','pipe','pipe']});server.stderr.on('data',x=>process.stderr.write(x));for(let i=0;i<200;i++){try{const r=await fetch(root+'/app');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,150));if(i===199)throw Error('Local test server did not start')}}
 let executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;let args=['--no-sandbox'];
 if(process.env.CHROMIUM_PACKAGE){const loaded=require(process.env.CHROMIUM_PACKAGE);const binary=loaded.default||loaded;executablePath=await binary.executablePath();args=binary.args;}
 const browser=await chromium.launch({headless:true,executablePath,args});
 try{
 const context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.route('https://*.supabase.co/**',mock);
 await context.route('**/api/ai',route=>{writes.push({name:'api/ai',body:route.request().postDataJSON()});return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'Hasil pengujian lokal'})})});
 await context.route('**/api/orchestrator',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({plan:{title:'Alur pengujian',reason:'Pengujian lokal',steps:[]},source:'deterministic'})}));
 await context.addInitScript(({user})=>{const claims={sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)};const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify(claims))+'.local-fixture';localStorage.setItem('sb-sfzaexzpbcvynkhglndi-auth-token',JSON.stringify({access_token:token,refresh_token:'local-fixture-only',token_type:'bearer',expires_in:3600,expires_at:claims.exp,user}));}, {user});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(root+'/app');await page.locator('.shell').waitFor({timeout:60000});
 async function go(module,feature){await page.evaluate(hash=>{location.hash=hash},nav.routeHash({module,feature}));await page.locator('.top h1').filter({hasText:feature}).waitFor().catch(async e=>{throw Error(module+'/'+feature+' current='+await page.locator('.top h1').textContent()+' '+e.message)});await page.waitForFunction(feature=>document.querySelector('.top h1')?.textContent===feature,feature);await page.waitForFunction(()=>![...document.querySelectorAll('[role="status"]')].some(e=>e.textContent==='Memuat fitur…'));await page.waitForTimeout(70);}
 const smoke=[];
 for(const testRole of (process.env.WORKSPACE_FOCUSED_TEST?[]:['owner','counselor'])){
  role=testRole;if(testRole!=='owner'){await page.reload();await page.locator('.shell').waitFor();}
  for(const module of catalog.modules){if(testRole==='counselor'&&module.key!=='bk')continue;
   for(const feature of catalog.visibleFeatures(module,testRole)){
    await go(module.key,feature);
    const data=await page.locator('.content').evaluate(el=>({heading:[...el.querySelectorAll('h2,h3')].map(h=>h.textContent).join(' | '),text:el.textContent||'',cards:el.querySelectorAll('.card,.panel').length,width:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(data.heading||data.cards>0,module.key+' / '+feature+' has no functional screen');
    assert.ok(data.width<=data.viewport+2,'Desktop horizontal overflow '+module.key+' / '+feature);
    assert.equal(errors.length,0,errors.join('\n'));smoke.push({role:testRole,module:module.key,feature,heading:data.heading});
   }
  }
 }
 role='owner';await page.reload();await page.locator('.shell').waitFor();
 await go('master','Siswa');assert.equal(await page.locator('.module-tabs').count(),0,'Top submenu removed');
 const importTop=await page.locator('.import-panel').evaluate(el=>el.getBoundingClientRect().top);const tableTop=await page.locator('.data-table').evaluate(el=>el.getBoundingClientRect().top);assert.ok(importTop<tableTop,'Excel toolbar must precede records');
 assert.equal(await page.locator('.data-table tbody tr').count(),50);await page.getByRole('button',{name:'Berikutnya',exact:true}).click();assert.equal(await page.locator('.data-table tbody tr').count(),11);await page.getByRole('button',{name:'Sebelumnya',exact:true}).click();
 await page.getByRole('searchbox',{name:'Cari Siswa',exact:true}).fill('1002');assert.equal(await page.locator('.data-table tbody tr').count(),1);await page.getByRole('searchbox',{name:'Cari Siswa',exact:true}).fill('');
 await page.getByLabel('Filter kelas',{exact:true}).selectOption(secondClass);assert.equal(await page.locator('.data-table tbody tr').count(),1);await page.getByLabel('Filter kelas',{exact:true}).selectOption('');
 await page.getByRole('checkbox',{name:'Pilih Siswa Pengujian',exact:true}).check();await page.getByRole('checkbox',{name:'Pilih Siswa Kedua',exact:true}).check();await page.getByRole('button',{name:'Arsipkan pilihan (2)',exact:true}).click();const batchDialog=page.getByRole('dialog',{name:'Konfirmasi Arsipkan pilihan'});await batchDialog.getByRole('button',{name:'Konfirmasi tindakan',exact:true}).click();await batchDialog.waitFor({state:'hidden'});await page.getByText('1 berhasil, 1 gagal. Data yang gagal tetap dipilih.',{exact:true}).waitFor();assert.ok(await page.getByRole('checkbox',{name:'Pilih Siswa Kedua',exact:true}).isChecked());assert.ok(writes.some(w=>w.name==='sc_master_save_student_profile'&&w.body.p_id===studentId&&w.body.p_payload.status==='archived'&&w.body.p_payload.name==='Siswa Pengujian'),'Archive keeps the full student identity');
 await page.getByRole('button',{name:'Batal memilih',exact:true}).click();await page.getByRole('button',{name:'Tambah Siswa',exact:true}).click();const studentModal=page.getByRole('dialog',{name:'Tambah Siswa'});await studentModal.getByLabel('Nama lengkap',{exact:true}).fill('Siswa Kelas Baru');await studentModal.getByRole('combobox',{name:'Kelas',exact:true}).click();await studentModal.getByRole('textbox',{name:'Cari Kelas',exact:true}).fill('VII Khusus');await studentModal.getByRole('button',{name:/Buat kelas baru/}).click();await studentModal.getByRole('button',{name:'Simpan Data',exact:true}).click();await studentModal.waitFor({state:'hidden'});const classWrite=writes.find(w=>w.name==='sc_master_save_class'&&w.body.p_name==='VII Khusus');assert.ok(classWrite,'Typed class creates actual master class');const savedStudent=writes.find(w=>w.name==='sc_master_save_student_profile'&&w.body.p_payload.name==='Siswa Kelas Baru');assert.ok(savedStudent&&/^[a-f0-9-]{36}$/.test(savedStudent.body.p_payload.class_id),'New student links a real class ID rather than arbitrary text');
 // Check the actual job of each restored HR screen, then verify destination tables with intercepted writes.
 await go('gajian','Jadwal Kerja');await page.getByRole('heading',{name:'Jadwal Kerja & Penempatan',exact:true}).waitFor();
 await page.getByLabel('Nama jadwal',{exact:true}).fill('Jadwal Uji');await page.getByRole('button',{name:'Tambah Jadwal',exact:true}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('Jadwal kerja disimpan'));
 assert.ok(writes.some(w=>w.name==='sc_hr_work_schedules'&&w.body.name==='Jadwal Uji'&&w.body.school_id===schoolId&&w.body.weekday.length===5),'Schedule must save work hours to school schedule table');
 await go('gajian','Lokasi Presensi');await page.getByRole('heading',{name:'Lokasi Presensi',exact:true,level:2}).waitFor();
 assert.equal(await page.getByLabel('Latitude',{exact:true}).count(),1);assert.equal(await page.getByLabel('Longitude',{exact:true}).count(),1);
 await page.getByLabel('Nama lokasi',{exact:true}).fill('Kampus Uji');await page.getByLabel('Latitude',{exact:true}).fill('0');await page.getByLabel('Longitude',{exact:true}).fill('0');await page.getByRole('button',{name:'Tambah Lokasi',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('Lokasi presensi disimpan'));
 assert.ok(writes.some(w=>w.name==='sc_hr_locations'&&w.body.latitude===0&&w.body.longitude===0&&w.body.radius_meters===150),'Location saves valid zero coordinates and radius');
 await go('gajian','Komponen Dinamis');await page.getByRole('heading',{name:'Komponen Dinamis Payroll',exact:true}).waitFor();
 await page.getByLabel('Nama komponen',{exact:true}).fill('Tunjangan Uji');await page.getByLabel('Nominal default',{exact:true}).fill('250000');await page.getByRole('button',{name:'Tambah Komponen',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('Komponen payroll disimpan'));
 assert.ok(writes.some(w=>w.name==='sc_payroll_component_catalog'&&w.body.kind==='earning'&&w.body.default_amount===250000),'Component creates payroll catalog data');
 await go('gajian','Rekrutmen');await page.getByRole('heading',{name:'Rekrutmen Sekolah',exact:true}).waitFor();assert.equal(await page.getByLabel('Nama jadwal',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Tambah lowongan draft',exact:true}).click();const openingModal=page.getByRole('dialog',{name:'Tambah lowongan'});await openingModal.getByLabel('Nama',{exact:true}).fill('Guru Matematika');await openingModal.getByRole('button',{name:'Simpan perubahan',exact:true}).click();await openingModal.waitFor({state:'hidden'});
 assert.ok(writes.some(w=>w.name==='sc_recruitment_openings'&&w.body.title==='Guru Matematika'&&w.body.status==='draft'),'Recruitment creates a draft opening rather than a schedule');
 for(const feature of ['PBD/EDS','KSP/KOSP','RKJM','RKT','RKAS','SOP']){await go('kepsek_ai',feature);assert.equal(await page.getByRole('heading',{name:'Asisten Perencanaan Sekolah',exact:true}).count(),0);}
 const mobileRoutes=[['overview','Ringkasan Operasional'],['master','Siswa'],['calendar','Kalender Sekolah'],['guru_ai','Modul Ajar'],['assistant','Asisten Guru'],['attendance','Check-in/check-out'],['gajian','Proses Payroll'],['sikas','Pembayaran'],['settings','Branding'],['help','Mulai dari Sini']];
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});for(const [m,f] of mobileRoutes){await go(m,f);const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(overflow.width<=overflow.viewport+2,`Overflow ${width}px ${m}/${f}: ${JSON.stringify(overflow)}`)}if(width<=740){await page.getByRole('button',{name:'Menu',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Menu sekolah'});await dialog.waitFor();const top=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+20,r.y+20)?.closest('[role="dialog"]')===el});assert.ok(top,'Drawer is underneath header');await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.body.style.overflow),'');}}
 await page.setViewportSize({width:390,height:844});await go('master','Siswa');await page.getByRole('button',{name:/Tambah Siswa|Tambah Data|Tambah Baru/}).first().click();const modal=page.getByRole('dialog').filter({hasText:/Siswa/i});await modal.waitFor();const bounds=await modal.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:innerWidth,height:innerHeight,parent:el.parentElement.parentElement.tagName}});assert.ok(bounds.x>=0&&bounds.right<=bounds.width+1&&bounds.y>=0&&bounds.bottom<=bounds.height+1,'Modal outside viewport');assert.equal(bounds.parent,'BODY','Modal must use body portal');await page.keyboard.press('Escape');
 await go('guru_ai','Modul Ajar');assert.ok(await page.getByText('Konteks Pembelajaran',{exact:true}).isVisible());assert.ok(await page.getByText('Topik pembelajaran',{exact:true}).isVisible());
 await go('sikas','Pemasukan');await go('sikas','Dashboard Keuangan');assert.ok(await page.getByRole('heading',{name:'Ringkasan Keuangan',exact:true}).isVisible());assert.equal(await page.getByRole('button',{name:'Tambah Data',exact:true}).count(),0);
 await go('help','Asisten AI');await page.getByRole('button',{name:'Buka Asisten Guru',exact:true}).first().click();await page.waitForFunction(()=>document.querySelector('.top h1')?.textContent==='Asisten Guru');await page.goBack();await page.waitForFunction(()=>document.querySelector('.top h1')?.textContent==='Asisten AI');
 await go('overview','Ringkasan Operasional');fs.mkdirSync('docs/qa',{recursive:true});await page.screenshot({path:'docs/qa/mobile-workspace.png',fullPage:true});await page.setViewportSize({width:1366,height:900});await page.screenshot({path:'docs/qa/desktop-workspace.png',fullPage:true});
 fs.writeFileSync('docs/qa/workspace-browser-results.json',JSON.stringify({scope:'Local UI integration with synthetic identity and intercepted APIs; not a live database or merchant E2E test.',screens:smoke.length,viewports:[320,390,768,1366],errors,writes,smoke},null,2));
 console.log('PASS: '+smoke.length+' menu screens, mobile layouts, overlay/focus/escape, canonical navigation/back, top Excel, search/class filters, pagination, partial batch failures and typed master-class creation.');
 }finally{await browser.close();if(server){try{process.kill(-server.pid,'SIGTERM')}catch{server.kill()}}}
})().catch(e=>{console.error(e);process.exit(1)});
