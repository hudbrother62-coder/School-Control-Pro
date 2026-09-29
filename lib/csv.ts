/** CSV RFC-style quoted fields with spreadsheet formula neutralisation on export. */
export function parseCsv(content:string):string[][] {
 const src=content.replace(/^\uFEFF/,"").replace(/^sep=([,;])\r?\n/i,"");
 const header=src.split(/\r?\n/,1)[0]||"";
 const delimiter=(header.match(/;/g)||[]).length>(header.match(/,/g)||[]).length?";":",";
 const out:string[][]=[];let row:string[]=[],part="",quoted=false;
 for(let i=0;i<src.length;i++){
  const c=src[i];
  if(quoted){if(c==='"'&&src[i+1]==='"'){part+='"';i++}else if(c==='"')quoted=false;else part+=c;}
  else if(c==='"'&&part==="")quoted=true;
  else if(c===delimiter){row.push(part);part="";}
  else if(c==="\n"||c==="\r"){if(c==="\r"&&src[i+1]==="\n")i++;row.push(part);if(row.some(z=>z.trim()))out.push(row);row=[];part="";}
  else part+=c;
 }
 if(quoted)throw Error("Format CSV: tanda kutip belum ditutup.");
 row.push(part);if(row.some(z=>z.trim()))out.push(row);return out;
}
export function csvExport(fields:string[],rows:(string|number|null|undefined)[][]):string {
 const quote=(v:unknown)=>{const raw=String(v??"");const safe=/^[\s]*[=+\-@\t\r]/.test(raw)?"'"+raw:raw;return '"'+safe.replaceAll('"','""')+'"';};
 return "\uFEFF"+[fields,...rows].map(r=>r.map(quote).join(",")).join("\r\n");
}
export function saveCsv(file:string,content:string):void {
 const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
