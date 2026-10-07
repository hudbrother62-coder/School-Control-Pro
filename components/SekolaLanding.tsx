'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {ArrowRight,ArrowUpRight,BookOpen,CalendarDays,Check,ChevronRight,ClipboardList,FileText,HeartHandshake,Menu,Moon,Search,ShieldCheck,Sun,Users,WalletCards,Wrench,X} from 'lucide-react';
import {plans,rupiah} from '@/lib/pricing';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {bookFrame} from '@/lib/landing-scroll';
import SekolaDemo from './SekolaDemo';
const SekolaBook=dynamic(()=>import('./SekolaBook'),{ssr:false});
const chapters=[
 {title:'SekolaPro',heading:<>Semua kebutuhan sekolah.<br/>Dalam satu buku.</>,description:'Jelajahi fitur SekolaPro.',features:['Pembelajaran','Kesiswaan','Administrasi','Fasilitas']},
 {title:'Pembelajaran',heading:<>Mengajar<br/>lebih fokus.</>,description:'Presensi, nilai, dan perangkat ajar.',features:['Presensi','Nilai','Perangkat ajar','Jadwal']},
 {title:'Kesiswaan',heading:<>Dampingi<br/>setiap siswa.</>,description:'Kenali siswa. Tuntaskan tindak lanjut.',features:['Data siswa','Konseling','Pembinaan']},
 {title:'Pengelolaan',heading:<>Kelola sekolah<br/>lebih mudah.</>,description:'Administrasi hingga fasilitas, terhubung.',features:['Keuangan','Laporan','Agenda','Fasilitas']}
];
const catalogue=[
 {title:'Pembelajaran',icon:BookOpen,roles:'Guru, wali kelas, kepala sekolah',items:['Presensi siswa dan rekap kehadiran','Lembar nilai dan rekap bulanan','Jurnal mengajar dan pengamatan siswa','Jadwal mingguan dan agenda mengajar','Modul ajar, RPP, LKPD dan bahan ajar','Asesmen soal dan rubrik penilaian','Proyek perangkat ajar dan riwayat draf']},
 {title:'Kesiswaan',icon:HeartHandshake,roles:'Guru BK, wali kelas, pengelola kesiswaan sesuai peran',items:['Data induk siswa, kelas dan penugasan','Catatan disiplin dan prestasi','Pembinaan dan tindak lanjut','Layanan konseling individu dan kelompok','Asesmen, rencana layanan dan rujukan','Surat pembinaan dan laporan siswa']},
 {title:'Manajemen & administrasi',icon:ClipboardList,roles:'Kepala sekolah, wakil kepala sekolah, staf',items:['Program sekolah, tugas, PIC dan tenggat','Agenda sekolah, pribadi dan kegiatan','Presensi agenda dengan lokasi dan peserta','Supervisi dan pemantauan kinerja','Jurnal harian, review dan arsip','Template laporan, identitas dan tanda tangan','Import Excel dan ekspor laporan','Asisten AI untuk pekerjaan sekolah']},
 {title:'Keuangan & pegawai',icon:WalletCards,roles:'Bendahara, staf keuangan, SDM dan kepala sekolah',items:['Kas, kategori transaksi dan anggaran','Tagihan siswa dan pencatatan pembayaran','Laporan keuangan dan rekap periode','Data pegawai dan presensi kerja','Pengajuan izin, cuti dan kebutuhan pegawai','Administrasi penggajian dan slip pribadi']},
 {title:'Perpustakaan & koordinasi',icon:CalendarDays,roles:'Petugas perpustakaan dan anggota sesuai akses',items:['Katalog dan inventaris buku','Peminjaman dan pengembalian buku','Laporan perpustakaan','Kalender dan kegiatan sekolah','Notifikasi dan komunikasi tim','Pencarian data dan arsip dokumen']},
 {title:'Pengelolaan fasilitas',icon:Wrench,roles:'Sarpras, petugas dan peminjam sesuai izin',items:['Inventaris ruang, barang dan bahan habis pakai','Lokasi, penanggung jawab dan kondisi aset','Peminjaman ruang atau barang','Permintaan perbaikan dan perawatan','Pengadaan, penerimaan dan stok minimum','Stok opname, mutasi dan ekspor laporan']}
];
type Modal='features'|'pricing'|'faq'|null;
export default function SekolaLanding(){
 const tour=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null),modalOpener=useRef<HTMLElement|null>(null),progressFill=useRef<HTMLSpanElement>(null);
 const bookProgress=useRef(0),smoothScroll=useRef<Lenis|null>(null);
 const [chapter,setChapter]=useState(0),[ending,setEnding]=useState(false),[copyVisible,setCopyVisible]=useState(false);
 const [dark,setDark]=useState(true),[reduced,setReduced]=useState(false),[modal,setModal]=useState<Modal>(null),[filter,setFilter]=useState('');
 useEffect(()=>{try{const saved=localStorage.getItem('school-control-theme');if(saved)setDark(saved==='dark');}catch{}const query=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(query.matches);change();query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 useEffect(()=>{
  const el=tour.current;if(!el)return;
  gsap.registerPlugin(ScrollTrigger);
  if(reduced){bookProgress.current=0;setChapter(0);setEnding(false);return;}
  const copy=Array.from(el.querySelectorAll<HTMLElement>('.sp-book-copy:not(.sp-book-outro)'));
  const outro=el.querySelector<HTMLElement>('.sp-book-outro');
  let active=-1,wasEnding=false,wasVisible=true;
  const motion={value:0};
  const draw=()=>{
   bookProgress.current=motion.value;const frame=bookFrame(motion.value);
   el.style.setProperty('--book-focus',String(frame.zoom));
   const isEnding=frame.outro>.08,isVisible=frame.copy>.08;
   if(wasVisible!==isVisible){wasVisible=isVisible;setCopyVisible(isVisible);}
   if(active!==frame.chapter){active=frame.chapter;setChapter(active);}
   if(wasEnding!==isEnding){wasEnding=isEnding;setEnding(isEnding);}
   copy.forEach((element,index)=>{
    const opacity=index===frame.chapter?frame.copy:0;
    element.style.opacity=String(opacity);element.style.transform=`translate3d(0,${(1-opacity)*24}px,0)`;
    Array.from(element.children).forEach((child,i)=>{const item=child as HTMLElement;const reveal=Math.max(0,Math.min(1,(opacity-i*.07)/(1-i*.07)));item.style.opacity=String(reveal);item.style.transform=`translate3d(0,${(1-reveal)*14}px,0)`;});
   });
   if(outro){outro.style.opacity=String(frame.outro);outro.style.transform=`translate3d(0,${(1-frame.outro)*18}px,0)`;}
   if(progressFill.current)progressFill.current.style.transform=`scaleX(${motion.value})`;
  };
  const lenis=new Lenis({lerp:.1,smoothWheel:true,syncTouch:false,anchors:true,prevent:node=>!!node.closest('.sp-dialog')});
  smoothScroll.current=lenis;
  const tick=(time:number)=>lenis.raf(time*1000);lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(tick);
  const context=gsap.context(()=>{
   gsap.to(motion,{value:1,ease:'none',onUpdate:draw,scrollTrigger:{trigger:el,start:'top top',end:'bottom bottom',scrub:.35,invalidateOnRefresh:true}});
   draw();
  },el);
  return()=>{context.revert();gsap.ticker.remove(tick);smoothScroll.current=null;lenis.destroy();};
 },[reduced]);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(modal){if(!d.open)d.showModal();const original=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=original;};}if(d.open)d.close();modalOpener.current?.focus({preventScroll:true});},[modal]);
 const open=(type:Modal)=>{modalOpener.current=document.activeElement as HTMLElement;setModal(type);setFilter('');};
 const close=()=>setModal(null);
 const feature=(label:string)=>{open('features');setFilter(label==='Data siswa'?'siswa':label);};
 const toggleTheme=()=>{const next=!dark;setDark(next);try{localStorage.setItem('school-control-theme',next?'dark':'light');}catch{}};
 const goToChapter=(index:number)=>{
  const el=tour.current;if(!el)return;
  if(reduced){el.querySelectorAll<HTMLElement>('.sp-book-copy:not(.sp-book-outro)')[index]?.scrollIntoView({behavior:'auto'});return;}
  const top=el.getBoundingClientRect().top+window.scrollY;
  const destination=top+(el.offsetHeight-window.innerHeight)*(index/4+.025);
  if(smoothScroll.current)smoothScroll.current.scrollTo(destination,{duration:1.4});
  else window.scrollTo({top:destination,behavior:'smooth'});
 };

 const matching=catalogue.filter(c=>(c.title+' '+c.roles+' '+c.items.join(' ')).toLowerCase().includes(filter.toLowerCase()));
 return <div className="sp" data-theme={dark?'dark':'light'} data-reduced={reduced}><a className="sp-skip" href="#tour-content">Lewati navigasi</a>
 <header className="sp-header"><Link className="sp-brand" href="/" aria-label="SekolaPro beranda"><img src="/sekola-pro-mark.svg" alt="" width={38} height={38}/><span>SekolaPro</span></Link><nav className="sp-nav" aria-label="Navigasi landing"><button onClick={()=>open('features')}>Fitur</button><button onClick={()=>open('pricing')}>Harga</button></nav><div className="sp-header-actions"><button className="sp-icon-btn" onClick={toggleTheme} aria-label={dark?'Aktifkan tema terang':'Aktifkan tema gelap'}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><a className="sp-login" href="/masuk">Masuk</a><a className="sp-button sp-button-small" href="/masuk">Masuk SekolaPro <ArrowUpRight size={15}/></a><button className="sp-icon-btn sp-mobile-menu" aria-label="Buka fitur dan informasi" onClick={()=>open('features')}><Menu size={20}/></button></div></header>
 <main id="tour-content" className="sp-book-story" ref={tour} tabIndex={-1}>
 <div className="sp-book-stage">
 <SekolaBook progress={bookProgress} dark={dark} reduced={reduced}/>
 <div className="sp-book-copy-area">
 {chapters.map((item,index)=><section key={item.title} className={`sp-book-copy ${index===0?'sp-book-intro':''}`} aria-hidden={!reduced&&(chapter!==index||ending||!copyVisible)} inert={!reduced&&(chapter!==index||ending||!copyVisible)}>
 <span className="sp-book-label">{index===0?'SEKOLAPRO':`${String(index).padStart(2,'0')} / ${item.title.toUpperCase()}`}</span>
 {index===0?<h1>{item.heading}</h1>:<h2>{item.heading}</h2>}
 <p>{item.description}</p>
 {index===0?<a href="/masuk" className="sp-button">Masuk SekolaPro <ArrowRight size={18}/></a>:null}
 <div className="sp-book-features">{item.features.map(label=><button key={label} onClick={()=>feature(label)}><ChevronRight size={14}/>{label}</button>)}</div>
 </section>)}
 <section className="sp-book-copy sp-book-outro" aria-hidden={!ending&&!reduced} inert={!ending&&!reduced}><span className="sp-book-label">UNTUK SELURUH TIM SEKOLAH</span><h2>Satu ruang.<br/>Seluruh tim.</h2><p>Mulai cerita sekolah Anda.</p><a href="/masuk" className="sp-button">Mulai sekarang <ArrowRight size={18}/></a><button className="sp-book-all" onClick={()=>open('features')}>Lihat semua fitur <ArrowUpRight size={16}/></button></section>
 </div>
 <nav className="sp-book-chapters" aria-label="Bab fitur SekolaPro">{chapters.map((item,index)=><button key={item.title} onClick={()=>goToChapter(index)} aria-current={chapter===index?'step':undefined} aria-label={`Ke bab ${item.title}`}><span className="sp-book-dot"/><span>{item.title}</span></button>)}</nav>
 </div>
 </main><SekolaDemo/><div className="sp-reading-progress" aria-hidden="true"><span ref={progressFill}/></div>

 <footer className="sp-end"><Link className="sp-brand" href="/"><img src="/sekola-pro-mark.svg" alt="" width={28} height={28}/><span>SekolaPro</span></Link><div><button onClick={()=>open('features')}>Fitur</button><button onClick={()=>open('pricing')}>Harga</button><button onClick={()=>open('faq')}>FAQ</button><a href="/masuk">Masuk</a></div><small>© {new Date().getFullYear()} SekolaPro</small></footer>
 <dialog data-lenis-prevent className="sp-dialog" ref={dialog} onCancel={close} onClose={()=>{if(modal)setModal(null);}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}} aria-labelledby="sp-dialog-title"><div className="sp-dialog-head"><div><span className="sp-eyebrow">SATU SISTEM UNTUK TIM SEKOLAH</span><h2 id="sp-dialog-title">{modal==='pricing'?'Paket SekolaPro':modal==='faq'?'Sebelum Anda mulai':'Temukan ruang kerja Anda.'}</h2></div><button className="sp-icon-btn" autoFocus onClick={close} aria-label="Tutup informasi"><X size={22}/></button></div><nav className="sp-dialog-nav" aria-label="Informasi produk">{(['features','pricing','faq'] as const).map(k=><button key={k} aria-pressed={modal===k} onClick={()=>{setModal(k);setFilter('');}}>{k==='features'?'Semua fitur':k==='pricing'?'Harga':'FAQ'}</button>)}</nav><div className="sp-dialog-body">
 {modal==='features'&&<><p className="sp-dialog-intro">Fitur berdasarkan pekerjaan Anda. Akses mengikuti peran dan izin dalam aplikasi; data konseling dan gaji tetap terbatas.</p><label className="sp-search"><Search size={19}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Cari fitur atau tanggung jawab…" aria-label="Cari fitur atau tanggung jawab"/></label><div className="sp-catalogue">{matching.map(c=>{const Icon=c.icon;return <article key={c.title}><div className="sp-catalogue-title"><Icon size={22}/><h3>{c.title}</h3></div><p>{c.roles}</p><ul>{c.items.map(item=><li key={item}><Check size={14}/>{item}</li>)}</ul></article>;})}</div>{!matching.length&&<p role="status" className="sp-empty">Fitur belum ditemukan. Coba “nilai”, “laporan”, atau “sarpras”.</p>}<div className="sp-dialog-note"><ShieldCheck size={18}/><span>Nama tanggung jawab membantu memilih kebutuhan. Daftar peran dan hak akses mengikuti konfigurasi yang tersedia di sekolah.</span></div></>}
 {modal==='pricing'&&<><p className="sp-dialog-intro">Satu paket per sekolah. Biaya berlangganan bulanan dengan pengelolaan akun melalui Super Admin.</p><div className="sp-price-grid">{(['monthly'] as const).map(k=><article key={k}><span className="sp-eyebrow">BERLANGGANAN BULANAN</span><h3>Bulanan</h3><strong>{rupiah(plans[k].price)}</strong><small>/{plans[k].days} hari</small><ul>{['Satu workspace sekolah','Anggota sesuai peran','Template laporan sekolah','200 permintaan generator AI/bulan'].map(item=><li key={item}><Check size={15}/>{item}</li>)}</ul><a className="sp-button" href="/masuk">Masuk SekolaPro <ArrowRight size={17}/></a></article>)}</div><p className="sp-dialog-intro">Pembuatan akun dan konfirmasi perpanjangan ditangani Super Admin. Akses setiap fitur mengikuti peran dan izin sekolah.</p></>}
 {modal==='faq'&&<div className="sp-faq">{[['Siapa yang dapat menggunakan SekolaPro?','Kepala sekolah, guru, wali kelas, guru BK, bendahara, SDM, dan staf sesuai peran yang tersedia. Tanggung jawab kesiswaan dan pengelola kegiatan dijalankan melalui peran serta izin yang sesuai.'],['Bagaimana akses data sensitif?','Catatan konseling, data keuangan, dan slip pribadi mengikuti pembatasan akses aplikasi. Promosi fitur tidak memberi akses tambahan kepada pengguna.'],['Apa saja yang bisa dikelola untuk fasilitas?','Inventaris barang dan ruangan, peminjaman, perawatan, pengadaan, bahan habis pakai, serta stok opname. Akses mengikuti peran dan izin pengguna.'],['Bagaimana memulai dan memasukkan data?','Masuk ke akun, lengkapi identitas, dan masukkan data melalui template Excel. Tim masuk menggunakan akun masing-masing sesuai peran.'],['Apakah laporan bisa mengikuti format sekolah?','Sekolah dapat menggunakan template Word serta identitas, logo, tanda tangan, dan stempel. Ekspor mengikuti dukungan pada masing-masing laporan.'],['Bagaimana cara memperpanjang akun?','Super Admin mengaktifkan akun selama satu bulan. Pembayaran dan perpanjangan dikonfirmasi oleh pengelola. Tanpa konfirmasi, akses otomatis berhenti saat masa aktif habis.']].map(([q,a])=><details key={q}><summary>{q}<ChevronRight size={17}/></summary><p>{a}</p></details>)}</div>}
 </div><div className="sp-dialog-bottom"><a className="sp-text-button" href="/masuk">Sudah punya akun? Masuk <ArrowUpRight size={15}/></a><a href="/masuk" className="sp-button sp-button-small">Masuk ke akun <ArrowRight size={17}/></a></div></dialog></div>;
}
