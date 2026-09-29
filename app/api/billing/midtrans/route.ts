import {NextRequest,NextResponse} from "next/server";
import {createHash,timingSafeEqual} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const serverKey=process.env.MIDTRANS_SERVER_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!serverKey||!url||!serviceKey)return NextResponse.json({error:"Server not configured"},{status:503});
  const event=await req.json();
  const {order_id,status_code,gross_amount,signature_key,transaction_status,fraud_status,transaction_id}=event;
  if(![order_id,status_code,gross_amount,signature_key,transaction_status].every(x=>typeof x==="string"))return NextResponse.json({error:"Bad payload"},{status:400});
  const expected=createHash("sha512").update(order_id+status_code+gross_amount+serverKey).digest("hex");
  const provided=String(signature_key).toLowerCase();
  if(provided.length!==expected.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return NextResponse.json({error:"Invalid signature"},{status:401});
  const settled=transaction_status==="settlement"||(transaction_status==="capture"&&fraud_status==="accept");
  if(!settled)return NextResponse.json({ok:true,ignored:transaction_status});
  const amount=Number(gross_amount);
  if(!Number.isSafeInteger(amount)||amount<=0)return NextResponse.json({error:"Invalid amount"},{status:400});
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await admin.rpc("sc_confirm_payment",{p_order_id:order_id,p_amount:amount,p_gateway_tx:typeof transaction_id==="string"?transaction_id:""});
  if(error)return NextResponse.json({error:"Payment reconciliation failed"},{status:400});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Notification rejected"},{status:400});}
}
