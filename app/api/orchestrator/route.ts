import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {modules,canAccess,visibleFeatures,type ModuleKey,type Role} from "@/lib/modules";
import {resolveWorkspaceRoute} from "@/lib/workspace-navigation";
import {planWorkflow} from "@/lib/orchestrator";

export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
type RawStep={module?:string;feature?:string;title?:string;instruction?:string};

function cleanJson(text:string){
 const start=text.indexOf("{"),end=text.lastIndexOf("}");
 if(start<0||end<=start)throw Error("Format AI tidak valid");
 return JSON.parse(text.slice(start,end+1));
}
function validated(raw:any,role:Role,request:string){
 const steps:Array<{module:ModuleKey;feature:string;title:string;instruction:string;permitted:boolean;matched:string[]}>= [];
 for(const item of (Array.isArray(raw?.steps)?raw.steps:[]) as RawStep[]){
  const mod=modules.find(m=>m.key===item.module);
  if(!mod)continue;
  const target=resolveWorkspaceRoute(mod.key,String(item.feature||""),role);if(!target)continue;const feature=target.feature;
  steps.push({module:target.module,feature,title:String(item.title||mod.label).slice(0,120),instruction:String(item.instruction||"Buka fitur dan verifikasi data sebelum menyimpan.").slice(0,500),permitted:true,matched:[]});
  if(steps.length>=8)break;
 }
 if(!steps.length)return planWorkflow(request,role);
 return {title:String(raw?.title||"Workflow SekolaPro").slice(0,120),reason:String(raw?.reason||"Urutan dibuat dari keterkaitan data dan pekerjaan antar modul.").slice(0,500),steps};
}

export async function POST(req:NextRequest){
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!token||!url||!key)return NextResponse.json({error:"Autentikasi diperlukan."},{status:401,headers});
  const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}}=await db.auth.getUser(token);if(!user)return NextResponse.json({error:"Sesi tidak sah."},{status:401,headers});
  const body=await req.json(),schoolId=String(body.school_id||""),request=String(body.request||"").trim();
  if(request.length<3||request.length>4000)return NextResponse.json({error:"Permintaan harus 3–4000 karakter."},{status:400,headers});
  const {data:member}=await db.from("sc_members").select("role").eq("school_id",schoolId).eq("user_id",user.id).maybeSingle();
  if(!member)return NextResponse.json({error:"Tidak memiliki akses sekolah."},{status:403,headers});
  const role=member.role as Role,fallback=planWorkflow(request,role),apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey)return NextResponse.json({plan:fallback,source:"deterministic"},{headers});
  const catalog=modules.filter(m=>canAccess(m,role)).map(m=>({module:m.key,label:m.label,features:visibleFeatures(m,role)}));
  const prompt="Anda adalah workflow planner untuk aplikasi SekolaPro sekolah Indonesia.\\n"+
   "Tugas: pecah permintaan pengguna menjadi urutan kerja lintas modul yang benar, tanpa mengeksekusi perubahan data.\\n"+
   "Gunakan HANYA module dan feature dari katalog berikut:\\n"+JSON.stringify(catalog)+"\\n"+
   "Prinsip: mulai dari sumber data/verifikasi sebelum tindakan turunan; hindari input ulang; maksimal 8 langkah; jangan membuka detail BK rahasia untuk role yang tidak berhak; jangan mengarang data; setiap step harus konkret.\\n"+
   "Kembalikan JSON murni: {\\\"title\\\":\\\"...\\\",\\\"reason\\\":\\\"...\\\",\\\"steps\\\":[{\\\"module\\\":\\\"...\\\",\\\"feature\\\":\\\"...\\\",\\\"title\\\":\\\"...\\\",\\\"instruction\\\":\\\"...\\\"}]}\\n"+
   "Permintaan pengguna: "+request;
  const model=process.env.GEMINI_MODEL||"gemini-2.5-flash";
  try{
   const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.1,maxOutputTokens:2200,responseMimeType:"application/json"}}),signal:AbortSignal.timeout(16000),cache:"no-store"});
   if(!response.ok)return NextResponse.json({plan:fallback,source:"deterministic"},{headers});
   const result=await response.json(),text=(result?.candidates?.[0]?.content?.parts||[]).map((x:{text?:string})=>x.text||"").join("").trim();
   const plan=validated(cleanJson(text),role,request);
   return NextResponse.json({plan,source:"ai"},{headers});
  }catch{return NextResponse.json({plan:fallback,source:"deterministic"},{headers})}
 }catch{return NextResponse.json({error:"Orchestrator tidak dapat memproses permintaan."},{status:500,headers})}
}
