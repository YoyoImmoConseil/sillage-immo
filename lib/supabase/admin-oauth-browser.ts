import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db/supabase";
import { publicEnv } from "../env/public";

export const createAdminOAuthBrowserClient = () => {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
};
