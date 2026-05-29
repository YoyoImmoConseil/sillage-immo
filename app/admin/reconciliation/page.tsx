import { redirect } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { listReconciliationSuggestions } from "@/services/admin/reconciliation-list.service";
import { ReconciliationListClient } from "./list-client";

export const dynamic = "force-dynamic";

export default async function AdminReconciliationPage() {
  const context = await getAdminPageContext();
  if (!context) redirect("/admin/login");
  if (!hasAdminPermission(context, "clients.view")) {
    redirect("/admin/forbidden");
  }

  const rows = await listReconciliationSuggestions(50);
  const canManage = hasAdminPermission(context, "clients.edit");

  return (
    <AdminShell
      title="Réconciliation multi-sources"
      description="Suggestions de rapprochement bien / vendeur à confirmer (estimateur · SweepBright · MyNotary)."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <ReconciliationListClient initialRows={rows} canManage={canManage} />
    </AdminShell>
  );
}
