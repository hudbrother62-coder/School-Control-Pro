"use client";
import {useEffect,useMemo,useState} from "react";
import {LayoutDashboard,Database,BookOpenCheck,Sparkles,ClipboardCheck,HeartHandshake,ListChecks,WalletCards,BriefcaseBusiness,Settings,LogOut,Clock3,BarChart3,Search,ChevronRight,GraduationCap,Sun,Moon,CalendarDays,KeyRound,Plus,Pencil,Trash2,MapPin,Download,Upload,Users,AlertTriangle,CheckCircle2} from "lucide-react";
import "./demo.css";

const menu=[
 ["overview","Beranda",LayoutDashboard,["Ringkasan Operasional","Analitik Sekolah","Agenda & Deadline"]],
 ["master","Data Induk",Database,["Siswa","Kelas","Guru","Tenaga Kependidikan","Mata Pelajaran","Penugasan Guru","Import Excel Keseluruhan"]],
 ["calendar","Agenda Sekolah",CalendarDays,["Kalender Sekolah","Agenda Pribadi","Agenda Pengguna","Kehadiran Agenda"]],
 ["teaching","Perangkat Ajar AI",Sparkles,["Proyek Pembelajaran","Modul Ajar","RPP","LKPD","Asesmen Soal","Strategi Pembelajaran","Bahan Ajar","Rubrik Penilaian","Panduan Presentasi","Peta Konsep","Ngobrol AI","Riwayat Draf"]],
 ["academic","Pembelajaran & Penilaian",BookOpenCheck,["Presensi Siswa","Lembar Nilai","Jurnal Mengajar","Agenda Mengajar","Rekap Bulanan","Laporan Kelas","Import/Export Excel"]],
 ["student","Disiplin & Prestasi",ClipboardCheck,["Pelanggaran","Prestasi","Pembinaan","Tindak Lanjut","Rekap & Laporan","Template Laporan"]],
 ["counseling","Bimbingan Konseling",HeartHandshake,["Pemetaan Kebutuhan","Kasus","Konseling Individu","Konseling Kelompok","Layanan Klasikal","RPL","Kunjungan Rumah","Rujukan","Karier","Riwayat Siswa","Tindak Lanjut"]],
 ["planning","Perencanaan & Supervisi",GraduationCap,["PBD/EDS","KSP/KOSP","RKJM","RKT","RKAS","SOP","Supervisi Guru","Pusat Dokumen","Persetujuan Dokumen"]],
 ["execution","Program, Tugas & Agenda",ListChecks,["Program Kerja","PIC","Tugas","Deadline","Progres","Kendala","Hasil Rapat","Agenda","Bukti Kegiatan"]],
 ["attendance","Presensi Realtime",Clock3,["Check-in/Check-out","Jadwal/Shift","Riwayat Kehadiran","Koreksi Beralasan","Izin","Cuti"]],
 ["performance","Kinerja & Pengembangan",BarChart3,["Kehadiran","Partisipasi Program","Pelatihan","Bukti Capaian","Evaluasi","Tanggapan Guru"]],
 ["finance","Keuangan & Tagihan",WalletCards,["Dashboard Keuangan","Kas/Rekening","Pemasukan","Pengeluaran","Anggaran","Tagihan Siswa","Pembayaran","Kuitansi","Laporan","Import/Export"]],
 ["payroll","Payroll & Slip",BriefcaseBusiness,["Komponen Gaji","Tunjangan","Potongan","Draft Payroll","Review","Approval","Kunci Periode","Rekap Payroll","Slip Saya"]],
 ["access","Akses & Peran",KeyRound,["Tambah Pengguna","Anggota Tim","Struktur Peran","Hak Akses Fitur"]],
 ["settings","Pengaturan Sekolah",Settings,["Profil Sekolah","Identitas & Kontak","Lokasi Sekolah","Akademik","Branding","Memori Sekolah","Langganan","Riwayat Pembayaran"]]
] as const;
type Key=typeof menu[number][0];
type Saved={id:string;title:string;detail:string;extra:string;date:string};

