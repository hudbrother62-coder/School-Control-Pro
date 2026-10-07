import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";

export const MAX_GEMINI_KEYS=7;
const KEY_RE=/^[\x21-\x7E]{20,512}$/;

export type GeminiKeySource="vercel"|"admin";
export type GeminiKeyEntry={slot:number;key:string;source:GeminiKeySource};

function encryptionKey(){
 const secret=process.env.AI_KEY_ENCRYPTION_SECRET?.trim();
 if(!secret)throw Error("AI_KEY_ENCRYPTION_SECRET belum dikonfigurasi.");
 return createHash("sha256").update(secret,"utf8").digest();
}
export function validGeminiKey(value:string){return KEY_RE.test(value.trim())}
export function envGeminiKey(slot:number){
 if(slot<1||slot>MAX_GEMINI_KEYS)return "";
 const named=process.env["GEMINI_API_KEY_"+slot]?.trim()||"";
 if(named)return named;
 return slot===1?(process.env.GEMINI_API_KEY?.trim()||""):"";
}
export function encryptStoredAiKey(value:string){
 const plain=value.trim();if(!validGeminiKey(plain))throw Error("Format API key Gemini tidak valid.");
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",encryptionKey(),iv);
 const encrypted=Buffer.concat([cipher.update(plain,"utf8"),cipher.final()]),tag=cipher.getAuthTag();
 return ["v1",iv.toString("base64"),tag.toString("base64"),encrypted.toString("base64")].join(":");
}
export function decryptStoredAiKey(value:string){
 const [version,iv64,tag64,data64]=value.split(":");
 if(version!=="v1"||!iv64||!tag64||!data64)throw Error("Format penyimpanan API key tidak dikenali.");
 const decipher=createDecipheriv("aes-256-gcm",encryptionKey(),Buffer.from(iv64,"base64"));
 decipher.setAuthTag(Buffer.from(tag64,"base64"));
 return Buffer.concat([decipher.update(Buffer.from(data64,"base64")),decipher.final()]).toString("utf8").trim();
}

export async function loadGeminiKeyPool(db?:SupabaseClient):Promise<GeminiKeyEntry[]>{
 const adminBySlot=new Map<number,string>();
 if(db&&process.env.AI_KEY_ENCRYPTION_SECRET){
  try{
   const {data,error}=await db.from("sc_platform_ai_keys").select("slot,secret_encrypted,is_active").eq("provider","gemini").eq("is_active",true).order("slot");
   if(!error)for(const row of data||[]){
    const slot=Number(row.slot);if(slot<1||slot>MAX_GEMINI_KEYS||!row.secret_encrypted)continue;
    try{const key=decryptStoredAiKey(String(row.secret_encrypted));if(validGeminiKey(key))adminBySlot.set(slot,key)}catch{}
   }
  }catch{}
 }
 const entries:GeminiKeyEntry[]=[],seen=new Set<string>();
 for(let slot=1;slot<=MAX_GEMINI_KEYS;slot++){
  const env=envGeminiKey(slot),admin=adminBySlot.get(slot)||"",key=env||admin,source:GeminiKeySource=env?"vercel":"admin";
  if(!key||seen.has(key)||!validGeminiKey(key))continue;
  seen.add(key);entries.push({slot,key,source});
 }
 return entries;
}

export async function fetchGeminiWithPool(args:{db?:SupabaseClient;models:string[];body:string;timeoutMs:number}){
 const keys=await loadGeminiKeyPool(args.db),statuses:number[]=[];
 const models=args.models.filter((x,i,a)=>x&&a.indexOf(x)===i);
 for(const model of models){
  for(const entry of keys){
   try{
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{
     method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":entry.key},body:args.body,
     signal:AbortSignal.timeout(args.timeoutMs),cache:"no-store"
    });
    if(response.ok)return {response,model,slot:entry.slot,source:entry.source,configured:keys.length,statuses};
    statuses.push(response.status);await response.arrayBuffer().catch(()=>{});
   }catch{statuses.push(0)}
  }
 }
 return {response:null as Response|null,model:null as string|null,slot:null as number|null,source:null as GeminiKeySource|null,configured:keys.length,statuses};
}
