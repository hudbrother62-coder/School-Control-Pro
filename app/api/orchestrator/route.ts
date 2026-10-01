import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {modules,canAccess,type ModuleKey,type Role} from "@/lib/modules";
import {planWorkflow} from "@/lib/orchestrator";

export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};

type RawStep={
 module?:string;feature?:string;title?:string;instruction?:string;
 required_data?:unknown;depends_on?:unknown;handoff?:unknown;
};

function cleanJson(text:string){
 const start=text.indexOf("{"),end=text.lastIndexOf("}");
 if(start<0||end<=start)throw Error("Format AI tidak valid");
 return JSON.parse(text.slice(start,end+1));
}
function safeArray(value:unknown,max=8){
 return Array.isArray(value)?value.map(x=>String(x).slice(0,120)).filter(Boolean).slice(0,max):[];
}
function validated(raw:any,role:Role,request:string,contextSummary:string){
 const steps:Array<{
  module:ModuleKey;feature:string;title:string;instruction:string;permitted:boolean;matched:string[];
  required_data:string[];depends_on:number[];handoff:Record<string,unknown>;
 }>=[];
 const catalog=modules.filter(m=>m.key!=="orchestrator");
 for(const item of (Array.isArray(raw?.steps)?raw.steps:[]) as RawStep[]){
  const mod=catalog.find(m=>m.key===item.module);
  if(!mod)continue;
  const feature=mod.features.includes(String(item.feature||""))?String(item.feature):mod.features[0]||"";
  const depends=Array.isArray(item.depends_on)?item.depends_on.map(Number).filter(x=>Number.isInteger(x)&&x>0&&x<=8).slice(0,4):[];
  const handoff=item.handoff&&typeof item.handoff==="object"&&!Array.isArray(item.handoff)?item.handoff as Record<string,unknown>:{};
  steps.push({
   module:mod.key,feature,
   title:String(item.title||mod.label).slice(0,120),
   instruction:String(item.instruction||"Buka fitur, verifikasi data, lalu konfirmasi hasil sebelum lanjut.").slice(0,600),
   permitted:canAccess(mod,role),matched:[],
   required_data:safeArray(item.required_data,8),depends_on:depends,handoff
  });
  if(steps.length>=10)break;
 }
 if(!steps.length){
  const fallback=planWorkflow(request,role);
  return {...fallback,context_summary:contextSummary};
 }
 return {
  title:String(raw?.title||"Workflow School Control").slice(0,120),
  reason:String(raw?.reason||"Urutan dibuat dari keterkaitan data dan pekerjaan antar modul.").slice(0,600),
  context_summary:contextSummary,
  steps
 };
}

async function schoolContext(db:any,schoolId:string){
 const today=new Date().toISOString().slice(0,10);
 const month=today.slice(0,7)+"-01";
 const reads=await Promise.allSettled([
  db.from("sc_students").select("id",{count:"exact",head:true}).eq("school_id",schoolId).neq("status","deleted"),
  db.from("sc_program_tasks").select("id",{count:"exact",head:true}).eq("school_id",schoolId).neq("status","done"),
  db.from("sc_calendar_events").select("id",{count:"exact",head:true}).eq("school_id",schoolId).gte("event_date",today),
  db.from("sc_discipline_actions").select("id",{count:"exact",head:true}).eq("school_id",schoolId).neq("status","completed"),
  db.from("sc_student_bills").select("id",{count:"exact",head:true}).eq("school_id",schoolId).neq("status","paid"),
  db.from("sc_hr_requests").select("id",{count:"exact",head:true}).eq("school_id",schoolId).eq("status","pending"),
  db.from("sc_documents").select("id",{count:"exact",head:true}).eq("school_id",schoolId).in("status",["draft","review"]),
  db.from("sc_teacher_journals").select("id",{count:"exact",head:true}).eq("school_id",schoolId).gte("lesson_date",month)
 ]);
 const count=(i:number)=>{
  const x=reads[i];
  if(x.status!=="fulfilled")return null;
  const value=x.value as {count?:number|null;error?:unknown};
  return value.error?null:(value.count??0);
 };
 const summary={
  siswa_aktif:count(0),tugas_program_terbuka:count(1),agenda_mendatang:count(2),
  tindak_lanjut_disiplin:count(3),tagihan_belum_lunas:count(4),pengajuan_hr_pending:count(5),
  dokumen_draft_review:count(6),jurnal_bulan_ini:count(7)
 };
 return summary;
}

