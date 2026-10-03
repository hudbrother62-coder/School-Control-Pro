import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
export const templateFields=['school_name','npsn','address','academic_year','principal_name','principal_nip','phone','email','website','province','education_level','motto','semester','city','report_title','report_subtitle','document_number','period','date','status','confidentiality','report_body','signatories','logo','signature','stamp'] as const;
export type SchoolTemplate={path:string;name:string;updated_at:string};
const text=(s:string)=>s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&');
export function inspectTemplate(data:ArrayBuffer|Uint8Array){
 if(data.byteLength>5*1024*1024)throw Error('Template maksimal 5 MB.');
 const zip=new PizZip(data);let size=0;
 const expanded=Object.values(zip.files).reduce((n,f)=>n+Number((f as any)._data?.uncompressedSize||0),0);if(expanded>25*1024*1024)throw Error('Isi template terlalu besar (maksimal 25 MB).');
 for(const [name,file] of Object.entries(zip.files)){
  if(file.dir)continue;
  size+=file.asUint8Array().length;if(size>25*1024*1024)throw Error('Isi template terlalu besar (maksimal 25 MB).');
  if(/vbaProject|embeddings\/|activeX\/|\.exe$/i.test(name))throw Error('Template mengandung makro atau objek tertanam. Gunakan DOCX biasa.');
  if(name.endsWith('.rels')&&/TargetMode=["']External["'][^>]*Type=["'][^"']*(?:image|oleObject|attachedTemplate)|Type=["'][^"']*(?:image|oleObject|attachedTemplate)[^>]*TargetMode=["']External["']/i.test(file.asText()))throw Error('Gambar eksternal/objek tertaut tidak didukung. Masukkan gambar langsung ke Word.');
 }
 const body=zip.file('word/document.xml');if(!body)throw Error('File bukan template DOCX yang valid.');
 const plain=text(body.asText());
 if(!plain.includes('{@report_body}'))throw Error('Tambahkan {@report_body} dalam paragraf tersendiri untuk tempat isi laporan.');
 new Docxtemplater(zip,{paragraphLoop:true,linebreaks:true});
 const tags=[...plain.matchAll(/\{(@?[a-z_]+)\}/g)].map(x=>x[1].replace(/^@/,''));
 const unknown=tags.filter(x=>!templateFields.includes(x as any));if(unknown.length)throw Error('Placeholder tidak dikenal: '+unknown.join(', '));
 return {tags:[...new Set(tags)],zip};
}
function extractBlock(xml:string,key:string){
 const re=new RegExp('<w:p(?:\\s[^>]*)?>[\\s\\S]*?<\\/w:p>','g');
 for(const m of xml.matchAll(re))if(text(m[0]).includes(key))return {start:m.index!,end:m.index!+m[0].length};
 throw Error('Penanda konten laporan tidak ditemukan.');
}
/** Merge generated report content/media into the school's original package; preserve its layout. */
export function renderSchoolTemplate(template:ArrayBuffer|Uint8Array,generated:ArrayBuffer|Uint8Array,values:Record<string,string>){
 const {zip}=inspectTemplate(template),source=new PizZip(generated);
 let xml=source.file('word/document.xml')!.asText();
 const start=extractBlock(xml,'SC_REPORT_BODY_START'),end=extractBlock(xml,'SC_REPORT_BODY_END');
 let body=xml.slice(start.end,end.start);
 if(values._body_font){const font=values._body_font.replace(/[&<>"']/g,'');const size=Math.max(16,Math.min(36,Number(values._body_size)||22));
 const props=`<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/><w:sz w:val="${size}"/>`;
 body=body.replace(/<w:r>/g,'<w:r><w:rPr>'+props+'</w:rPr>').replace(/<w:r><w:rPr>([\s\S]*?)<\/w:rPr><w:rPr>/g,'<w:r><w:rPr>$1');
 }

 let rels=zip.file('word/_rels/document.xml.rels')!.asText(),addedRelationships='';
 const sourceRels=source.file('word/_rels/document.xml.rels')!.asText();
 let imageIndex=0;const images:string[]=[];
 for(const m of sourceRels.matchAll(/<Relationship\b[^>]*\/>/g)){
  const id=m[0].match(/Id="([^"]+)"/)?.[1],target=m[0].match(/Target="([^"]+)"/)?.[1];
  if(!id||!target||!m[0].includes('/image'))continue;
  const file=source.file('word/'+target);if(!file)continue;
  const newId='sc_'+Date.now()+'_'+imageIndex++,newTarget='media/'+newId+'.'+target.split('.').pop();
  zip.file('word/'+newTarget,file.asUint8Array());
  const relationship=m[0].replace('Id="'+id+'"','Id="'+newId+'"').replace('Target="'+target+'"','Target="'+newTarget+'"');addedRelationships+=relationship;rels=rels.replace('</Relationships>',relationship+'</Relationships>');
  xml=xml.replaceAll('r:embed="'+id+'"','r:embed="'+newId+'"');body=body.replaceAll('r:embed="'+id+'"','r:embed="'+newId+'"');
 }
 // Dedicated asset paragraphs are outside the body and can be placed anywhere in the template.
 for(const key of ['LOGO','SIGNATURE','STAMP']){
  const marker='SC_ASSET_'+key;const p=[...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].find(m=>text(m[0]).includes(marker));
  images.push(p?p[0].replace(/<w:r>\s*<w:t[^>]*>SC_ASSET_[A-Z]+<\/w:t>\s*<\/w:r>/g,''): '');
 }
 zip.file('word/_rels/document.xml.rels',rels);
 for(const name of Object.keys(zip.files).filter(n=>/^word\/(header|footer)[^/]*\.xml$/.test(n))){
  const relName='word/_rels/'+name.split('/').pop()+'.rels';
  const existing=zip.file(relName)?.asText()||'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  zip.file(relName,existing.replace(/<Relationships([^>]*)\/>/,'<Relationships$1></Relationships>').replace('</Relationships>',addedRelationships+'</Relationships>'));
 }
 let ct=zip.file('[Content_Types].xml')!.asText();
 for(const ext of ['png','jpg','jpeg'])if(!ct.includes('Extension="'+ext+'"'))ct=ct.replace('</Types>',`<Default Extension="${ext}" ContentType="image/${ext==='png'?'png':'jpeg'}"/></Types>`);
 zip.file('[Content_Types].xml',ct);
 const signatureStart=extractBlock(xml,'SC_REPORT_BODY_END').end;
 const assetStart=[...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].find(m=>text(m[0]).includes('SC_ASSET_'))?.index;
 const signatories=xml.slice(signatureStart,assetStart??xml.indexOf('<w:sectPr'));
 const doc=new Docxtemplater(zip,{paragraphLoop:true,linebreaks:true,nullGetter:()=>''});
 doc.render({...values,report_body:body,signatories,logo:images[0],signature:images[1],stamp:images[2]});
 let drawingId=1000;for(const name of Object.keys(doc.getZip().files).filter(n=>/^word\/.*\.xml$/.test(n))){const f=doc.getZip().file(name);if(f)doc.getZip().file(name,f.asText().replace(/(<wp:docPr[^>]*id=")\d+/g,()=>'<wp:docPr id="'+drawingId++));}
 return doc.getZip().generate({type:'uint8array',compression:'DEFLATE'});
}
