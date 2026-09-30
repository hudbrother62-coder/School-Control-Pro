"use client";
import {useEffect,useMemo,useState} from "react";
import {ChevronLeft,ChevronRight,Plus} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {isAdmin,type Role} from "@/lib/modules";

type EventRow={id:string;title:string;event_date:string;category:string;notes:string|null;created_by:string;pic_id:string|null};
const ymd=(d:Date)=>d.toLocaleDateString("en-CA");
const monthStart=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),1);
const addMonths=(d:Date,n:number)=>new Date(d.getFullYear(),d.getMonth()+n,1);
const same=(a:Date,b:string)=>ymd(a)===b;

export default function SchoolCalendar({schoolId,userId,role,compact=false}:{schoolId:string;userId:string;role:Role;compact?:boolean}){
 const db=useMemo(()=>browserDb(),[]),[cursor,setCursor]=useState(()=>monthStart(new Date())),[rows,setRows]=useState<EventRow[]>([]),[title,setTitle]=useState(""),[day,setDay]=useState(ymd(new Date())),[notes,setNotes]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const canWrite=role!=="viewer";
 async function load(){if(!db)return;const from=ymd(monthStart(cursor)),to=ymd(new Date(cursor.getFullYear(),cursor.getMonth()+2,0));const {data,error}=await db.from("sc_calendar_events").select("id,title,event_date,category,notes,created_by,pic_id").eq("school_id",schoolId).gte("event_date",from).lte("event_date",to).order("event_date");if(error)setError(error.message);else setRows((data||[]) as EventRow[])}
 useEffect(()=>{void load()},[db,schoolId,cursor]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError("");try{await fn();await load()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function add(){if(!db||title.trim().length<3)return;await run(async()=>{const {error}=await db.from("sc_calendar_events").insert({school_id:schoolId,title:title.trim(),event_date:day,category:"school",notes:notes.trim()||null,created_by:userId});if(error)throw error;setTitle("");setNotes("")})}
 async function edit(x:EventRow){if(!db)return;const nextTitle=prompt("Nama agenda",x.title);if(!nextTitle)return;const nextDate=prompt("Tanggal YYYY-MM-DD",x.event_date)||x.event_date;const nextNotes=prompt("Catatan",x.notes||"")||"";await run(async()=>{const {error}=await db.rpc("sc_update_operational",{p_school:schoolId,p_entity:"calendar",p_id:x.id,p_patch:{title:nextTitle,event_date:nextDate,notes:nextNotes}});if(error)throw error})}
 async function remove(x:EventRow){if(!db||!confirm("Hapus agenda ini?"))return;await run(async()=>{const {error}=await db.rpc("sc_delete_operational",{p_school:schoolId,p_entity:"calendar",p_id:x.id});if(error)throw error})}
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
 const nextMonthStart=addMonths(monthStart(new Date()),1),nextMonthEnd=new Date(nextMonthStart.getFullYear(),nextMonthStart.getMonth()+1,0);
 const tomorrowRows=rows.filter(x=>same(tomorrow,x.event_date)),nextMonthRows=rows.filter(x=>{const d=new Date(x.event_date+"T00:00:00");return d>=nextMonthStart&&d<=nextMonthEnd});
 if(compact)return <section className="panel"><div className="sectionhead"><div><h2>Agenda Terdekat</h2></div><button className="button secondary" onClick={()=>setCursor(addMonths(cursor,1))}>Bulan Depan</button></div><div className="grid"><div className="card"><label>Besok</label><strong>{tomorrowRows.length}</strong><small>{tomorrowRows.slice(0,2).map(x=>x.title).join(" · ")||"Tidak ada agenda"}</small></div><div className="card"><label>Bulan depan</label><strong>{nextMonthRows.length}</strong><small>{nextMonthRows.slice(0,2).map(x=>x.title).join(" · ")||"Belum ada agenda"}</small></div></div></section>;

 const first=monthStart(cursor),offset=(first.getDay()+6)%7,cells=Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),i-offset+1));
 return <><section className="panel"><div className="calendar-head"><button className="iconbutton" onClick={()=>setCursor(addMonths(cursor,-1))}><ChevronLeft size={17}/></button><h2>{cursor.toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</h2><button className="iconbutton" onClick={()=>setCursor(addMonths(cursor,1))}><ChevronRight size={17}/></button></div><div className="calendar-week">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{cells.map(d=>{const key=ymd(d),ev=rows.filter(x=>x.event_date===key);return <button key={key} className={"calendar-cell "+(d.getMonth()===cursor.getMonth()?"":"muted-month")+" "+(same(new Date(),key)?"today":"")} onClick={()=>setDay(key)}><b>{d.getDate()}</b>{ev.slice(0,3).map(x=><small key={x.id}>{x.title}</small>)}{ev.length>3&&<small>+{ev.length-3} lagi</small>}</button>})}</div></section>
 {canWrite&&<section className="panel"><div className="sectionhead"><h2>Tambah Agenda</h2><Plus size={18}/></div><div className="fields"><label className="field">Tanggal<input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label><label className="field">Agenda<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Rapat wali kelas"/></label><label className="field full">Catatan<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label><button className="button" disabled={busy||title.trim().length<3} onClick={()=>void add()}>Simpan Agenda</button></div></section>}
 <section className="panel"><h2>Agenda Bulan Ini & Berikutnya</h2>{rows.map(x=><div className="entry" key={x.id}><div><strong>{x.title}</strong><small>{x.event_date}{x.notes?" · "+x.notes:""}</small></div>{(isAdmin(role)||x.created_by===userId)&&<div className="flow"><button className="button secondary" onClick={()=>void edit(x)}>Edit</button><button className="button danger" onClick={()=>void remove(x)}>Hapus</button></div>}</div>)}{!rows.length&&<div className="empty">Belum ada agenda.</div>}</section>{error&&<div className="banner error">{error}</div>}</>;
}
