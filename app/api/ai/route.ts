import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {teacherSystemStandard} from "@/lib/teacher-ai-config";

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
  if(!["guru_ai","kepsek_ai"].includes(module)||prompt.length<10||prompt.length>18000)return NextResponse.json({error:"Instruksi tidak valid (10–18000 karakter)."},{status:400,headers});
  const {data:membership}=await db.from("sc_members").select("role").eq("school_id",schoolId).eq("user_id",user.id).maybeSingle();
  if(!membership)return NextResponse.json({error:"Tidak memiliki akses sekolah."},{status:403,headers});
  if(module==="kepsek_ai"&&!["owner","principal","vice_principal"].includes(membership.role))return NextResponse.json({error:"Menu khusus manajemen sekolah."},{status:403,headers});
  if(module==="guru_ai"&&!["owner","principal","vice_principal","teacher"].includes(membership.role))return NextResponse.json({error:"Akses generator guru ditolak."},{status:403,headers});
  const {data:school}=await db.from("sc_schools").select("name,academic_year,npsn").eq("id",schoolId).maybeSingle();
  const {data:facts}=await db.from("sc_school_facts").select("key,value").eq("school_id",schoolId).limit(20);
  const memory=(facts||[]).map(x=>x.key+": "+x.value).join("\n").slice(0,6000);
  const apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey)return NextResponse.json({error:"Kunci AI server belum dikonfigurasi. Hubungi pengelola platform."},{status:503,headers});
  const {error:budgetError}=await db.rpc("sc_consume_ai_budget",{p_school:schoolId,p_module:module});
  if(budgetError)return NextResponse.json({error:budgetError.message},{status:429,headers});
  const models=[process.env.GEMINI_MODEL||"gemini-2.5-flash",process.env.GEMINI_FALLBACK_MODEL||"gemini-2.5-flash-lite"].filter((x,i,a)=>a.indexOf(x)===i);
  const baseInstruction="Anda adalah asisten administrasi pendidikan Indonesia dalam School Control. Bantu menyusun DRAF yang dapat ditinjau pengguna. Jangan mengarang data kehadiran, data siswa, sumber resmi, regulasi atau dokumen sekolah. Jika data belum diberikan, tandai data yang perlu dilengkapi atau diverifikasi. Jangan meminta atau memproses rahasia konseling BK. Jangan mengklaim sinkronisasi dengan ARKAS, e-Kinerja, atau sistem pemerintah. Gunakan Bahasa Indonesia rapi.";
  const instruction=module==="guru_ai"?baseInstruction+"\n\n"+teacherSystemStandard:baseInstruction;
  const body=JSON.stringify({system_instruction:{parts:[{text:instruction}]},contents:[{role:"user",parts:[{text:"Sekolah: "+(school?.name||"Tidak tersedia")+". Tahun ajaran: "+(school?.academic_year||"Tidak diketahui")+". NPSN: "+(school?.npsn||"Belum diisi")+". Memori sekolah umum terverifikasi:\n"+memory+"\nModul: "+module+". Permintaan: "+prompt}]}],generationConfig:{temperature:0.35,maxOutputTokens:8192}});
  for(const model of models){
   try{
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body,signal:AbortSignal.timeout(28000),cache:"no-store"});
    if(!response.ok){if([429,500,502,503,504].includes(response.status))continue;return NextResponse.json({error:"Layanan AI sedang tidak tersedia."},{status:503,headers})}
    const result=await response.json();
    const text=(result?.candidates?.[0]?.content?.parts||[]).map((x:{text?:string})=>x.text||"").join("\n").trim();
    if(text)return NextResponse.json({text,model},{headers});
   }catch{/* coba fallback */}
  }
  return NextResponse.json({error:"Kuota atau kapasitas AI sedang terbatas. Coba lagi nanti."},{status:503,headers});
 }catch{return NextResponse.json({error:"Permintaan AI tidak dapat diproses."},{status:500,headers});}
}
