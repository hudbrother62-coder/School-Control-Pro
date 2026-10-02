import {NextRequest,NextResponse} from "next/server";
import {verifyNotification,NotificationError} from "@/lib/midtrans-notification";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const serverKey=process.env.MIDTRANS_SERVER_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!serverKey||!url||!serviceKey)return NextResponse.json({error:"Server not configured"},{status:503});
  const event=await req.json();
  const verified=verifyNotification(event,serverKey);
  if(!verified.status)return NextResponse.json({ok:true,ignored:event.transaction_status});
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await admin.rpc("sc_reconcile_payment",{p_order_id:verified.orderId,p_amount:verified.amount,p_gateway_tx:verified.transactionId,p_status:verified.status});
  if(error)return NextResponse.json({error:"Payment reconciliation failed"},{status:400});
  return NextResponse.json({ok:true,status:verified.status});
 }catch(e){if(e instanceof NotificationError)return NextResponse.json({error:e.message},{status:e.statusCode});return NextResponse.json({error:"Notification rejected"},{status:400});}
}
