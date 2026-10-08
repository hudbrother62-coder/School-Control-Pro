"use client";

import {templateBlob,resolveReportAssets} from "@/lib/report-template-client";
import {downloadExcel,type SheetRows} from "@/lib/excel";

export type ReportIdentity={
 motto?:string|null;semester?:string|null;school_id?:string;name:string;npsn:string|null;address:string|null;academic_year:string|null;education_level:string|null;
 principal_name:string|null;principal_nip:string|null;phone:string|null;email:string|null;website:string|null;
 province:string|null;city:string|null;postal_code:string|null;logo_url:string|null;signature_url:string|null;
 stamp_url:string|null;report_settings:Record<string,unknown>|null
};
export type ReportMetric={label:string;value:string;note?:string};
export type ReportSection={title:string;columns:string[];rows:Array<Array<string|number|null|undefined>>};
export type ReportSignature={role:string;name?:string|null;identifier?:string|null};
export type OfficialReportModel={
 moduleKey:string;documentType:string;prefix:string;title:string;subtitle?:string;periodLabel?:string;
 periodStart?:string|null;periodEnd?:string|null;metrics?:ReportMetric[];notes?:string[];sections:ReportSection[];
 signatures?:ReportSignature[];orientation?:"portrait"|"landscape";confidentiality?:"internal"|"restricted"|"confidential";
 status?:"draft"|"review"|"approved"|"issued";footer?:string;issuedAt?:string|null
};
export type IssuedReport={id:string;document_number:string;issued_at:string};

const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));
const safe=(v:string)=>v.replace(/[^a-zA-Z0-9 _.-]/g,"_").slice(0,100);
const dateId=(v?:string|null)=>v?new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(v+"T12:00:00")):"";
const currentDate=(issuedAt?:string|null)=>new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(issuedAt&&Number.isFinite(Date.parse(issuedAt))?new Date(issuedAt):new Date());
function schoolLetterDate(i:ReportIdentity,issuedAt?:string|null){
 const location=String(i.report_settings?.letter_city||i.city||"................").trim()||"................";
 return location+", "+currentDate(issuedAt);
}

export async function loadReportIdentity(db:any,schoolId:string):Promise<ReportIdentity>{
 const {data,error}=await db.from("sc_schools").select("name,npsn,address,academic_year,education_level,motto,semester,principal_name,principal_nip,phone,email,website,province,city,postal_code,logo_url,signature_url,stamp_url,report_settings").eq("id",schoolId).single();
 if(error)throw error;
 return await resolveReportAssets(data,schoolId) as ReportIdentity;
}

export function defaultSignatures(identity:ReportIdentity,preparedBy?:string):ReportSignature[]{
 const settings=identity.report_settings||{};
 const signerTitle=String(settings.signer_title||"Kepala Sekolah");
 return [
  {role:"Disusun oleh",name:preparedBy||null},
  {role:"Mengetahui / Menyetujui · "+signerTitle,name:identity.principal_name||signerTitle,identifier:identity.principal_nip?("NIP. "+identity.principal_nip):null}
 ];
}

export async function issueReport(db:any,schoolId:string,model:OfficialReportModel,identity?:ReportIdentity):Promise<IssuedReport>{
 const snapshot={model,identity:identity||null,generated_at:new Date().toISOString()};
 const {data,error}=await db.rpc("sc_issue_report_document",{
  p_school:schoolId,p_module:model.moduleKey,p_type:model.documentType,p_title:model.title,p_snapshot:snapshot,
  p_prefix:model.prefix,p_period_start:model.periodStart||null,p_period_end:model.periodEnd||null
 });
 if(error)throw error;
 const row=Array.isArray(data)?data[0]:data;
 return row as IssuedReport;
}

