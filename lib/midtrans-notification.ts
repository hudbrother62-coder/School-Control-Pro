import {createHash,timingSafeEqual} from 'node:crypto';
export class NotificationError extends Error{constructor(message:string,public statusCode:number){super(message);}}
export function verifyNotification(event:unknown,serverKey:string){
 if(!event||typeof event!=='object')throw new NotificationError('Bad payload',400);
 const {order_id,status_code,gross_amount,signature_key,transaction_status,fraud_status,transaction_id}=event as Record<string,unknown>;
 if(![order_id,status_code,gross_amount,signature_key,transaction_status].every(x=>typeof x==='string'))throw new NotificationError('Bad payload',400);
 const expected=createHash('sha512').update(String(order_id)+String(status_code)+String(gross_amount)+serverKey).digest('hex');
 const provided=String(signature_key).toLowerCase();
 if(! /^[0-9a-f]{128}$/.test(provided)||provided.length!==expected.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))throw new NotificationError('Invalid signature',401);
 const amount=Number(gross_amount);if(!Number.isSafeInteger(amount)||amount<=0)throw new NotificationError('Invalid amount',400);
 let status:'pending'|'paid'|'failed'|'expired'|null=null;
 if(transaction_status==='settlement'||(transaction_status==='capture'&&fraud_status==='accept'))status='paid';
 else if(transaction_status==='pending'||transaction_status==='authorize')status='pending';
 else if(transaction_status==='expire')status='expired';
 else if(['cancel','deny','failure'].includes(String(transaction_status)))status='failed';
 return {orderId:String(order_id),amount,transactionId:typeof transaction_id==='string'?transaction_id:'',status};
}
