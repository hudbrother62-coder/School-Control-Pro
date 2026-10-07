const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const ts=require("typescript");
const base=path.resolve(__dirname,"..");
// Public Supabase publishable keys are intentionally safe for browser use. Block legacy project refs and service-role material only.
const forbidden=["vtcdopzlgitqhvxqmtuy","ypekuhwyjvyyzvedncqh","service_role=eyJ","SUPABASE_SERVICE_ROLE_KEY="];
for(const folder of ["app","components","lib","supabase"]){
 const walk=(dir)=>{for(const x of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,x.name);
  if(x.isDirectory()){walk(p);continue;}
  if(!/\.(?:ts|tsx|js|jsx|sql|json)$/.test(x.name))continue;
  const s=fs.readFileSync(p,"utf8");
  for(const term of forbidden)assert(!s.includes(term),"Legacy production credential/project reference in "+path.relative(base,p));
 }};
 walk(path.join(base,folder));
}
function load(file,deps={}){
 const js=ts.transpileModule(fs.readFileSync(path.join(base,"lib",file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function("require","module","exports",js)((key)=>deps[key]||require(key),module,module.exports);
 return module.exports;
}
const modules=load("modules.ts");
const {orchestrate}=load("orchestrator.ts",{"./modules":modules});
const check=(request,role,target,allowed)=>{const x=orchestrate(request,role);assert.equal(x.module,target,request);assert.equal(x.permitted,allowed,request)};
check("Buat RKT tahun ajaran","principal","kepsek_ai",true);
check("Saya ingin absen pribadi","teacher","attendance",true);
check("Slip gaji saya","teacher","payslip",true);
check("Tagihan siswa","teacher","sikas",false);
check("Konseling individu","counselor","bk",true);
check("Konseling individu","principal","bk",false); // Principal navigation exposes aggregates only; private sessions remain counselor-only.
check("Data siswa dan kelas","owner","master",true);
check("Halo","teacher","overview",true);
const dashboard=fs.readFileSync(path.join(base,"app/app/page.tsx"),"utf8");
const dashboardWithoutShell=dashboard.replace(/^import WorkspaceNavigation from ["']@\/components\/WorkspaceNavigation["'];\n/m,"");
const dashboardWithoutClock=dashboardWithoutShell.replace(/^import LiveClock from ["']@\/components\/LiveClock["'];\n/m,"");
assert(!/^import\s+\w+\s+from\s+["']@\/components\//m.test(dashboardWithoutClock),"Dashboard panels must load on demand instead of in the initial bundle.");
assert(/dynamic\(\s*\(\)\s*=>\s*import\(/.test(dashboard),"Dashboard panels must use lazy dynamic imports.");
assert(!dashboard.includes("setInterval(()=>setLiveTime"),"A per-second clock must not re-render the full dashboard.");
assert(dashboard.includes("<LiveClock "),"Attendance must render the isolated live clock component.");
const orchestratorUi=fs.readFileSync(path.join(base,"components/UniversalOrchestrator.tsx"),"utf8");
assert(orchestratorUi.includes("/api/orchestrator"),"Universal Orchestrator must call the role-checked AI planning endpoint.");
assert(fs.readdirSync(path.join(base,"supabase/migrations")).some(x=>x.includes("orchestration_workflows")),"Workflow run and step tables must be created by a migration.");
const journal=fs.readFileSync(path.join(base,"components/TeachingJournal.tsx"),"utf8");
assert(journal.includes('.update(payload).eq("school_id",schoolId).eq("id",editingId)'),"Teaching Journal must support editing existing entries.");
assert(journal.includes('.delete().eq("school_id",schoolId).eq("id",r.id)'),"Teaching Journal must support deleting owned entries.");
const schoolProfile=fs.readFileSync(path.join(base,"components/SchoolProfile.tsx"),"utf8");
assert(schoolProfile.includes('allowCustom customLabel="Gunakan jenjang ini"'),"School profile must allow standard and custom education levels.");
const masterHub=fs.readFileSync(path.join(base,"components/MasterHubV2.tsx"),"utf8");
assert(masterHub.includes('select("education_level,academic_year")'),"Class level choices must follow the school education level.");
assert(masterHub.includes('Template Excel')&&masterHub.includes('Export Data'),"Data Induk must keep per-menu import templates and exports.");
const teacherAi=fs.readFileSync(path.join(base,"components/AIWorkbench.tsx"),"utf8");
for(const required of ["CP / TP / ATP yang diketahui","Kompetensi awal / prasyarat","Kebutuhan inklusi / dukungan khusus","Preferensi asesmen","Kurikulum / acuan"])assert(teacherAi.includes(required),"Guru AI project context missing: "+required);
const calendar=fs.readFileSync(path.join(base,"components/SchoolCalendar.tsx"),"utf8");
assert(calendar.includes('count>0&&<i aria-label={count+" agenda"}'),"Calendar dates with agenda must show an indicator.");
assert(calendar.includes("REKAP BULANAN")&&calendar.includes("agenda-grade-group"),"Calendar must keep separated monthly agenda recaps.");
const reportModule=modules.modules.find(x=>x.key==="reports");
assert(reportModule&&reportModule.features.includes("Arsip Laporan"),"Pusat Laporan must be exposed as a first-class navigation module.");
assert(!dashboard.includes('className="module-tabs"')&&dashboard.includes("WorkspaceNavigation"),"Header submenus must be removed while sidebar/drawer navigation remains.");
const dashboardOverview=fs.readFileSync(path.join(base,"components/DashboardOverview.tsx"),"utf8");
assert(dashboardOverview.includes("COMMAND CENTER SEKOLAH")&&dashboardOverview.includes("Pusat Laporan"),"Dashboard must render the operational command center and direct report access.");
const reportCenter=fs.readFileSync(path.join(base,"components/ReportCenter.tsx"),"utf8");
for(const required of ["Laporan Akademik","Laporan Disiplin & Prestasi","Laporan Keuangan","Laporan Perpustakaan","Standar dokumen sekolah Indonesia"])assert(reportCenter.includes(required),"Report Center missing: "+required);
const reportEngine=fs.readFileSync(path.join(base,"lib/report-engine.ts"),"utf8");
assert(reportEngine.includes("show_logo")&&reportEngine.includes("classification_code")&&reportEngine.includes("signer_title"),"Report engine must honor shared school template settings.");
const disciplineTemplate=fs.readFileSync(path.join(base,"components/DisciplineReportTemplate.tsx"),"utf8");
assert(disciplineTemplate.includes("sc_update_report_settings")&&!disciplineTemplate.includes("localStorage.setItem"),"Discipline report template must persist in the school workspace, not browser localStorage.");
const disciplineParity=fs.readFileSync(path.join(base,"components/DisciplineLegacyParity.tsx"),"utf8");
assert(disciplineParity.includes('focus==="Rekap & Laporan"')&&disciplineParity.includes("rekap_disiplin_prestasi"),"Discipline recap must use the official report engine.");
const financeParity=fs.readFileSync(path.join(base,"components/FinanceLegacyParity.tsx"),"utf8");
assert(financeParity.includes('focus==="Laporan"')&&financeParity.includes("rekap_piutang_siswa")&&financeParity.includes("rekap_pembayaran_siswa"),"Finance report center must include period, receivable, and payment reports.");
const demoWorkspace=fs.readFileSync(path.join(base,"components/DemoWorkspace.tsx"),"utf8");
assert(demoWorkspace.includes('"reports","Pusat Laporan"')&&demoWorkspace.includes("<ReportCenter"),"Demo must expose the first-class report center.");
for(const required of ["Laporan Lengkap","Rekap & Laporan","Laporan BK","Laporan Program","Buku Kas Umum","Realisasi Anggaran","Arsip Laporan"])assert(demoWorkspace.includes(required),"Demo report parity missing: "+required);
assert(demoWorkspace.includes("DemoReportView")&&demoWorkspace.includes("downloadExcel"),"Demo report pages must provide preview/export behavior.");
assert(demoWorkspace.includes("settings::Branding")&&demoWorkspace.includes("principalNip"),"Demo report identity must be configurable from Branding.");
const authScreen=fs.readFileSync(path.join(base,"components/AuthScreen.tsx"),"utf8");
const registerHelper=fs.readFileSync(path.join(base,"lib/register-account.ts"),"utf8");
assert(!authScreen.includes(".auth.signUp("),"Primary registration must not depend on Supabase confirmation email.");
assert(registerHelper.includes('functions.invoke("register-school-account"')&&registerHelper.includes("signInWithPassword"),"Registration must use the server-confirmed function and establish a password session.");
assert(!dashboard.includes(".auth.signUp("),"Fallback /app registration must not reintroduce email-confirmation signup.");
console.log("PASS: isolation, navigation visibility, command center, report center, CRUD, agenda, school-level, Guru AI, and official report regression checks.");
"use client";
