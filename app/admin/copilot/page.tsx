import { redirect } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import {
  getAdminPageContext,
  hasAdminPermission,
} from "@/lib/admin/auth";
import {
  getCopilotPromptsForRole,
  getCopilotUsageToday,
  type CopilotRole,
} from "@/services/admin/copilot-orchestrator.service";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CopilotClient } from "./copilot-client";

export const dynamic = "force-dynamic";

const isCopilotRole = (
  role: string
): role is CopilotRole => role === "manager" || role === "administrateur";

export default async function CopilotPage() {
  const context = await getAdminPageContext();
  if (!context) {
    redirect("/admin/login");
  }
  if (!hasAdminPermission(context, "admin.dashboard.pilot.view")) {
    redirect("/admin/forbidden");
  }
  if (!isCopilotRole(context.role) || !context.profile) {
    redirect("/admin/forbidden");
  }

  const [usage, conversations, prompts] = await Promise.all([
    getCopilotUsageToday(context.profile.id),
    (async () => {
      const { data } = await supabaseAdmin
        .from("ai_conversations")
        .select("id, started_at, ended_at, status, metadata, updated_at")
        .eq("entity_type", "admin")
        .eq("channel", "admin_console")
        .filter("metadata->>admin_profile_id", "eq", context.profile!.id)
        .order("started_at", { ascending: false })
        .limit(50);
      return ((data ?? []) as Array<{
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
    })(),
    Promise.resolve(
      getCopilotPromptsForRole(context.role as CopilotRole).map((p) => ({
        id: p.id,
        label: p.label,
        prompt: p.prompt,
      }))
    ),
  ]);

  return (
    <AdminShell
      title="Copilot Sillage"
      description="Pose une question, le copilot appelle les outils MCP pour répondre avec les données réelles de l'agence."
      role={context.role}
      profileName={
        context.profile?.fullName ?? context.profile?.email ?? "Mode admin"
      }
    >
      <CopilotClient
        suggestedPrompts={prompts}
        initialConversations={conversations}
        initialDailyUsage={{
          costEurTotal: usage.costEurTotal,
          capEur: usage.capEur,
          overCap: usage.overCap,
        }}
      />
    </AdminShell>
  );
}