function schoolContact(i:ReportIdentity){
 const s=i.report_settings||{};
 return [
  s.show_npsn!==false&&i.npsn?"NPSN "+i.npsn:"",
  s.show_phone!==false&&i.phone?"Telp. "+i.phone:"",
  s.show_email!==false?i.email||"":"",
  s.show_website===true?i.website||"":""
 ].filter(Boolean).join(" · ");
}
function schoolAddress(i:ReportIdentity){
 return [i.address,i.city,i.province,i.postal_code].filter(Boolean).join(", ");
}
function signaturesHtml(identity:ReportIdentity,items:ReportSignature[],issuedAt?:string|null){
 const settings=identity.report_settings||{};
 const showSignature=settings.show_signature!==false;
 const showStamp=settings.show_stamp===true;
 return `<div class="signatures">${items.map((s,idx)=>`<div class="signature"><b>${idx===items.length-1?esc(schoolLetterDate(identity,issuedAt)):"&nbsp;"}</b><span>${esc(s.role)}</span><div class="sign-assets">${idx===items.length-1&&showStamp&&identity.stamp_url?`<img class="stamp" src="${esc(identity.stamp_url)}" alt="">`:""}${idx===items.length-1&&showSignature&&identity.signature_url?`<img src="${esc(identity.signature_url)}" alt="">`:""}</div><strong>${esc(s.name||"........................")}</strong>${s.identifier?`<small>${esc(s.identifier)}</small>`:""}</div>`).join("")}</div>`;
}

