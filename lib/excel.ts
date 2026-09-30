"use client";
export type SheetRows=Record<string,string|number|boolean|null|undefined>[];
export async function readExcel(file:File):Promise<SheetRows>{
 const sheets=await readWorkbook(file);
 const first=Object.keys(sheets)[0];
 return first?sheets[first]:[];
}
export async function readWorkbook(file:File):Promise<Record<string,SheetRows>>{
 const XLSX=await import("xlsx");
 const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});
 const result:Record<string,SheetRows>={};
 for(const name of wb.SheetNames){
  const ws=wb.Sheets[name];
  result[name]=XLSX.utils.sheet_to_json(ws,{defval:""}) as SheetRows;
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
