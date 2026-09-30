import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | null = null;

// Browser-safe public values. These are not service-role credentials.
const PUBLIC_URL="https://sfzaexzpbcvynkhglndi.supabase.co";
const PUBLIC_KEY="sb_publishable_9RSzLKMNLYPchxRUv5WImg_IdAdDtHc";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || PUBLIC_KEY;

export function browserDb(): SupabaseClient {
  // Client Components can be pre-rendered on the server. Return a non-persistent
  // request-local client there so useMemo() never freezes on a null value.
  if (typeof window === "undefined") {
    return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  }
  if (!client) {
    client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  }
  return client;
}
