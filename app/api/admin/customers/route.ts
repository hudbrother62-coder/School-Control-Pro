import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const runtime="nodejs";
const h={"Cache-Control":"no-store"};
const reply=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:h});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function POST(req:NextRequest){
 try{
  const token=req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://sfzaexzpbcvynkhglndi.supabase.co";
  const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_9RSzLKMNLYPchxRUv5WImg_IdAdDtHc";
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!token)return reply("Masuk sebagai Super Admin terlebih dahulu.",401);
  if(!serviceKey)return reply("SUPABASE_SERVICE_ROLE_KEY belum diatur di Vercel.",503);
  const sessionDb=createClient(url,pub,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await sessionDb.auth.getUser(token);
  if(authError||!user)return reply("Sesi tidak berlaku. Masuk kembali.",401);
  const {data:isAdmin,error:accessError}=await sessionDb.rpc("sc_is_platform_admin");
  if(accessError||isAdmin!==true)return reply("Aksi ini hanya untuk Super Admin.",403);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||typeof body.action!=="string")return reply("Aksi tidak valid.");
  if(body.action==="create"){
   const email=String(body.email||"").trim().toLowerCase();
   const password=String(body.password||"");
   const name=String(body.name||"").trim().slice(0,120);
   const schoolName=String(body.school_name||"").trim();
   const schoolId=String(body.school_id||"").trim();
   const role=schoolId?String(body.role||"staff"):"owner";
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8||password.length>128)return reply("Email atau kata sandi (8–128 karakter) tidak valid.");
   if(schoolId?!uuid.test(schoolId):schoolName.length<3||schoolName.length>120)return reply("Pilih sekolah atau masukkan nama sekolah yang valid.");
   if(schoolId&&!["principal","vice_principal","teacher","counselor","hr","treasurer","staff","viewer"].includes(role))return reply("Peran akun tidak valid.");
   const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name},app_metadata:{provisioned_by_platform:true}});
   if(createError||!created.user)return reply(createError?.message||"Akun gagal dibuat.",409);
   const {data:assigned,error:assignError}=await admin.rpc("sc_platform_provision_account",{p_user:created.user.id,p_school_name:schoolName,p_school:schoolId||null,p_role:role});
   if(assignError){await admin.auth.admin.deleteUser(created.user.id);return reply("Pembuatan sekolah/keanggotaan gagal: "+assignError.message,500);}
   return NextResponse.json({ok:true,user_id:created.user.id,school_id:assigned,email,role},{headers:h});
  }
  if(body.action==="account_status"){
   const id=String(body.user_id||""),disabled=body.disabled;
   if(!uuid.test(id)||typeof disabled!=="boolean")return reply("Akun atau status tidak valid.");
   // Re-allow authentication first; RLS hold is released only after auth ban is removed.
   if(!disabled){const x=await admin.auth.admin.updateUserById(id,{ban_duration:"none"});if(x.error)return reply("Gagal mengaktifkan autentikasi: "+x.error.message,500);}
   const {error:holdError}=await admin.rpc("sc_platform_set_account_disabled",{p_user:id,p_disabled:disabled,p_actor:user.id});
   if(holdError)return reply(holdError.message,500);
   if(disabled){const x=await admin.auth.admin.updateUserById(id,{ban_duration:"876000h"});if(x.error)return reply("Akses database sudah diblokir, tetapi pemblokiran login gagal: "+x.error.message,500);}
   return NextResponse.json({ok:true,disabled},{headers:h});
  }
  if(body.action==="school_status"){
   const id=String(body.school_id||""),paused=body.paused;
   if(!uuid.test(id)||typeof paused!=="boolean")return reply("Sekolah atau status tidak valid.");
   const {error}=await admin.rpc("sc_platform_set_school_paused",{p_school:id,p_paused:paused,p_actor:user.id});
   if(error)return reply(error.message,500);
   return NextResponse.json({ok:true,paused},{headers:h});
  }
  if(body.action==="renew"){
   const id=String(body.school_id||""),reference=String(body.confirmation_ref||"").trim(),note=String(body.note||"").trim();
   if(!uuid.test(id)||reference.length<8||reference.length>100||note.length>500)return reply("Konfirmasi tidak valid.");
   const {data:expires_at,error}=await admin.rpc("sc_platform_confirm_renewal",{p_school:id,p_actor:user.id,p_ref:reference,p_note:note});
   if(error)return reply(error.message,500);
   return NextResponse.json({ok:true,expires_at},{headers:h});
  }
  return reply("Aksi tidak dikenal.",400);
 }catch{
  return reply("Permintaan pengelolaan pelanggan gagal diproses.",500);
 }
}
