import type { SupabaseClient } from "@supabase/supabase-js";

export type RegisterAccountInput={
  email:string;
  password:string;
  schoolName:string;
};

export async function registerConfirmedAccount(db:SupabaseClient,input:RegisterAccountInput){
  const email=input.email.trim().toLowerCase();
  const schoolName=input.schoolName.trim();

  const {data,error}=await db.functions.invoke("register-school-account",{
    body:{email,password:input.password,school_name:schoolName}
  });
  if(error)throw error;
  if(data?.code==="already_registered")throw Error("Email sudah terdaftar. Gunakan menu Masuk atau pulihkan kata sandi.");
  if(!data?.ok)throw Error(data?.error||"Pendaftaran belum berhasil.");

  const login=await db.auth.signInWithPassword({email,password:input.password});
  if(login.error)throw login.error;
  if(!login.data.user||login.data.user.email?.toLowerCase()!==email)throw Error("Sesi akun tidak sesuai dengan pendaftaran. Silakan masuk kembali.");
  return login.data;
}
