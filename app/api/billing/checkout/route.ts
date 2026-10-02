import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {randomUUID} from "node:crypto";
import {plans} from "@/lib/pricing";
export const runtime="nodejs";
const h={"Cache-Control":"no-store"};
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!token)return NextResponse.json({error:"Login diperlukan."},{status:401,headers:h});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,midtransKey=process.env.MIDTRANS_SERVER_KEY;
  if(!url||!key||!serviceKey||!midtransKey)return NextResponse.json({error:"Gateway pembayaran belum dikonfigurasi oleh pengelola platform."},{status:503,headers:h});
  const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}}=await db.auth.getUser(token);
  if(!user)return NextResponse.json({error:"Sesi tidak sah."},{status:401,headers:h});
  const body=await req.json();
  const schoolId=typeof body.school_id==="string"?body.school_id:"";
  const planId=body.plan==="yearly"?"yearly":body.plan==="monthly"?"monthly":null;
  if(!planId||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(schoolId))return NextResponse.json({error:"Sekolah atau paket tidak valid."},{status:400,headers:h});
  const {data:membership}=await db.from("sc_members").select("role").eq("user_id",user.id).eq("school_id",schoolId).maybeSingle();
  if(!membership||membership.role!=="owner")return NextResponse.json({error:"Hanya akun utama sekolah dapat melakukan pembayaran."},{status:403,headers:h});
  const plan=plans[planId];
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const cutoff=new Date(Date.now()-60*60*1000).toISOString();
  const {count}=await admin.from("sc_payment_orders").select("order_id",{count:"exact",head:true}).eq("school_id",schoolId).gte("created_at",cutoff);
  if((count||0)>=6)return NextResponse.json({error:"Terlalu banyak percobaan checkout. Coba kembali nanti."},{status:429,headers:h});
  const orderId="SC-"+randomUUID();
  const {error:insertError}=await admin.from("sc_payment_orders").insert({order_id:orderId,school_id:schoolId,gross_amount:plan.price,period_days:plan.days});
  if(insertError)return NextResponse.json({error:"Gagal menyiapkan pesanan."},{status:500,headers:h});
  const gateway=process.env.MIDTRANS_IS_PRODUCTION==="true"?"https://app.midtrans.com/snap/v1/transactions":"https://app.sandbox.midtrans.com/snap/v1/transactions";
  const base=(process.env.SCHOOL_CONTROL_BASE_URL||req.nextUrl.origin).replace(/\/$/,"");
  const payload={
   transaction_details:{order_id:orderId,gross_amount:plan.price},
   customer_details:{email:user.email},
   item_details:[{id:"school-control-"+planId,price:plan.price,quantity:1,name:"School Control - "+plan.label}],
   ...(base?{callbacks:{finish:base+"/app?billing=return"}}:{})
  };
  const response=await fetch(gateway,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Basic "+Buffer.from(midtransKey+":").toString("base64")},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
  if(!response.ok){await admin.from("sc_payment_orders").update({status:"failed"}).eq("order_id",orderId);return NextResponse.json({error:"Gateway pembayaran belum tersedia. Silakan coba kembali."},{status:502,headers:h});}
  const result=await response.json();
  if(!result?.redirect_url)return NextResponse.json({error:"Tautan pembayaran belum tersedia."},{status:502,headers:h});
  return NextResponse.json({redirect_url:result.redirect_url,order_id:orderId},{headers:h});
 }catch{return NextResponse.json({error:"Checkout gagal diproses."},{status:500,headers:h});}
}
