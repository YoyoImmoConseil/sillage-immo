import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import { listAdminProperties } from "@/services/properties/manual-property.service";
import type { PropertyBusinessType } from "@/types/domain/properties";

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
          <input className="rounded border px-3 py-2 text-sm" name="search" defaultValue={filters.search ?? ""} placeholder="Titre, ville, type" />
          <select className="rounded border px-3 py-2 text-sm" name="source" defaultValue={filters.source ?? ""}>
            <option value="">Toutes les sources</option>
            <option value="manual">Manuel</option>
            <option value="sweepbright">SweepBright</option>
          </select>
          <select className="rounded border px-3 py-2 text-sm" name="businessType" defaultValue={filters.businessType ?? ""}>
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

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(20,20,70,0.14)] text-left">
              <th className="p-3">Titre</th>
              <th className="p-3">Source</th>
              <th className="p-3">Ville</th>
              <th className="p-3">Type</th>
              <th className="p-3">Publication</th>
              <th className="p-3">Prix</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 ? (
              <tr>
                <td className="p-3 opacity-70" colSpan={7}>
                  Aucun bien.
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <tr key={property.id} className="border-b border-[rgba(20,20,70,0.1)] last:border-0">
                  <td className="p-3">{property.title ?? "Bien sans titre"}</td>
                  <td className="p-3">{property.source}</td>
                  <td className="p-3">{property.city ?? "-"}</td>
                  <td className="p-3">
                    {property.businessType} · {formatPropertyTypeLabel(property.propertyType) ?? "-"}
                  </td>
                  <td className="p-3">{property.isPublished ? "Publie" : "Brouillon"}</td>
                  <td className="p-3">{property.priceAmount ?? "-"}</td>
                  <td className="p-3">
                    <Link href={`/admin/properties/${property.id}`} className="underline">
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
