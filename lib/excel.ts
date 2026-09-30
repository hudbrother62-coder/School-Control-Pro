"use client";
export type SheetRows=Record<string,string|number|boolean|null|undefined>[];
export async function readExcel(file:File):Promise<SheetRows>{
 const XLSX=await import("xlsx");
 const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});
 const ws=wb.Sheets[wb.SheetNames[0]];
 return XLSX.utils.sheet_to_json(ws,{defval:""}) as SheetRows;
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
