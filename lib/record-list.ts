export type RecordFilter<T>={key:string;label:string;options:{value:string;label:string}[];value:(row:T)=>string};
export function filterRecords<T>(rows:T[],query:string,text:(row:T)=>string,filters:RecordFilter<T>[],values:Record<string,string>){const words=query.trim().toLocaleLowerCase('id').split(/\s+/).filter(Boolean);return rows.filter(row=>words.every(word=>text(row).toLocaleLowerCase('id').includes(word))&&filters.every(f=>!values[f.key]||f.value(row)===values[f.key]));}
export async function processRecordBatch(ids:string[],action:(id:string)=>Promise<void>){const succeeded:string[]=[],failed:{id:string;message:string}[]=[];for(const id of [...new Set(ids)]){try{await action(id);succeeded.push(id)}catch(e){failed.push({id,message:e instanceof Error?e.message:String((e as {message?:string})?.message||e)})}}return {succeeded,failed};}

/** Mengubah tanggal database ke tanggal sekolah WIB. */
export function recordDateKey(value:string|null|undefined):string {
 if(!value)return "";
 const match=/^\d{4}-\d{2}-\d{2}/.exec(value);
 if(!match)return "";
 if(!value.includes("T"))return match[0];
 const parsed=new Date(value);
 if(Number.isNaN(parsed.getTime()))return match[0];
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(parsed);
 const part=(kind:string)=>parts.find(p=>p.type===kind)?.value||"";
 return part("year")+"-"+part("month")+"-"+part("day");
}
export function isInDateRange(value:string|null|undefined,from:string,to:string):boolean {
 if(!from&&!to)return true;
 const day=recordDateKey(value);
 return !!day&&(!from||day>=from)&&(!to||day<=to);
}
