import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { listClients } from "@/services/clients/client-profile.service";
import { hasAdminPermission } from "@/lib/admin/auth";
export const dynamic = "force-dynamic";

type ClientsAdminPageProps = {
  searchParams?: Promise<{ search?: string; status?: string }>;
};

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR");
const formatAccountStatus = (item: {
  authUserId: string | null;
  hasAcceptedInvitation: boolean;
}) => {
  if (item.authUserId) return "Compte active";
  if (item.hasAcceptedInvitation) return "Compte active";
  return "Prospect";
};

export default async function ClientsAdminPage({ searchParams }: ClientsAdminPageProps) {
  const context = await requireAdminPagePermission("clients.view");
  const filters = (await searchParams) ?? {};
  const { items, total } = await listClients({
    search: filters.search,
    status: filters.status as "all" | "account_active" | "invite_pending" | "prospect" | undefined,
    limit: 50,
  });

  const canCreate = hasAdminPermission(context, "clients.create");

  return (
    <AdminShell
      title="Clients vendeurs"
      description="Gerer les espaces client, rattacher leads et biens, affecter les conseillers et inviter les clients."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="grid flex-1 gap-3 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-5 md:grid-cols-3">
          <input
            className="rounded border px-3 py-2 text-sm"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Nom, email, telephone"
          />
          <select className="rounded border px-3 py-2 text-sm" name="status" defaultValue={filters.status ?? "all"}>
            <option value="all">Tous</option>
            <option value="account_active">Compte active</option>
            <option value="invite_pending">Invite en attente</option>
            <option value="prospect">Prospect</option>
          </select>
          <button className="sillage-btn rounded px-4 py-2 text-sm">Filtrer</button>
        </form>
        {canCreate && (
          <Link
            className="sillage-btn rounded px-4 py-2 text-sm"
            href="/admin/clients/new"
          >
            Creer un client
          </Link>
        )}
      </div>

      <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] bg-white/70 p-6">
        <div className="mb-3">
          <p className="text-sm text-[#141446]/75">{total} client(s)</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(20,20,70,0.2)] text-left">
              <th className="p-3 font-medium">Nom</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Telephone</th>
              <th className="p-3 font-medium">Projets</th>
              <th className="p-3 font-medium">Statut</th>
              <th className="p-3 font-medium">Derniere activite</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="p-3 text-[#141446]/70" colSpan={7}>
                  Aucun client pour le moment.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-[rgba(20,20,70,0.15)] last:border-0">
                  <td className="p-3">{(item.fullName ?? `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim()) || "-"}</td>
                  <td className="p-3">{item.email}</td>
                  <td className="p-3">{item.phone ?? "-"}</td>
                  <td className="p-3">{item.sellerProjectCount}</td>
                  <td className="p-3">{formatAccountStatus(item)}</td>
                  <td className="p-3">{item.lastLoginAt ? formatDate(item.lastLoginAt) : "-"}</td>
                  <td className="p-3">
                    <Link className="underline text-[#141446]" href={`/admin/clients/${item.id}`}>
                      Voir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