export async function POST(req:NextRequest){
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!token||!url||!key)return NextResponse.json({error:"Autentikasi diperlukan."},{status:401,headers});
  const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}}=await db.auth.getUser(token);
  if(!user)return NextResponse.json({error:"Sesi tidak sah."},{status:401,headers});

  const body=await req.json();
  const schoolId=String(body.school_id||"");
  const request=String(body.request||"").trim();
  if(request.length<3||request.length>4000)return NextResponse.json({error:"Permintaan harus 3–4000 karakter."},{status:400,headers});

  const {data:member}=await db.from("sc_members").select("role").eq("school_id",schoolId).eq("user_id",user.id).maybeSingle();
  if(!member)return NextResponse.json({error:"Tidak memiliki akses sekolah."},{status:403,headers});
  const role=member.role as Role;

  const context=await schoolContext(db,schoolId);
  const contextSummary="Ringkasan data yang dapat dibaca role ini: "+Object.entries(context).map(([k,v])=>k.replaceAll("_"," ")+"="+(v===null?"tidak tersedia":v)).join(", ")+".";
  const fallback={...planWorkflow(request,role),context_summary:contextSummary};
  const apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey)return NextResponse.json({plan:fallback,source:"deterministic"},{headers});

  const catalog=modules.filter(m=>m.key!=="orchestrator"&&canAccess(m,role)).map(m=>({module:m.key,label:m.label,features:m.features}));
  const prompt=
   "Anda adalah workflow orchestrator untuk aplikasi School Control sekolah Indonesia.\n"+
   "Jangan sekadar memilih satu menu. Pecah tujuan pengguna menjadi workflow lintas modul yang bisa dijalankan bertahap.\n"+
   "Gunakan HANYA module dan feature dari katalog berikut:\n"+JSON.stringify(catalog)+"\n\n"+
   "Konteks data yang tersedia untuk role ini (hanya ringkasan, bukan izin untuk mengarang detail):\n"+JSON.stringify(context)+"\n\n"+
   "Aturan:\n"+
   "1. Mulai dari verifikasi/sumber data sebelum tindakan turunan.\n"+
   "2. Maksimal 10 langkah.\n"+
   "3. Jika data belum pasti, tulis pada required_data.\n"+
   "4. depends_on berisi nomor langkah yang harus selesai dulu.\n"+
   "5. handoff berisi konteks singkat yang harus dibawa ke langkah berikutnya, tanpa data rahasia.\n"+
   "6. Jangan membuka detail konseling BK rahasia kepada role yang tidak berhak.\n"+
   "7. Jangan membuat klaim bahwa perubahan data sudah dilakukan.\n"+
   "8. Setiap langkah harus mengarah ke fitur nyata dan memberi instruksi konkret.\n"+
   "Kembalikan JSON murni dengan bentuk: "+
   "{\"title\":\"...\",\"reason\":\"...\",\"steps\":[{\"module\":\"...\",\"feature\":\"...\",\"title\":\"...\",\"instruction\":\"...\",\"required_data\":[\"...\"],\"depends_on\":[1],\"handoff\":{\"key\":\"value\"}}]}\n\n"+
   "Permintaan pengguna: "+request;

  const models=[process.env.GEMINI_MODEL||"gemini-2.5-flash",process.env.GEMINI_FALLBACK_MODEL||"gemini-2.5-flash-lite"].filter((x,i,a)=>a.indexOf(x)===i);
  for(const model of models){
   try{
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{
     method:"POST",
     headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
     body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.08,maxOutputTokens:3200,responseMimeType:"application/json"}}),
     signal:AbortSignal.timeout(18000),cache:"no-store"
    });
    if(!response.ok){if([429,500,502,503,504].includes(response.status))continue;break}
    const result=await response.json();
    const text=(result?.candidates?.[0]?.content?.parts||[]).map((x:{text?:string})=>x.text||"").join("").trim();
    const plan=validated(cleanJson(text),role,request,contextSummary);
    return NextResponse.json({plan,source:"ai",model},{headers});
   }catch{/* try fallback model */}
  }
  return NextResponse.json({plan:fallback,source:"deterministic"},{headers});
 }catch{
  return NextResponse.json({error:"Orchestrator tidak dapat memproses permintaan."},{status:500,headers});
 }
}