export function officialReportHtml(identity:ReportIdentity,model:OfficialReportModel,documentNumber?:string){
 const landscape=model.orientation==="landscape";
 const draft=!documentNumber||model.status==="draft";
 const metrics=(model.metrics||[]).map(m=>`<div class="metric"><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong>${m.note?`<small>${esc(m.note)}</small>`:""}</div>`).join("");
 const notes=(model.notes||[]).filter(Boolean);
 const sections=model.sections.map(sec=>`<section><h2>${esc(sec.title)}</h2><div class="tablewrap"><table><thead><tr>${sec.columns.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${sec.rows.length?sec.rows.map(row=>`<tr>${sec.columns.map((_,i)=>`<td>${esc(row[i]??"—")}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${Math.max(1,sec.columns.length)}">Belum ada data pada periode ini.</td></tr>`}</tbody></table></div></section>`).join("");
 const signatures=model.signatures?.length?model.signatures:defaultSignatures(identity);
 const confidentiality=model.confidentiality==="confidential"?"RAHASIA":model.confidentiality==="restricted"?"TERBATAS":"INTERNAL SEKOLAH";
 return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(model.title)}</title><style>
 @page{size:A4 ${landscape?"landscape":"portrait"};margin:15mm 14mm 16mm}
 *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:10.5px;line-height:1.45;margin:0;background:white}
 .watermark{position:fixed;inset:42% 0 auto;text-align:center;font-size:58px;font-weight:800;color:rgba(120,120,120,.08);transform:rotate(-28deg);pointer-events:none;z-index:0}
 .kop{display:grid;grid-template-columns:88px 1fr 88px;align-items:center;text-align:center;padding-bottom:9px;border-bottom:4px double #111;margin-bottom:18px;position:relative;z-index:1}
 .kop img{max-width:72px;max-height:72px;object-fit:contain}.kop h1{font-size:17px;margin:0 0 3px;text-transform:uppercase}.kop p{margin:2px 0;font-size:9.5px}.kop small{font-size:8.5px}
 .meta{text-align:center;margin-bottom:18px}.meta h2{font-size:16px;margin:0;text-transform:uppercase}.meta p{margin:4px 0}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;text-align:left;margin:12px auto 0;max-width:680px;font-size:9px}
 .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0 0 16px}.metric{border:1px solid #cfd6df;padding:8px}.metric span,.metric small{display:block;color:#596579}.metric strong{display:block;font-size:14px;margin:3px 0}
 .notes{border-left:3px solid #334155;background:#f8fafc;padding:9px 11px;margin:0 0 16px}.notes h3{font-size:10px;margin:0 0 5px}.notes ul{margin:0;padding-left:17px}
 section{margin:0 0 16px;break-inside:auto;position:relative;z-index:1}section h2{font-size:11px;margin:0 0 6px;text-transform:uppercase}.tablewrap{overflow:visible}table{width:100%;border-collapse:collapse;font-size:8.5px}th,td{border:1px solid #9ca3af;padding:5px;vertical-align:top}th{background:#f1f5f9;font-weight:700;text-align:left}tr{break-inside:avoid}
 .signatures{display:grid;grid-template-columns:repeat(${Math.max(1,signatures.length)},1fr);gap:35px;margin-top:34px;text-align:center;break-inside:avoid}.signature{min-height:118px;display:flex;flex-direction:column;align-items:center}.signature span{margin-bottom:5px}.signature b{font-weight:400;min-height:18px}.signature strong{margin-top:auto;text-decoration:underline}.signature small{margin-top:2px}.sign-assets{height:62px;position:relative;display:flex;align-items:center;justify-content:center}.sign-assets img{max-width:100px;max-height:58px}.sign-assets .stamp{position:absolute;opacity:.78;transform:translateX(24px);max-width:68px}
 .footer{margin-top:22px;border-top:1px solid #d1d5db;padding-top:6px;display:flex;justify-content:space-between;color:#64748b;font-size:8px}.classification{font-weight:700;letter-spacing:.06em}
 @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.screen-only{display:none}}
 </style></head><body>${draft?'<div class="watermark">DRAFT</div>':""}
 <header class="kop"><div>${(identity.report_settings||{}).show_logo!==false&&identity.logo_url?`<img src="${esc(identity.logo_url)}" alt="Logo sekolah">`:""}</div><div><h1>${esc(identity.name||"NAMA SEKOLAH")}</h1><p>${esc(schoolAddress(identity)||"Alamat sekolah belum dilengkapi")}</p><small>${esc(schoolContact(identity))}</small></div><div></div></header>
 <div class="meta"><h2>${esc(model.title)}</h2>${model.subtitle?`<p>${esc(model.subtitle)}</p>`:""}<div class="meta-grid"><span><b>Nomor:</b> ${esc(documentNumber||"DRAFT / BELUM DITERBITKAN")}</span><span><b>Klasifikasi:</b> ${esc(confidentiality)}${(identity.report_settings||{}).classification_code?" · "+esc((identity.report_settings||{}).classification_code):""}</span>${model.periodLabel?`<span><b>Periode:</b> ${esc(model.periodLabel)}</span>`:""}<span><b>Tahun Pelajaran:</b> ${esc(identity.academic_year||"—")}</span></div></div>
 ${metrics?`<div class="metrics">${metrics}</div>`:""}${notes.length?`<div class="notes"><h3>Catatan / Keterangan</h3><ul>${notes.map(n=>`<li>${esc(n)}</li>`).join("")}</ul></div>`:""}${sections}
 ${signaturesHtml(identity,signatures,model.issuedAt)}
 <footer class="footer"><span>${esc(model.footer||(identity.name+" · Dokumen administrasi sekolah"))}</span><span class="classification">${esc(confidentiality)}</span></footer>
 </body></html>`;
}

export function previewOfficialReport(identity:ReportIdentity,model:OfficialReportModel,documentNumber?:string){
 const w=window.open("","_blank","width=1100,height=800");
 if(!w)throw Error("Popup diblokir browser. Izinkan popup untuk preview laporan.");
 w.document.open();w.document.write(officialReportHtml(identity,model,documentNumber));w.document.close();
 return w;
}

async function printWhenAssetsReady(w:Window){
 const images=Array.from(w.document.images);
 await Promise.all(images.map(img=>new Promise<void>(resolve=>{
  if(img.complete){resolve();return;}
  let finished=false;
  const done=()=>{if(finished)return;finished=true;img.removeEventListener("load",done);img.removeEventListener("error",done);resolve();};
  img.addEventListener("load",done,{once:true});img.addEventListener("error",done,{once:true});setTimeout(done,5000);
 })));
 if(w.document.fonts)await w.document.fonts.ready;
 if(!w.closed){w.focus();w.print();}
}

export function printOfficialReport(identity:ReportIdentity,model:OfficialReportModel,documentNumber?:string){
 const w=previewOfficialReport(identity,model,documentNumber);
 void printWhenAssetsReady(w);
}

function toSheets(model:OfficialReportModel,documentNumber?:string,identity?:ReportIdentity):{name:string;rows:SheetRows}[]{
 const summary:SheetRows=[
  {Bagian:"Sekolah",Nilai:identity?.name||""},
  {Bagian:"NPSN",Nilai:identity?.npsn||""},
  {Bagian:"Tahun Pelajaran",Nilai:identity?.academic_year||""},
  {Bagian:"Judul",Nilai:model.title},
  {Bagian:"Nomor Dokumen",Nilai:documentNumber||"DRAFT / BELUM DITERBITKAN"},
  {Bagian:"Tanggal Terbit",Nilai:model.issuedAt?currentDate(model.issuedAt):""},
  {Bagian:"Status",Nilai:model.status||"draft"},
  {Bagian:"Periode",Nilai:model.periodLabel||""},
  ...(model.metrics||[]).map(x=>({Bagian:x.label,Nilai:x.value})),
  ...(model.notes||[]).map((x,i)=>({Bagian:"Catatan "+(i+1),Nilai:x}))
 ];
 return [{name:"Ringkasan",rows:summary},...model.sections.map(s=>({name:s.title.slice(0,31),rows:s.rows.map(row=>Object.fromEntries(s.columns.map((c,i)=>[c,row[i]??""])))}))];
}

export async function downloadOfficialExcel(model:OfficialReportModel,documentNumber?:string,identity?:ReportIdentity){
 await downloadExcel(safe(model.title+(documentNumber?" "+documentNumber.replaceAll("/","-"):""))+".xlsx",toSheets(model,documentNumber,identity));
}

async function maybeImage(url:string|null|undefined){
 if(!url)return null;
 try{const res=await fetch(url);if(!res.ok)throw Error();const data=new Uint8Array(await res.arrayBuffer());if(data.length>5*1024*1024)throw Error();const type=(res.headers.get("content-type")||"").includes("jpeg")?"jpg":"png";if(!(type==="png"&&data[0]===137&&data[1]===80||type==="jpg"&&data[0]===255&&data[1]===216))throw Error();return {data,type}}catch{throw Error("Gambar laporan tidak dapat dimuat. Periksa logo/tanda tangan/stempel atau unggah PNG/JPG melalui Template Laporan Sekolah.")}
}

export async function downloadOfficialDocx(identity:ReportIdentity,model:OfficialReportModel,documentNumber?:string){
 const d:any=await import("docx");
 const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,HeadingLevel,ImageRun,PageOrientation,Footer,PageNumber}=d;
 const settings=identity.report_settings||{};
 const logo=settings.show_logo===false?null:await maybeImage(identity.logo_url);
 const signature=settings.show_signature===false?null:await maybeImage(identity.signature_url);
 const stamp=settings.show_stamp===true?await maybeImage(identity.stamp_url):null;
 const children:any[]=[];
 const address=schoolAddress(identity),contact=schoolContact(identity);
 if(logo)children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new ImageRun({data:logo.data,transformation:{width:65,height:65},type:logo.type})]}));
 children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:identity.name||"NAMA SEKOLAH",bold:true,size:30})]}));
 if(address)children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:address,size:18})]}));
 if(contact)children.push(new Paragraph({alignment:AlignmentType.CENTER,border:{bottom:{style:"double",size:8,color:"111111"}},spacing:{after:260},children:[new TextRun({text:contact,size:17})]}));
 children.push(new Paragraph({heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,children:[new TextRun({text:model.title.toUpperCase(),bold:true})]}));
 if(model.subtitle)children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun(model.subtitle)]}));
 children.push(new Paragraph({spacing:{before:120,after:160},children:[new TextRun({text:"Nomor: "+(documentNumber||"DRAFT / BELUM DITERBITKAN"),bold:true}),new TextRun("   |   Tahun Pelajaran: "+(identity.academic_year||"—"))]}));
 const beginMarker=new Paragraph("SC_REPORT_BODY_START"),endMarker=new Paragraph("SC_REPORT_BODY_END");children.push(beginMarker);
 for(const m of model.metrics||[])children.push(new Paragraph({children:[new TextRun({text:m.label+": ",bold:true}),new TextRun(m.value+(m.note?" · "+m.note:""))]}));
 if(model.notes?.length){children.push(new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun("Catatan / Keterangan")]}));for(const n of model.notes)children.push(new Paragraph({children:[new TextRun("• "+n)]}))}
 for(const sec of model.sections){
  children.push(new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:220,after:80},children:[new TextRun(sec.title)]}));
  const rows=[new TableRow({tableHeader:true,children:sec.columns.map(c=>new TableCell({children:[new Paragraph({children:[new TextRun({text:c,bold:true})]})]}))}),...sec.rows.map(row=>new TableRow({children:sec.columns.map((_,i)=>new TableCell({children:[new Paragraph(String(row[i]??"—"))]}))}))];
  children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows}));
 }
 children.push(endMarker);
 const signs=model.signatures?.length?model.signatures:defaultSignatures(identity);
 children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({children:signs.map((s,idx)=>new TableCell({borders:{top:{style:"nil"},bottom:{style:"nil"},left:{style:"nil"},right:{style:"nil"},insideHorizontal:{style:"nil"},insideVertical:{style:"nil"}},children:[
  new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun(idx===signs.length-1?schoolLetterDate(identity,model.issuedAt):"")]}),
  new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun(s.role)]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:80},children:idx===signs.length-1&&signature?[new ImageRun({data:signature.data,transformation:{width:90,height:55},type:signature.type})]:[new TextRun("\n\n")]}),
  ...(idx===signs.length-1&&stamp?[new Paragraph({alignment:AlignmentType.CENTER,children:[new ImageRun({data:stamp.data,type:stamp.type,transformation:{width:55,height:55}})]})]:[]),
  new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:s.name||"........................",bold:true,underline:{}})]}),
  ...(s.identifier?[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun(s.identifier)]})]:[])
 ]}))})]}));
 const footer=new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun(model.title.slice(0,70)+" · Halaman "),new TextRun({children:[PageNumber.CURRENT]})]})]});
 const configuredTemplate=(settings.templates as any)?.[model.documentType]||(settings.templates as any)?.[model.moduleKey]||(settings.templates as any)?.default;
 if(!configuredTemplate){children.splice(children.indexOf(beginMarker),1);children.splice(children.indexOf(endMarker),1);}
 if(configuredTemplate)for(const [key,url] of [["LOGO",settings.show_logo===false?null:identity.logo_url],["SIGNATURE",settings.show_signature===false?null:identity.signature_url],["STAMP",settings.show_stamp===true?identity.stamp_url:null]]){const img=await maybeImage(url as string|null);if(img)children.push(new Paragraph({children:[new TextRun("SC_ASSET_"+key),new ImageRun({data:img.data,type:img.type,transformation:{width:65,height:65}})]}));}
 const doc=new Document({creator:"SekolaPro",title:model.title,styles:{default:{document:{run:{font:String(settings.body_font||"Times New Roman"),size:Number(settings.body_font_size||11)*2}}}},sections:[{properties:{page:{size:{orientation:model.orientation==="landscape"?PageOrientation.LANDSCAPE:PageOrientation.PORTRAIT},margin:{top:850,right:800,bottom:850,left:800}}},footers:{default:footer},children}]});
 const blob=await templateBlob(await Packer.toBlob(doc),identity,{title:model.title,subtitle:model.subtitle,documentType:model.documentType,moduleKey:model.moduleKey,period:model.periodLabel,number:documentNumber,status:model.status,confidentiality:model.confidentiality});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=safe(model.title+(documentNumber?" "+documentNumber.replaceAll("/","-"):""))+".docx";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}

