import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const isRegisteredToolVersion = async (
  toolName: string,
  toolVersion: string
) => {
  const { data, error } = await supabaseAdmin
    .from("tool_versions")
    .select("id")
    .eq("tool_name", toolName)
    .eq("tool_version", toolVersion)
    .eq("lifecycle_status", "active")
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
};
