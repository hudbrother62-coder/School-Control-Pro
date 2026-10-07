const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function compile(file,deps){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','module','exports',js)(name=>deps[name]||require(name),module,module.exports);return module.exports}
const modules=compile('lib/modules.ts',{});const nav=compile('lib/workspace-navigation.ts',{'./modules':modules});const planner=compile('lib/orchestrator.ts',{'./modules':modules});let currentRole='teacher',seenToken='';
const db={auth:{getUser:async token=>{seenToken=token;return {data:{user:{id:'local-user'}}}}},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{role:currentRole}})})};
const api=compile('app/api/orchestrator/route.ts',{'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},'@supabase/supabase-js':{createClient:()=>db},'@/lib/modules':modules,'@/lib/orchestrator':planner,'@/lib/workspace-navigation':nav});
const env=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','GEMINI_API_KEY'];const original=Object.fromEntries(env.map(k=>[k,process.env[k]]));
(async()=>{try{process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.example.test';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='fixture-public-key';delete process.env.GEMINI_API_KEY;
 const request=(authorization,text)=>({headers:new Headers(authorization?{authorization}:{}),json:async()=>({school_id:'local-school',request:text})});
 assert.equal((await api.POST(request(null,'Buat RKT'))).status,401);
 const reply=await api.POST(request('Bearer local-fixture-token','Pengajuan lembur sampai payroll dan slip'));assert.equal(reply.status,200);assert.equal(seenToken,'local-fixture-token');assert.ok(reply.body.plan.steps.length>0);
 assert.ok(reply.body.plan.objective);assert.ok(reply.body.plan.acceptanceCriteria.length>=3);assert.ok(['high','critical'].includes(reply.body.plan.riskLevel));
 const payroll=reply.body.plan.steps.filter(s=>s.module==='gajian'&&s.feature==='Proses Payroll');assert.ok(payroll.length>0);assert.ok(payroll.every(s=>s.permitted===false));assert.ok(payroll.every(s=>s.action&&s.verification&&s.requiresApproval));
 currentRole='owner';const owner=await api.POST(request('Bearer local-fixture-token','Pengajuan lembur sampai payroll dan slip'));assert.ok(owner.body.plan.steps.every(s=>s.permitted));
 console.log('PASS: orchestrator Bearer parsing, authentication and role-specific payroll workflow.');
 }finally{for(const k of env)if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k]}})().catch(e=>{console.error(e);process.exit(1)});
