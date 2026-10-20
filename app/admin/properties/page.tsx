import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { ADMIN_PROPERTY_SECTIONS } from "@/lib/properties/admin-sections";
import { listAdminProperties } from "@/services/properties/manual-property.service";
import type { PropertyBusinessType } from "@/types/domain/properties";
import { PropertiesTable } from "./properties-table";

export const dynamic = "force-dynamic";

type AdminPropertiesPageProps = {
  searchParams?: Promise<{
    search?: string;
    source?: string;
    businessType?: string;
  }>;
};

export default async function AdminPropertiesPage({ searchParams }: AdminPropertiesPageProps) {
  const context = await requireAdminPagePermission("properties.view");
  const filters = (await searchParams) ?? {};
  const businessType =
    filters.businessType === "sale" || filters.businessType === "rental"
      ? (filters.businessType as PropertyBusinessType)
      : undefined;
  const properties = await listAdminProperties({
    search: filters.search,
    source: filters.source,
    businessType,
  });

  return (
    <AdminShell
      title="Biens"
      description="Catalogue interne des biens synchronises et des biens saisis manuellement."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="grid flex-1 gap-3 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-5 md:grid-cols-4">
          <input className="rounded border px-3 py-2 text-sm" name="search" defaultValue={filters.search ?? ""} placeholder="Titre, ville, type" aria-label="Rechercher un bien" />
          <select className="rounded border px-3 py-2 text-sm" name="source" defaultValue={filters.source ?? ""} aria-label="Filtrer par source">
            <option value="">Toutes les sources</option>
            <option value="manual">Manuel</option>
            <option value="sweepbright">SweepBright</option>
          </select>
          <select className="rounded border px-3 py-2 text-sm" name="businessType" defaultValue={filters.businessType ?? ""} aria-label="Filtrer par type de transaction">
            <option value="">Vente et location</option>
            <option value="sale">Vente</option>
            <option value="rental">Location</option>
          </select>
          <button className="sillage-btn rounded px-4 py-2 text-sm">Filtrer</button>
        </form>
        <Link href="/admin/properties/new" className="sillage-btn rounded px-4 py-2 text-sm">
          Ajouter un bien manuel
        </Link>
      </div>

      <div className="space-y-6">
        {ADMIN_PROPERTY_SECTIONS.map((section) => {
          const items = properties.filter((property) => property.section === section.key);
          return (
            <section key={section.key} className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-2">
              <header className="flex flex-wrap items-baseline justify-between gap-2 px-3 pb-2 pt-3">
                <h2 className="text-lg font-semibold text-navy">
                  {section.title}
                  <span className="ml-2 text-sm font-normal text-navy/60">
                    {items.length} bien{items.length > 1 ? "s" : ""}
                  </span>
                </h2>
                <p className="text-xs text-navy/60">{section.description}</p>
              </header>
              <PropertiesTable items={items} emptyLabel="Aucun bien dans cette section." />
            </section>
          );
        })}
      </div>
    </AdminShell>
  );
}
