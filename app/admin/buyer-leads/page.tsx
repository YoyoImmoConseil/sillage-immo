import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { listBuyerLeadsForAdmin } from "@/services/buyers/buyer-lead.service";

export const dynamic = "force-dynamic";

type BuyerLeadsPageProps = {
  searchParams?: Promise<{
    search?: string;
    status?: string;
    businessType?: string;
  }>;
};

export default async function BuyerLeadsAdminPage({ searchParams }: BuyerLeadsPageProps) {
  const context = await requireAdminPagePermission("leads.buyers.view");
  const filters = (await searchParams) ?? {};
  const leads = await listBuyerLeadsForAdmin(filters);

  return (
    <AdminShell
      title="Leads acquereurs"
      description="Recherche et qualification des projets d'achat ou de location."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <form className="mb-6 grid gap-3 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-5 md:grid-cols-4">
        <input className="rounded border px-3 py-2 text-sm" name="search" defaultValue={filters.search ?? ""} placeholder="Nom, email, telephone, notes" />
        <select className="rounded border px-3 py-2 text-sm" name="status" defaultValue={filters.status ?? ""}>
          <option value="">Tous les statuts</option>
          <option value="new">new</option>
          <option value="qualified">qualified</option>
          <option value="active_search">active_search</option>
          <option value="visit">visit</option>
          <option value="won">won</option>
          <option value="lost">lost</option>
        </select>
        <select className="rounded border px-3 py-2 text-sm" name="businessType" defaultValue={filters.businessType ?? ""}>
          <option value="">Achat et location</option>
          <option value="sale">Achat</option>
          <option value="rental">Location</option>
        </select>
        <button className="sillage-btn rounded px-4 py-2 text-sm">Filtrer</button>
      </form>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(20,20,70,0.14)] text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Nom</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Recherche</th>
              <th className="p-3">Budget</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td className="p-3 opacity-70" colSpan={7}>
                  Aucun lead acquereur.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-[rgba(20,20,70,0.1)] last:border-0">
                  <td className="p-3">{new Date(lead.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="p-3">{lead.fullName}</td>
                  <td className="p-3">
                    <div>{lead.email}</div>
                    <div className="opacity-70">{lead.phone ?? "-"}</div>
                  </td>
                  <td className="p-3">
                    {lead.searchProfile?.businessType === "rental" ? "Location" : "Achat"}
                    {lead.searchProfile?.cities.length ? ` · ${lead.searchProfile.cities.join(", ")}` : ""}
                  </td>
                  <td className="p-3">
                    {lead.searchProfile?.budgetMin ?? "-"} / {lead.searchProfile?.budgetMax ?? "-"}
                  </td>
                  <td className="p-3">{lead.status}</td>
                  <td className="p-3">
                    <Link href={`/admin/buyer-leads/${lead.id}`} className="underline">
                      Ouvrir
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
