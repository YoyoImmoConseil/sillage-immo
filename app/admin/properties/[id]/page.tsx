import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { listMatchesForProperty } from "@/services/buyers/buyer-matching.service";
import { getAdminPropertyDetail } from "@/services/properties/manual-property.service";
import { PropertyForm } from "../property-form";

export const dynamic = "force-dynamic";

type AdminPropertyDetailPageProps = {
  params: Promise<{ id: string }>;
};

const toStringValue = (value: number | null) => (typeof value === "number" ? String(value) : "");

export default async function AdminPropertyDetailPage({ params }: AdminPropertyDetailPageProps) {
  const context = await requireAdminPagePermission("properties.view");
  const { id } = await params;
  const detail = await getAdminPropertyDetail(id);
  if (!detail) notFound();

  const matches = await listMatchesForProperty(id);

  return (
    <AdminShell
      title={detail.property.title ?? "Bien"}
      description="Gestion du bien et vue inverse des rapprochements acquereurs."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4 flex gap-3">
        <Link href="/admin/properties" className="text-sm underline text-[#141446]">
          Retour aux biens
        </Link>
        {detail.listing?.canonical_path ? (
          <Link href={detail.listing.canonical_path} className="text-sm underline text-[#141446]">
            Voir la fiche publique
          </Link>
        ) : null}
      </div>

      <div className="space-y-6">
        <PropertyForm
          mode="edit"
          propertyId={detail.property.id}
          source={detail.property.source}
          initial={{
            title: detail.property.title ?? "",
            description: detail.property.description ?? "",
            propertyType: detail.property.property_type ?? "",
            city: detail.property.city ?? "",
            postalCode: detail.property.postal_code ?? "",
            businessType: (detail.listing?.business_type ?? "sale") as "sale" | "rental",
            priceAmount: toStringValue(detail.listing?.price_amount ?? null),
            livingArea: toStringValue(detail.property.living_area ?? null),
            rooms: toStringValue(detail.property.rooms ?? null),
            bedrooms: toStringValue(detail.property.bedrooms ?? null),
            floor: toStringValue(detail.property.floor ?? null),
            hasTerrace:
              detail.property.has_terrace === null ? "" : detail.property.has_terrace ? "true" : "false",
            hasElevator:
              detail.property.has_elevator === null ? "" : detail.property.has_elevator ? "true" : "false",
            coverImageUrl: detail.listing?.cover_image_url ?? "",
            isPublished: detail.listing?.is_published ?? false,
          }}
        />

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Acquereurs compatibles</h2>
          <div className="mt-4 space-y-3">
            {matches.length === 0 ? (
              <p className="text-sm opacity-70">
                Aucun rapprochement calcule pour ce bien.
              </p>
            ) : (
              matches.map((match) => (
                <article key={match.id} className="rounded-2xl border border-[rgba(20,20,70,0.12)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#141446]">{match.fullName}</h3>
                      <p className="text-sm text-[#141446]/70">
                        {match.email} · {match.statusLabel} · Score {match.score}/100
                      </p>
                    </div>
                    <Link href={`/admin/buyer-leads/${match.buyerLeadId}`} className="text-sm underline">
                      Ouvrir la fiche acquereur
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
