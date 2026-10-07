const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
const mods=read("lib/modules.ts");
const routes=read("lib/workspace-navigation.ts");
const page=read("app/app/page.tsx");
const finance=read("components/FinancePanel.tsx");
const migration=read("supabase/migrations/20261008070000_finance_proof_attachment.sql");
const navigation=mods.match(/key:"sikas",[^\n]+/);
assert.ok(navigation,"finance module is registered");
for(const old of ["Bukti Transaksi","Realisasi Anggaran","Riwayat Pembayaran","Buku Kas Umum","\"Laporan\""]){
 assert.ok(!navigation[0].includes(old),"duplicate finance submenu must be absent: "+old);
}
assert.ok(navigation[0].includes("Laporan Keuangan"),"single financial report navigation");
for(const old of ["Bukti Transaksi","Realisasi Anggaran","Riwayat Pembayaran","Buku Kas Umum","Laporan"]){
 assert.ok(routes.includes('"sikas::'+old+'":'),"old bookmark alias: "+old);
}
assert.ok(page.includes('["WhatsApp Tagihan","Tim Keuangan"].includes(featureFocus)'),"financial screens use one primary data component");
assert.ok(finance.includes('sc_record_bill_payment_v2'),"student payment must create a ledger transaction");
assert.ok(finance.includes('sc_attach_finance_proof'),"late proof upload uses audited RPC");
assert.ok(finance.includes('createSignedUrl(path,180)'),"private evidence must use expiring URLs");
assert.ok(finance.includes('transaction_id:string'),"payment links to ledger record");
assert.ok(finance.includes('p.proof_path||transaction?.proof_path'),"payment displays linked proof");
assert.ok(finance.includes('t.proof_path||linked?.proof_path'),"ledger displays linked receipt proof");
assert.ok(finance.includes('tab==="payment"'),"payment history remains inside finance panel");
for(const type of ['financial','bku','budget','receivables','payments']){
 assert.ok(finance.includes('value="'+type+'"'),"unified report type: "+type);
}
assert.ok(finance.includes('t.occurred_at.startsWith(reportMonth)'),"reports are period-scoped");
assert.ok(finance.includes('t.status!=="void"'),"void transactions excluded");
assert.ok(migration.includes('storage.objects')&&migration.includes('o.owner_id=auth.uid()::text'),"attach must verify file ownership");
assert.ok(migration.includes('for update')&&migration.includes('finance.proof_attached'),"proof mutation is locked and audited");
assert.ok(migration.includes('update public.sc_bill_payments')&&migration.includes('update public.sc_finance_transactions'),"proof propagation keeps ledger and receipt consistent");
console.log("PASS unified finance navigation, attached evidence, period reports and backend audit guards.");
