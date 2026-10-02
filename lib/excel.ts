"use client";
export type SheetRows=Record<string,string|number|boolean|null|undefined>[];
export async function readExcel(file:File):Promise<SheetRows>{
 const sheets=await readWorkbook(file);
 const first=Object.keys(sheets)[0];
 return first?sheets[first]:[];
}
export async function readWorkbook(file:File):Promise<Record<string,SheetRows>>{
 const XLSX=await import("xlsx");
 const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
 const result:Record<string,SheetRows>={};
 for(const name of wb.SheetNames){
  const ws=wb.Sheets[name];
  const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(ws,{defval:""});
  result[name]=rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>{
   // Excel stores formatted dates/times as serial numbers. Preserve ordinary
   // numeric columns (scores, amounts, coordinates) while normalizing dates.
   const timeColumn=/^(jam|time)(_|\s|$)/i.test(key);
   const dateColumn=/^(tanggal|tgl|date|deadline)(_|\s|$)|(_tanggal|_date)$/i.test(key);
   const parts=value instanceof Date
    ? {y:value.getFullYear(),m:value.getMonth()+1,d:value.getDate(),H:value.getHours(),M:value.getMinutes()}
    : typeof value==="number"&&(dateColumn||(timeColumn&&value>=0&&value<1))
     ? XLSX.SSF.parse_date_code(value,{date1904:!!wb.Workbook?.WBProps?.date1904}) : null;
   if(parts){
    const pad=(n:number)=>String(n).padStart(2,"0");
    if(timeColumn||parts.y<1900)return [key,pad(parts.H)+":"+pad(parts.M)];
    const day=parts.y+"-"+pad(parts.m)+"-"+pad(parts.d);
    return [key,dateColumn?day:day+" "+pad(parts.H)+":"+pad(parts.M)];
   }
   return [key,value];
  }))) as SheetRows;
 }
 return result;
}
export async function downloadExcel(filename:string,sheets:{name:string;rows:SheetRows}[]){
 const XLSX=await import("xlsx");
 const wb=XLSX.utils.book_new();
 for(const sheet of sheets){
  const ws=XLSX.utils.json_to_sheet(sheet.rows);
  XLSX.utils.book_append_sheet(wb,ws,sheet.name.slice(0,31));
 }
 XLSX.writeFile(wb,filename);
}
