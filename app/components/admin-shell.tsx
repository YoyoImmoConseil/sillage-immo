import Link from "next/link";
import { AdminSignOutButton } from "./admin-sign-out-button";
import type { AdminPermission, AdminRole } from "@/types/domain/admin";
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_PERMISSIONS } from "@/types/domain/admin";

type AdminShellProps = {
  title: string;
  description?: string;
  role: AdminRole;
  profileName?: string | null;
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Utilisateurs & roles", permission: "admin.users.view" as AdminPermission },
  { href: "/admin/clients", label: "Clients vendeurs", permission: "clients.view" as AdminPermission },
  { href: "/admin/leads", label: "Recherche leads", permission: "leads.sellers.view" as AdminPermission },
  { href: "/admin/seller-leads", label: "Leads vendeurs", permission: "leads.sellers.view" as AdminPermission },
  { href: "/admin/buyer-leads", label: "Leads acquereurs", permission: "leads.buyers.view" as AdminPermission },
  { href: "/admin/properties", label: "Biens", permission: "properties.view" as AdminPermission },
  { href: "/admin/sweepbright-sync", label: "Sync SweepBright", permission: "operations.view" as AdminPermission },
];

export function AdminShell({ title, description, role, profileName, children }: AdminShellProps) {
  const permissions = ADMIN_ROLE_PERMISSIONS[role];
  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission));

  return (
    <main className="min-h-screen bg-[#f4ece4]">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full space-y-4 px-6 py-8 md:px-10 xl:px-14 2xl:px-20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[#f4ece4]/70">Back-office Sillage Immo</p>
              <h1 className="text-3xl font-semibold">{title}</h1>
              {description ? <p className="max-w-3xl text-sm text-[#f4ece4]/78">{description}</p> : null}
            </div>
            <div className="space-y-2 text-right">
              <p className="text-sm text-[#f4ece4]/78">
                {profileName ?? "Acces admin"} · {ADMIN_ROLE_LABELS[role]}
              </p>
              <div className="flex justify-end">
                <AdminSignOutButton />
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded border border-[#f4ece4]/30 px-3 py-2 text-sm text-[#f4ece4]/88 transition hover:bg-[#f4ece4]/10"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="px-6 py-8 md:px-10 xl:px-14 2xl:px-20">{children}</section>
    </main>
  );
}
