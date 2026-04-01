import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageMountLogger } from "@/app/admin/admin-page-mount-logger";
import { AdminShell } from "@/app/components/admin-shell";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { TimeoutError, withTimeout } from "@/lib/async/timeout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminPermission } from "@/types/domain/admin";

export const dynamic = "force-dynamic";

const cards = [
  {
    href: "/admin/users",
    title: "Utilisateurs & roles",
    description: "Inviter un membre, activer/desactiver un acces et attribuer les roles.",
    permission: "admin.users.view" as AdminPermission,
  },
  {
    href: "/admin/clients",
    title: "Clients vendeurs",
    description: "Gerer les espaces client, rattacher leads et biens, affecter les conseillers et inviter les clients.",
    permission: "clients.view" as AdminPermission,
  },
  {
    href: "/admin/leads",
    title: "Recherche leads",
    description: "Rechercher dans les leads vendeurs et acquereurs depuis une vue transversale.",
    permission: "leads.sellers.view" as AdminPermission,
  },
  {
    href: "/admin/properties",
    title: "Biens",
    description: "Piloter les biens manuels et consulter les biens synchronises depuis SweepBright.",
    permission: "properties.view" as AdminPermission,
  },
  {
    href: "/admin/buyer-leads",
    title: "Matching acquereurs",
    description: "Enrichir les criteres et recalculer les rapprochements acquereur ↔ biens.",
    permission: "leads.buyers.view" as AdminPermission,
  },
];

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
        : "Impossible de verifier la session admin pour le moment.";
  }

  if (!context && !warningMessage) {
    // #region agent log
    fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
      body: JSON.stringify({
        sessionId: "cada68",
        runId: `admin-page-${Date.now()}`,
        hypothesisId: "H12",
        location: "app/admin/page.tsx:AdminDashboardPage",
        message: "No admin context resolved on dashboard page",
        data: {
          hasWarningMessage: Boolean(warningMessage),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await withTimeout(
        supabase.auth.getUser(),
        4000,
        "La verification de la session Google prend trop de temps."
      );

      if (user) {
        // #region agent log
        fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
          body: JSON.stringify({
            sessionId: "cada68",
            runId: `admin-page-${Date.now()}`,
            hypothesisId: "H12",
            location: "app/admin/page.tsx:AdminDashboardPage",
            message: "Supabase session exists but admin context is missing",
            data: {
              hasUser: true,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        redirect("/admin/forbidden");
      }
    } catch {
      redirect("/admin/login");
    }

    redirect("/admin/login");
  }

  if (context && !hasAdminPermission(context, "admin.dashboard.view")) {
    // #region agent log
    fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
      body: JSON.stringify({
        sessionId: "cada68",
        runId: `admin-page-${Date.now()}`,
        hypothesisId: "H12",
        location: "app/admin/page.tsx:AdminDashboardPage",
        message: "Admin context exists without dashboard permission",
        data: {
          role: context.role,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    redirect("/admin/forbidden");
  }

  // #region agent log
  fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
    body: JSON.stringify({
      sessionId: "cada68",
      runId: `admin-page-${Date.now()}`,
      hypothesisId: "H12",
      location: "app/admin/page.tsx:AdminDashboardPage",
      message: "Admin dashboard page rendered with context",
      data: {
        role: context?.role ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!context) {
    return (
      <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
        <section className="mx-auto max-w-3xl rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
          <h1 className="text-3xl font-semibold text-[#141446]">Dashboard admin</h1>
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warningMessage ?? "La page est temporairement indisponible."}
          </p>
          <Link href="/admin/login" className="mt-4 inline-block text-sm underline text-[#141446]">
            Retour a la connexion admin
          </Link>
        </section>
      </main>
    );
  }

  const visibleCards = cards.filter((card) => hasAdminPermission(context, card.permission));

  return (
    <AdminShell
      title="Dashboard admin"
      description="Point d'entree du back-office RBAC Sillage Immo."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <AdminPageMountLogger page="admin-dashboard" data={{ role: context.role }} />
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
    </AdminShell>
  );
}
