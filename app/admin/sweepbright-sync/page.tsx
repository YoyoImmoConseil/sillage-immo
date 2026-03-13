import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import {
  getSweepBrightDeliveryStats,
  listRecentSweepBrightDeliveries,
} from "@/services/properties/sweepbright-sync.service";

export const dynamic = "force-dynamic";

export default async function SweepBrightSyncAdminPage() {
  const context = await requireAdminPagePermission("operations.view");

  const [stats, deliveries] = await Promise.all([
    getSweepBrightDeliveryStats(),
    listRecentSweepBrightDeliveries(30),
  ]);

  return (
    <AdminShell
      title="Sync SweepBright"
      description="Etat des webhooks CRM, des retries et des deliveries traitees localement."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <section className="space-y-8 text-[#141446]">
        <div className="space-y-3">
          <div className="flex gap-3 text-sm">
            <Link href="/admin/seller-leads" className="underline">
              Back-office leads
            </Link>
            <Link href="/" className="underline">
              Accueil
            </Link>
          </div>
        </div>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Received", value: stats.received },
            { label: "Processing", value: stats.processing },
            { label: "Processed", value: stats.processed },
            { label: "Failed", value: stats.failed },
            { label: "Ignored", value: stats.ignored },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-5"
            >
              <p className="text-sm opacity-70">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-2">
          <div className="px-3 py-2">
            <h2 className="sillage-section-title">Dernieres deliveries</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(20,20,70,0.18)] text-left">
                  <th className="p-3">Date</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Estate</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Attempts</th>
                  <th className="p-3">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-b border-[rgba(20,20,70,0.12)] last:border-0">
                    <td className="p-3">{new Date(delivery.created_at).toLocaleString("fr-FR")}</td>
                    <td className="p-3">{delivery.event_name}</td>
                    <td className="p-3">{delivery.estate_id ?? "-"}</td>
                    <td className="p-3">{delivery.status}</td>
                    <td className="p-3">{delivery.attempts}</td>
                    <td className="p-3">{delivery.last_error ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AdminShell>
  );
}