function fieldLabels(active:Key,feature:string){
 if(active==="master")return feature==="Siswa"?["Nama Siswa","NIS / NISN","Kelas"]:feature==="Kelas"?["Nama Kelas","Jenjang","Tahun Ajaran"]:feature==="Guru"?["Nama Guru","Jabatan / Mata Pelajaran","Jam Masuk"]:feature==="Tenaga Kependidikan"?["Nama Tenaga Kependidikan","Jabatan","Jam Masuk"]:feature==="Mata Pelajaran"?["Nama Mata Pelajaran","Kode","Kelompok Mapel"]:["Data Penugasan","Guru / Kelas","Mata Pelajaran"];
 if(active==="calendar")return ["Nama Agenda","Lokasi / Peserta","Catatan kegiatan"];
 if(active==="teaching")return feature==="Proyek Pembelajaran"?["Nama Proyek","Kelas / Mata Pelajaran","Topik & kebutuhan siswa"]:["Topik / Dokumen","Kelas & Mata Pelajaran","Instruksi / Konteks"];
 if(active==="academic")return feature==="Lembar Nilai"?["Nama Penilaian","Kelas / Mata Pelajaran","Nilai / Keterangan"]:feature==="Presensi Siswa"?["Nama Siswa / Kelas","Status Kehadiran","Catatan"]:["Nama Kegiatan","Kelas / Mata Pelajaran","Keterangan"];
 if(active==="student")return feature==="Prestasi"?["Nama Siswa","Jenis / Tingkat Prestasi","Bukti & tindak lanjut"]:["Nama Siswa","Kejadian / Kategori","Tindak lanjut"];
 if(active==="counseling")return ["Siswa / Sasaran","Topik layanan","Catatan privat"];
 if(active==="planning")return ["Nama Dokumen / Supervisi","Periode / Sasaran","Catatan / Temuan"];
 if(active==="execution")return ["Program / Tugas","PIC / Deadline","Progres / Kendala"];
 if(active==="attendance")return ["Nama / Jenis","Waktu / Shift","Lokasi / Alasan"];
 if(active==="performance")return ["Nama Bukti / Kegiatan","Periode / Sasaran","Catatan evaluasi"];
 if(active==="finance")return ["Transaksi / Tagihan","Kas / Kategori","Nominal / Keterangan"];
 if(active==="payroll")return ["Pegawai / Periode","Komponen","Nominal / Status"];
 if(active==="access")return feature==="Tambah Pengguna"?["Nama / Email","Peran Awal","Catatan"]:["Pengguna / Peran","Hak Akses","Catatan"];
 if(active==="settings")return ["Nama / Nilai Pengaturan","Kategori","Keterangan"];
 return ["Judul","Detail","Keterangan"];
}

function Dashboard({feature}:{feature:string}){
 const attendance=[31,36,39,37,40,38,39],tasks=[8,5,2],finance=[72,48,61,55,80,74];
 if(feature==="Analitik Sekolah")return <div className="demo-dashboard-stack">
  <div className="demo-panels"><section><div className="demo-section-title"><div><h3>Tren Kehadiran SDM 7 Hari</h3><p>Grafik utama operasional: cepat terlihat bila kehadiran menurun.</p></div><span className="demo-badge">Prioritas</span></div><div className="demo-bars">{attendance.map((n,i)=><div key={i}><i style={{height:(n/42*100)+"%"}}/><b>{n}</b><small>{["Kam","Jum","Sen","Sel","Rab","Kam","Jum"][i]}</small></div>)}</div></section>
  <section><div className="demo-section-title"><div><h3>Status Program & Deadline</h3><p>Memisahkan pekerjaan aktif, berjalan, dan terlambat.</p></div></div>{["Belum mulai","Berjalan","Terlambat"].map((x,i)=><div className="demo-hbar" key={x}><span>{x}</span><i><b style={{width:(tasks[i]/8*100)+"%"}}/></i><strong>{tasks[i]}</strong></div>)}</section></div>
  <section><div className="demo-section-title"><div><h3>Arus Kas 6 Bulan</h3><p>Ringkasan tren keuangan tanpa membuka detail transaksi sensitif.</p></div></div><div className="demo-bars wide">{finance.map((n,i)=><div key={i}><i style={{height:n+"%"}}/><b>{n}jt</b><small>{["Apr","Mei","Jun","Jul","Agu","Sep"][i]}</small></div>)}</div></section>
 </div>;
 if(feature==="Agenda & Deadline")return <div className="demo-panels"><section><h3>Agenda 31 Hari ke Depan</h3>{["Rapat Kurikulum · 1 Okt 09.00","Supervisi VIII A · 2 Okt 08.00","Pelatihan Guru · 4 Okt 10.00","Evaluasi Program · 8 Okt 13.00"].map(x=><div className="demo-row" key={x}><CalendarDays size={16}/><b>{x}</b><small>Terjadwal</small></div>)}</section><section><h3>Deadline yang Perlu Tindakan</h3>{["Bukti Program Literasi · hari ini","Review RKT · 2 hari","Rekap Tagihan · 4 hari"].map((x,i)=><div className="demo-row" key={x}><AlertTriangle size={16}/><b>{x}</b><small>{i===0?"Prioritas":"Aktif"}</small></div>)}</section></div>;
 return <><div className="demo-grid"><div className="demo-stat"><small>Siswa Aktif</small><strong>486</strong><span>18 kelas</span></div><div className="demo-stat"><small>Guru & Staf</small><strong>42</strong><span>39 hadir hari ini</span></div><div className="demo-stat"><small>Kehadiran Hari Ini</small><strong>93%</strong><span>3 perlu verifikasi</span></div><div className="demo-stat"><small>Tugas Aktif</small><strong>8</strong><span>2 melewati tenggat</span></div></div><div className="demo-panels"><section><h3>Fokus Hari Ini</h3>{["39 SDM sudah presensi","2 tugas melewati tenggat","3 agenda sekolah hari ini"].map(x=><div className="demo-row" key={x}><CheckCircle2 size={16}/><b>{x}</b><small>Realtime</small></div>)}</section><section><h3>Agenda Terdekat</h3>{["Rapat Kurikulum · 09.00","Supervisi VIII A · besok","Pelatihan Guru · 4 Okt"].map(x=><div className="demo-row" key={x}><CalendarDays size={16}/><b>{x}</b><small>Terjadwal</small></div>)}</section></div></>;
}

