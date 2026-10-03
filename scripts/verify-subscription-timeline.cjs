const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript');const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/subscription-timeline.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);const {subscriptionTimeline:t}=m.exports,now=Date.parse('2026-10-03T12:00:00Z');
let x=t({status:'trial',trial_ends_at:'2026-10-05T13:00:00Z',current_period_end:null},now);assert.equal(x.trialDays,3);assert.equal(x.hoursLeft,49);assert.equal(x.active,true);
x=t({status:'trial',trial_ends_at:'2026-10-03T12:00:00Z',current_period_end:null},now);assert.equal(x.active,false);assert.equal(x.inactiveDays,0);
x=t({status:'active',trial_ends_at:'2026-10-01T12:00:00Z',current_period_end:'2026-10-08T12:00:00Z'},now);assert.equal(x.dueDays,5);assert.equal(x.trialDays,null);
x=t({status:'active',trial_ends_at:null,current_period_end:'2026-10-01T11:59:00Z'},now);assert.equal(x.inactiveDays,2);
x=t({status:'suspended',trial_ends_at:null,current_period_end:'2026-11-01T12:00:00Z',updated_at:'2026-10-02T12:00:00Z'},now);assert.equal(x.active,false);assert.equal(x.inactiveDays,1);
x=t({status:'none',trial_ends_at:null,current_period_end:null},now);assert.equal(x.deadline,null);assert.equal(x.inactiveDays,null);
console.log('PASS: exact trial expiry, paid renewal, hour/day countdowns, suspended accounts and missing dates.');
