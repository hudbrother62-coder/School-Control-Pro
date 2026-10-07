import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const noStore={"Cache-Control":"no-store"};
const result=(code:number,data:Record<string,unknown>)=>NextResponse.json(data,{status:code,headers:noStore});
const allowed=["principal","vice_principal","teacher","counselor","hr","treasurer","finance_staff","supervisor","staff","viewer"];
const position:Record<string,string>={principal:"Kepala Sekolah",vice_principal:"Wakil Kepala Sekolah",teacher:"Guru",counselor:"Guru BK",hr:"SDM / HR",treasurer:"Bendahara",finance_staff:"Staf Keuangan",supervisor:"Supervisor",staff:"Staf"};
export async function POST(req:NextRequest){
 const token=req.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!token)return result(401,{error:"Masuk terlebih dahulu."});
 if(!url||!publicKey||!serviceKey)return result(503,{error:"Layanan pembuatan akun belum dikonfigurasi. Hubungi Super Admin untuk mengaktifkan SUPABASE_SERVICE_ROLE_KEY di Vercel."});
 const client=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await client.auth.getUser(token);
 if(authError||!user)return result(401,{error:"Sesi tidak valid."});
 let input:Record<string,unknown>;
 try{input=await req.json()}catch{return result(400,{error:"Permintaan tidak valid."})}
 const school=String(input.school_id||""),role=String(input.role||""),name=String(input.name||"").trim(),email=String(input.email||"").trim().toLowerCase(),password=String(input.password||"");
 const staffId=String(input.staff_id||"");
 if(!/^[a-f0-9-]{36}$/i.test(school)||!allowed.includes(role)||name.length<2||name.length>120||!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)||email.length>254||password.length<8||password.length>128||!!staffId&&!/^[a-f0-9-]{36}$/i.test(staffId))
  return result(400,{error:"Nama, email, password, profil staf atau peran tidak valid."});
 const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:actor}=await service.from("sc_members").select("role,is_active").eq("school_id",school).eq("user_id",user.id).maybeSingle();
 if(!actor?.is_active||!["owner","principal"].includes(actor.role)||(actor.role==="principal"&&role==="principal"))return result(403,{error:"Hak membuat akun tidak tersedia untuk peran ini."});
 const {data:sub}=await service.from("sc_subscriptions").select("status,trial_ends_at,current_period_end").eq("school_id",school).maybeSingle();
 const paid=sub?.status==="active"&&sub.current_period_end&&Date.parse(sub.current_period_end)>Date.now();
 const trial=sub?.status==="trial"&&sub.trial_ends_at&&Date.parse(sub.trial_ends_at)>Date.now();
 if(!paid&&!trial)return result(403,{error:"Langganan sekolah sudah tidak aktif."});
 if(staffId){
  const {data:record}=await service.from("sc_staff").select("id,user_id").eq("school_id",school).eq("id",staffId).maybeSingle();
  if(!record||record.user_id)return result(409,{error:"Profil guru/staf sudah terhubung atau tidak tersedia."});
 }
 const {data:created,error:createError}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:name}});
 if(createError||!created.user)return result(409,{error:"Email tidak dapat didaftarkan. Pastikan email belum dipakai akun lain."});
 const accountId=created.user.id;
 let linkedExisting=false;
 try{
  const {error:joinError}=await service.from("sc_members").insert({school_id:school,user_id:accountId,role,is_active:true});
  if(joinError)throw joinError;
  if(role!=="viewer"){
   const staffType=["principal","vice_principal","teacher","counselor"].includes(role)?"teacher":"education_staff";
   if(staffId){
    const {data:updated,error:linkError}=await service.from("sc_staff").update({user_id:accountId,email,staff_type:staffType}).eq("school_id",school).eq("id",staffId).is("user_id",null).select("id").maybeSingle();
    if(linkError||!updated)throw linkError||Error("Gagal menghubungkan staf.");
    linkedExisting=true;
   }else{
    const {error:staffError}=await service.from("sc_staff").insert({school_id:school,user_id:accountId,name,email,staff_type:staffType,position:position[role]||"Staf"});
    if(staffError)throw staffError;
   }
  }
  await service.from("sc_audit_log").insert({school_id:school,actor_id:user.id,action:"team.account.created",target_id:accountId,metadata:{role,email}});
  return result(201,{ok:true,email,role,attendance_eligible:role!=="viewer"});
 }catch{
  if(linkedExisting)await service.from("sc_staff").update({user_id:null}).eq("school_id",school).eq("user_id",accountId);
  await service.from("sc_staff").delete().eq("school_id",school).eq("user_id",accountId);
  await service.from("sc_members").delete().eq("school_id",school).eq("user_id",accountId);
  await service.auth.admin.deleteUser(accountId);
  return result(500,{error:"Akun tidak berhasil dibuat. Perubahan dibatalkan."});
 }
}
