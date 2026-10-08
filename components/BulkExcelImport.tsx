"use client";
import {useState} from "react";
import {Download,Upload} from "lucide-react";
import {downloadExcel,readExcel,type SheetRows} from "@/lib/excel";
import type {ImportOutcome} from "@/lib/bulk-import";
import {errorMessage} from "@/lib/error-message";

export type ExcelImportOption={value:string;label:string;example:SheetRows;guide:string};
export default function BulkExcelImport({options,onImport,disabled=false}:{options:ExcelImportOption[];onImport:(kind:string,rows:SheetRows)=>Promise<ImportOutcome>;disabled?:boolean}){
 const [kind,setKind]=useState(options[0]?.value||""),[rows,setRows]=useState<SheetRows>([]),[filename,setFilename]=useState(""),[error,setError]=useState(""),[result,setResult]=useState<ImportOutcome|null>(null),[busy,setBusy]=useState(false);
 const current=options.find(x=>x.value===kind)||options[0],columns=Object.keys(current?.example[0]||{});
 async function download(){
  if(!current)return;
  setError("");
  try{await downloadExcel("template-"+kind+"-sekolapro.xlsx",[{name:"DATA",rows:current.example},{name:"PANDUAN",rows:[{Ketentuan:"Hapus semua baris contoh sebelum mengimpor. Jangan ubah nama kolom."},{Ketentuan:current.guide},{Ketentuan:"Batas 500 baris, 8 MB. Data yang sudah ada tidak ditimpa."}]}]);}
  catch(e){setError(errorMessage(e));}
 }
 async function read(file?:File){
  setRows([]);setResult(null);setError("");setFilename("");
  if(!file)return;
  try{
   if(!/\.(xlsx|xls|csv)$/i.test(file.name))throw Error("Gunakan file Excel (.xlsx/.xls) atau CSV.");
   if(file.size>8_000_000)throw Error("Ukuran file maksimal 8 MB.");
   const data=await readExcel(file);
   if(!data.length||data.length>500)throw Error("File harus berisi 1–500 baris data.");
   const missing=columns.filter(x=>!Object.prototype.hasOwnProperty.call(data[0],x));
   if(missing.length)throw Error("Kolom template tidak ditemukan: "+missing.join(", "));
   setRows(data);setFilename(file.name);
  }catch(e){setError(errorMessage(e));}
 }
 async function commit(){
  if(!rows.length||busy||disabled)return;
  setBusy(true);setError("");setResult(null);
  try{const outcome=await onImport(kind,rows);setResult(outcome);setRows([]);setFilename("");}
  catch(e){setError(errorMessage(e));}
  finally{setBusy(false);}
 }
 return <section className="panel excel-toolbar" aria-label="Import Excel massal">
  <div className="sectionhead"><div><h2>Import Excel Massal</h2><p className="muted">Unduh template, isi data, periksa pratinjau, lalu impor. Data lama tidak ditimpa.</p></div></div>
  <div className="flow" style={{alignItems:"end",flexWrap:"wrap"}}>
   <label className="field" style={{minWidth:180}}>Jenis data
    <select value={kind} disabled={busy||disabled} onChange={e=>{setKind(e.target.value);setRows([]);setFilename("");setResult(null);setError("");}}>{options.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
   </label>
   <button type="button" className="button secondary" disabled={busy} onClick={()=>void download()}><Download size={15}/> Unduh Template</button>
   <label className="button secondary" style={{cursor:busy||disabled?"not-allowed":"pointer"}}><Upload size={15}/> Pilih Excel<input type="file" hidden accept=".xlsx,.xls,.csv" disabled={busy||disabled} onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value="";void read(f);}}/></label>
  </div>
  {current&&<p className="muted" style={{marginTop:8}}>{current.guide}</p>}
  {rows.length>0&&<div style={{marginTop:12}}><p><strong>{filename}</strong> · {rows.length} baris siap ditinjau (5 baris pertama).</p>
   <div className="tablewrap" style={{maxWidth:"100%",overflowX:"auto"}}><table className="data-table"><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.slice(0,5).map((r,i)=><tr key={i}>{columns.map(c=><td key={c}>{String(r[c]??"")}</td>)}</tr>)}</tbody></table></div>
   <div className="flow"><button type="button" className="button" disabled={busy||disabled} onClick={()=>void commit()}>{busy?"Mengimpor…":"Impor "+rows.length+" Baris"}</button><button type="button" className="button secondary" disabled={busy} onClick={()=>{setRows([]);setFilename("");}}>Batal</button></div>
  </div>}
  {error&&<p role="alert" className="banner error">{error}</p>}
  {result&&<div role="status" className={result.errors.length?"banner":"banner success"}>Berhasil: {result.imported} baris. Gagal/dilewati: {result.errors.length} baris.
   {result.errors.length>0&&<><details><summary>Lihat detail kegagalan</summary><ul>{result.errors.slice(0,30).map((x,i)=><li key={i}>Baris {x.row}: {x.reason}</li>)}</ul></details><button type="button" className="button secondary" onClick={()=>void downloadExcel("hasil-gagal-import-"+kind+".xlsx",[{name:"GAGAL",rows:result.errors.map(x=>({Baris:x.row,Alasan:x.reason}))}])}>Unduh Kesalahan Excel</button></>}
  </div>}
 </section>;
}
