/* Opt-in live integration: isolated temporary QA accounts supplied outside the repository.
   No customer identities, production records or credentials are used. The caller removes fixtures. */
const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto');
const {createClient}=require('@supabase/supabase-js');
const f=JSON.parse(fs.readFileSync(process.env.SC_QA_FIXTURE_FILE));
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://sfzaexzpbcvynkhglndi.supabase.co',key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_9RSzLKMNLYPchxRUv5WImg_IdAdDtHc';
const clients={},channels=[],results=[];
function pass(s){results.push(s);console.log('PASS '+s);}
async function ok(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data;}
async function denied(p,label){const r=await p;assert.ok(r.error,label);pass(label);}
function subscription(db,table,filter,events){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Realtime subscribe timed out: '+table)),20000);const channel=db.channel('qa-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table,...(filter?{filter}:{})},p=>events.push(p)).subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(timeout);resolve(channel);}if(s==='CHANNEL_ERROR'){clearTimeout(timeout);reject(Error('Realtime channel error: '+table));}});channels.push([db,channel]);});}
async function until(fn,label){const deadline=Date.now()+20000;while(!fn()){if(Date.now()>deadline)throw Error('Realtime delivery timed out: '+label);await new Promise(r=>setTimeout(r,50));}}
(async()=>{try{
 for(const [name,user] of Object.entries(f.users)){const d=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});await ok(d.auth.signInWithPassword({email:user.email,password:user.password}));clients[name]=d;}
 pass('Five isolated identities authenticate through the real Auth service');
 const {alice,admin,bob,colleague,unassigned}=clients;
 const [a1,a2]=await Promise.all([ok(alice.rpc('sc_support_open',{p_school:f.schools[0]})),ok(alice.rpc('sc_support_open',{p_school:f.schools[0]}))]);assert.equal(a1,a2);const a=a1;
 const b=await ok(bob.rpc('sc_support_open',{p_school:f.schools[1]})),c=await ok(colleague.rpc('sc_support_open',{p_school:f.schools[0]})),u=await ok(unassigned.rpc('sc_support_open',{p_school:null}));
 assert.notEqual(a,c);pass('Concurrent room creation is idempotent; same-school users have separate rooms');
 await denied(alice.rpc('sc_support_open',{p_school:f.schools[1],p_user:f.users.bob.id}),'Cannot impersonate another account or school');
 await denied(bob.rpc('sc_support_send',{p_thread:a,p_body:'Forbidden'}),'Different school cannot write another conversation');
 await denied(colleague.rpc('sc_support_send',{p_thread:a,p_body:'Forbidden'}),'Same-school colleague cannot write another user conversation');
 await denied(alice.rpc('sc_support_send',{p_thread:a,p_body:' '}),'Empty messages rejected');
 await denied(alice.rpc('sc_support_send',{p_thread:a,p_body:'x'.repeat(4001)}),'Oversized text rejected');
 const ae=[],be=[],ce=[],admine=[],changes=[];
 await Promise.all([subscription(alice,'sc_support_messages','thread_id=eq.'+a,ae),subscription(bob,'sc_support_messages',null,be),subscription(colleague,'sc_support_messages',null,ce),subscription(admin,'sc_support_messages',null,admine),subscription(alice,'sc_school_changes','school_id=eq.'+f.schools[0],changes)]);
 const start=Date.now();const msg=await ok(alice.rpc('sc_support_send',{p_thread:a,p_body:'QA text delivered live'}));await until(()=>admine.some(e=>Number(e.new.id)===Number(msg)),'admin receives user text');
 const reply=await ok(admin.rpc('sc_support_send',{p_thread:a,p_body:'QA reply delivered live'}));await until(()=>ae.some(e=>Number(e.new.id)===Number(reply)),'user receives admin reply');
 pass('Real WebSocket delivery in both directions without refresh ('+(Date.now()-start)+' ms)');
 assert.equal(be.length,0);assert.equal(ce.length,0);assert.equal((await ok(bob.from('sc_support_messages').select('*').eq('thread_id',a))).length,0);assert.equal((await ok(colleague.from('sc_support_messages').select('*').eq('thread_id',a))).length,0);pass('RLS prevents REST and realtime leakage to other schools and same-school users');
 const contacts=await ok(admin.rpc('sc_support_contacts',{p_school:null}));const contact=contacts.find(x=>x.user_id===f.users.alice.id&&x.school_id===f.schools[0]);assert.equal(Number(contact.unread),1);
 const latest=await ok(admin.from('sc_support_messages').select('created_at').eq('id',msg).single());await ok(admin.rpc('sc_support_read',{p_thread:a,p_until:latest.created_at}));const read=await ok(admin.rpc('sc_support_contacts',{p_school:null}));assert.equal(Number(read.find(x=>x.thread_id===a).unread),0);pass('Unread counters clear only through the authorized read cursor');
 const expired=await ok(bob.from('sc_subscriptions').select('trial_ends_at').eq('school_id',f.schools[1]).single());assert.ok(Date.parse(expired.trial_ends_at)<Date.now());await ok(bob.rpc('sc_support_send',{p_thread:b,p_body:'Viewer support after expired trial'}));await ok(unassigned.rpc('sc_support_send',{p_thread:u,p_body:'Support before school creation'}));pass('Expired trial, viewer role and unassigned accounts retain support access');
 const audio=fs.readFileSync(process.env.SC_QA_AUDIO_FILE),audioPath=a+'/'+f.users.alice.id+'/'+crypto.randomUUID()+'.webm';
 await ok(alice.storage.from('sc-support-audio').upload(audioPath,audio,{contentType:'audio/webm'}));
 const voice=await ok(alice.rpc('sc_support_send',{p_thread:a,p_audio_path:audioPath,p_audio_seconds:1}));await until(()=>admine.some(e=>Number(e.new.id)===Number(voice)),'voice note realtime');
 const signed=await ok(admin.storage.from('sc-support-audio').createSignedUrl(audioPath,60));const fetched=await fetch(signed.signedUrl);assert.equal(fetched.status,200);assert.deepEqual(Buffer.from(await fetched.arrayBuffer()),audio);pass('Private voice note uploads, arrives live and downloads byte-for-byte through authorized signing');
 await denied(bob.storage.from('sc-support-audio').createSignedUrl(audioPath,60),'Other school cannot sign private audio');
 await denied(colleague.storage.from('sc-support-audio').createSignedUrl(audioPath,60),'Same-school colleague cannot sign private audio');
 await denied(alice.rpc('sc_support_send',{p_thread:a,p_audio_path:a+'/'+f.users.alice.id+'/'+crypto.randomUUID()+'.webm',p_audio_seconds:1}),'Missing audio object rejected');
 await denied(alice.rpc('sc_support_send',{p_thread:a,p_audio_path:audioPath,p_audio_seconds:121}),'Voice notes over 120 seconds rejected');
 const anon=createClient(url,key,{auth:{persistSession:false}});await denied(anon.rpc('sc_support_contacts',{p_school:null}),'Anonymous users cannot list contacts');
 const r=await anon.from('sc_support_messages').select('*');assert.ok(r.error||!r.data?.length);pass('Anonymous users cannot read messages');
 await ok(alice.rpc('sc_save_school_fact',{p_school:f.schools[0],p_key:'QA realtime support check',p_value:'Changed '+Date.now()}));await until(()=>changes.length>0,'school data change signal');assert.ok(changes.every(e=>Object.keys(e.new).every(k=>['school_id','revision','changed_at'].includes(k))));pass('Database RPC mutation emits a real school signal without private data fields');
 fs.writeFileSync(process.env.SC_QA_RESULT_FILE||'/tmp/sc-support-live-results.json',JSON.stringify({tested_at:new Date().toISOString(),live:true,results},null,2));
 }finally{for(const [db,ch] of channels)await db.removeChannel(ch);for(const db of Object.values(clients)){await db.auth.signOut();db.auth.stopAutoRefresh();}}})().catch(e=>{console.error(e.message);process.exitCode=1;});
