"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowRight,ArrowLeft,Eye,EyeOff,LockKeyhole,ShieldCheck,BookOpenCheck,Sparkles} from "lucide-react";
import {browserDb} from "@/lib/supabase";
import {errorMessage} from "@/lib/error-message";
import "./auth.css";

export default function AuthScreen(){
 const db=useMemo(()=>browserDb(),[]);
 const submitting=useRef(false);
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[showPassword,setShowPassword]=useState(false);
 const [loading,setLoading]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[forgot,setForgot]=useState(false);
 useEffect(()=>{let active=true;void (async()=>{const {data:{user}}=await db.auth.getUser();if(!active||!user||submitting.current)return;const {data}=await db.rpc("sc_is_platform_admin");if(active&&!submitting.current)window.location.assign(data===true?"/admin":"/app");})();return()=>{active=false}},[db]);
 async function submit(e:React.FormEvent){
  e.preventDefault();submitting.current=true;setError("");setMessage("");setLoading(true);
  try{
   if(forgot){const {error:e}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+"/pulihkan"});if(e)throw e;setMessage("Jika email terdaftar, instruksi pemulihan akan dikirim.");return;}
   const {error:e}=await db.auth.signInWithPassword({email:email.trim(),password});if(e)throw e;
   const {data:admin}=await db.rpc("sc_is_platform_admin");
   window.location.assign(admin===true?"/admin":"/app");
  }catch(e){
   const detail=errorMessage(e);
   setError(/email not confirmed|email_not_confirmed/i.test(detail)?"Akun belum diaktifkan. Hubungi pengelola.":/invalid login credentials/i.test(detail)?"Email atau kata sandi tidak sesuai. Minta akun kepada pengelola SekolaPro.":/banned|disabled|suspended/i.test(detail)?"Akun sedang dinonaktifkan. Hubungi pengelola SekolaPro.":detail);
  }finally{setLoading(false);submitting.current=false;}
 }
 return <main className="auth-v2"><div className="auth-v2-left"><Link href="/" className="auth-v2-brand"><img src="/sekola-pro-mark.svg" width="40" height="40" alt=""/><span><b>SekolaPro</b><small>School Management Platform</small></span></Link><div className="auth-v2-promo"><span className="auth-v2-tag">SATU EKOSISTEM DIGITAL</span><h1>Bangun sekolah yang lebih <em>terkendali.</em></h1><p>Data siswa, guru, program, pembelajaran, dan keuangan terhubung dalam satu workspace. Akses dibuat dan dikelola oleh Super Admin.</p><div className="auth-v2-benefits"><div><BookOpenCheck/><span>Administrasi terintegrasi, satu data induk</span></div><div><ShieldCheck/><span>Pengguna memiliki akses sesuai peran</span></div><div><Sparkles/><span>Asisten AI untuk membantu tugas sekolah</span></div></div></div><span className="auth-v2-copyright">© {new Date().getFullYear()} SekolaPro · Satu sistem untuk sekolah Anda</span></div><div className="auth-v2-right"><div className="auth-v2-top"><Link href="/"><ArrowLeft size={16}/> Kembali ke beranda</Link><span>Belum memiliki akses? Hubungi pengelola SekolaPro.</span></div><div className="auth-v2-form-wrap"><div className="auth-v2-symbol"><img src="/sekola-pro-mark.svg" width="37" height="37" alt=""/></div><span className="auth-v2-eyebrow">{forgot?"PEMULIHAN AKUN":"AKSES PELANGGAN"}</span><h2>{forgot?"Pulihkan kata sandi":"Masuk ke workspace."}</h2><p>{forgot?"Masukkan alamat email akun Anda.":"Gunakan akun yang sudah dibuat oleh pengelola SekolaPro."}</p><form onSubmit={submit}>
 <label>Email<input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@sekolah.sch.id"/></label>
 {!forgot&&<label>Kata sandi<div className="auth-v2-password"><input type={showPassword?"text":"password"} minLength={8} required value={password} autoComplete="current-password" onChange={e=>setPassword(e.target.value)} placeholder="Masukkan kata sandi"/><button type="button" aria-label={showPassword?"Sembunyikan kata sandi":"Tampilkan kata sandi"} onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>}
 {!forgot&&<button type="button" className="auth-v2-forgot" onClick={()=>setForgot(true)}>Lupa kata sandi?</button>}
 {error&&<div className="auth-v2-error" role="alert">{error}</div>}{message&&<div className="auth-v2-message" role="status">{message}</div>}
 <button className="auth-v2-submit" disabled={loading}>{loading?"Memproses…":forgot?"Kirim Instruksi":"Masuk ke SekolaPro"}<ArrowRight size={17}/></button>
 </form>{forgot?<button className="auth-v2-back" onClick={()=>setForgot(false)}>Kembali ke halaman masuk</button>:<><div className="auth-v2-divider"><span>KEAMANAN WORKSPACE</span></div><div className="auth-v2-foot"><LockKeyhole size={15}/> Akun pribadi, dengan akses bulanan yang dikelola pengelola platform.</div></>}</div><div className="auth-v2-mobile-footer">SekolaPro · Manajemen sekolah lebih terarah</div></div></main>;
}