export function narrativeDocumentHtml(identity:ReportIdentity,doc:{title:string;kind:string;content:string;status:string;revision:number}){
 const safeContent=esc(doc.content).replace(/\n/g,"<br>");
 const settings=identity.report_settings||{};
 return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>@page{size:A4 portrait;margin:18mm}body{font:12pt Arial;line-height:1.6;color:#111827;margin:0}.kop{text-align:center;border-bottom:4px double #111;padding-bottom:10px;margin-bottom:22px}.kop img{max-height:70px}.kop h1{font-size:17pt;margin:2px}.kop p{font-size:9pt;margin:2px}.title{text-align:center;margin:22px 0}.title h2{font-size:15pt;text-transform:uppercase}.meta{font-size:9pt;color:#475569}.body{white-space:normal;text-align:justify}.sign{margin-left:auto;width:260px;text-align:center;margin-top:45px}.sign img{max-width:95px;max-height:60px}.footer{margin-top:35px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:8pt;color:#64748b}</style></head><body><header class="kop">${settings.show_logo!==false&&identity.logo_url?`<img src="${esc(identity.logo_url)}" alt="Logo sekolah">`:""}<h1>${esc(identity.name)}</h1><p>${esc(schoolAddress(identity))}</p><p>${esc(schoolContact(identity))}</p></header><div class="title"><h2>${esc(doc.title)}</h2><div class="meta">${esc(doc.kind)} · Revisi ${doc.revision} · ${esc(doc.status)}</div></div><main class="body">${safeContent}</main><div class="sign"><p>${esc(schoolLetterDate(identity))}</p><p>${esc(settings.signer_title||"Kepala Sekolah")}</p>${settings.show_signature!==false&&identity.signature_url?`<img src="${esc(identity.signature_url)}" alt="Tanda tangan">`:"<br><br><br>"}${settings.show_stamp===true&&identity.stamp_url?`<img src="${esc(identity.stamp_url)}" alt="Stempel sekolah">`:""}<strong>${esc(identity.principal_name||"........................")}</strong>${identity.principal_nip?`<div>NIP. ${esc(identity.principal_nip)}</div>`:""}</div><footer class="footer">${esc(identity.name)} · Dokumen administrasi sekolah</footer></body></html>`;
}

export function printNarrativeDocument(identity:ReportIdentity,doc:{title:string;kind:string;content:string;status:string;revision:number}){
 const w=window.open("","_blank","width=1000,height=800");if(!w)throw Error("Popup diblokir browser.");
 w.document.open();w.document.write(narrativeDocumentHtml(identity,doc));w.document.close();void printWhenAssetsReady(w);
}

export async function downloadNarrativeDocx(identity:ReportIdentity,doc:{title:string;kind:string;content:string;status:string;revision:number}){
 const d:any=await import("docx");const {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,Footer,PageNumber,ImageRun}=d;
 const settings=identity.report_settings||{},logo=settings.show_logo===false?null:await maybeImage(identity.logo_url),signature=settings.show_signature===false?null:await maybeImage(identity.signature_url);const children:any[]=[];
 if(logo)children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new ImageRun({data:logo.data,transformation:{width:65,height:65},type:logo.type})]}));
 children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:identity.name||"NAMA SEKOLAH",bold:true,size:30})]}));
 children.push(new Paragraph({alignment:AlignmentType.CENTER,border:{bottom:{style:"double",size:8,color:"111111"}},spacing:{after:260},children:[new TextRun({text:[schoolAddress(identity),schoolContact(identity)].filter(Boolean).join(" · "),size:17})]}));
 children.push(new Paragraph({heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER,children:[new TextRun({text:doc.title.toUpperCase(),bold:true})]}));
 children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:220},children:[new TextRun(doc.kind+" · Revisi "+doc.revision+" · "+doc.status)]}));
 const beginMarker=new Paragraph("SC_REPORT_BODY_START"),endMarker=new Paragraph("SC_REPORT_BODY_END");children.push(beginMarker);
 for(const block of doc.content.split(/\n{2,}/)){const text=block.trim();if(!text)continue;const isHeading=/^(BAB|BAGIAN|LAMPIRAN|[A-Z][A-Z\s/&-]{5,})/.test(text)&&text.length<120;children.push(new Paragraph({heading:isHeading?HeadingLevel.HEADING_2:undefined,alignment:isHeading?AlignmentType.LEFT:AlignmentType.JUSTIFIED,spacing:{after:120},children:[new TextRun({text,bold:isHeading})]}))}
 children.push(endMarker);
 children.push(new Paragraph({alignment:AlignmentType.RIGHT,spacing:{before:300},children:[new TextRun(schoolLetterDate(identity))]}));
 children.push(new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:String(settings.signer_title||"Kepala Sekolah"),bold:true})]}));
 if(signature)children.push(new Paragraph({alignment:AlignmentType.RIGHT,children:[new ImageRun({data:signature.data,transformation:{width:90,height:55},type:signature.type})]})); else children.push(new Paragraph("\n\n"));
 const stamp=settings.show_stamp===true?await maybeImage(identity.stamp_url):null;if(stamp)children.push(new Paragraph({alignment:AlignmentType.RIGHT,children:[new ImageRun({data:stamp.data,type:stamp.type,transformation:{width:55,height:55}})]}));
 children.push(new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:identity.principal_name||"........................",bold:true,underline:{}})]}));
 if(identity.principal_nip)children.push(new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun("NIP. "+identity.principal_nip)]}));
 const footer=new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun(doc.title.slice(0,70)+" · Halaman "),new TextRun({children:[PageNumber.CURRENT]})]})]});
 const moduleKey=/^(PBD|KSP|KOSP|RKJM|RKT|RKAS|SOP|SUPERVISION)$/i.test(doc.kind)?"kepsek_ai":"guru_ai";
 const configuredTemplate=(settings.templates as any)?.[doc.kind]||(settings.templates as any)?.[moduleKey]||(settings.templates as any)?.default;
 if(!configuredTemplate){children.splice(children.indexOf(beginMarker),1);children.splice(children.indexOf(endMarker),1);}
 if(configuredTemplate)for(const [key,url] of [["LOGO",identity.logo_url],["SIGNATURE",settings.show_signature===false?null:identity.signature_url],["STAMP",settings.show_stamp===true?identity.stamp_url:null]]){const img=await maybeImage(url as string|null);if(img)children.push(new Paragraph({children:[new TextRun("SC_ASSET_"+key),new ImageRun({data:img.data,type:img.type,transformation:{width:65,height:65}})]}));}
 const out=new Document({creator:"SekolaPro",title:doc.title,styles:{default:{document:{run:{font:String(settings.body_font||"Times New Roman"),size:Number(settings.body_font_size||11)*2}}}},sections:[{footers:{default:footer},children}]});const blob=await templateBlob(await Packer.toBlob(out),identity,{title:doc.title,documentType:doc.kind,moduleKey,status:doc.status}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=safe(doc.title)+".docx";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}

export async function issueAndExport(db:any,schoolId:string,identity:ReportIdentity,model:OfficialReportModel,format:"pdf"|"docx"|"xlsx"){
 const issued=await issueReport(db,schoolId,model,identity);
 if(format==="pdf")printOfficialReport(identity,{...model,status:"issued",issuedAt:issued.issued_at},issued.document_number);
 if(format==="docx")await downloadOfficialDocx(identity,{...model,status:"issued",issuedAt:issued.issued_at},issued.document_number);
 if(format==="xlsx")await downloadOfficialExcel({...model,status:"issued",issuedAt:issued.issued_at},issued.document_number,identity);
 return issued;
}
