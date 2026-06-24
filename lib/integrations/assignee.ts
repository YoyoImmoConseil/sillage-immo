import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Resolve the Sillage collaborator (admin_profile) a partner record is
// assigned to. SweepBright Zaps expose an assignee (id / phone / sometimes
// email/name); we map it to a local admin_profile so the lead/transaction is
// attributed automatically.
//
// Match priority (most reliable first):
//   1. email            → admin_profiles.email (case-insensitive)
//   2. externalId       → admin_profiles.metadata->>'sweepbright_user_id'
//   3. name             → admin_profiles.full_name (case-insensitive)
//
// The raw hints should always be persisted alongside the record (in metadata)
// so an unmatched assignee can be reconciled manually later.

export type AssigneeHints = {
  email?: string | null;
  externalId?: string | null;
  name?: string | null;
  phone?: string | null;
};

export type ResolvedAssignee = {
  adminProfileId: string | null;
  matchedBy: "email" | "sweepbright_user_id" | "full_name" | null;
};

const hasAnyHint = (hints: AssigneeHints): boolean =>
  Boolean(
    hints.email?.trim() ||
      hints.externalId?.toString().trim() ||
      hints.name?.trim() ||
      hints.phone?.trim()
  );

export const resolveAssignee = async (
  hints: AssigneeHints
): Promise<ResolvedAssignee> => {
  if (!hasAnyHint(hints)) return { adminProfileId: null, matchedBy: null };

  const email = hints.email?.trim();
  if (email) {
    const { data } = await supabaseAdmin
      .from("admin_profiles")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (data?.id) return { adminProfileId: data.id, matchedBy: "email" };
  }

  const externalId = hints.externalId?.toString().trim();
  if (externalId) {
    const { data } = await supabaseAdmin
      .from("admin_profiles")
      .select("id")
      .eq("metadata->>sweepbright_user_id", externalId)
      .limit(1)
      .maybeSingle();
    if (data?.id) return { adminProfileId: data.id, matchedBy: "sweepbright_user_id" };
  }

  const name = hints.name?.trim();
  if (name) {
    const { data } = await supabaseAdmin
      .from("admin_profiles")
      .select("id")
      .ilike("full_name", name)
      .limit(1)
      .maybeSingle();
    if (data?.id) return { adminProfileId: data.id, matchedBy: "full_name" };
  }

  return { adminProfileId: null, matchedBy: null };
};

// Build a compact, JSON-safe record of the raw assignee hints to stash in a
// record's metadata (preserves data even when no admin_profile matched).
export const assigneeMetadata = (
  hints: AssigneeHints,
  resolved: ResolvedAssignee
): Record<string, unknown> | undefined => {
  const entry: Record<string, unknown> = {};
  if (hints.email?.trim()) entry.email = hints.email.trim();
  if (hints.externalId?.toString().trim())
    entry.externalId = hints.externalId.toString().trim();
  if (hints.name?.trim()) entry.name = hints.name.trim();
  if (hints.phone?.trim()) entry.phone = hints.phone.trim();
  if (Object.keys(entry).length === 0) return undefined;
  entry.matchedBy = resolved.matchedBy;
  entry.adminProfileId = resolved.adminProfileId;
  return entry;
};
