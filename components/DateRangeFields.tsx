"use client";
export default function DateRangeFields({from,to,onFrom,onTo}:{from:string;to:string;onFrom:(day:string)=>void;onTo:(day:string)=>void}){
 return <div className="record-date-inline" role="group" aria-label="Filter rentang tanggal">
  <label className="field record-date">Dari tanggal<input type="date" value={from} max={to||undefined} onChange={e=>onFrom(e.target.value)}/></label>
  <label className="field record-date">Sampai tanggal<input type="date" value={to} min={from||undefined} onChange={e=>onTo(e.target.value)}/></label>
  {(from||to)&&<button type="button" className="button secondary record-date-reset" onClick={()=>{onFrom("");onTo("")}}>Reset tanggal</button>}
 </div>;
}
