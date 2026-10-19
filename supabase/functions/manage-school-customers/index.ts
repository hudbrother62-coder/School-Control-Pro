import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","Content-Type":"application/json"};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const reject=(error:string,status=400)=>respond({error},status);
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reject("Metode tidak diizinkan",405);
 try{
  const jwt=req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!jwt)return reject("Masuk sebagai Super Admin terlebih dahulu",401);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return reject("Kunci sistem autentikasi belum tersedia",503);
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(jwt);
  if(authError||!user)return reject("Sesi tidak sah",401);
  const {data:platformAdmin,error:adminError}=await admin.from("sc_platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(adminError||!platformAdmin)return reject("Akses Super Admin diperlukan",403);
  const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||typeof body.action!=="string")return reject("Aksi tidak valid");
  if(body.action==="create"){
   const email=String(body.email||"").trim().toLowerCase();
   const password=String(body.password||"");
   const name=String(body.name||"").trim().slice(0,120);
   const schoolName=String(body.school_name||"").trim();
   const schoolId=String(body.school_id||"").trim();
   const role=schoolId?String(body.role||"staff"):"owner";
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8||password.length>128)return reject("Email atau kata sandi (8–128 karakter) tidak valid");
   if(schoolId?!uuid.test(schoolId):schoolName.length<3||schoolName.length>120)return reject("Pilih sekolah atau masukkan nama sekolah yang valid");
   if(schoolId&&!["principal","vice_principal","teacher","counselor","hr","treasurer","staff","viewer"].includes(role))return reject("Peran tidak valid");
   const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name},app_metadata:{provisioned_by_platform:true}});
   if(createError||!created.user)return reject(createError?.message||"Gagal membuat akun",409);
   const {data:assigned,error:assignError}=await admin.rpc("sc_platform_provision_account",{p_user:created.user.id,p_school_name:schoolName,p_school:schoolId||null,p_role:role});
   if(assignError){await admin.auth.admin.deleteUser(created.user.id);return reject("Gagal menghubungkan sekolah: "+assignError.message,500);}
   return respond({ok:true,user_id:created.user.id,school_id:assigned,email,role});
  }
  if(body.action==="delete_account"){
   const id=String(body.user_id||"").trim();
   const typedEmail=String(body.confirm_email||"").trim().toLowerCase();
   const typedPhrase=String(body.confirm_phrase||"").trim();
   if(!uuid.test(id)||typedPhrase!=="HAPUS"||!typedEmail||typedEmail.length>320)return reject("Verifikasi penghapusan belum sesuai");
   if(id===user.id)return reject("Tidak dapat menghapus akun Super Admin sendiri",403);
   const {data:protectedAdmin,error:protectedError}=await admin.from("sc_platform_admins").select("user_id").eq("user_id",id).maybeSingle();
   if(protectedError)return reject("Gagal memeriksa perlindungan akun",500);
   if(protectedAdmin)return reject("Akun Super Admin tidak dapat dihapus",403);
   const {data:target,error:targetError}=await admin.auth.admin.getUserById(id);
   if(targetError||!target.user||target.user.deleted_at)return reject("Akun tidak ditemukan atau sudah dihapus",404);
   if((target.user.email||"").toLowerCase()!==typedEmail)return reject("Email verifikasi tidak cocok dengan akun",400);
   const {data:memberships,error:memberError}=await admin.from("sc_members").select("school_id,role").eq("user_id",id);
   if(memberError)return reject("Gagal memeriksa keanggotaan sekolah",500);
   for(const membership of memberships||[]){
    if(membership.role!=="owner")continue;
    const {count,error:countError}=await admin.from("sc_members").select("user_id",{count:"exact",head:true}).eq("school_id",membership.school_id).eq("role","owner").eq("is_active",true).neq("user_id",id);
    if(countError)return reject("Gagal memeriksa kepemilikan sekolah",500);
    if(!count)return reject("Pemilik terakhir sekolah tidak boleh dihapus. Pindahkan kepemilikan sekolah terlebih dahulu.",409);
   }
   // Soft deletion revokes user authentication without cascading school data.
   const {error:deleteError}=await admin.auth.admin.deleteUser(id,true);
   if(deleteError)return reject("Penghapusan akun gagal: "+deleteError.message,500);
   return respond({ok:true,deleted_user_id:id});
  }
  if(body.action==="account_status"){
   const id=String(body.user_id||""),disabled=body.disabled;
   if(!uuid.test(id)||typeof disabled!=="boolean")return reject("Akun atau status tidak valid");
   if(!disabled){const {error}=await admin.auth.admin.updateUserById(id,{ban_duration:"none"});if(error)return reject("Gagal mengaktifkan login: "+error.message,500);}
   const {error:holdError}=await admin.rpc("sc_platform_set_account_disabled",{p_user:id,p_disabled:disabled,p_actor:user.id});
   if(holdError)return reject(holdError.message,500);
   if(disabled){const {error}=await admin.auth.admin.updateUserById(id,{ban_duration:"876000h"});if(error)return reject("Akses database diblokir, tetapi pemblokiran login gagal: "+error.message,500);}
   return respond({ok:true,disabled});
  }
  if(body.action==="school_status"){
   const id=String(body.school_id||""),paused=body.paused;
   if(!uuid.test(id)||typeof paused!=="boolean")return reject("Sekolah atau status tidak valid");
   const {error}=await admin.rpc("sc_platform_set_school_paused",{p_school:id,p_paused:paused,p_actor:user.id});
   if(error)return reject(error.message,500);
   return respond({ok:true,paused});
  }
  if(body.action==="lifetime"){
   const id=String(body.school_id||""),reference=String(body.confirmation_ref||"").trim(),note=String(body.note||"").trim();
   if(!uuid.test(id)||!/^[A-Za-z0-9-]{8,85}$/.test(reference)||note.length>500)return reject("Konfirmasi paket selamanya tidak valid");
   const {data:expires_at,error}=await admin.rpc("sc_platform_confirm_lifetime",{p_school:id,p_actor:user.id,p_ref:reference,p_note:note});
   if(error)return reject(error.message,500);
   return respond({ok:true,plan:"lifetime",expires_at});
  }
  if(body.action==="renew"){
   const id=String(body.school_id||""),reference=String(body.confirmation_ref||"").trim(),note=String(body.note||"").trim();
   if(!uuid.test(id)||reference.length<8||reference.length>100||note.length>500)return reject("Konfirmasi tidak valid");
   const coupon=String(body.coupon_code||"").trim().toUpperCase();
   if(coupon&&!/^[A-Z0-9-]{4,24}$/.test(coupon))return reject("Kode kupon tidak valid.");
   const rpc=coupon?"sc_platform_confirm_coupon_renewal":"sc_platform_confirm_renewal";
   const args=coupon?{p_school:id,p_actor:user.id,p_ref:reference,p_coupon:coupon,p_note:note}:{p_school:id,p_actor:user.id,p_ref:reference,p_note:note};
   const {data:expires_at,error}=await admin.rpc(rpc,args);
   if(error)return reject(error.message,500);
   return respond({ok:true,expires_at});
  }
  if(body.action==="coupons_list"){
   const {data,error}=await admin.from("sc_promo_coupons").select("code,discount_percent,is_active,expires_at,max_redemptions,redeemed_count").order("code");
   if(error)return reject("Daftar kupon belum tersedia.",503);
   return respond({ok:true,coupons:data||[]});
  }
  if(body.action==="coupon_set"){
   const code=String(body.code||"").trim().toUpperCase();
   const discount=Number(body.discount_percent),active=body.active;
   const limit=body.max_redemptions==null||body.max_redemptions===""?null:Number(body.max_redemptions);
   const expires=body.expires_at?String(body.expires_at):null;
   if(!/^[A-Z0-9-]{4,24}$/.test(code)||!Number.isInteger(discount)||discount<1||discount>99
      ||typeof active!=="boolean"||(limit!==null&&(!Number.isInteger(limit)||limit<1))
      ||(expires!==null&&!Number.isFinite(Date.parse(expires))))
    return reject("Pengaturan kupon tidak valid.");
   const {error}=await admin.rpc("sc_platform_set_coupon",{p_actor:user.id,p_code:code,p_discount:discount,p_active:active,p_expires:expires,p_limit:limit});
   if(error)return reject(error.message,409);
   return respond({ok:true,code});
  }
  return reject("Aksi tidak dikenal");
 }catch{ return reject("Permintaan tidak berhasil diproses",500); }
});
