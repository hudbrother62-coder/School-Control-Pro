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
check("Konseling individu","principal","bk",true); // Principal sees overview only; counselor-only RLS still protects cases.
check("Data siswa dan kelas","owner","master",true);
check("Halo","teacher","overview",true);
const dashboard=fs.readFileSync(path.join(base,"app/app/page.tsx"),"utf8");
const dashboardWithoutClock=dashboard.replace(/^import LiveClock from ["']@\/components\/LiveClock["'];\n/m,"");
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
assert(masterHub.includes('select("education_level")'),"Class level choices must follow the school education level.");
assert(masterHub.includes('Template Excel')&&masterHub.includes('Export Data'),"Data Induk must keep per-menu import templates and exports.");
const teacherAi=fs.readFileSync(path.join(base,"components/AIWorkbench.tsx"),"utf8");
for(const required of ["CP / TP / ATP yang diketahui","Kompetensi awal / prasyarat","Kebutuhan inklusi / dukungan khusus","Preferensi asesmen","Kurikulum / acuan"])assert(teacherAi.includes(required),"Guru AI project context missing: "+required);
const calendar=fs.readFileSync(path.join(base,"components/SchoolCalendar.tsx"),"utf8");
assert(calendar.includes('count>0&&<i aria-label={count+" agenda"}'),"Calendar dates with agenda must show an indicator.");
assert(calendar.includes("REKAP BULANAN")&&calendar.includes("agenda-grade-group"),"Calendar must keep separated monthly agenda recaps.");
const reportFiles=[
 "lib/report-engine.ts",
 "components/AcademicLegacyParity.tsx",
 "components/AcademicAdvanced.tsx",
 "components/DisciplinePanel.tsx",
 "components/DisciplineLegacyParity.tsx",
 "components/DisciplineReportTemplate.tsx",
 "components/BKPanel.tsx",
 "components/FinancePanel.tsx",
 "components/FinanceLegacyParity.tsx",
 "components/CommandLegacyParity.tsx",
 "components/HRLegacyParity.tsx",
 "components/PayrollPanel.tsx",
 "components/Supervision.tsx",
 "components/ManagementLegacyParity.tsx",
 "components/DocumentCenter.tsx",
 "components/ReportArchive.tsx",
 "components/SchoolProfile.tsx"
];
for(const file of reportFiles){
 const source=fs.readFileSync(path.join(base,file),"utf8");
 const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true,fileName:file});
 const fatal=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(fatal.length,0,file+" has TypeScript/TSX parse errors: "+fatal.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join(" | "));
}
const reportEngine=fs.readFileSync(path.join(base,"lib/report-engine.ts"),"utf8");
assert(reportEngine.includes("sc_issue_report_document"),"Official reports must issue atomic school document numbers.");
assert(reportEngine.includes('await import("docx")'),"Official Word exports must use native DOCX generation.");
assert(reportEngine.includes("DRAFT"),"Unissued report previews must carry draft state.");
const reportArchive=fs.readFileSync(path.join(base,"components/ReportArchive.tsx"),"utf8");
assert(reportArchive.includes("sc_report_documents"),"Issued reports must be retrievable from the centralized archive.");
const disciplineTemplate=fs.readFileSync(path.join(base,"components/DisciplineReportTemplate.tsx"),"utf8");
assert(disciplineTemplate.includes("sc_update_report_settings")&&!disciplineTemplate.includes("localStorage"),"Discipline report templates must be workspace-persisted, not browser-local.");
const documentCenter=fs.readFileSync(path.join(base,"components/DocumentCenter.tsx"),"utf8");
assert(documentCenter.includes("downloadNarrativeDocx")&&!documentCenter.includes("application/msword"),"Document Center must generate real DOCX rather than HTML renamed as Word.");
const financePanel=fs.readFileSync(path.join(base,"components/FinancePanel.tsx"),"utf8");
assert(financePanel.includes("Tagihan dan Tunggakan")&&financePanel.includes("Anggaran dan Realisasi"),"Finance report center must cover receivables and budget realization.");
const reportMigration=fs.readdirSync(path.join(base,"supabase/migrations")).find(x=>x.includes("official_report_engine"));
assert(reportMigration,"Official report engine schema must be tracked in a migration.");
const reportSql=fs.readFileSync(path.join(base,"supabase/migrations",reportMigration),"utf8");
assert(reportSql.includes("sc_report_documents")&&reportSql.includes("sc_document_sequences"),"Report migration must create archive and numbering tables.");
assert(reportSql.includes("module_key='bk'")&&reportSql.includes("module_key='gajian'"),"Report archive RLS must protect sensitive module reports by role.");

console.log("PASS: isolation, dashboard parity, official reporting, report RLS, native DOCX, finance, discipline, BK, payroll, and archive regression checks.");
"use client";
