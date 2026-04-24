import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import {
  getBuyerLeadDetailForAdmin,
  listBuyerLeadAdminProjects,
} from "@/services/buyers/buyer-lead.service";
import { listMatchesForBuyerLead } from "@/services/buyers/buyer-matching.service";
import { BuyerLeadForm } from "./buyer-lead-form";
import { BuyerLeadAdminPanel } from "./buyer-lead-admin-panel";

export const dynamic = "force-dynamic";

type BuyerLeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

const toStringValue = (value: number | null) => (typeof value === "number" ? String(value) : "");

export default async function BuyerLeadDetailPage({ params }: BuyerLeadDetailPageProps) {
  const context = await requireAdminPagePermission("leads.buyers.view");
  const { id } = await params;
  const detail = await getBuyerLeadDetailForAdmin(id);
  if (!detail) notFound();

  const matches = await listMatchesForBuyerLead(id);
  const adminProjects = await listBuyerLeadAdminProjects(id);

  return (
    <AdminShell
      title={detail.lead.fullName}
      description="Fiche projet acquereur et moteur de rapprochement."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4">
        <Link href="/admin/buyer-leads" className="text-sm underline text-[#141446]">
          Retour aux leads acquereurs
        </Link>
      </div>

      <div className="space-y-6">
        <BuyerLeadAdminPanel
          buyerLeadId={detail.lead.id}
          origin={detail.lead.origin}
          emailVerifiedAt={detail.lead.emailVerifiedAt}
          sweepbrightContactId={detail.lead.sweepbrightContactId}
          sweepbrightSyncedAt={detail.lead.sweepbrightSyncedAt}
          sweepbrightLastError={detail.lead.sweepbrightLastError}
        />

        {adminProjects.length > 0 ? (
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
            <h2 className="text-xl font-semibold text-[#141446]">
              Recherches sauvegardées ({adminProjects.length})
            </h2>
            <div className="mt-4 grid gap-3">
              {adminProjects.map((project) => (
                <article
                  key={project.clientProjectId}
                  className="rounded-2xl border border-[rgba(20,20,70,0.14)] p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#141446]">
                        {project.title ?? "Recherche acquéreur"}
                      </p>
                      <p className="text-[#141446]/70">
                        Statut projet : {project.status} ·{" "}
                        {project.searchProfile
                          ? `Recherche : ${project.searchProfile.status}`
                          : "Aucun profil de recherche actif"}
                      </p>
                      {project.searchProfile ? (
                        <p className="text-xs text-[#141446]/60">
                          {project.searchProfile.businessType === "rental"
                            ? "Location"
                            : "Achat"}{" "}
                          ·{" "}
                          {(project.searchProfile.cities ?? []).join(", ") ||
                            project.searchProfile.locationText ||
                            "Zone non précisée"}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/admin/client-projects/${project.clientProjectId}`}
                      className="text-sm underline"
                    >
                      Voir le projet client
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <BuyerLeadForm
          buyerLeadId={detail.lead.id}
          initial={{
            fullName: detail.lead.fullName,
            email: detail.lead.email,
            phone: detail.lead.phone ?? "",
            status: detail.lead.status,
            timeline: detail.lead.timeline ?? "",
            financingStatus: detail.lead.financingStatus ?? "",
            preferredContactChannel: detail.lead.preferredContactChannel ?? "",
            notes: detail.lead.notes ?? "",
            businessType: detail.searchProfile?.businessType ?? "sale",
            locationText: detail.searchProfile?.locationText ?? "",
            cities: detail.searchProfile?.cities.join(", ") ?? "",
            propertyTypes: detail.searchProfile?.propertyTypes.join(", ") ?? "",
            budgetMin: toStringValue(detail.searchProfile?.budgetMin ?? null),
            budgetMax: toStringValue(detail.searchProfile?.budgetMax ?? null),
            roomsMin: toStringValue(detail.searchProfile?.roomsMin ?? null),
            roomsMax: toStringValue(detail.searchProfile?.roomsMax ?? null),
            bedroomsMin: toStringValue(detail.searchProfile?.bedroomsMin ?? null),
            livingAreaMin: toStringValue(detail.searchProfile?.livingAreaMin ?? null),
            livingAreaMax: toStringValue(detail.searchProfile?.livingAreaMax ?? null),
            floorMin: toStringValue(detail.searchProfile?.floorMin ?? null),
            floorMax: toStringValue(detail.searchProfile?.floorMax ?? null),
            requiresTerrace:
              detail.searchProfile?.requiresTerrace === null || detail.searchProfile?.requiresTerrace === undefined
                ? ""
                : detail.searchProfile.requiresTerrace
                  ? "true"
                  : "false",
            requiresElevator:
              detail.searchProfile?.requiresElevator === null || detail.searchProfile?.requiresElevator === undefined
                ? ""
                : detail.searchProfile.requiresElevator
                  ? "true"
                  : "false",
          }}
        />

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Biens compatibles</h2>
          <div className="mt-4 grid gap-3">
            {matches.length === 0 ? (
              <p className="text-sm opacity-70">
                Aucun rapprochement calcule pour le moment. Enregistre la fiche puis lance un recalcul.
              </p>
            ) : (
              matches.map((match) => (
                <article key={match.id} className="rounded-2xl border border-[rgba(20,20,70,0.14)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#141446]">{match.title ?? "Bien sans titre"}</h3>
                      <p className="text-sm text-[#141446]/70">
                        {match.city ?? "-"} · {formatPropertyTypeLabel(match.propertyType) ?? "-"} · Score {match.score}/100
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link href={`/admin/properties/${match.propertyId}`} className="text-sm underline">
                        Ouvrir en admin
                      </Link>
                      <Link href={match.canonicalPath} className="text-sm underline">
                        Voir la fiche publique
                      </Link>
                    </div>
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
