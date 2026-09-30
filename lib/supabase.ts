import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | null = null;

// Browser-safe public fallback. These are Supabase publishable values, not service-role secrets.
// Vercel environment variables still override them when configured.
const PUBLIC_URL="https://sfzaexzpbcvynkhglndi.supabase.co";
const PUBLIC_KEY="sb_publishable_9RSzLKMNLYPchxRUv5WImg_IdAdDtHc";

export function browserDb(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || PUBLIC_KEY;
  if (!client) client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}
