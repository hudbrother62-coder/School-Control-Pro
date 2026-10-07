import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store","Content-Type":"application/json"};
export async function POST(req:NextRequest){
 const token=req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return NextResponse.json({error:"Masuk sebagai Super Admin terlebih dahulu."},{status:401,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://sfzaexzpbcvynkhglndi.supabase.co";
 const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_9RSzLKMNLYPchxRUv5WImg_IdAdDtHc";
 try{
  const body=await req.text();
  if(body.length>10000)return NextResponse.json({error:"Permintaan terlalu besar."},{status:413,headers});
  const response=await fetch(url+"/functions/v1/manage-school-customers",{
   method:"POST",
   headers:{"Authorization":"Bearer "+token,"apikey":pub,"Content-Type":"application/json"},
   body,cache:"no-store",signal:AbortSignal.timeout(15000)
  });
  const result=await response.text();
  return new NextResponse(result,{status:response.status,headers});
 }catch{return NextResponse.json({error:"Layanan pengelolaan akun belum dapat diakses."},{status:502,headers});}
}
