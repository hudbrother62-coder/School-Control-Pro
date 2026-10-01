"use client";

const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]||m));

export function reportTable(headers:string[],rows:unknown[][]){
 const head=headers.map(h=>"<th>"+esc(h)+"</th>").join("");
 const body=rows.map(r=>"<tr>"+r.map(v=>"<td>"+esc(v)+"</td>").join("")+"</tr>").join("");
 return "<table><thead><tr>"+head+"</tr></thead><tbody>"+body+"</tbody></table>";
}

export function printPdf(title:string,bodyHtml:string){
 const w=window.open("","_blank");
 if(!w)throw Error("Popup diblokir browser.");
 w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>"+esc(title)+"</title><style>body{font:12px Arial;margin:22mm;color:#111;line-height:1.5}h1{font-size:20px;margin:0 0 14px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #bbb;padding:6px;text-align:left;vertical-align:top}th{background:#eee}.meta{color:#555;margin-bottom:14px}@media print{body{margin:12mm}}</style></head><body><h1>"+esc(title)+"</h1>"+bodyHtml+"</body></html>");
 w.document.close();w.focus();w.print();
}

export function downloadWord(filename:string,title:string,bodyHtml:string){
 const html="<!doctype html><html><head><meta charset='utf-8'><title>"+esc(title)+"</title><style>body{font:11pt Arial;color:#111}h1{font-size:18pt}table{width:100%;border-collapse:collapse}th,td{border:1px solid #777;padding:6px;text-align:left}th{background:#eee}</style></head><body><h1>"+esc(title)+"</h1>"+bodyHtml+"</body></html>";
 const blob=new Blob(["\ufeff",html],{type:"application/msword;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename.endsWith(".doc")?filename:filename+".doc";
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

export function downloadCsv(filename:string,headers:string[],rows:unknown[][]){
 const quote=(v:unknown)=>'"'+String(v??"").replaceAll('"','""')+'"';
 const csv="\ufeff"+[headers.map(quote).join(","),...rows.map(r=>r.map(quote).join(","))].join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename.endsWith(".csv")?filename:filename+".csv";
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
