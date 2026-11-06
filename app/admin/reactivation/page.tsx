import Link from "next/link";

import { AdminShell } from "@/app/components/admin-shell";
import { hasAdminPermission, requireAdminPagePermission } from "@/lib/admin/auth";
import { SILLAGE_CONTACT_EMAIL } from "@/lib/brand/company";
import { DEFAULT_REACTIVATION_CAMPAIGN, OWNER_RESPONSE_LABELS, OWNER_SUBJECTS, isOwnerResponse } from "@/lib/reactivation/model";
import { loadProtectionIndex } from "@/services/reactivation/protected-contacts.service";
import {
  countSentSoFar,
  getReactivationStats,
  isReactivationPaused,
  resolveDailyLimitWithRamp,
  resolveDefaultOrder,
} from "@/services/reactivation/reactivation-send.service";
import { ReactivationTools } from "./reactivation-tools";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "À envoyer",
  sent: "Séquence en cours",
  responded: "A répondu",
  dormant: "Dormant",
  excluded: "Exclu",
  bounced: "Rebond",
  unsubscribed: "Désinscrit",
};

const SEGMENT_LABELS: Record<string, string> = {
  v1_proprietaire: "Propriétaires",
  v3_client: "Clients vendeurs (acte signé)",
  a1_acquereur: "Acquéreurs",
  a2_ancien: "Anciens prospects",
};

const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(new Date(iso)) : "—";

const rate = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 1000) / 10} %` : "—");

export default async function ReactivationAdminPage() {
  const context = await requireAdminPagePermission("leads.sellers.view");
  const stats = await getReactivationStats(DEFAULT_REACTIVATION_CAMPAIGN);
  const sentSoFar = await countSentSoFar(DEFAULT_REACTIVATION_CAMPAIGN);
  const dailyLimit = resolveDailyLimitWithRamp(sentSoFar);
  const canManage = hasAdminPermission(context, "leads.sellers.manage");
  const paused = isReactivationPaused();
  const protection = await loadProtectionIndex();
  const protectionSummary = {
    size: protection.size,
    syncedAt: protection.syncedAt ? formatDate(protection.syncedAt.toISOString()) : null,
  };
  const responded = stats.byStatus.responded ?? 0;
  const unsubscribed = stats.byStatus.unsubscribed ?? 0;
  const contacted = (stats.byStatus.sent ?? 0) + responded + unsubscribed + (stats.byStatus.dormant ?? 0);
  const cards = [
    { label: "Contacts importés", value: stats.total },
    {
      label: "À envoyer",
      value: stats.pendingSendable,
      hint: stats.pendingOtherSegments > 0 ? `+ ${stats.pendingOtherSegments} hors vague (clients acte signé / acquéreurs)` : undefined,
    },
    { label: "Contactés", value: contacted },
    { label: "Ont répondu", value: responded, hint: rate(responded, contacted) },
    { label: "Vendeurs chauds", value: (stats.byResponse.vendre ?? 0) + (stats.byResponse.valeur ?? 0) },
    { label: "Désinscrits", value: unsubscribed, hint: rate(unsubscribed, contacted) },
  ];
  const border = "rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/70";

  return (
    <AdminShell
      title="Réactivation SweepBright"
      description="Vague propriétaires : import, envoi cadencé (J0, J+7, J+21), réponses par bouton et vendeurs à rappeler."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <section className="space-y-8 text-navy">
        <p className="text-sm opacity-70">
          Campagne <code>{stats.campaign}</code> ·{" "}
          {paused ? (
            <strong>envoi automatique en pause (REACTIVATION_PAUSED)</strong>
          ) : (
            <>
              {dailyLimit} envois par jour ouvré à 9 h, {resolveDefaultOrder(sentSoFar) === "newest" ? "fiches les plus récentes d'abord" : "fiches les plus anciennes d'abord"}
            </>
          )}{" "}
          ({sentSoFar} mails partis ; 50 jusqu&apos;à 500, puis 150) ·{" "}
          <Link href="/admin/seller-leads" className="underline">
            leads vendeurs
          </Link>
        </p>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {cards.map((card) => (
            <article key={card.label} className={`${border} p-5`}>
              <p className="text-sm opacity-70">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold">{card.value}</p>
              {card.hint ? <p className="mt-1 text-xs opacity-60">{card.hint}</p> : null}
            </article>
          ))}
        </section>

        {canManage ? (
          <ReactivationTools campaign={stats.campaign} defaultLimit={dailyLimit} contactEmail={SILLAGE_CONTACT_EMAIL} protection={protectionSummary} />
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <article className={`${border} p-5`}>
            <h2 className="sillage-section-title">Par statut</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <li key={status} className="flex justify-between">
                  <span>{STATUS_LABELS[status] ?? status}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className={`${border} p-5`}>
            <h2 className="sillage-section-title">Par segment</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {Object.entries(stats.bySegment).map(([segment, count]) => (
                <li key={segment} className="flex justify-between">
                  <span>{SEGMENT_LABELS[segment] ?? segment}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className={`${border} p-5`}>
            <h2 className="sillage-section-title">Objets testés (J0)</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(["A", "B", "C"] as const).map((variant) => {
                const sent = stats.byVariantSent[variant] ?? 0;
                const answered = stats.byVariantResponded[variant] ?? 0;
                return (
                  <li key={variant}>
                    <p className="font-medium">
                      {variant} · {OWNER_SUBJECTS[variant]}
                    </p>
                    <p className="opacity-70">
                      {sent} envoyés · {answered} réponses · {rate(answered, sent)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </article>
        </section>

        <section className={`${border} p-2`}>
          <div className="px-3 py-2">
            <h2 className="sillage-section-title">Dernières réponses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="px-3 py-2">Quand</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Réponse</th>
                  <th className="px-3 py-2">Segment</th>
                  <th className="px-3 py-2">Négociateur</th>
                  <th className="px-3 py-2">Lead vendeur</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentResponses.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 opacity-70" colSpan={6}>
                      Aucune réponse pour l&apos;instant.
                    </td>
                  </tr>
                ) : (
                  stats.recentResponses.map((row) => (
                    <tr key={row.id} className="border-t border-[rgba(20,20,70,0.1)]">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.respondedAt)}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{row.fullName}</p>
                        <p className="opacity-70">
                          {row.email}
                          {row.phone ? ` · ${row.phone}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2">{isOwnerResponse(row.response) ? OWNER_RESPONSE_LABELS[row.response] : (row.response ?? "—")}</td>
                      <td className="px-3 py-2">{SEGMENT_LABELS[row.segment] ?? row.segment}</td>
                      <td className="px-3 py-2">{row.negotiator ?? "—"}</td>
                      <td className="px-3 py-2">
                        {row.sellerLeadId ? (
                          <Link href={`/admin/seller-leads/${row.sellerLeadId}`} className="underline">
                            Ouvrir
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AdminShell>
  );
}
