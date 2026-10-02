"use client";
import {useEffect,useId,useMemo,useRef,useState} from "react";
import {Check,ChevronDown,Plus,Search,X} from "lucide-react";

export type SmartOption={value:string;label:string;subtitle?:string;search?:string};

export default function SmartSelect({
 label,value,options,onChange,placeholder="Pilih data",allowCustom=false,customLabel="Gunakan teks ini",disabled=false
}:{label:string;value:string;options:SmartOption[];onChange:(value:string)=>void;placeholder?:string;allowCustom?:boolean;customLabel?:string;disabled?:boolean}){
 const root=useRef<HTMLDivElement>(null),optionId=useId();
 useEffect(()=>{function outside(e:PointerEvent){if(root.current&&!root.current.contains(e.target as Node))setOpen(false)}document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside)},[]);
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");
 const selected=options.find(x=>x.value===value);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return options.slice(0,100);return options.filter(x=>(x.label+" "+(x.subtitle||"")+" "+(x.search||"")).toLowerCase().includes(q)).slice(0,100)},[query,options]);
 const custom=query.trim();
 function choose(v:string){onChange(v);setOpen(false);setQuery("")}
 return <div ref={root} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();setOpen(false);root.current?.querySelector<HTMLButtonElement>(".smart-trigger")?.focus()}}} className={"smart-select "+(open?"open":"")}>
  <span className="smart-label">{label}</span>
  <button type="button" className="smart-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={optionId} aria-haspopup="listbox" disabled={disabled} onClick={()=>setOpen(v=>!v)}>
   <span>{selected?<><b>{selected.label}</b>{selected.subtitle&&<small>{selected.subtitle}</small>}</>:value?<b>{value}</b>:<em>{placeholder}</em>}</span><ChevronDown size={16}/>
  </button>
  {open&&<div className="smart-popover">
   <div className="smart-search"><Search size={15}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} aria-label={"Cari "+label} placeholder={allowCustom?"Cari atau ketik sendiri…":"Ketik untuk mencari…"}/><button type="button" onClick={()=>setOpen(false)} aria-label="Tutup"><X size={14}/></button></div>
   <div className="smart-options" role="listbox" id={optionId} aria-label={label}>
    {filtered.map(x=><button type="button" key={x.value} role="option" aria-selected={x.value===value} className={x.value===value?"selected":""} onClick={()=>choose(x.value)}><span><b>{x.label}</b>{x.subtitle&&<small>{x.subtitle}</small>}</span>{x.value===value&&<Check size={14}/>}</button>)}
    {allowCustom&&custom&&!options.some(x=>x.label.toLowerCase()===custom.toLowerCase()||x.value.toLowerCase()===custom.toLowerCase())&&<button type="button" className="custom" onClick={()=>choose(custom)}><Plus size={14}/><span><b>{customLabel}</b><small>{custom}</small></span></button>}
    {!filtered.length&&!allowCustom&&<div className="smart-empty">Data tidak ditemukan.</div>}
   </div>
  </div>}
 </div>;
}
