import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { listMcpApiKeys } from "@/services/mcp/mcp-api-key.service";
import { listTools } from "@/lib/mcp/registry";
import { bootstrapMcpRegistry } from "@/lib/mcp/bootstrap";
import { McpKeysManager } from "./mcp-keys-manager";

export const dynamic = "force-dynamic";

export default async function McpKeysPage() {
  const context = await requireAdminPagePermission("admin.users.manage");
  bootstrapMcpRegistry();
  const keys = await listMcpApiKeys();
  const tools = listTools().map((tool) => ({
    name: tool.name,
    mutates: Boolean(tool.mutates),
    readsPii: Boolean(tool.readsPii),
  }));

  return (
    <AdminShell
      title="Clés MCP externes"
      description="Clés nommées, scopées et révocables pour les consommateurs MCP tiers (allowlist d'outils, écriture, PII, IP)."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <McpKeysManager initialKeys={keys} tools={tools} />
    </AdminShell>
  );
}