function CalendarPreview({items,onPick}:{items:Saved[];onPick:(d:string)=>void}){
 const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),1),offset=(first.getDay()+6)%7;
 const cells=Array.from({length:35},(_,i)=>new Date(now.getFullYear(),now.getMonth(),i-offset+1));
 return <section><div className="demo-section-title"><div><h3>{now.toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</h3><p>Klik tanggal untuk mengisi agenda. Data demo tetap bisa ditambah, edit, dan hapus.</p></div></div><div className="demo-calendar-week">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=><span key={x}>{x}</span>)}</div><div className="demo-calendar">{cells.map(d=>{const key=d.toLocaleDateString("en-CA"),count=items.filter(x=>x.date===key).length;return <button key={key} onClick={()=>onPick(key)} className={d.getMonth()===now.getMonth()?"":"outside"}><b>{d.getDate()}</b>{count>0&&<small>{count} agenda</small>}</button>})}</div></section>
}

export default function DemoWorkspace(){
 const firstFeature=menu[0][3][0];
 const [active,setActive]=useState<Key>("overview"),[expanded,setExpanded]=useState<Key|null>("overview"),[feature,setFeature]=useState<string>(firstFeature),[title,setTitle]=useState(""),[detail,setDetail]=useState(""),[extra,setExtra]=useState(""),[date,setDate]=useState(()=>new Date().toLocaleDateString("en-CA")),[saved,setSaved]=useState<Record<string,Saved[]>>({});
 const [ready,setReady]=useState(false),[theme,setTheme]=useState<"light"|"dark">("light"),[query,setQuery]=useState("");
 useEffect(()=>{if(sessionStorage.getItem("sc_internal_review")!=="1"){window.location.replace("/masuk");return}const t=localStorage.getItem("school-control-theme")==="dark"?"dark":"light";setTheme(t);document.body.dataset.theme=t;try{setSaved(JSON.parse(localStorage.getItem("sc_internal_workspace_data_v3")||"{}"))}catch{}setReady(true)},[]);
 const current=useMemo(()=>menu.find(x=>x[0]===active)!,[active]);
 if(!ready)return null;
 const storageKey=active+"::"+feature,labels=fieldLabels(active,feature),rows=saved[storageKey]||[];
 function choose(k:Key){const m=menu.find(x=>x[0]===k)!;setActive(k);setExpanded(k);setFeature(m[3][0]);setTitle("");setDetail("");setExtra("")}
 function chooseFeature(k:Key,x:string){setActive(k);setExpanded(k);setFeature(x);setTitle("");setDetail("");setExtra("")}
 function toggleTheme(){const next=theme==="light"?"dark":"light";setTheme(next);localStorage.setItem("school-control-theme",next);document.body.dataset.theme=next}
 function persist(next:Record<string,Saved[]>){setSaved(next);localStorage.setItem("sc_internal_workspace_data_v3",JSON.stringify(next))}
 function add(){if(title.trim().length<2)return;const item={id:crypto.randomUUID(),title:title.trim(),detail:detail.trim(),extra:extra.trim(),date};persist({...saved,[storageKey]:[item,...rows]});setTitle("");setDetail("");setExtra("")}
 function edit(id:string){const item=rows.find(x=>x.id===id);if(!item)return;const a=prompt(labels[0],item.title);if(!a)return;const b=prompt(labels[1],item.detail)||"";const e=prompt(labels[2],item.extra)||"";persist({...saved,[storageKey]:rows.map(x=>x.id===id?{...x,title:a,detail:b,extra:e}:x)})}
 function del(id:string){if(confirm("Hapus data demo ini?"))persist({...saved,[storageKey]:rows.filter(x=>x.id!==id)})}
 function logout(){sessionStorage.removeItem("sc_internal_review");window.location.replace("/masuk")}
 function downloadTemplate(){
  const header=[labels[0],labels[1],labels[2],"Tanggal"],sample=["Contoh data","Isi sesuai kebutuhan","Boleh dikosongkan",date];
  const csv=[header,sample].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="template-"+active+"-"+feature.toLowerCase().replaceAll(" ","-")+".csv";a.click();URL.revokeObjectURL(a.href)
 }
 const importFeature=feature.toLowerCase().includes("import");
 const calendarFeature=active==="calendar";
 const attendanceFeature=active==="attendance"&&feature==="Check-in/Check-out";
 return <div className="demo-shell"><aside><div className="demo-brand"><img src="/school-control-mark.svg" width={38} height={38} alt=""/><span><b>School Control</b><small>Demo · akses setara paket aktif</small></span></div><nav>{menu.map(([k,label,Icon,features])=><div className="demo-navitem" key={k}><button className={active===k?"active":""} onClick={()=>choose(k)}><Icon size={18}/>{label}<ChevronRight className={expanded===k?"open":""} size={15}/></button>{expanded===k&&<div className="demo-navchildren">{features.map(x=><button key={x} className={active===k&&feature===x?"selected":""} onClick={()=>chooseFeature(k,x)}>{x}</button>)}</div>}</div>)}</nav><button className="demo-exit" onClick={logout}><LogOut size={17}/> Keluar</button></aside><main><header><div><span className="demo-kicker">SCHOOL CONTROL / DEMO AKSES PENUH</span><h1>{feature}</h1><p>{current[1]} · halaman khusus {feature}. Tidak ada lagi submenu duplikat di dalam halaman.</p></div><div className="demo-head-actions"><button className="demo-theme" onClick={toggleTheme}>{theme==="light"?<Moon size={16}/>:<Sun size={16}/>} {theme==="light"?"Gelap":"Terang"}</button><label className="demo-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari data halaman ini"/></label></div></header><div className="demo-content">
  {active==="overview"?<Dashboard feature={feature}/>:<>
   {calendarFeature&&<CalendarPreview items={rows} onPick={setDate}/>}
   {attendanceFeature&&<section className="demo-realtime"><div><span className="demo-live-dot"/><b>Presensi realtime aktif</b><small>Demo meniru alur waktu server + izin lokasi perangkat.</small></div><button className="demo-primary" onClick={()=>{navigator.geolocation?.getCurrentPosition(()=>setExtra("Lokasi perangkat diizinkan"),()=>setExtra("Lokasi tidak diizinkan"));setTitle("Presensi Masuk");setDetail(new Date().toLocaleTimeString("id-ID"))}}><MapPin size={15}/> Ambil Lokasi & Absen</button></section>}
   {importFeature&&<section><div className="demo-section-title"><div><h3>Import / Export</h3><p>Gunakan template agar kolom konsisten. Pada produksi, sheet kosong dilewati saat import keseluruhan.</p></div></div><div className="demo-toolbar-live"><button onClick={downloadTemplate}><Download size={15}/> Unduh Template</button><label><Upload size={15}/> Pilih File<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>{const file=e.currentTarget.files?.[0];if(file){setTitle("Import "+file.name);setDetail("File dipilih");setExtra("Siap diperiksa")}}}/></label></div></section>}
   {!importFeature&&<section className="demo-form"><div className="demo-form-head"><div><h3>Input {feature}</h3><p>Demo memakai data lokal tetapi alur tambah, edit, hapus, tanggal, dan form dibuat aktif seperti akun berbayar.</p></div><span className="pill">CRUD Aktif</span></div>
    <label>{labels[0]}<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={"Masukkan "+labels[0].toLowerCase()}/></label>
    <label>{labels[1]}<input value={detail} onChange={e=>setDetail(e.target.value)} placeholder={labels[1]}/></label>
    <label>{labels[2]}<input value={extra} onChange={e=>setExtra(e.target.value)} placeholder={labels[2]}/></label>
    <label>Tanggal<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <button className="demo-primary" onClick={add}><Plus size={15}/> Tambah Data</button>
   </section>}
   <section><div className="demo-section-title"><div><h3>Data {feature}</h3><p>{rows.length} data pada halaman ini.</p></div></div>{rows.filter(x=>(x.title+" "+x.detail+" "+x.extra).toLowerCase().includes(query.toLowerCase())).map(x=><div className="demo-row" key={x.id}><span className="dot"/><b>{x.title}<small style={{display:"block"}}>{x.date}{x.detail?" · "+x.detail:""}{x.extra?" · "+x.extra:""}</small></b><div className="flow"><button onClick={()=>edit(x.id)} aria-label="Edit"><Pencil size={14}/></button><button onClick={()=>del(x.id)} aria-label="Hapus"><Trash2 size={14}/></button></div></div>)}{!rows.length&&<div className="demo-empty">Belum ada data. Gunakan form di atas untuk mencoba halaman ini.</div>}</section>
  </>}
 </div></main></div>;
}