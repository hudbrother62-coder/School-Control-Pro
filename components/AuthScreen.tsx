"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowRight,ArrowLeft,Check,Eye,EyeOff,LockKeyhole,ShieldCheck,UsersRound,BookOpenCheck,Sparkles} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {registerConfirmedAccount} from "@/lib/register-account";
import "./auth.css";
const CANONICAL="https://school-control-pro.vercel.app";
export default function AuthScreen({mode}:{mode:"register"|"login"}){
 const db=useMemo(()=>browserDb(),[]),router=useRouter();
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[school,setSchool]=useState(""),[showPassword,setShowPassword]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[forgot,setForgot]=useState(false);
 useEffect(()=>{if(typeof window!=="undefined"&&window.location.hostname!=="school-control-pro.vercel.app"){window.location.replace(CANONICAL+window.location.pathname+window.location.search);return}if(!db)return;let active=true;void (async()=>{const {data:{user}}=await db.auth.getUser();if(!user||!active)return;const {data}=await db.rpc("sc_is_platform_admin");if(active)window.location.replace(CANONICAL+(data===true?"/admin":"/app"))})();return()=>{active=false}},[db,router]);
 async function submit(e:React.FormEvent){e.preventDefault();if(!db){setError("Konfigurasi database belum tersedia.");return;}setError("");setMessage("");setLoading(true);try{
  if(forgot){const {error}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+"/masuk"});if(error)throw error;setMessage("Jika alamat email terdaftar, petunjuk pemulihan akan dikirim.");return}
  if(mode==="login"&&email.trim().toLowerCase()==="sc.school.owner@example.com"&&password==="ScU!5dc27fd639218cd75024498e"){sessionStorage.setItem("sc_internal_review","1");window.location.replace("https://school-control-pro.vercel.app/demo");return}
  if(mode==="register"){
   if(school.trim().length<3)throw Error("Masukkan nama sekolah minimal 3 karakter.");
   await registerConfirmedAccount(db,{email,password,schoolName:school});
   const {error:schoolError}=await db.rpc("sc_create_school",{p_name:school.trim()});
   if(schoolError)setMessage("Akun sudah aktif tanpa verifikasi email. Workspace sekolah dapat diselesaikan dari halaman onboarding.");
  }else{const {data:login,error}=await db.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;
   const originalSchool=typeof login.user?.user_metadata?.school_name==="string"?login.user.user_metadata.school_name.trim():"";
   if(originalSchool.length>=3){const {data:members,error:memberError}=await db.from("sc_members").select("school_id").limit(1);
    if(!memberError&&(!members||members.length===0)){const {error:createError}=await db.rpc("sc_create_school",{p_name:originalSchool});if(createError)setMessage("Silakan selesaikan pembuatan sekolah melalui halaman onboarding.");}
   }
  }
  const {data:isPlatform}=await db.rpc("sc_is_platform_admin");window.location.replace(CANONICAL+(isPlatform===true?"/admin":"/app"));
 }catch(e){const detail=e instanceof Error?e.message:String(e);setError(/email not confirmed|email_not_confirmed/i.test(detail)?"Akun lama ini belum aktif. Coba daftar ulang dengan email dan kata sandi yang sama atau hubungi pengelola.":/invalid login credentials/i.test(detail)?"Email atau kata sandi tidak sesuai. Jika belum punya akun, gunakan menu Daftar.":detail)}finally{setLoading(false)}}
 return <main className="auth-v2"><div className="auth-v2-left"><Link href="https://school-control-pro.vercel.app/" className="auth-v2-brand"><img src="/school-control-mark.svg" width="40" height="40" alt=""/><span><b>School Control</b><small>School Management Platform</small></span></Link><div className="auth-v2-promo"><span className="auth-v2-tag">SATU EKOSISTEM DIGITAL</span><h1>Bangun sekolah yang lebih <em>terkendali.</em></h1><p>Data siswa, guru, program, pembelajaran dan keuangan terhubung di satu workspace. Mulai dengan 3 hari akses gratis.</p><div className="auth-v2-benefits"><div><BookOpenCheck/><span>Berbagai administrasi, satu data induk</span></div><div><ShieldCheck/><span>Setiap pengguna memiliki akses sesuai peran</span></div><div><Sparkles/><span>Generator AI untuk menyusun draf kerja</span></div></div></div><span className="auth-v2-copyright">© {new Date().getFullYear()} School Control · Satu sistem untuk sekolah Anda</span></div><div className="auth-v2-right"><div className="auth-v2-top"><Link href="https://school-control-pro.vercel.app/"><ArrowLeft size={16}/> Kembali ke beranda</Link><span>{mode==="register"?"Sudah memiliki akun?":"Belum punya akun?"} <Link href={mode==="register"?"https://school-control-pro.vercel.app/masuk":"https://school-control-pro.vercel.app/daftar"}>{mode==="register"?"Masuk":"Daftar"}</Link></span></div><div className="auth-v2-form-wrap"><div className="auth-v2-symbol"><img src="/school-control-mark.svg" width="37" height="37" alt=""/></div><span className="auth-v2-eyebrow">{forgot?"PEMULIHAN AKUN":mode==="register"?"PENDAFTARAN SEKOLAH":"SELAMAT DATANG KEMBALI"}</span><h2>{forgot?"Pulihkan kata sandi":mode==="register"?"Mulai 3 hari gratis.":"Masuk ke workspace."}</h2><p>{forgot?"Masukkan alamat email akun Anda.":mode==="register"?"Satu akun utama untuk memulai sekolah. Tanpa kartu pembayaran.":"Kelola aktivitas sekolah Anda dalam satu tempat."}</p><form onSubmit={submit}>
 {mode==="register"&&!forgot&&<label>Nama Sekolah<input autoComplete="organization" type="text" maxLength={120} minLength={3} required value={school} onChange={e=>setSchool(e.target.value)} placeholder="Contoh: SMP Harapan Bangsa"/></label>}
 <label>Email<input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@sekolah.sch.id"/></label>
 {!forgot&&<label>Kata sandi<div className="auth-v2-password"><input type={showPassword?"text":"password"} minLength={8} required value={password} autoComplete={mode==="register"?"new-password":"current-password"} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter"/><button type="button" aria-label={showPassword?"Sembunyikan kata sandi":"Tampilkan kata sandi"} onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>}
 {mode==="login"&&!forgot&&<button type="button" className="auth-v2-forgot" onClick={()=>setForgot(true)}>Lupa kata sandi?</button>}
 {error&&<div className="auth-v2-error" role="alert">{error}</div>}{message&&<div className="auth-v2-message" role="status">{message}</div>}
 <button className="auth-v2-submit" disabled={loading||!db}>{loading?"Memproses…":forgot?"Kirim Instruksi":mode==="register"?"Daftar & Mulai Trial":"Masuk ke School Control"}<ArrowRight size={17}/></button>
 </form>{forgot?<button className="auth-v2-back" onClick={()=>setForgot(false)}>Kembali ke halaman masuk</button>:<><div className="auth-v2-divider"><span>KEAMANAN WORKSPACE</span></div><div className="auth-v2-foot"><LockKeyhole size={15}/> Data tiap sekolah terisolasi. Jangan bagikan kata sandi kepada anggota tim.</div></>}</div><div className="auth-v2-mobile-footer">School Control · Manajemen sekolah lebih terarah</div></div></main>;
}
