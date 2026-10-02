"use client";
import SearchableSelect from "@/components/SearchableSelect";
import {errorMessage} from "@/lib/error-message";
import {useEffect,useMemo,useState} from "react";
import {browserDb} from "@/lib/supabase";
import {isAdmin,type Role,type Staff} from "@/lib/modules";
type Mode="disiplin"|"bk"|"command"|"sikas"|"gajian";
type Student={id:string;name:string;nis:string|null};
type Row={id:string;[k:string]:unknown};
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"});
const tableFor:Record<Mode,string>={disiplin:"sc_discipline_events",bk:"sc_bk_cases",command:"sc_programs",sikas:"sc_finance_transactions",gajian:"sc_payroll_records"};
export default function Operations({mode,schoolId,userId,role,staff}:{mode:Mode;schoolId:string;userId:string;role:Role;staff:Staff[]}){
 const db=useMemo(()=>browserDb(),[]);
 const [students,setStudents]=useState<Student[]>([]),[rows,setRows]=useState<Row[]>([]);
 const [studentId,setStudentId]=useState(""),[title,setTitle]=useState(""),[category,setCategory]=useState(""),[notes,setNotes]=useState(""),[day,setDay]=useState(today()),[followUp,setFollowUp]=useState("");
 const [financeKind,setFinanceKind]=useState("income"),[amount,setAmount]=useState(""),[staffId,setStaffId]=useState(""),[gross,setGross]=useState(""),[deductions,setDeductions]=useState("0"),[period,setPeriod]=useState(today().slice(0,7));
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[ok,setOk]=useState("");
 const manager=isAdmin(role),counselor=role==="counselor";const canWrite=mode==="bk"?counselor:mode==="sikas"?["owner","principal","treasurer"].includes(role):mode==="gajian"?["owner","hr"].includes(role):mode==="command"?manager:manager||role==="teacher"||counselor;
 const student=(id:unknown)=>students.find(s=>s.id===id)?.name||"Siswa";const staffName=(id:unknown)=>staff.find(s=>s.id===id)?.name||"SDM";
 async function load(){if(!db)return;if(mode==="bk"||mode==="disiplin"){const {data}=await db.from("sc_students").select("id,name,nis").eq("school_id",schoolId).eq("status","active").order("name");setStudents((data||[]) as Student[])}
 const {data,error:e}=await db.from(tableFor[mode]).select("*").eq("school_id",schoolId).limit(80);
 if(e)setError(e.message);else setRows((data||[]) as Row[]);}
 useEffect(()=>{void load()},[db,mode,schoolId]);
 async function submit(e:React.FormEvent){e.preventDefault();if(!db)return;setError("");setOk("");setBusy(true);try{
  let body:Record<string,unknown>={school_id:schoolId};
  if(mode==="disiplin")body={...body,student_id:studentId,category,title:title.trim(),occurred_at:day,follow_up:followUp.trim()||null,created_by:userId};
  if(mode==="bk")body={...body,student_id:studentId,category:category.trim(),assigned_counselor:userId,confidential_notes:notes.trim()||null,follow_up_date:followUp||null};
  if(mode==="command")body={...body,title:title.trim(),owner_id:userId,status:"planned",deadline:day||null};
  if(mode==="sikas")body={...body,kind:financeKind,occurred_at:day,category:category.trim(),amount:Number(amount),description:notes.trim()||null,created_by:userId};
  if(mode==="gajian")body={...body,staff_id:staffId,period,gross:Number(gross),deductions:Number(deductions),status:"draft"};
  const {error:e}=await db.from(tableFor[mode]).insert(body);if(e)throw e;await load();setTitle("");setNotes("");setFollowUp("");setAmount("");setGross("");setOk("Data disimpan.");}
 catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 const textField=(label:string,value:string,set:(s:string)=>void,type="text",required=true)=><label className="field">{label}<input type={type} required={required} value={value} onChange={e=>set(e.target.value)}/></label>;
 const studentField=<label className="field">Siswa<SearchableSelect label="Siswa" value={studentId} required onChange={e=>setStudentId(e.target.value)}><option value="">Pilih siswa</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} {s.nis?"· "+s.nis:""}</option>)}</SearchableSelect></label>;
 if(mode==="bk"&&!counselor)return <section className="panel"><h2>Perlindungan data BK</h2><p>Catatan konseling per siswa hanya untuk konselor penanggung jawab. Kepala sekolah memperoleh jumlah agregat melalui kanal laporan yang terpisah.</p></section>;
 return <section className="panel"><h2>{({disiplin:"Disiplin & prestasi siswa",bk:"Kasus dan tindak lanjut BK",command:"Program dan tugas sekolah",sikas:"Buku kas sekolah",gajian:"Draft payroll bulanan"} as Record<Mode,string>)[mode]}</h2>
 {mode==="bk"&&<p className="hint">Catatan ini bersifat rahasia. Tidak masuk catatan umum dan tidak dibaca oleh asisten AI sekolah.</p>}
 {mode==="gajian"&&<p className="hint">Input draft saja. Persetujuan, penguncian payroll dan penerbitan slip gaji belum diaktifkan pada fondasi ini.</p>}
 {canWrite&&<form className="fields" onSubmit={e=>void submit(e)}>
 {(mode==="disiplin"||mode==="bk")&&studentField}
 {mode==="disiplin"&&<><label className="field">Kategori<SearchableSelect label="Kategori" required value={category} onChange={e=>setCategory(e.target.value)}><option value="">Pilih kategori</option><option value="violation">Pelanggaran</option><option value="achievement">Prestasi</option><option value="coaching">Pembinaan</option></SearchableSelect></label>{textField("Judul kejadian",title,setTitle)}{textField("Tanggal",day,setDay,"date")}<label className="field full">Tindak lanjut<textarea value={followUp} onChange={e=>setFollowUp(e.target.value)}/></label></>}
 {mode==="bk"&&<>{textField("Kategori kebutuhan/kasus",category,setCategory)}<label className="field full">Catatan konseling terbatas<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label>{textField("Tanggal tindak lanjut (opsional)",followUp,setFollowUp,"date",false)}</>}
 {mode==="command"&&<>{textField("Nama program",title,setTitle)}{textField("Deadline",day,setDay,"date")}</>}
 {mode==="sikas"&&<><label className="field">Jenis transaksi<SearchableSelect label="Jenis transaksi" value={financeKind} onChange={e=>setFinanceKind(e.target.value)}><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></SearchableSelect></label>{textField("Kategori",category,setCategory)}{textField("Nominal (Rp)",amount,setAmount,"number")}{textField("Tanggal",day,setDay,"date")}<label className="field full">Keterangan<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label></>}
 {mode==="gajian"&&<><label className="field">Pegawai<SearchableSelect label="Pegawai" required value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="">Pilih pegawai</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</SearchableSelect></label>{textField("Periode",period,setPeriod,"month")}{textField("Gaji & tunjangan bruto",gross,setGross,"number")}{textField("Potongan",deductions,setDeductions,"number")}</>}
 <button className="button" disabled={busy||((mode==="sikas"&&Number(amount)<=0)||(mode==="gajian"&&(!staffId||Number(gross)<0||Number(deductions)<0||Number(deductions)>Number(gross))))}>Simpan</button></form>}
 <div className="tablewrap" style={{marginTop:18}}><table className="data-table"><thead><tr><th>Tanggal / periode</th><th>Data</th><th>Keterangan</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{String(r.occurred_at||r.deadline||r.period||r.created_at||"—").slice(0,10)}</td><td>{mode==="disiplin"?student(r.student_id):mode==="bk"?student(r.student_id):mode==="command"?String(r.title):mode==="gajian"?staffName(r.staff_id):String(r.category)}</td><td>{mode==="disiplin"?String(r.category)+" · "+String(r.title):mode==="bk"?"Status: "+String(r.status)+" · "+String(r.category):mode==="command"?String(r.status):mode==="sikas"?(r.kind==="income"?"+":"−")+" Rp "+Number(r.amount).toLocaleString("id-ID"): "Rp "+(Number(r.gross)-Number(r.deductions)).toLocaleString("id-ID")+" · "+String(r.status)}</td></tr>)}</tbody></table>{!rows.length&&<div className="empty">Belum ada data yang tersedia untuk akses Anda.</div>}</div>
 {error&&<div className="banner error" role="alert">{error}</div>}{ok&&<div className="banner success">{ok}</div>}
 </section>;
}
