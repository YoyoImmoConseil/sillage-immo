import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientSpacePageContext } from "@/lib/client-space/auth";
import { getClientPortalProjectDetail } from "@/services/clients/client-portal.service";
import type { SellerPortalProjectDetail } from "@/services/clients/seller-portal.service";
import { MANDATE_STATUS_LABELS, SELLER_PROJECT_STATUS_LABELS } from "@/types/domain/client";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";

type SellerProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR");

function SellerProjectDetailView({ detail }: { detail: SellerPortalProjectDetail }) {
  const appointmentUrl =
    detail.advisor?.bookingUrl ??
    detail.properties.find((property) => property.isPrimary && property.appointmentServiceUrl)
      ?.appointmentServiceUrl ??
    detail.properties.find((property) => property.appointmentServiceUrl)?.appointmentServiceUrl ??
    null;
  const advisorDisplayName =
    detail.advisor?.fullName ??
    ([detail.advisor?.firstName, detail.advisor?.lastName].filter(Boolean).join(" ").trim() || null) ??
    detail.advisor?.email ??
    null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Link href="/espace-client" className="text-sm underline text-[#141446]">
          Retour a mes projets
        </Link>
      </div>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">Projet vendeur</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#141446]">
          {detail.project.title ?? "Projet vendeur"}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Statut projet</p>
            <p className="mt-2 text-[#141446]">
              {detail.project.projectStatus
                ? SELLER_PROJECT_STATUS_LABELS[
                    detail.project.projectStatus as keyof typeof SELLER_PROJECT_STATUS_LABELS
                  ] ?? detail.project.projectStatus
                : "A definir"}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Mandat</p>
            <p className="mt-2 text-[#141446]">
              {detail.project.mandateStatus
                ? MANDATE_STATUS_LABELS[
                    detail.project.mandateStatus as keyof typeof MANDATE_STATUS_LABELS
                  ] ?? detail.project.mandateStatus
                : "Aucun"}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Derniere connexion</p>
            <p className="mt-2 text-[#141446]">
              {detail.client.lastLoginAt ? formatDate(detail.client.lastLoginAt) : "Premiere connexion"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">Derniere estimation</h3>
            {detail.valuation ? (
              <div className="mt-4 space-y-2 text-[#141446]">
                <p>
                  Valeur indicative :{" "}
                  <strong>
                    {detail.valuation.estimatedPrice
                      ? `${detail.valuation.estimatedPrice.toLocaleString("fr-FR")} €`
                      : "Non disponible"}
                  </strong>
                </p>
                {(detail.valuation.valuationLow || detail.valuation.valuationHigh) && (
                  <p className="text-sm text-[#141446]/75">
                    Fourchette :
                    {detail.valuation.valuationLow
                      ? ` ${detail.valuation.valuationLow.toLocaleString("fr-FR")} €`
                      : " n/a"}
                    {" - "}
                    {detail.valuation.valuationHigh
                      ? `${detail.valuation.valuationHigh.toLocaleString("fr-FR")} €`
                      : "n/a"}
                  </p>
                )}
                <p className="text-sm text-[#141446]/75">
                  Source : {detail.valuation.provider ?? "Sillage Immo"}
                  {detail.valuation.syncedAt ? ` · Mise a jour le ${formatDate(detail.valuation.syncedAt)}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#141446]/75">
                Aucune estimation detaillee n&apos;est encore disponible.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">Bien rattache</h3>
            {detail.properties.length === 0 ? (
              <p className="mt-4 text-sm text-[#141446]/75">Aucun bien n&apos;est encore rattache a ce projet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.properties.map((property) => (
                  <div key={property.id} className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                    <p className="font-medium text-[#141446]">
                      {property.formattedAddress ?? "Adresse en cours de synchronisation"}
                    </p>
                    <p className="mt-1 text-sm text-[#141446]/75">
                      {property.propertyType ? formatPropertyTypeLabel(property.propertyType) : "Type non renseigne"}
                      {property.livingArea ? ` · ${property.livingArea} m²` : ""}
                      {property.isPrimary ? " · Bien principal" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">Historique recent</h3>
            {detail.events.length === 0 ? (
              <p className="mt-4 text-sm text-[#141446]/75">Aucun evenement visible pour le moment.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.events.map((event) => (
                  <div key={event.id} className="flex flex-col gap-1 rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                    <span className="text-xs uppercase text-[#141446]/55">{formatDate(event.createdAt)}</span>
                    <span className="text-sm text-[#141446]">{event.eventName}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">Votre conseiller</h3>
            {detail.advisor ? (
              <div className="mt-4 space-y-2 text-sm text-[#141446]">
                <p className="font-medium text-base">{advisorDisplayName}</p>
                <p>
                  <a href={`mailto:${detail.advisor.email}`} className="underline">
                    {detail.advisor.email}
                  </a>
                </p>
                {detail.advisor.phone ? (
                  <p>
                    <a href={`tel:${detail.advisor.phone}`} className="underline">
                      {detail.advisor.phone}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#141446]/75">
                Aucun conseiller n&apos;est encore affecte. Notre equipe reviendra vers vous.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">Prochaine action</h3>
            <div className="mt-4 space-y-3 text-sm text-[#141446]">
              {appointmentUrl ? (
                <a
                  href={appointmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded bg-[#141446] px-4 py-2 text-[#f4ece4]"
                >
                  Prendre rendez-vous
                </a>
              ) : null}
              {detail.advisor ? (
                <a href={`mailto:${detail.advisor.email}`} className="block underline">
                  Contacter mon conseiller par email
                </a>
              ) : (
                <a href="mailto:contact@sillage-immo.com" className="block underline">
                  Contacter l&apos;equipe Sillage Immo
                </a>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export default async function SellerProjectPage({ params }: SellerProjectPageProps) {
  const context = await requireClientSpacePageContext();
  const { projectId } = await params;
  const detail = await getClientPortalProjectDetail({
    authUserId: context.authUserId,
    projectId,
  });

  if (!detail) {
    notFound();
  }

  if (detail.kind === "seller") {
    return <SellerProjectDetailView detail={detail.detail} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Link href="/espace-client" className="text-sm underline text-[#141446]">
          Retour a mes projets
        </Link>
      </div>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">
          {detail.kind === "buyer" ? "Projet acquereur" : detail.detail.projectTypeLabel}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#141446]">
          {detail.detail.title ??
            (detail.kind === "buyer" ? "Projet acquereur" : "Projet client")}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Statut projet</p>
            <p className="mt-2 text-[#141446]">{detail.detail.status}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Creation</p>
            <p className="mt-2 text-[#141446]">
              {formatDate(detail.detail.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h3 className="text-xl font-semibold text-[#141446]">Projet en preparation</h3>
        <p className="mt-4 text-sm text-[#141446]/75">{detail.detail.message}</p>
        <p className="mt-3 text-sm text-[#141446]/70">
          Votre compte peut deja accueillir plusieurs projets. Le detail de ce parcours sera active dans un
          prochain lot sans changer votre mode de connexion.
        </p>
      </section>
    </div>
  );
}
