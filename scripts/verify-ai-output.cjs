// Regression tests for platform-managed AI provider using simulated responses only.
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>deps[n]||require(n),m,m.exports);return m.exports;}
const aiContext=load('lib/ai-school-context.ts');
const teacher=load('lib/teacher-ai-config.ts'),principal=load('lib/principal-ai-config.ts'),templates=load('lib/education-templates.ts'),quality=load('lib/ai-output-quality.ts',{'./teacher-ai-config':teacher,'./principal-ai-config':principal});
let role='owner',membership=true,budget=0,lastBody,finish='STOP',reply='',contextCalls=0,poolEnabled=true,providerStatuses=[];
const db={auth:{getUser:async()=>({data:{user:{id:'fixture-user'}}})},from:name=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:name==='sc_members'?(membership?{role}:null):{name:'Sekolah Uji',academic_year:'2026/2027'}}),limit:async()=>({data:[]})}),rpc:async(name)=>{if(name==='sc_consume_ai_budget')budget++;if(name==='sc_ai_school_context'){contextCalls++;return {error:null,data:{summary:{student:[{present:1001,total:1005}],attendance:[],program:[],grades:[],journals:[],finance:[{secret:'financial-secret'}],period:{start:'2026-10-01',end:'2026-10-31'},generated_at:'2026-10-03',scope:'fixture'}}}}return {error:null}}};
const pool={loadGeminiKeyPool:async()=>poolEnabled?[{slot:1,key:'server-only-credential',source:'vercel'}]:[],
 fetchGeminiWithPool:async({body})=>{lastBody=JSON.parse(body);if(providerStatuses.length)return {response:null,model:null,configured:poolEnabled?1:0,statuses:providerStatuses};return {response:{json:async()=>({candidates:[{finishReason:finish,content:{parts:[{thought:true,text:'PRIVATE THINKING'},{text:reply}]}}]})},model:'gemini-fixture',configured:1,statuses:[]}}};
const api=load('app/api/ai/route.ts',{'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},'@supabase/supabase-js':{createClient:()=>db},'@/lib/ai-school-context':aiContext,'@/lib/teacher-ai-config':teacher,'@/lib/education-templates':templates,'@/lib/ai-output-quality':quality,'@/lib/ai-key-pool':pool});
const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
(async()=>{try{
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.test';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='public-fixture';
 const request=(module,key,token='fixture')=>({headers:new Headers(token?{authorization:'Bearer '+token}:{}),json:async()=>({school_id:'fixture-school',module,template:key,prompt:'Susun draf sesuai data: kelas VII, topik pecahan, 2 x 40 menit, fasilitas papan tulis.'})});
 assert.equal((await api.POST(request('guru_ai','rpp',null))).status,401);
 membership=false;assert.equal((await api.POST(request('guru_ai','rpp'))).status,403);membership=true;role='teacher';assert.equal((await api.POST(request('kepsek_ai','RKT'))).status,403);role='owner';assert.equal((await api.POST(request('guru_ai','RKT'))).status,400);
 let checked=0;for(const [module,config] of [['guru_ai',teacher.teacherToolConfig],['kepsek_ai',principal.principalToolConfig]])for(const [key,tool] of Object.entries(config)){
  reply=tool.standard.map(s=>'## '+s+'\nIsi simulasi sesuai konteks dan bukti yang diberikan, dengan peninjauan penanggung jawab sekolah.').join('\n');
  const response=await api.POST(request(module,key));assert.equal(response.status,200);assert.equal(response.body.quality.structuralPass,true,module+' '+key);
  assert.ok(lastBody.system_instruction.parts[0].text.includes(tool.instruction));for(const heading of tool.standard)assert.ok(lastBody.system_instruction.parts[0].text.includes(heading));
  assert.ok(lastBody.contents[0].parts[0].text.includes('1005'));assert.ok(!lastBody.contents[0].parts[0].text.includes('financial-secret'));
  assert.ok(!response.body.text.includes('PRIVATE THINKING'));assert.equal(response.body.model,'gemini-fixture');
  assert.equal(quality.evaluateAiOutput(module,key,'## Judul salah\n'+reply.replaceAll('## ','')).structuralPass,false);checked++;
 }
 finish='MAX_TOKENS';assert.equal((await api.POST(request('guru_ai','rpp'))).status,422);finish='STOP';
 poolEnabled=false;assert.equal((await api.POST(request('guru_ai','rpp'))).status,503);poolEnabled=true;
 for(const [statuses,expected] of [[[429],429],[[400,401,403],503],[[500],503]]){providerStatuses=statuses;const x=await api.POST(request('guru_ai','rpp'));assert.equal(x.status,expected);assert.ok(!x.body.error.includes('server-only-credential'))}
 providerStatuses=[];reply='Jawaban uji';
 const countBefore=contextCalls,optOut=request('guru_ai','rpp');const getBody=optOut.json;optOut.json=async()=>({...await getBody(),include_school_context:false});assert.equal((await api.POST(optOut)).body.context.status,'disabled');assert.equal(contextCalls,countBefore);
 assert.ok(budget===checked+1+3+1);
 console.log('PASS: platform-managed AI credential pool mock, quota/rate-limit fallback, role restrictions and sensitive-output handling.');
 console.log('PASS: '+checked+' document standards tested, truncated text rejected, context opt-out respected. External AI service not contacted.');
 }finally{for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}})().catch(e=>{console.error(e);process.exit(1)});
