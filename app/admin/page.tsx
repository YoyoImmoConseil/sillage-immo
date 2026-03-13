import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const cards = [
  {
    href: "/admin/users",
    title: "Utilisateurs & roles",
    description: "Inviter un membre, activer/desactiver un acces et attribuer les roles.",
  },
  {
    href: "/admin/leads",
    title: "Recherche leads",
    description: "Rechercher dans les leads vendeurs et acquereurs depuis une vue transversale.",
  },
  {
    href: "/admin/properties",
    title: "Biens",
    description: "Piloter les biens manuels et consulter les biens synchronises depuis SweepBright.",
  },
  {
    href: "/admin/buyer-leads",
    title: "Matching acquereurs",
    description: "Enrichir les criteres et recalculer les rapprochements acquereur ↔ biens.",
  },
];

export default async function AdminDashboardPage() {
  const context = await requireAdminPagePermission("admin.dashboard.view");

  return (
    <AdminShell
      title="Dashboard admin"
      description="Point d'entree du back-office RBAC Sillage Immo."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <section className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
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
