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

const getSellerEventCopy = (eventName: string, eventCategory: string) => {
  switch (eventName) {
    case "client_invitation.sent":
      return {
        title: "Votre accès à l'espace client est prêt",
        body: "Un lien de connexion sécurisé vous a été envoyé pour retrouver votre projet à tout moment.",
      };
    case "client_invitation.accepted":
      return {
        title: "Votre espace client est actif",
        body: "Vous pouvez maintenant suivre votre projet vendeur et retrouver vos informations en un seul endroit.",
      };
    case "project_property.linked_from_estimation":
    case "project_property.linked":
      return {
        title: "Votre bien a été ajouté à votre espace",
        body: "Les informations de votre bien sont désormais rattachées à votre projet pour un suivi plus clair.",
      };
    case "valuation.recorded":
      return {
        title: "Votre estimation est disponible",
        body: "Votre première fourchette de valeur a été enregistrée dans votre espace client.",
      };
    case "seller_project.created_from_lead":
      return {
        title: "Votre projet vendeur est ouvert",
        body: "Votre espace Sillage commence à se structurer autour de votre bien et de votre vente.",
      };
    case "advisor.assigned":
      return {
        title: "Un conseiller Sillage vous accompagne",
        body: "Votre projet est maintenant suivi par un interlocuteur dédié.",
      };
    default:
      return {
        title:
          eventCategory === "valuation"
            ? "Votre projet évolue"
            : eventCategory === "invitation"
              ? "Votre accès client progresse"
              : "Une nouvelle étape a été franchie",
        body: "Votre espace client a été mis à jour avec une nouvelle information concernant votre projet.",
      };
  }
};

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
          Retour à mes projets
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
                : "À définir"}
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
            <p className="text-xs uppercase text-[#141446]/60">Dernière connexion</p>
            <p className="mt-2 text-[#141446]">
              {detail.client.lastLoginAt ? formatDate(detail.client.lastLoginAt) : "Première connexion"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">Dernière estimation</h3>
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
                  {detail.valuation.syncedAt ? ` · Mise à jour le ${formatDate(detail.valuation.syncedAt)}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#141446]/75">
                Aucune estimation détaillée n&apos;est encore disponible.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">Bien rattaché</h3>
            {detail.properties.length === 0 ? (
              <p className="mt-4 text-sm text-[#141446]/75">Aucun bien n&apos;est encore rattaché à ce projet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.properties.map((property) => (
                  <div key={property.id} className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                    <p className="font-medium text-[#141446]">
                      {property.formattedAddress ?? "Adresse en cours de synchronisation"}
                    </p>
                    <p className="mt-1 text-sm text-[#141446]/75">
                      {property.propertyType ? formatPropertyTypeLabel(property.propertyType) : "Type non renseigné"}
                      {property.livingArea ? ` · ${property.livingArea} m²` : ""}
                      {property.isPrimary ? " · Bien principal" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">Historique récent</h3>
            {detail.events.length === 0 ? (
              <p className="mt-4 text-sm text-[#141446]/75">Aucun événement visible pour le moment.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.events.map((event) => (
                  <div key={event.id} className="flex flex-col gap-1 rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                    {(() => {
                      const copy = getSellerEventCopy(event.eventName, event.eventCategory);
                      return (
                        <>
                          <span className="text-xs uppercase text-[#141446]/55">{formatDate(event.createdAt)}</span>
                          <span className="text-sm font-medium text-[#141446]">{copy.title}</span>
                          <span className="text-sm text-[#141446]/72">{copy.body}</span>
                        </>
                      );
                    })()}
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
                Aucun conseiller n&apos;est encore affecté. Notre équipe reviendra vers vous.
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
                  Contacter l&apos;équipe Sillage Immo
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
          Retour à mes projets
        </Link>
      </div>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">
          {detail.kind === "buyer" ? "Projet acquéreur" : detail.detail.projectTypeLabel}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#141446]">
          {detail.detail.title ??
            (detail.kind === "buyer" ? "Projet acquéreur" : "Projet client")}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Statut projet</p>
            <p className="mt-2 text-[#141446]">{detail.detail.status}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Création</p>
            <p className="mt-2 text-[#141446]">
              {formatDate(detail.detail.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h3 className="text-xl font-semibold text-[#141446]">
          {detail.kind === "buyer" ? "Recherche rattachée" : "Projet en préparation"}
        </h3>
        <p className="mt-4 text-sm text-[#141446]/75">{detail.detail.message}</p>
        {detail.kind === "buyer" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-[#141446]/60">Zone de recherche</p>
              <p className="mt-2 text-[#141446]">
                {detail.detail.locationLabel ?? "Zone en cours de qualification"}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-[#141446]/60">Budget</p>
              <p className="mt-2 text-[#141446]">
                {detail.detail.budgetLabel ?? "Budget à préciser"}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-[#141446]/60">Statut recherche</p>
              <p className="mt-2 text-[#141446]">
                {detail.detail.searchStatus ?? "Recherche en cours de qualification"}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-[#141446]/60">Financement</p>
              <p className="mt-2 text-[#141446]">
                {detail.detail.financingStatus ?? "Situation non renseignée"}
              </p>
            </div>
          </div>
        ) : null}
        {detail.kind === "buyer" && (detail.detail.propertyTypes.length > 0 || detail.detail.roomsMin || detail.detail.livingAreaMin) ? (
          <p className="mt-4 text-sm text-[#141446]/70">
            {detail.detail.propertyTypes.length > 0
              ? `Types recherchés : ${detail.detail.propertyTypes.join(", ")}`
              : "Types de biens à préciser"}
            {detail.detail.roomsMin ? ` · ${detail.detail.roomsMin} pièce(s) min.` : ""}
            {detail.detail.livingAreaMin ? ` · ${detail.detail.livingAreaMin} m² min.` : ""}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-[#141446]/70">
          Votre compte peut déjà accueillir plusieurs projets. Le détail de ce parcours continuera à
          s&apos;enrichir sans changer votre mode de connexion.
        </p>
      </section>
    </div>
  );
}
