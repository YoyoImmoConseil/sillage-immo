import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db/supabase";
import { publicEnv } from "../env/public";

export const createSupabaseBrowserClient = () => {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};
