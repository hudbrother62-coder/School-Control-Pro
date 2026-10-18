"use client";
import {useEffect,useState,type ReactNode} from "react";
import {browserDb} from "@/lib/supabase";

export default function LandingSessionGate({children}:{children:ReactNode}){
 const [guest,setGuest]=useState(false);

 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const db=browserDb();
    // Supabase persists this browser's session and refreshes tokens automatically.
    const {data:{session}}=await db.auth.getSession();
    if(!active)return;
    if(!session){setGuest(true);return;}

    // Validate the saved session before choosing the account workspace.
    const {data:{user}}=await db.auth.getUser();
    if(!active)return;
    if(!user){setGuest(true);return;}

    const {data:isPlatformAdmin}=await db.rpc("sc_is_platform_admin");
    if(active)window.location.replace(isPlatformAdmin===true?"/admin":"/app");
   }catch{
    if(active)setGuest(true);
   }
  })();
  return()=>{active=false};
 },[]);

 if(!guest)return <main className="authwrap" aria-busy="true"><div className="panel" role="status">Memeriksa sesi SekolaPro…</div></main>;
 return <>{children}</>;
}
