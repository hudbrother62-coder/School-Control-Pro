import {useEffect,useState} from "react";

export default function LiveClock({timezone}:{timezone:string}){
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{
  const timer=window.setInterval(()=>setNow(new Date()),1000);
  return ()=>window.clearInterval(timer);
 },[]);
 return <>{now.toLocaleTimeString("id-ID",{timeZone:timezone,hour:"2-digit",minute:"2-digit",second:"2-digit"})}</>;
}
