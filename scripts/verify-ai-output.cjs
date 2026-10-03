// Provider contract tests use simulated outputs. They do not claim live Gemini quality.
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>deps[n]||require(n),m,m.exports);return m.exports;}
const aiContext=load("lib/ai-school-context.ts");
const teacher=load('lib/teacher-ai-config.ts'),principal=load('lib/principal-ai-config.ts'),templates=load('lib/education-templates.ts'),quality=load('lib/ai-output-quality.ts',{'./teacher-ai-config':teacher,'./principal-ai-config':principal});
let role='owner',membership=true,budget=0,lastBody,finish='STOP',reply='',contextCalls=0;
const db={auth:{getUser:async()=>({data:{user:{id:'fixture-user'}}})},from:name=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:name==='sc_members'?(membership?{role}:null):{name:'Sekolah Uji',academic_year:'2026/2027'}}),limit:async()=>({data:[]})}),rpc:async(name)=>{if(name==="sc_consume_ai_budget")budget++;if(name==="sc_ai_school_context"){contextCalls++;return {error:null,data:{summary:{student:[{present:1001,total:1005}],attendance:[],program:[],grades:[],journals:[],finance:[{secret:"financial-secret"}],period:{start:"2026-10-01",end:"2026-10-31"},generated_at:"2026-10-03",scope:"fixture"}}}}return {error:null}}};
const api=load('app/api/ai/route.ts',{'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},'@supabase/supabase-js':{createClient:()=>db},'@/lib/ai-school-context':aiContext,'@/lib/teacher-ai-config':teacher,'@/lib/education-templates':templates,'@/lib/ai-output-quality':quality});
const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','GEMINI_API_KEY'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]])),originalFetch=global.fetch;
(async()=>{try{
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.test';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='public-fixture';process.env.GEMINI_API_KEY='server-test-key';
 global.fetch=async(url,options)=>{lastBody=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{finishReason:finish,content:{parts:[{text:reply}]}}]})}};
 const request=(module,key,token='fixture')=>({headers:new Headers(token?{authorization:'Bearer '+token}:{}),json:async()=>({school_id:'fixture-school',module,template:key,prompt:'Susun draf sesuai data: kelas VII, topik pecahan, 2 x 40 menit, fasilitas papan tulis.'})});
 assert.equal((await api.POST(request('guru_ai','rpp',null))).status,401);
 membership=false;assert.equal((await api.POST(request('guru_ai','rpp'))).status,403);membership=true;role='teacher';assert.equal((await api.POST(request('kepsek_ai','RKT'))).status,403);role='owner';assert.equal((await api.POST(request('guru_ai','RKT'))).status,400);
 let checked=0;for(const [module,config] of [['guru_ai',teacher.teacherToolConfig],['kepsek_ai',principal.principalToolConfig]])for(const [key,tool] of Object.entries(config)){
  reply=tool.standard.map(s=>'## '+s+'\nIsi simulasi sesuai konteks dan bukti yang diberikan, dengan peninjauan penanggung jawab sekolah.').join('\n');
  const r=await api.POST(request(module,key));assert.equal(r.status,200);assert.equal(r.body.quality.structuralPass,true,module+' '+key);assert.ok(lastBody.system_instruction.parts[0].text.includes(tool.instruction));for(const section of tool.standard)assert.ok(lastBody.system_instruction.parts[0].text.includes(section));assert.ok(lastBody.contents[0].parts[0].text.includes('1005'));assert.ok(!lastBody.contents[0].parts[0].text.includes('financial-secret'));
  assert.equal(quality.evaluateAiOutput(module,key,'## Judul salah\n'+reply.replaceAll('## ','')).structuralPass,false);checked++;
 }
 finish='MAX_TOKENS';assert.equal((await api.POST(request('guru_ai','rpp'))).status,422);
 delete process.env.GEMINI_API_KEY;assert.equal((await api.POST(request('guru_ai','rpp'))).status,503);
 assert.ok(budget===checked+1);
 const authKey='AQ.'+'synthetic_fixture_'.repeat(3);
 const dotRequest=request('guru_ai','rpp');dotRequest.headers.set('x-user-gemini-key',authKey);finish='STOP';
 let forwarded=false;global.fetch=async(url,options)=>{assert.ok(!url.includes(authKey));forwarded=options.headers['x-goog-api-key']===authKey;return {ok:true,json:async()=>({candidates:[{content:{parts:[{thought:true,text:'private thinking'},{text:'Jawaban uji'}]}}]})}};
 const authResult=await api.POST(dotRequest);assert.equal(authResult.status,200);assert.equal(forwarded,true);assert.equal(authResult.body.text,'Jawaban uji');assert.equal(authResult.body.context.status,"included");
 for(const status of [400,401,403,429]){global.fetch=async()=>({ok:false,status});const r=await api.POST(dotRequest);assert.equal(r.status,status===401?403:status);assert.ok(!r.body.error.includes(authKey));assert.ok(/Google|Gemini/.test(r.body.error));}
 const malformed=request('guru_ai','rpp');malformed.headers.set('x-user-gemini-key','invalid key with spaces');assert.equal((await api.POST(malformed)).status,400);
 global.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Jawaban uji'}]}}]})});const countBefore=contextCalls;const optOut=request('guru_ai','rpp');optOut.headers.set('x-user-gemini-key',authKey);const getBody=optOut.json;optOut.json=async()=>({...await getBody(),include_school_context:false});assert.equal((await api.POST(optOut)).body.context.status,'disabled');assert.equal(contextCalls,countBefore);
 console.log('PASS: authorization key with dot forwarded only in header, whitespace rejected, provider errors actionable, thought content excluded.');
console.log('PASS: '+checked+' generator standards enforced server-side; missing sections detected, auth/role/school boundaries, unknown tool rejected, truncated output rejected and missing provider reported. Live provider output remains unverified.');
 }finally{global.fetch=originalFetch;for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}})().catch(e=>{console.error(e);process.exit(1)});
