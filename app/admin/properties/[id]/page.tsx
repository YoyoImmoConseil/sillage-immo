import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission, hasAdminPermission } from "@/lib/admin/auth";
import { listMatchesForProperty } from "@/services/buyers/buyer-matching.service";
import { getAdminPropertyDetail } from "@/services/properties/manual-property.service";
import { PropertyForm } from "../property-form";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AttachPropertyToProjectButton } from "./attach-property-to-project-button";
import { PropertyLocationMap } from "@/app/components/property-location-map";

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

  const { data: projectProps } = await supabaseAdmin
    .from("project_properties")
    .select("id, client_project_id")
    .eq("property_id", id)
    .is("unlinked_at", null);

  type ProjectPropRow = { id: string; client_project_id: string };
  const projectIds = ((projectProps ?? []) as ProjectPropRow[]).map((p) => p.client_project_id);
  type ProjectRow = { id: string; client_profile_id: string };
  type ProfileRow = { id: string; full_name: string | null };
  let projectDetails: Array<{ client_project_id: string; client_profile_id: string; client_profile: { full_name: string | null } }> = [];
  if (projectIds.length > 0) {
    const { data: projects } = await supabaseAdmin
      .from("client_projects")
      .select("id, client_profile_id")
      .in("id", projectIds);
    const projectsTyped = (projects ?? []) as ProjectRow[];
    const profileIds = [...new Set(projectsTyped.map((p) => p.client_profile_id))];
    const { data: profiles } = await supabaseAdmin
      .from("client_profiles")
      .select("id, full_name")
      .in("id", profileIds);
    const profilesTyped = (profiles ?? []) as ProfileRow[];
    const profileMap = profilesTyped.reduce(
      (acc, p) => {
        acc[p.id] = p;
        return acc;
      },
      {} as Record<string, { full_name: string | null }>
    );
    projectDetails = projectsTyped.map((p) => ({
      client_project_id: p.id,
      client_profile_id: p.client_profile_id,
      client_profile: profileMap[p.client_profile_id] ?? { full_name: null },
    }));
  }

  const canEditClients = hasAdminPermission(context, "clients.edit");
  const fullAddress =
    detail.property.formatted_address ??
    [
      detail.property.street_number,
      detail.property.street,
      detail.property.postal_code,
      detail.property.city,
      detail.property.country,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");
  const hasLocationMap =
    typeof detail.property.latitude === "number" && typeof detail.property.longitude === "number";

  return (
    <AdminShell
      title={detail.property.title ?? "Bien"}
      description="Gestion du bien et vue inverse des rapprochements acquéreurs."
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

        {hasLocationMap ? (
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
            <h2 className="text-xl font-semibold text-[#141446]">Emplacement</h2>
            <div className="mt-4">
              <PropertyLocationMap
                latitude={detail.property.latitude}
                longitude={detail.property.longitude}
                address={fullAddress || null}
                title={detail.property.title ?? "Bien"}
              />
            </div>
          </section>
        ) : null}

        {(canEditClients || projectDetails.length > 0) && (
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
            <h2 className="text-xl font-semibold text-[#141446]">Projets clients</h2>
            <div className="mt-4 space-y-3">
              {projectDetails.length === 0 ? (
                <p className="text-sm text-[#141446]/70">Aucun projet client rattaché.</p>
              ) : (
                projectDetails.map((p) => (
                  <div key={p.client_project_id} className="flex items-center justify-between rounded-2xl border border-[rgba(20,20,70,0.12)] p-4">
                    <span className="text-[#141446]">{p.client_profile.full_name ?? "Client"}</span>
                    <Link
                      href={`/admin/clients/${p.client_profile_id}/projects/${p.client_project_id}`}
                      className="text-sm underline">
                      Ouvrir le projet
                    </Link>
                  </div>
                ))
              )}
              {canEditClients && (
                <div className="mt-4">
                  <AttachPropertyToProjectButton propertyId={id} />
                </div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Acquéreurs compatibles</h2>
          <div className="mt-4 space-y-3">
            {matches.length === 0 ? (
              <p className="text-sm opacity-70">
                Aucun rapprochement calculé pour ce bien.
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
                      Ouvrir la fiche acquéreur
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
