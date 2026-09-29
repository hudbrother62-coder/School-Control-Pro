import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {randomUUID} from "node:crypto";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,midtransKey=process.env.MIDTRANS_SERVER_KEY;
  const price=Number(process.env.SCHOOL_CONTROL_MONTHLY_PRICE_IDR);
  if(!url||!key||!serviceKey||!midtransKey||!Number.isInteger(price)||price<=0)return NextResponse.json({error:"Checkout belum dikonfigurasi."},{status:503});
  if(!token)return NextResponse.json({error:"Login diperlukan."},{status:401});
  const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}}=await db.auth.getUser(token);
  if(!user)return NextResponse.json({error:"Sesi tidak sah."},{status:401});
  const body=await req.json();const schoolId=typeof body.school_id==="string"?body.school_id:"";
  const {data:membership}=await db.from("sc_members").select("role").eq("user_id",user.id).eq("school_id",schoolId).maybeSingle();
  if(!membership||membership.role!=="owner")return NextResponse.json({error:"Hanya akun utama sekolah dapat berlangganan."},{status:403});
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const orderId="SC-"+randomUUID();
  const {error:insertError}=await admin.from("sc_payment_orders").insert({order_id:orderId,school_id:schoolId,gross_amount:price,period_days:30});
  if(insertError)return NextResponse.json({error:"Gagal menyiapkan pesanan."},{status:500});
  const api=process.env.MIDTRANS_IS_PRODUCTION==="true"?"https://app.midtrans.com/snap/v1/transactions":"https://app.sandbox.midtrans.com/snap/v1/transactions";
  const response=await fetch(api,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Basic "+Buffer.from(midtransKey+":").toString("base64")},body:JSON.stringify({transaction_details:{order_id:orderId,gross_amount:price},customer_details:{email:user.email},item_details:[{id:"school-control-monthly",price,quantity:1,name:"School Control - langganan 30 hari"}]})});
  if(!response.ok){await admin.from("sc_payment_orders").update({status:"failed"}).eq("order_id",orderId);return NextResponse.json({error:"Gateway pembayaran belum tersedia."},{status:502});}
  const snap=await response.json();
  if(!snap.redirect_url)return NextResponse.json({error:"Tautan pembayaran belum tersedia."},{status:502});
  return NextResponse.json({redirect_url:snap.redirect_url,order_id:orderId},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Checkout gagal diproses."},{status:500});}
}
