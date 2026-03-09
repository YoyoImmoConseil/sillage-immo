import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db/supabase";
import { serverEnv } from "../env/server";

export const supabaseAdmin: any = createClient<Database>(
  serverEnv.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
