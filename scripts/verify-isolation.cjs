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
console.log("PASS: source isolation and 8 role-aware orchestration scenarios.");
"use client";

