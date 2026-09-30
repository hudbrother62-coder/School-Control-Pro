"use client";
import {useEffect,useState} from "react";
import {LayoutDashboard,Database,BookOpenCheck,Sparkles,ClipboardCheck,HeartHandshake,ListChecks,WalletCards,BriefcaseBusiness,Settings,LogOut,Clock3,BarChart3,Search,ChevronRight,GraduationCap,Sun,Moon,CalendarDays,KeyRound,Plus,Pencil,Trash2,MapPin} from "lucide-react";
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
const desc:Record<Key,string>={
 overview:"Ringkasan sekolah dengan data utama, grafik dan pekerjaan yang perlu perhatian.",
 master:"Sumber data siswa, kelas, guru, tenaga kependidikan, mapel dan penugasan.",
 calendar:"Kalender sekolah, agenda pribadi, agenda pengguna dan kehadiran kegiatan.",
 teaching:"Workspace guru untuk proyek pembelajaran dan pembuatan perangkat ajar.",
 academic:"Presensi siswa, lembar nilai, jurnal, rekap dan laporan per guru.",
 student:"Pelanggaran, prestasi, pembinaan, tindak lanjut dan template laporan.",
 counseling:"Administrasi BK privat dari pemetaan kebutuhan sampai tindak lanjut.",
 planning:"Perencanaan sekolah, dokumen kerja dan supervisi akademik.",
 execution:"Program, PIC, tugas, progres, kendala, rapat, agenda dan bukti.",
 attendance:"Presensi realtime berbasis waktu server dan lokasi perangkat.",
 performance:"Rekap kinerja dan pengembangan berbasis bukti.",
 finance:"Kas, anggaran, tagihan, pembayaran, kuitansi dan laporan.",
 payroll:"Komponen gaji, proses payroll, approval dan slip.",
 access:"Tambah pengguna, ubah peran dan atur akses fitur.",
 settings:"Identitas, kontak, lokasi, akademik, branding dan langganan."
};
function fieldLabels(active:Key,feature:string){
 if(active==="master")return feature==="Siswa"?["Nama Siswa","NIS / NISN","Kelas"]:feature==="Kelas"?["Nama Kelas","Jenjang","Tahun Ajaran"]:feature==="Guru"?["Nama Guru","Jabatan / Mapel","Jam Masuk"]:feature==="Tenaga Kependidikan"?["Nama Tenaga Kependidikan","Jabatan","Jam Masuk"]:feature==="Mata Pelajaran"?["Nama Mata Pelajaran","Kode","Keterangan"]:["Data Penugasan","Guru / Kelas","Mata Pelajaran"];
 if(active==="calendar")return ["Nama Agenda","Lokasi / Peserta","Catatan"];
 if(active==="teaching")return ["Topik / Proyek","Kelas & Mata Pelajaran","Instruksi / Konteks"];
 if(active==="academic")return feature==="Lembar Nilai"?["Nama Penilaian","Mata Pelajaran / Kelas","Nilai / Keterangan"]:["Nama Kegiatan","Kelas / Siswa","Keterangan"];
 if(active==="student")return ["Siswa","Kejadian / Prestasi","Tindak Lanjut"];
 if(active==="counseling")return ["Siswa / Sasaran","Topik Layanan","Catatan Privat"];
 if(active==="planning")return ["Nama Dokumen / Supervisi","Periode / Sasaran","Catatan"];
 if(active==="execution")return ["Program / Tugas","PIC / Deadline","Progres / Kendala"];
 if(active==="attendance")return ["Nama / Jenis","Waktu / Shift","Lokasi / Alasan"];
 if(active==="performance")return ["Nama Bukti","Periode / Kegiatan","Catatan Evaluasi"];
 if(active==="finance")return ["Nama Transaksi / Tagihan","Akun / Kategori","Nominal / Keterangan"];
 if(active==="payroll")return ["Pegawai / Periode","Komponen","Nominal / Status"];
 if(active==="access")return feature==="Tambah Pengguna"?["Nama / Email","Peran Awal","Catatan"]:["Pengguna / Peran","Hak Akses","Catatan"];
 if(active==="settings")return ["Nama / Nilai Pengaturan","Kategori","Keterangan"];
 return ["Judul","Detail","Keterangan"];
}
function Dashboard(){
 const attendance=[31,36,39,37,40,38,39],students=[32,30,34,28,31,35];
 return <><div className="demo-grid"><div className="demo-stat"><small>Siswa Aktif</small><strong>486</strong><span>18 kelas</span></div><div className="demo-stat"><small>Guru & Staf</small><strong>42</strong><span>39 hadir hari ini</span></div><div className="demo-stat"><small>Kehadiran Hari Ini</small><strong>93%</strong><span>3 perlu verifikasi</span></div><div className="demo-stat"><small>Deadline Aktif</small><strong>8</strong><span>2 melewati tenggat</span></div></div><div className="demo-panels"><section><h3>Tren Kehadiran 7 Hari</h3><div className="demo-bars">{attendance.map((n,i)=><div key={i}><i style={{height:(n/42*100)+"%"}}/><b>{n}</b><small>{["Rab","Kam","Jum","Sen","Sel","Rab","Kam"][i]}</small></div>)}</div></section><section><h3>Siswa per Kelas</h3>{students.map((n,i)=><div className="demo-hbar" key={i}><span>{["VII A","VII B","VIII A","VIII B","IX A","IX B"][i]}</span><i><b style={{width:(n/35*100)+"%"}}/></i><strong>{n}</strong></div>)}</section></div><div className="demo-panels"><section><h3>Agenda Terdekat</h3>{["Rapat Kurikulum · 1 Okt 09.00","Supervisi VIII A · 2 Okt 08.00","Pelatihan Guru · 4 Okt 10.00"].map(x=><div className="demo-row" key={x}><CalendarDays size={16}/><b>{x}</b><small>Terjadwal</small></div>)}</section><section><h3>Pekerjaan Prioritas</h3>{["Lengkapi bukti program literasi","Review RKT semester","Verifikasi tagihan siswa"].map(x=><div className="demo-row" key={x}><ListChecks size={16}/><b>{x}</b><small>Perlu tindakan</small></div>)}</section></div></>;
}
export default function DemoWorkspace(){
 const [active,setActive]=useState<Key>("overview"),[expanded,setExpanded]=useState<Key|null>("overview"),[feature,setFeature]=useState(""),[title,setTitle]=useState(""),[detail,setDetail]=useState(""),[extra,setExtra]=useState(""),[date,setDate]=useState(()=>new Date().toLocaleDateString("en-CA")),[saved,setSaved]=useState<Record<string,Saved[]>>({});
 const [ready,setReady]=useState(false),[theme,setTheme]=useState<"light"|"dark">("light");
 useEffect(()=>{if(sessionStorage.getItem("sc_internal_review")!=="1"){window.location.replace("/masuk");return}const t=localStorage.getItem("school-control-theme")==="dark"?"dark":"light";setTheme(t);document.body.dataset.theme=t;try{setSaved(JSON.parse(localStorage.getItem("sc_internal_workspace_data_v2")||"{}"))}catch{}setReady(true)},[]);
 if(!ready)return null;
 const current=menu.find(x=>x[0]===active)!;const storageKey=active+"::"+(feature||"utama"),labels=fieldLabels(active,feature);
 function choose(k:Key){setActive(k);setExpanded(k);setFeature("");setTitle("");setDetail("");setExtra("")}
 function toggleTheme(){const next=theme==="light"?"dark":"light";setTheme(next);localStorage.setItem("school-control-theme",next);document.body.dataset.theme=next}
 function persist(next:Record<string,Saved[]>){setSaved(next);localStorage.setItem("sc_internal_workspace_data_v2",JSON.stringify(next))}
 function add(){if(title.trim().length<2)return;const item={id:crypto.randomUUID(),title:title.trim(),detail:detail.trim(),extra:extra.trim(),date};persist({...saved,[storageKey]:[...(saved[storageKey]||[]),item]});setTitle("");setDetail("");setExtra("")}
 function edit(id:string){const item=(saved[storageKey]||[]).find(x=>x.id===id);if(!item)return;const a=prompt(labels[0],item.title);if(!a)return;const b=prompt(labels[1],item.detail)||"";const e=prompt(labels[2],item.extra)||"";persist({...saved,[storageKey]:(saved[storageKey]||[]).map(x=>x.id===id?{...x,title:a,detail:b,extra:e}:x)})}
 function del(id:string){if(confirm("Hapus data demo ini?"))persist({...saved,[storageKey]:(saved[storageKey]||[]).filter(x=>x.id!==id)})}
 function logout(){sessionStorage.removeItem("sc_internal_review");window.location.replace("/masuk")}
 return <div className="demo-shell"><aside><div className="demo-brand"><img src="/school-control-mark.svg" width={38} height={38} alt=""/><span><b>School Control</b><small>Workspace Demo · Paket Aktif</small></span></div><nav>{menu.map(([k,label,Icon,features])=><div className="demo-navitem" key={k}><button className={active===k&&!feature?"active":""} onClick={()=>choose(k)}><Icon size={18}/>{label}<ChevronRight className={expanded===k?"open":""} size={15}/></button>{expanded===k&&<div className="demo-navchildren">{features.map(x=><button key={x} className={active===k&&feature===x?"selected":""} onClick={()=>{setActive(k);setFeature(x);setTitle("");setDetail("");setExtra("")}}>{x}</button>)}</div>}</div>)}</nav><button className="demo-exit" onClick={logout}><LogOut size={17}/> Keluar</button></aside><main><header><div><span className="demo-kicker">SCHOOL CONTROL / DEMO AKSES PENUH</span><h1>{feature||current[1]}</h1><p>{feature?"Workspace "+feature+" · semua tombol input demo aktif.":desc[active]}</p></div><div className="demo-head-actions"><button className="demo-theme" onClick={toggleTheme}>{theme==="light"?<Moon size={16}/>:<Sun size={16}/>} {theme==="light"?"Gelap":"Terang"}</button><div className="demo-search"><Search size={16}/><span>Cari fitur…</span></div></div></header><div className="demo-content">
  {active==="overview"&&!feature?<Dashboard/>:<>
   {!feature&&<section><h3>{current[1]}</h3><p className="demo-lead">{desc[active]}</p><div className="demo-module-grid">{current[3].map(x=><button key={x} onClick={()=>setFeature(x)}><ChevronRight size={15}/><span><b>{x}</b><small>Buka workspace</small></span></button>)}</div></section>}
   {feature&&<><section className="demo-form"><div className="demo-form-head"><div><h3>{feature}</h3><p>Input demo disimpan di perangkat ini sehingga kamu bisa mencoba alur tambah, edit dan hapus seperti akun aktif.</p></div><span className="pill">Paket Aktif</span></div>
    <label>{labels[0]}<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={"Masukkan "+labels[0].toLowerCase()}/></label>
    <label>{labels[1]}<input value={detail} onChange={e=>setDetail(e.target.value)} placeholder={labels[1]}/></label>
    <label>{labels[2]}<input value={extra} onChange={e=>setExtra(e.target.value)} placeholder={labels[2]}/></label>
    <label>Tanggal<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    {active==="attendance"&&feature==="Check-in/Check-out"&&<div className="demo-location"><MapPin size={16}/><span>Lokasi perangkat akan diminta saat presensi pada akun produksi.</span></div>}
    <button className="demo-primary" onClick={add}><Plus size={15}/> Tambah Data</button>
   </section><section><div className="sectionhead"><h3>Data {feature}</h3><span className="pill">{(saved[storageKey]||[]).length} data demo</span></div>{(saved[storageKey]||[]).map(x=><div className="demo-row" key={x.id}><span className="dot"/><b>{x.title}<small style={{display:"block"}}>{x.date}{x.detail?" · "+x.detail:""}{x.extra?" · "+x.extra:""}</small></b><div className="flow"><button onClick={()=>edit(x.id)}><Pencil size={14}/></button><button onClick={()=>del(x.id)}><Trash2 size={14}/></button></div></div>)}{!(saved[storageKey]||[]).length&&<div className="demo-empty">Belum ada data. Gunakan form di atas untuk mencoba fitur ini.</div>}</section></>}
  </>}
 </div></main></div>;
}
