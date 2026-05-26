import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/copilot/conversations/:id
// Returns the message history of a copilot conversation, gated to the
// admin who owns it.

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  const adminContext = await getAdminPageContext();
  if (!adminContext || !adminContext.profile) {
    return NextResponse.json(
      { ok: false, message: "Session admin requise." },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(adminContext, "admin.dashboard.pilot.view")) {
    return NextResponse.json(
      { ok: false, message: "Accès copilot refusé." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Conversation id requis." },
      { status: 400 }
    );
  }

  const { data: convo, error: convoError } = await supabaseAdmin
    .from("ai_conversations")
    .select("id, started_at, ended_at, status, metadata")
    .eq("id", id)
    .eq("entity_type", "admin")
    .eq("channel", "admin_console")
    .filter("metadata->>admin_profile_id", "eq", adminContext.profile.id)
    .maybeSingle();
  if (convoError || !convo) {
    return NextResponse.json(
      { ok: false, message: "Conversation introuvable." },
      { status: 404 }
    );
  }

  const { data: msgRows } = await supabaseAdmin
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  const messages = ((msgRows ?? []) as Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
  }>)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));

  return NextResponse.json({
    ok: true,
    data: {
      conversation: {
        id: convo.id,
        startedAt: convo.started_at,
        endedAt: convo.ended_at,
        status: convo.status,
      },
      messages,
    },
  });
};
