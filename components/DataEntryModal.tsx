"use client";
import {ReactNode,useEffect} from "react";
import {X} from "lucide-react";

export default function DataEntryModal({open,title,subtitle,onClose,children,wide=false}:{open:boolean;title:string;subtitle?:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
 useEffect(()=>{if(!open)return;const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};document.addEventListener("keydown",onKey);const prev=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.removeEventListener("keydown",onKey);document.body.style.overflow=prev}},[open,onClose]);
 if(!open)return null;
 return <div className="modalbackdrop data-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section className={"modalcard data-modal-card "+(wide?"wide":"")} role="dialog" aria-modal="true" aria-label={title}>
   <div className="data-modal-head"><div><span>INPUT DATA</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="iconbutton" aria-label="Tutup" onClick={onClose}><X size={18}/></button></div>
   <div className="data-modal-body">{children}</div>
  </section>
 </div>
}
