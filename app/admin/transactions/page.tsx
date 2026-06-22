import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { listTransactions } from "@/services/transactions/transaction.service";
import { listActiveAdvisors } from "@/services/admin/admin-user.service";
import {
  TRANSACTION_STATUS_LABELS,
  type TransactionStatus,
} from "@/types/domain/transactions";

export const dynamic = "force-dynamic";

const formatAmount = (amount: number | null, currency: string) => {
  if (typeof amount !== "number") return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default async function TransactionsPage() {
  const context = await requireAdminPagePermission("operations.view");
  const [{ items }, advisors] = await Promise.all([
    listTransactions({ limit: 100 }),
    listActiveAdvisors(),
  ]);

  const advisorById = new Map(
    advisors.map((advisor) => [
      advisor.id,
      advisor.full_name ??
        [advisor.first_name, advisor.last_name].filter(Boolean).join(" ") ??
        advisor.email,
    ])
  );

  const canManage = context.permissions.includes("operations.manage");

  return (
    <AdminShell
      title="Transactions"
      description="Mandats, compromis et actes — prix et honoraires (CA HT)."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      {canManage ? (
        <div className="mb-4">
          <Link
            href="/admin/transactions/new"
            className="sillage-btn rounded px-4 py-2 text-sm"
          >
            Nouvelle transaction
          </Link>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[rgba(20,20,70,0.12)] text-xs uppercase tracking-wide text-navy/60">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Conseiller</th>
              <th className="px-4 py-3">Prix mandat</th>
              <th className="px-4 py-3">Honoraires</th>
              <th className="px-4 py-3">Acte signé</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-navy/60">
                  Aucune transaction pour le moment.
                </td>
              </tr>
            ) : (
              items.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-[rgba(20,20,70,0.06)] hover:bg-[rgba(20,20,70,0.03)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/transactions/${transaction.id}`}
                      className="underline"
                    >
                      {transaction.reference ?? transaction.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {transaction.business_type === "rental" ? "Location" : "Vente"}
                  </td>
                  <td className="px-4 py-3">
                    {TRANSACTION_STATUS_LABELS[
                      transaction.status as TransactionStatus
                    ] ?? transaction.status}
                  </td>
                  <td className="px-4 py-3">
                    {transaction.assigned_admin_profile_id
                      ? advisorById.get(transaction.assigned_admin_profile_id) ?? "—"
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {formatAmount(transaction.mandate_price_amount, transaction.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {formatAmount(transaction.honoraires_amount, transaction.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {transaction.deed_signed_at
                      ? new Date(transaction.deed_signed_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
