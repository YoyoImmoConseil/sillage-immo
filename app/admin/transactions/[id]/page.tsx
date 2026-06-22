import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { getTransactionById } from "@/services/transactions/transaction.service";
import { listActiveAdvisors } from "@/services/admin/admin-user.service";
import { EditTransactionPanel } from "./edit-transaction-panel";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireAdminPagePermission("operations.view");
  const { id } = await params;
  const [transaction, advisors] = await Promise.all([
    getTransactionById(id),
    listActiveAdvisors(),
  ]);

  if (!transaction) notFound();

  const canManage = context.permissions.includes("operations.manage");

  return (
    <AdminShell
      title={`Transaction ${transaction.reference ?? transaction.id.slice(0, 8)}`}
      description="Détail, prix, honoraires et historique."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4">
        <Link href="/admin/transactions" className="text-sm underline text-navy">
          Retour aux transactions
        </Link>
      </div>

      <EditTransactionPanel
        canManage={canManage}
        transaction={{
          id: transaction.id,
          reference: transaction.reference,
          businessType: transaction.business_type,
          status: transaction.status,
          currency: transaction.currency,
          assignedAdminProfileId: transaction.assigned_admin_profile_id,
          mandatePriceAmount: transaction.mandate_price_amount,
          agreedPriceAmount: transaction.agreed_price_amount,
          deedPriceAmount: transaction.deed_price_amount,
          honorairesAmount: transaction.honoraires_amount,
          honorairesSource: transaction.honoraires_source,
          mandateSignedAt: transaction.mandate_signed_at,
          preliminarySaleSignedAt: transaction.preliminary_sale_signed_at,
          deedSignedAt: transaction.deed_signed_at,
          notes: transaction.notes,
        }}
        advisors={advisors.map((advisor) => ({
          id: advisor.id,
          label:
            advisor.full_name ??
            [advisor.first_name, advisor.last_name].filter(Boolean).join(" ") ??
            advisor.email,
        }))}
        honorairesHistory={transaction.honorairesHistory.map((entry) => ({
          id: entry.id,
          amount: entry.amount,
          currency: entry.currency,
          source: entry.source,
          reason: entry.reason,
          createdAt: entry.created_at,
        }))}
        sellersCount={transaction.sellers.length}
        buyersCount={transaction.buyers.length}
      />
    </AdminShell>
  );
}
