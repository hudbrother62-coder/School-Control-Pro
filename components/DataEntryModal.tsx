"use client";
import {ReactNode,useEffect,useRef} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";

export default function DataEntryModal({open,title,subtitle,onClose,children,wide=false}:{open:boolean;title:string;subtitle?:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
 const dialogRef=useRef<HTMLElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow="hidden";dialogRef.current?.querySelector<HTMLElement>("button")?.focus();const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.stopPropagation();closeRef.current();return}if(e.key!=="Tab")return;const nodes=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')||[]).filter(n=>n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};document.addEventListener("keydown",onKey);return()=>{document.removeEventListener("keydown",onKey);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true})}},[open]);
 if(!open||typeof document==="undefined")return null;
 return createPortal(<div className="modalbackdrop data-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section ref={dialogRef} className={"modalcard data-modal-card "+(wide?"wide":"")} role="dialog" aria-modal="true" aria-label={title}>
   <div className="data-modal-head"><div><span>SEKOLAPRO</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="iconbutton" aria-label="Tutup" onClick={onClose}><X size={18}/></button></div>
   <div className="data-modal-body">{children}</div>
  </section>
 </div>,document.body);
}
