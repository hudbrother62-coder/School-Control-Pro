import type {SheetRows} from "./excel";

export type ImportIssue={row:number;reason:string};
export type ImportOutcome={imported:number;errors:ImportIssue[]};
export type PreparedImport={key:string;payload:Record<string,unknown>};

export const cell=(row:Record<string,unknown>,column:string)=>String(row[column]??"").trim();
export function required(row:Record<string,unknown>,column:string,max=200){
 const value=cell(row,column);
 if(!value||value.length>max)throw Error(column+": wajib diisi (maksimal "+max+" karakter).");
 if(/^contoh\b/i.test(value))throw Error(column+": hapus baris contoh dari template.");
 return value;
}
export function numeric(row:Record<string,unknown>,column:string,fallback=0,min=0,max=1e12){
 const text=cell(row,column);
 if(!text)return fallback;
 const n=Number(text);
 if(!Number.isFinite(n)||n<min||n>max)throw Error(column+": harus angka antara "+min+" dan "+max+".");
 return n;
}
export function day(row:Record<string,unknown>,column:string){
 const value=cell(row,column);
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error(column+": gunakan format YYYY-MM-DD.");
 const d=new Date(value+"T00:00:00Z");
 if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error(column+": tanggal tidak valid.");
 return value;
}
export const norm=(value:string)=>value.trim().toLocaleLowerCase("id-ID");

export async function importPreparedRows(
 rows:SheetRows,
 prepare:(row:Record<string,unknown>,rowNumber:number)=>PreparedImport,
 insert:(payloads:Record<string,unknown>[])=>Promise<void>,
 knownKeys:Iterable<string>=[]
):Promise<ImportOutcome>{
 const errors:ImportIssue[]=[],pending:{row:number;payload:Record<string,unknown>}[]=[];
 const keys=new Set(Array.from(knownKeys,norm));
 for(const [index,row] of rows.entries()){
  const rowNumber=index+2;
  try{
   const next=prepare(row,rowNumber);
   if(!next.key.trim())throw Error("Kunci identitas data kosong.");
   const key=norm(next.key);
   if(keys.has(key))throw Error("Data dengan identitas ini sudah ada / duplikat dalam file.");
   keys.add(key);
   pending.push({row:rowNumber,payload:next.payload});
  }catch(e){errors.push({row:rowNumber,reason:e instanceof Error?e.message:String(e)});}
 }
 let imported=0;
 for(let start=0;start<pending.length;start+=50){
  const batch=pending.slice(start,start+50);
  try{
   await insert(batch.map(x=>x.payload));
   imported+=batch.length;
  }catch{
   // Database inserts are atomic per request. Retry individually to identify bad records.
   for(const item of batch){
    try{await insert([item.payload]);imported++;}
    catch(e){errors.push({row:item.row,reason:e instanceof Error?e.message:String(e)});}
   }
  }
 }
 return {imported,errors:errors.sort((a,b)=>a.row-b.row)};
}
