import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminShell } from "@/app/components/admin-shell";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { TimeoutError, withTimeout } from "@/lib/async/timeout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminPermission } from "@/types/domain/admin";
import { getDashboardSnapshot } from "@/services/admin/dashboard-aggregator.service";
import { getAllSyntheses } from "@/services/admin/dashboard-syntheses.service";
import { KpiGrid } from "./dashboard-pilot/kpi-grid";
import { FunnelChart } from "./dashboard-pilot/funnel-chart";
import { TopZonesTable } from "./dashboard-pilot/top-zones-table";
import { AdvisorPerformanceTable } from "./dashboard-pilot/advisor-performance-table";
import { ConversationsInsights } from "./dashboard-pilot/conversations-insights";
import { SynthesesGrid } from "./dashboard-pilot/syntheses-grid";

export const dynamic = "force-dynamic";

const cards = [
  {
    href: "/admin/copilot",
    title: "Copilot Sillage",
    description: "Pose une question, le copilot appelle les outils MCP pour répondre avec les données réelles de l'agence.",
    permission: "admin.dashboard.pilot.view" as AdminPermission,
  },
  {
    href: "/admin/users",
    title: "Utilisateurs & rôles",
    description: "Inviter un membre, activer/désactiver un accès et attribuer les rôles.",
    permission: "admin.users.view" as AdminPermission,
  },
  {
    href: "/admin/clients",
    title: "Clients vendeurs",
    description: "Gérer les espaces client, rattacher leads et biens, affecter les conseillers et inviter les clients.",
    permission: "clients.view" as AdminPermission,
  },
  {
    href: "/admin/leads",
    title: "Recherche leads",
    description: "Rechercher dans les leads vendeurs et acquéreurs depuis une vue transversale.",
    permission: "leads.sellers.view" as AdminPermission,
  },
  {
    href: "/admin/properties",
    title: "Biens",
    description: "Piloter les biens manuels et consulter les biens synchronisés depuis SweepBright.",
    permission: "properties.view" as AdminPermission,
  },
  {
    href: "/admin/buyer-leads",
    title: "Matching acquéreurs",
    description: "Enrichir les critères et recalculer les rapprochements acquéreur ↔ biens.",
    permission: "leads.buyers.view" as AdminPermission,
  },
  {
    href: "/admin/mynotary",
    title: "MyNotary",
    description: "Suivre les mandats, offres et compromis signés, et rattacher manuellement les documents non matchés.",
    permission: "admin.mynotary.view" as AdminPermission,
  },
];

async function PilotDashboardBody({ canSeeAdvisors }: { canSeeAdvisors: boolean }) {
  const [snapshot, syntheses] = await Promise.all([
    getDashboardSnapshot(),
    getAllSyntheses(),
  ]);

  const kpisArray = [
    snapshot.kpis.sellerLeads,
    snapshot.kpis.buyerLeads,
    snapshot.kpis.visitsScheduled,
    snapshot.kpis.mandatesSigned,
    snapshot.kpis.offersSigned,
    snapshot.kpis.preliminarySalesSigned,
    snapshot.kpis.deedsSigned,
    snapshot.kpis.conversations,
  ];

  return (
    <div className="space-y-6">
      <KpiGrid kpis={kpisArray} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FunnelChart steps={snapshot.funnel} />
        <TopZonesTable rows={snapshot.topZones} />
      </div>

      {canSeeAdvisors ? <AdvisorPerformanceTable rows={snapshot.advisors} /> : null}

      <ConversationsInsights snapshot={snapshot.conversations} />

      <SynthesesGrid syntheses={syntheses} />

      <p className="text-xs text-[#141446]/55">
        Snapshot dashboard mis à jour toutes les 5 minutes (SSR cached) •
        synthèses IA mises à jour toutes les heures • dernière génération{" "}
        {new Date(snapshot.generatedAt).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

function PilotDashboardFallback() {
  return (
    <div className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6 text-sm text-[#141446]/70">
      Chargement du dashboard de pilotage…
    </div>
  );
}

export default async function AdminDashboardPage() {
  let warningMessage: string | null = null;
  let context = null;

  try {
    context = await withTimeout(
      getAdminPageContext(),
      4000,
      "Le chargement de la session admin prend trop de temps."
    );
  } catch (error) {
    warningMessage =
      error instanceof TimeoutError
        ? error.message
        : "Impossible de vérifier la session admin pour le moment.";
  }

  if (!context && !warningMessage) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await withTimeout(
        supabase.auth.getUser(),
        4000,
        "La vérification de la session Google prend trop de temps."
      );

      if (user) {
        redirect("/admin/forbidden");
      }
    } catch {
      redirect("/admin/login");
    }

    redirect("/admin/login");
  }

  if (context && !hasAdminPermission(context, "admin.dashboard.view")) {
    redirect("/admin/forbidden");
  }

  if (!context) {
    return (
      <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
        <section className="mx-auto max-w-3xl rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
          <h1 className="text-3xl font-semibold text-[#141446]">Dashboard admin</h1>
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warningMessage ?? "La page est temporairement indisponible."}
          </p>
          <Link href="/admin/login" className="mt-4 inline-block text-sm underline text-[#141446]">
            Retour à la connexion admin
          </Link>
        </section>
      </main>
    );
  }

  const showPilotDashboard = hasAdminPermission(
    context,
    "admin.dashboard.pilot.view"
  );

  const visibleCards = cards.filter((card) => hasAdminPermission(context, card.permission));

  return (
    <AdminShell
      title={showPilotDashboard ? "Pilotage Sillage Immo" : "Dashboard admin"}
      description={
        showPilotDashboard
          ? "Cockpit consolidé : KPI 30 jours, funnel acquisition, top zones, performance conseillers et synthèses IA."
          : "Point d'entrée du back-office RBAC Sillage Immo."
      }
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      {showPilotDashboard ? (
        <Suspense fallback={<PilotDashboardFallback />}>
          <PilotDashboardBody canSeeAdvisors={true} />
        </Suspense>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {visibleCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6 transition hover:border-[rgba(20,20,70,0.3)]"
            >
              <h2 className="text-xl font-semibold text-[#141446]">{card.title}</h2>
              <p className="mt-2 text-sm text-[#141446]/75">{card.description}</p>
            </Link>
          ))}
        </section>
      )}

      {showPilotDashboard && visibleCards.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#141446]/70">
            Navigation rapide
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white/60 px-4 py-3 text-sm transition hover:border-[rgba(20,20,70,0.3)]"
              >
                <span className="font-semibold text-[#141446]">{card.title}</span>
                <span className="ml-2 text-[#141446]/60">→</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </AdminShell>
  );
}
