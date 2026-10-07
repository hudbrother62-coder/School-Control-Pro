import {NextResponse} from "next/server";
export const runtime="nodejs";
export async function POST(){
 return NextResponse.json({error:"Pembayaran dan perpanjangan akun dilakukan melalui konfirmasi Super Admin."},{status:403,headers:{"Cache-Control":"no-store"}});
}
