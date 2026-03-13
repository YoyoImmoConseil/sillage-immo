import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { searchSellerLeads } from "@/services/admin/lead-search.service";
import { listBuyerLeadsForAdmin } from "@/services/buyers/buyer-lead.service";

export const dynamic = "force-dynamic";

type LeadsSearchPageProps = {
  searchParams?: Promise<{
    search?: string;
    status?: string;
    city?: string;
  }>;
};

export default async function AdminLeadSearchPage({ searchParams }: LeadsSearchPageProps) {
  const context = await requireAdminPagePermission("leads.sellers.view");
  const filters = (await searchParams) ?? {};

  const [sellerLeads, buyerLeads] = await Promise.all([
    searchSellerLeads(filters),
    listBuyerLeadsForAdmin({ search: filters.search, status: filters.status }),
  ]);

  return (
    <AdminShell
      title="Recherche leads"
      description="Vue transverse sur les leads vendeurs et acquereurs."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <form className="mb-6 grid gap-3 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-5 md:grid-cols-4">
        <input
          className="rounded border px-3 py-2 text-sm"
          name="search"
          defaultValue={filters.search ?? ""}
          placeholder="Nom, email, telephone, message"
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          name="city"
          defaultValue={filters.city ?? ""}
          placeholder="Ville vendeur"
        />
        <input
          className="rounded border px-3 py-2 text-sm"
          name="status"
          defaultValue={filters.status ?? ""}
          placeholder="Statut"
        />
        <button className="sillage-btn rounded px-4 py-2 text-sm">Rechercher</button>
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Leads vendeurs</h2>
          <div className="mt-4 space-y-3">
            {sellerLeads.length === 0 ? (
              <p className="text-sm opacity-70">Aucun resultat vendeur.</p>
            ) : (
              sellerLeads.map((lead) => (
                <article key={lead.id} className="rounded-2xl border border-[rgba(20,20,70,0.12)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#141446]">{lead.full_name}</h3>
                      <p className="text-sm text-[#141446]/70">
                        {lead.email} · {lead.city ?? "-"} · {lead.status}
                      </p>
                    </div>
                    <Link href={`/admin/seller-leads/${lead.id}`} className="text-sm underline">
                      Ouvrir
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Leads acquereurs</h2>
          <div className="mt-4 space-y-3">
            {buyerLeads.length === 0 ? (
              <p className="text-sm opacity-70">Aucun resultat acquereur.</p>
            ) : (
              buyerLeads.map((lead) => (
                <article key={lead.id} className="rounded-2xl border border-[rgba(20,20,70,0.12)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#141446]">{lead.fullName}</h3>
                      <p className="text-sm text-[#141446]/70">
                        {lead.email} · {lead.searchProfile?.businessType === "rental" ? "Location" : "Achat"} · {lead.status}
                      </p>
                    </div>
                    <Link href={`/admin/buyer-leads/${lead.id}`} className="text-sm underline">
                      Ouvrir
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
