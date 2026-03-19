import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { hasAdminPermission, requireAdminPagePermission } from "@/lib/admin/auth";
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
  const context = await requireAdminPagePermission("admin.dashboard.view");
  const visibleCards = cards.filter((card) => hasAdminPermission(context, card.permission));

  return (
    <AdminShell
      title="Dashboard admin"
      description="Point d'entree du back-office RBAC Sillage Immo."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
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
