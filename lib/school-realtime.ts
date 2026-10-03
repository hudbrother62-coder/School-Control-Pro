'use client';
import {useCallback,useEffect,useRef,useSyncExternalStore} from 'react';
import {browserDb} from './supabase';
import {readAllRows} from './read-all-rows';
const listeners=new Map<string,Set<()=>void>>(),versions=new Map<string,number>();
let stop:(()=>void)|undefined;
function emit(school:string){for(const key of [school,'*']){versions.set(key,(versions.get(key)||0)+1);listeners.get(key)?.forEach(fn=>fn());}}
function start(){
 const db=browserDb();let alive=true,pending:ReturnType<typeof setTimeout>|undefined,checking=false;
 const known=new Map<string,number>();
 const changed=new Set<string>();
 function queue(id:string){changed.add(id);if(pending)return;pending=setTimeout(()=>{pending=undefined;changed.forEach(emit);changed.clear();},200);}
 async function reconcile(){if(checking||!alive||document.visibilityState==='hidden')return;checking=true;try{
  const {data,error}=await readAllRows(db.from('sc_school_changes').select('school_id,revision').order('school_id'));if(error||!alive)return;
  const present=new Set<string>();for(const row of data||[]){present.add(row.school_id);if(known.has(row.school_id)&&known.get(row.school_id)!==row.revision)queue(row.school_id);else if(!known.has(row.school_id))queue(row.school_id);known.set(row.school_id,row.revision);}
  for(const id of known.keys())if(!present.has(id)){known.delete(id);queue(id);}
 }finally{checking=false;}}
 const channel=db.channel('school-changes-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'sc_school_changes'},payload=>{
  const row=payload.new as {school_id?:string;revision?:number};if(row.school_id){known.set(row.school_id,row.revision||0);queue(row.school_id);}
 }).subscribe(s=>{if(s==='SUBSCRIBED')void reconcile();});
 const interval=setInterval(()=>void reconcile(),30000);
 const wake=()=>void reconcile();window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);void reconcile();
 stop=()=>{alive=false;clearInterval(interval);if(pending)clearTimeout(pending);void db.removeChannel(channel);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake);stop=undefined;};
}
function subscribe(key:string,fn:()=>void){let set=listeners.get(key);if(!set){set=new Set();listeners.set(key,set);}set.add(fn);if(!stop)start();return()=>{set!.delete(fn);if(!set!.size)listeners.delete(key);if(!listeners.size)stop?.();};}
export function useSchoolRevision(school:string){const sub=useCallback((fn:()=>void)=>school?subscribe(school,fn):()=>{},[school]);return useSyncExternalStore(sub,()=>versions.get(school)||0,()=>0);}
/** Refresh data only; mounted screens keep their filters, navigation and editing state. */
export function useRealtimeRefresh(school:string,load:()=>Promise<unknown>|void){
 const version=useSchoolRevision(school),callback=useRef(load),last=useRef(version);callback.current=load;
 useEffect(()=>{if(last.current===version)return;last.current=version;let disposed=false;const timer=setTimeout(()=>{if(!disposed)Promise.resolve(callback.current()).catch(()=>{});},80);return()=>{disposed=true;clearTimeout(timer);};},[version,school]);
}
