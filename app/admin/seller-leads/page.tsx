import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { searchSellerLeads } from "@/services/admin/lead-search.service";

export const dynamic = "force-dynamic";

const formatDate = (value: string) => {
  return new Date(value).toLocaleString("fr-FR");
};

const formatStatusLabel = (status: string) => {
  switch (status) {
    case "new":
      return "Nouveau";
    case "to_call":
      return "A rappeler";
    case "qualified":
      return "Qualifié";
    case "closed":
      return "Clos";
    default:
      return status;
  }
};

const formatTimelineLabel = (timeline: string | null) => {
  switch (timeline) {
    case "already_listed":
      return "Deja mis en vente";
    case "list_now":
      return "Mise en vente maintenant";
    case "list_within_6_months":
      return "Mise en vente dans les 6 mois";
    case "self_sell_first":
      return "Commencer sans agence";
    case "early_reflection":
      return "Debut de reflexion";
    case "personal_information_only":
      return "Information personnelle uniquement";
    default:
      return timeline ?? "-";
  }
};

type SellerLeadsAdminPageProps = {
  searchParams?: Promise<{
    search?: string;
    status?: string;
    city?: string;
  }>;
};

export default async function SellerLeadsAdminPage({ searchParams }: SellerLeadsAdminPageProps) {
  const context = await requireAdminPagePermission("leads.sellers.view");
  const filters = (await searchParams) ?? {};
  const data = await searchSellerLeads(filters);

  return (
    <AdminShell
      title="Leads vendeurs"
      description="Recherche et pilotage commercial des leads vendeurs."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="grid flex-1 gap-3 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-5 md:grid-cols-4">
          <input className="rounded border px-3 py-2 text-sm" name="search" defaultValue={filters.search ?? ""} placeholder="Nom, email, telephone, message" />
          <input className="rounded border px-3 py-2 text-sm" name="city" defaultValue={filters.city ?? ""} placeholder="Ville" />
          <select className="rounded border px-3 py-2 text-sm" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Tous les statuts</option>
            <option value="new">Nouveau</option>
            <option value="to_call">A rappeler</option>
            <option value="qualified">Qualifie</option>
            <option value="closed">Clos</option>
          </select>
          <button className="sillage-btn rounded px-4 py-2 text-sm">Filtrer</button>
        </form>
        <Link className="text-sm underline text-[#141446]" href="/admin/leads">
          Vue transverse leads
        </Link>
      </div>
      <section className="bg-[#f4ece4]">
        <div className="w-full">
          <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-2">
            <div className="mb-3">
              <p className="px-3 pt-2 text-sm opacity-75">Derniers leads vendeurs</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(20,20,70,0.2)] text-left">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Nom</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Ville</th>
                  <th className="p-3 font-medium">Delai</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td className="p-3 opacity-70" colSpan={7}>
                      Aucun lead vendeur pour le moment.
                    </td>
                  </tr>
                ) : (
                  data.map((lead) => (
                    <tr key={lead.id} className="border-b border-[rgba(20,20,70,0.15)] last:border-0">
                      <td className="p-3">{formatDate(lead.created_at)}</td>
                      <td className="p-3">{lead.full_name}</td>
                      <td className="p-3">{lead.email}</td>
                      <td className="p-3">{lead.city ?? "-"}</td>
                      <td className="p-3">{formatTimelineLabel(lead.timeline)}</td>
                      <td className="p-3">{formatStatusLabel(lead.status)}</td>
                      <td className="p-3">
                        <Link className="underline" href={`/admin/seller-leads/${lead.id}`}>
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      </section>
    </AdminShell>
  );
}
