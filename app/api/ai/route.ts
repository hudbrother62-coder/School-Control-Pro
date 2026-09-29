import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
export async function POST(req:NextRequest){
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!token||!url||!key)return NextResponse.json({error:"Autentikasi diperlukan."},{status:401,headers});
  const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await db.auth.getUser(token);
  if(userError||!user)return NextResponse.json({error:"Sesi tidak sah."},{status:401,headers});
  const payload=await req.json();
  const schoolId=typeof payload.school_id==="string"?payload.school_id:"";
  const module=payload.module;
  const prompt=typeof payload.prompt==="string"?payload.prompt.trim():"";
  if(!["guru_ai","kepsek_ai"].includes(module)||prompt.length<10||prompt.length>6000)return NextResponse.json({error:"Instruksi tidak valid (10–6000 karakter)."}, {status:400,headers});
  const {data:membership}=await db.from("sc_members").select("role").eq("school_id",schoolId).eq("user_id",user.id).maybeSingle();
  if(!membership)return NextResponse.json({error:"Tidak memiliki akses sekolah."},{status:403,headers});
  if(module==="kepsek_ai"&&!["owner","principal","vice_principal"].includes(membership.role))return NextResponse.json({error:"Menu khusus manajemen sekolah."},{status:403,headers});
  const {data:school}=await db.from("sc_schools").select("name").eq("id",schoolId).maybeSingle();
  const {error:budgetError}=await db.rpc("sc_consume_ai_budget",{p_school:schoolId,p_module:module});
  if(budgetError)return NextResponse.json({error:budgetError.message}, {status:429,headers});
  const apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey)return NextResponse.json({error:"Kunci AI server belum dikonfigurasi. Hubungi pengelola platform."},{status:503,headers});
  const model=process.env.GEMINI_MODEL||"gemini-2.5-flash";
  const instruction="Anda adalah asisten administrasi pendidikan Indonesia dalam School Control. Bantu menyusun DRAF yang dapat ditinjau pengguna. Jangan mengarang data kehadiran, data siswa, sumber resmi, regulasi atau dokumen sekolah. Jika data belum diberikan, minta pengguna melengkapi. Jangan meminta atau memproses rahasia konseling BK. Jangan mengklaim sinkronisasi dengan ARKAS, e-Kinerja, atau sistem pemerintah. Gunakan Bahasa Indonesia rapi.";
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body:JSON.stringify({system_instruction:{parts:[{text:instruction}]},contents:[{role:"user",parts:[{text:"Sekolah: "+(school?.name||"Tidak tersedia")+". Modul: "+module+". Permintaan: "+prompt}]}],generationConfig:{temperature:0.4,maxOutputTokens:2048}}),signal:AbortSignal.timeout(28000),cache:"no-store"});
  if(!response.ok){return NextResponse.json({error:response.status===429?"Kuota penyedia AI sedang terbatas. Coba lagi nanti.":"Layanan AI sedang tidak tersedia."},{status:503,headers});}
  const result=await response.json();
  const text=(result?.candidates?.[0]?.content?.parts||[]).map((x:{text?:string})=>x.text||"").join("\n").trim();
  if(!text)return NextResponse.json({error:"Belum ada jawaban AI yang dapat digunakan."},{status:502,headers});
  return NextResponse.json({text},{headers});
 }catch{return NextResponse.json({error:"Permintaan AI tidak dapat diproses."},{status:500,headers});}
}
