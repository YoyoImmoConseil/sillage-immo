import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { listActiveAdvisors } from "@/services/admin/admin-user.service";
import { CreateTransactionForm } from "./create-transaction-form";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const context = await requireAdminPagePermission("operations.manage");
  const advisors = await listActiveAdvisors();

  return (
    <AdminShell
      title="Nouvelle transaction"
      description="Saisie manuelle d'un mandat / compromis / acte."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4">
        <Link href="/admin/transactions" className="text-sm underline text-navy">
          Retour aux transactions
        </Link>
      </div>
      <CreateTransactionForm
        advisors={advisors.map((advisor) => ({
          id: advisor.id,
          label:
            advisor.full_name ??
            [advisor.first_name, advisor.last_name].filter(Boolean).join(" ") ??
            advisor.email,
        }))}
      />
    </AdminShell>
  );
}
