import {NextRequest,NextResponse} from "next/server";
import {createClient,type SupabaseClient,type User} from "@supabase/supabase-js";
import {MAX_GEMINI_KEYS,encryptStoredAiKey,envGeminiKey,validGeminiKey} from "@/lib/ai-key-pool";

export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
type Context={db:SupabaseClient;user:User};

async function adminContext(req:NextRequest):Promise<Context|NextResponse>{
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!token||!url||!key)return NextResponse.json({error:"Autentikasi diperlukan."},{status:401,headers});
 const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await db.auth.getUser(token);
 if(userError||!user)return NextResponse.json({error:"Sesi tidak sah."},{status:401,headers});
 const {data:isAdmin,error:adminError}=await db.rpc("sc_is_platform_admin");
 if(adminError||isAdmin!==true)return NextResponse.json({error:"Akses Super Admin diperlukan."},{status:403,headers});
 return {db,user};
}
const slotValue=(value:unknown)=>{const slot=Number(value);return Number.isInteger(slot)&&slot>=1&&slot<=MAX_GEMINI_KEYS?slot:0};

export async function GET(req:NextRequest){
 const ctx=await adminContext(req);if(ctx instanceof NextResponse)return ctx;
 const {data,error}=await ctx.db.from("sc_platform_ai_keys").select("slot,last_four,is_active,updated_at").eq("provider","gemini").order("slot");
 if(error)return NextResponse.json({error:error.message},{status:500,headers});
 const rows=new Map((data||[]).map(row=>[Number(row.slot),row]));
 const slots=Array.from({length:MAX_GEMINI_KEYS},(_,i)=>{
  const slot=i+1,row=rows.get(slot),env=!!envGeminiKey(slot),admin=!!row?.is_active;
  return {slot,configured:env||admin,source:env?"vercel":admin?"admin":"empty",admin_configured:admin,vercel_configured:env,masked:env?"Tersimpan di Vercel":admin?"••••"+String(row?.last_four||""):"",updated_at:row?.updated_at||null};
 });
 return NextResponse.json({slots,configured:slots.filter(x=>x.configured).length,max:MAX_GEMINI_KEYS},{headers});
}

export async function POST(req:NextRequest){
 const ctx=await adminContext(req);if(ctx instanceof NextResponse)return ctx;
 if(!process.env.AI_KEY_ENCRYPTION_SECRET)return NextResponse.json({error:"Kunci enkripsi platform belum dikonfigurasi di Vercel."},{status:503,headers});
 const body=await req.json(),slot=slotValue(body.slot),key=String(body.key||"").trim();
 if(!slot||!validGeminiKey(key))return NextResponse.json({error:"Slot atau format API key tidak valid."},{status:400,headers});
 const {error}=await ctx.db.from("sc_platform_ai_keys").upsert({slot,provider:"gemini",secret_encrypted:encryptStoredAiKey(key),last_four:key.slice(-4),is_active:true,updated_by:ctx.user.id,updated_at:new Date().toISOString()},{onConflict:"slot"});
 if(error)return NextResponse.json({error:error.message},{status:500,headers});
 return NextResponse.json({ok:true,slot,masked:"••••"+key.slice(-4)},{headers});
}

export async function DELETE(req:NextRequest){
 const ctx=await adminContext(req);if(ctx instanceof NextResponse)return ctx;
 const body=await req.json(),slot=slotValue(body.slot);
 if(!slot)return NextResponse.json({error:"Slot tidak valid."},{status:400,headers});
 const {error}=await ctx.db.from("sc_platform_ai_keys").delete().eq("provider","gemini").eq("slot",slot);
 if(error)return NextResponse.json({error:error.message},{status:500,headers});
 return NextResponse.json({ok:true,slot},{headers});
}
