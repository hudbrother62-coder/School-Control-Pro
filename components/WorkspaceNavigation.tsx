"use client";
import {useState} from "react";
import {ChevronRight,ClipboardCheck,Clock3,Search,Sparkles,type LucideIcon} from "lucide-react";
import {navigationFeatures,type FeatureModule,type ModuleKey,type Role} from "@/lib/modules";
import {principalGroupForFeature,principalSearchText} from "@/lib/principal-workspace";

const group=(key:ModuleKey)=>key==="overview"?"Beranda":key==="master"?"Data Induk":["calendar","journals","notes"].includes(key)?"Agenda & Jurnal":key==="reports"?"Laporan":["guru_ai","buku_kerja"].includes(key)?"Mengajar & Penilaian":["disiplin","bk"].includes(key)?"Kesiswaan":["library","sarpras"].includes(key)?"Layanan Sekolah":key==="assistant"?"Asisten AI":["command","kepsek_ai"].includes(key)?"Manajemen Sekolah":["attendance","performance","gajian","payslip"].includes(key)?"SDM & Kehadiran":key==="sikas"?"Keuangan":"Pengaturan & Bantuan";

export default function WorkspaceNavigation({items,role,module,feature,expanded,icons,onChoose,onExpand}:{items:FeatureModule[];role:Role;module:ModuleKey;feature:string;expanded:ModuleKey|null;icons:Record<ModuleKey,LucideIcon>;onChoose:(m:ModuleKey,f?:string)=>void;onExpand:(m:ModuleKey|null)=>void}){
 const [query,setQuery]=useState("");
 const [openGroup,setOpenGroup]=useState<string|null>(null);
 const words=query.toLocaleLowerCase("id").trim().split(/\s+/).filter(Boolean);
 const matches=(s:string)=>words.every(w=>s.toLocaleLowerCase("id").includes(w));
 const filtered=items.filter(m=>matches(m.label)||navigationFeatures(m,role).some(f=>matches(m.label+" "+(m.key==="kepsek_ai"?principalSearchText(f):f))));
 const sections=[...new Set(filtered.map(m=>group(m.key)))];
 const hasOrchestrator=items.some(m=>m.key==="assistant"&&navigationFeatures(m,role).includes("Universal AI Orchestrator"));
 const hasCheckIn=items.some(m=>m.key==="attendance"&&navigationFeatures(m,role).includes("Presensi Saya"));
 const hasStudentAttendance=items.some(m=>m.key==="buku_kerja"&&navigationFeatures(m,role).includes("Presensi Siswa"));

 return <nav aria-label="Menu sekolah" className="workspace-navigation">
  <label className="nav-search"><Search size={16}/><input aria-label="Cari menu sekolah" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari menu atau pekerjaan…" type="search"/></label>
  <button className={"navbtn "+(module==="overview"&&feature==="Ruang Kerja"?"active":"")} onClick={()=>{setQuery("");onChoose("overview","Ruang Kerja")}}><Search size={18}/><span>Ruang kerja terpadu</span></button>
  {hasCheckIn&&<button className={"navbtn navbtn-attendance-quick "+(module==="attendance"&&feature==="Presensi Saya"?"active":"")} onClick={()=>{setQuery("");onChoose("attendance","Presensi Saya")}}><Clock3 size={18}/><span>Check-in Guru / Staf</span></button>}
  {hasStudentAttendance&&<button className={"navbtn navbtn-student-attendance-quick "+(module==="buku_kerja"&&feature==="Presensi Siswa"?"active":"")} onClick={()=>{setQuery("");onChoose("buku_kerja","Presensi Siswa")}}><ClipboardCheck size={18}/><span>Absensi Siswa</span></button>}
  {hasOrchestrator&&<button className={"navbtn navbtn-orchestrator "+(module==="assistant"&&feature==="Universal AI Orchestrator"?"active":"")} onClick={()=>{setQuery("");onChoose("assistant","Universal AI Orchestrator")}}><Sparkles size={18}/><span>Universal AI Orchestrator</span></button>}
  {!filtered.length&&<p className="nav-empty">Menu tidak ditemukan untuk akses Anda.</p>}
  {sections.map(section=><section className="nav-cluster" key={section}>
   <button className="nav-cluster-toggle" aria-expanded={!!words.length||(openGroup??group(module))===section} onClick={()=>setOpenGroup((openGroup??group(module))===section?"":section)}><span>{section}</span><ChevronRight className={!!words.length||(openGroup??group(module))===section?"open":""} size={17}/></button>
   <div hidden={!words.length&&(openGroup??group(module))!==section}>
    {filtered.filter(m=>group(m.key)===section).map(m=>{
     const Icon=icons[m.key],open=!!words.length||expanded===m.key,features=navigationFeatures(m,role).filter(f=>!words.length||matches(m.label)||matches(m.label+" "+(m.key==="kepsek_ai"?principalSearchText(f):f)));
     const activeFeature=m.key==="kepsek_ai"?principalGroupForFeature(feature)?.name||feature:feature;
     return <div className="navitem" key={m.key}><div className="navrow"><button className={"navbtn "+(module===m.key?"active":"")} aria-current={module===m.key?"page":undefined} onClick={()=>{setQuery("");onChoose(m.key)}}><Icon size={19}/><span>{m.label}</span></button>{features.length>1&&<button className="navexpand" aria-label={"Submenu "+m.label} aria-expanded={open} aria-controls={"navigation-"+m.key} onClick={()=>onExpand(open?null:m.key)}><ChevronRight className={"navchev "+(open?"open":"")} size={17}/></button>}</div>{open&&features.length>0&&(features.length>1||words.length>0)&&<div className="navchildren" id={"navigation-"+m.key}>{features.map(f=>{const description=m.key==="kepsek_ai"?principalGroupForFeature(f)?.description:null;const active=module===m.key&&activeFeature===f;return <button key={f} type="button" aria-current={active?"page":undefined} aria-label={description?f+". "+description:f} title={description||undefined} className={(active?"active ":"")+(m.key==="kepsek_ai"?"principal-nav-item":"")} onClick={()=>{setQuery("");onChoose(m.key,f)}}><span>{f}</span>{description&&<small>{description}</small>}</button>})}</div>}</div>
    })}
   </div>
  </section>)}
 </nav>;
}
