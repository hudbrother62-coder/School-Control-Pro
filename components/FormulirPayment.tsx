"use client";

import {useEffect,useId,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {CreditCard,ExternalLink,LoaderCircle,LockKeyhole,ShieldCheck,X} from "lucide-react";
import "./formulir-checkout.css";

// Provider URL supplied by the product owner. Payment is NOT confirmed by opening this link.
const CHECKOUT_URL="https://profit-meledak.store/sekolapro";
type FrameState="loading"|"loaded"|"error";

export default function FormulirPayment({schoolName}:{schoolName:string}){
 const [open,setOpen]=useState(false);
 const [frameState,setFrameState]=useState<FrameState>("loading");
 const [frameKey,setFrameKey]=useState(0);
 const titleId=useId();
 const trigger=useRef<HTMLButtonElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const modal=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  if(!open)return;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeButton.current?.focus();
  function onKeyDown(event:KeyboardEvent){
   if(event.key==="Escape"){event.preventDefault();setOpen(false);return;}
   if(event.key!=="Tab")return;
   const nodes=modal.current?.querySelectorAll<HTMLElement>("button:not([disabled]),a[href],iframe");
   if(!nodes?.length)return;
   const first=nodes[0],last=nodes[nodes.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  document.addEventListener("keydown",onKeyDown);
  return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener("keydown",onKeyDown);trigger.current?.focus();};
 },[open]);

 useEffect(()=>{
  if(!open||frameState!=="loading")return;
  const timeout=window.setTimeout(()=>setFrameState("error"),18000);
  return()=>window.clearTimeout(timeout);
 },[open,frameState,frameKey]);

 function start(){setFrameState("loading");setOpen(true);}
 function retry(){setFrameState("loading");setFrameKey(value=>value+1);}

 return <>
  <button ref={trigger} type="button" className="formulir-checkout-trigger" onClick={start}>
   <CreditCard size={18}/> Buka Formulir Pembayaran
  </button>
  {open&&typeof document!=="undefined"&&createPortal(
   <div className="formulir-checkout-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
    <section ref={modal} role="dialog" aria-modal="true" aria-labelledby={titleId} className="formulir-checkout-modal">
     <header className="formulir-checkout-header">
      <div><span className="formulir-checkout-eyebrow"><LockKeyhole size={13}/> SEKOLAPRO · CHECKOUT</span>
       <h2 id={titleId}>Pembayaran Langganan</h2>
       <p>Gunakan formulir pemesanan Sekolapro dari penyedia pembayaran.</p>
      </div>
      <button ref={closeButton} className="formulir-checkout-close" aria-label="Tutup formulir" onClick={()=>setOpen(false)}><X size={19}/></button>
     </header>
     <div className="formulir-checkout-body">
      <div className="formulir-checkout-school"><span>Sekolah yang akan diperpanjang</span><strong>{schoolName}</strong></div>
      <p className="formulir-checkout-guidance">Isi nama sekolah dan kontak yang benar pada formulir agar Customer Service bisa mencocokkan pembayaran. Nominal dan metode pembayaran mengikuti checkout penyedia.</p>
      <div className="formulir-checkout-links">
       <span>FORMULIR PEMESANAN</span>
       <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Buka checkout di tab baru</a>
      </div>
      <div className="formulir-checkout-host">
       {frameState==="loading"&&<div className="formulir-checkout-loader" role="status"><LoaderCircle size={17}/> Memuat formulir resmi…</div>}
       {frameState==="error"&&<div className="formulir-checkout-error" role="alert">
        <strong>Formulir tidak dapat dimuat dalam aplikasi.</strong>
        <p>Buka langsung halaman penyedia. Jangan membayar jika nama produk atau nominal tidak sesuai.</p>
        <button onClick={retry}>Coba muat ulang</button>
        <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer">Buka formulir pembayaran <ExternalLink size={14}/></a>
       </div>}
       <iframe key={frameKey} title="Checkout langganan Sekolapro" src={CHECKOUT_URL}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-modals"
        allow="payment *" referrerPolicy="strict-origin-when-cross-origin"
        onLoad={()=>setFrameState("loaded")} onError={()=>setFrameState("error")}
        className="formulir-checkout-frame" style={{display:frameState==="error"?"none":"block"}}/>
      </div>
      <div className="formulir-checkout-warning"><ShieldCheck size={20}/>
       <p>Jangan masukkan password akun Sekolapro ke formulir pihak ketiga. <strong>Pembayaran tidak otomatis mengaktifkan akun.</strong> Customer Service memeriksa transaksi, lalu Super Admin mengonfirmasi dan mengatur masa aktif sekolah.</p>
      </div>
     </div>
     <footer className="formulir-checkout-footer"><small>Data sekolah tidak dihapus selama menunggu konfirmasi.</small><button onClick={()=>setOpen(false)}>Tutup</button></footer>
    </section>
   </div>,document.body)}
 </>;
}
