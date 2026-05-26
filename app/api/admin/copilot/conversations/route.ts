import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/copilot/conversations
// Returns the past copilot conversations for the connected admin, so
// the UI can show them in a sidebar (grouped by day client-side).

export const GET = async () => {
  const context = await getAdminPageContext();
  if (!context || !context.profile) {
    return NextResponse.json(
      { ok: false, message: "Session admin requise." },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "admin.dashboard.pilot.view")) {
    return NextResponse.json(
      { ok: false, message: "Accès copilot refusé." },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("ai_conversations")
    .select("id, started_at, ended_at, status, metadata, updated_at")
    .eq("entity_type", "admin")
    .eq("channel", "admin_console")
    .filter("metadata->>admin_profile_id", "eq", context.profile.id)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  const conversations = ((data ?? []) as Array<{
    id: string;
    started_at: string;
    ended_at: string | null;
    status: string;
    metadata: Record<string, unknown>;
    updated_at: string;
  }>).map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status,
    updatedAt: row.updated_at,
    title:
      typeof row.metadata?.title === "string"
        ? row.metadata.title
        : null,
  }));

  return NextResponse.json({ ok: true, data: { conversations } });
};
