import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { TimeoutError, withTimeout } from "@/lib/async/timeout";
import {
  listClients,
  type ClientProfileListItem,
} from "@/services/clients/client-profile.service";
export const dynamic = "force-dynamic";

type ClientsAdminPageProps = {
  searchParams?: Promise<{ search?: string; status?: string }>;
};

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR");
const formatAccountStatus = (item: {
  authUserId: string | null;
  hasAcceptedInvitation: boolean;
}) => {
  if (item.authUserId) return "Compte actif";
  if (item.hasAcceptedInvitation) return "Compte actif";
  return "Prospect";
};

export default async function ClientsAdminPage({ searchParams }: ClientsAdminPageProps) {
  const filters = (await searchParams) ?? {};
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
    redirect("/admin/login");
  }

  if (context && !hasAdminPermission(context, "clients.view")) {
    redirect("/admin/forbidden");
  }

  if (!context) {
    return (
      <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
        <section className="mx-auto max-w-3xl rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
          <h1 className="text-3xl font-semibold text-[#141446]">Clients vendeurs</h1>
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

  let items: ClientProfileListItem[] = [];
  let total = 0;
  try {
    const result = await withTimeout(
      listClients({
        search: filters.search,
        status: filters.status as "all" | "account_active" | "invite_pending" | "prospect" | undefined,
        limit: 50,
      }),
      5000,
      "Le chargement des clients est trop lent."
    );
    items = result.items;
    total = result.total;
  } catch (error) {
    warningMessage =
      error instanceof TimeoutError
        ? error.message
        : "Impossible de charger la liste clients pour le moment.";
  }

  const canCreate = hasAdminPermission(context, "clients.create");

  return (
    <AdminShell
      title="Clients vendeurs"
      description="Gérer les espaces client, rattacher leads et biens, affecter les conseillers et inviter les clients."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="grid flex-1 gap-3 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-5 md:grid-cols-3">
          <input
            className="rounded border px-3 py-2 text-sm"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Nom, email, téléphone"
          />
          <select className="rounded border px-3 py-2 text-sm" name="status" defaultValue={filters.status ?? "all"}>
            <option value="all">Tous</option>
            <option value="account_active">Compte actif</option>
            <option value="invite_pending">Invitation en attente</option>
            <option value="prospect">Prospect</option>
          </select>
          <button className="sillage-btn rounded px-4 py-2 text-sm">Filtrer</button>
        </form>
        {canCreate && (
          <Link
            className="sillage-btn rounded px-4 py-2 text-sm"
            href="/admin/clients/new"
          >
            Créer un client
          </Link>
        )}
      </div>

      <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] bg-white/70 p-6">
        {warningMessage ? (
          <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warningMessage}
          </p>
        ) : null}
        <div className="mb-3">
          <p className="text-sm text-[#141446]/75">{total} client(s)</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(20,20,70,0.2)] text-left">
              <th className="p-3 font-medium">Nom</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Téléphone</th>
              <th className="p-3 font-medium">Projets</th>
              <th className="p-3 font-medium">Statut</th>
              <th className="p-3 font-medium">Dernière activité</th>
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
