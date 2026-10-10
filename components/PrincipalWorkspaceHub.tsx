"use client";
import {ArrowLeft,ArrowRight,FolderOpen} from "lucide-react";
import {principalGroupForFeature,principalGroups} from "@/lib/principal-workspace";
export default function PrincipalWorkspaceHub({focus,onChoose}:{focus:string;onChoose:(feature:string)=>void}){
 const group=principalGroupForFeature(focus)||principalGroups[0];
 const selected=group.items.find(i=>i.feature===focus);
 return <section className="principal-workspace" aria-label="Navigasi perencanaan dan supervisi">
 {selected?<><button type="button" className="principal-back" onClick={()=>onChoose(group.name)}><ArrowLeft size={16}/> Kembali ke {group.name}</button>
 <div className="principal-current"><span className="principal-kicker">{group.name}</span><p>{selected.description}</p></div>
 <div className="principal-related" aria-label="Fitur lain dalam kelompok ini">{group.items.map(item=><button type="button" key={item.feature} title={item.description} className={item.feature===focus?"active":""} aria-current={item.feature===focus?"page":undefined} onClick={()=>onChoose(item.feature)}>{item.feature}</button>)}</div></>:
 <><div className="principal-heading"><div className="principal-heading-icon"><FolderOpen size={21}/></div><div><span className="principal-kicker">PERENCANAAN & SUPERVISI</span><h2>{group.name}</h2><p>{group.description}</p></div></div>
 <div className="principal-feature-grid">{group.items.map(item=><button type="button" className="principal-feature-card" key={item.feature} onClick={()=>onChoose(item.feature)}><span><strong>{item.feature}</strong><small>{item.description}</small></span><ArrowRight aria-hidden size={18}/></button>)}</div>
 <p className="principal-footnote">Pilih pekerjaan yang ingin dibuka. Fitur lama dan tautan dokumen tetap tersedia.</p></>}
 </section>;
}
