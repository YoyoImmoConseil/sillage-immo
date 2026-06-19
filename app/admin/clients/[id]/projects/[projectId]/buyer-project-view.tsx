import Link from "next/link";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import type { BuyerLeadSnapshot, BuyerSearchProfileSnapshot } from "@/types/domain/buyers";
import type { BuyerMatchListItem } from "@/services/buyers/buyer-matching.service";

type BuyerProjectViewProps = {
  buyerLeadId: string;
  project: {
    title: string | null;
    status: string;
    createdAt: string;
  };
  client: {
    fullName: string | null;
    email: string;
    phone: string | null;
    authUserId: string | null;
    lastLoginAt: string | null;
  };
  lead: BuyerLeadSnapshot;
  searchProfile: BuyerSearchProfileSnapshot | null;
  matches: BuyerMatchListItem[];
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR") : "-";

const formatPrice = (value: number | null) =>
  typeof value === "number" ? `${value.toLocaleString("fr-FR")} €` : null;

const formatRange = (min: number | null, max: number | null, unit = "") => {
  const suffix = unit ? ` ${unit}` : "";
  if (typeof min === "number" && typeof max === "number") return `${min} – ${max}${suffix}`;
  if (typeof min === "number") return `≥ ${min}${suffix}`;
  if (typeof max === "number") return `≤ ${max}${suffix}`;
  return null;
};

const formatBudget = (min: number | null, max: number | null) => {
  const minLabel = formatPrice(min);
  const maxLabel = formatPrice(max);
  if (minLabel && maxLabel) return `${minLabel} – ${maxLabel}`;
  if (minLabel) return `À partir de ${minLabel}`;
  if (maxLabel) return `Jusqu'à ${maxLabel}`;
  return null;
};

const formatBool = (value: boolean | null) => {
  if (value === null) return null;
  return value ? "Oui" : "Non";
};

const CriteriaRow = ({ label, value }: { label: string; value: string | null }) =>
  value ? (
    <div>
      <p className="text-xs uppercase text-navy/60">{label}</p>
      <p className="text-navy">{value}</p>
    </div>
  ) : null;

export function BuyerProjectView({
  buyerLeadId,
  project,
  client,
  lead,
  searchProfile,
  matches,
}: BuyerProjectViewProps) {
  const businessLabel = searchProfile?.businessType === "rental" ? "Location" : "Achat";
  const zone =
    (searchProfile?.cities ?? []).join(", ") || searchProfile?.locationText || null;
  const accountActivated = Boolean(client.authUserId);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-navy/60">Projet acquéreur</p>
            <h2 className="text-xl font-semibold text-navy">
              {project.title ?? "Recherche acquéreur"}
            </h2>
            <p className="mt-1 text-sm text-navy/70">
              {businessLabel} · Statut projet : {project.status}
              {searchProfile ? ` · Recherche : ${searchProfile.status}` : ""}
            </p>
          </div>
          <Link
            href={`/admin/buyer-leads/${buyerLeadId}`}
            className="sillage-btn rounded px-4 py-2 text-sm"
          >
            Gérer la fiche acquéreur
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
        <h2 className="text-xl font-semibold text-navy">Acquéreur & accès</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <CriteriaRow label="Nom" value={client.fullName ?? lead.fullName} />
          <CriteriaRow label="Email" value={client.email} />
          <CriteriaRow label="Téléphone" value={client.phone ?? lead.phone} />
          <CriteriaRow
            label="Statut compte"
            value={accountActivated ? "Compte activé" : "Prospect (invitation envoyée)"}
          />
          <CriteriaRow label="Dernière connexion" value={formatDate(client.lastLoginAt)} />
          <CriteriaRow
            label="Email vérifié"
            value={lead.emailVerifiedAt ? formatDate(lead.emailVerifiedAt) : "Non vérifié"}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
        <h2 className="text-xl font-semibold text-navy">Critères de recherche</h2>
        {searchProfile ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <CriteriaRow label="Type de projet" value={businessLabel} />
            <CriteriaRow label="Zone" value={zone} />
            <CriteriaRow
              label="Types de bien"
              value={
                searchProfile.propertyTypes.length
                  ? searchProfile.propertyTypes
                      .map((type) => formatPropertyTypeLabel(type) ?? type)
                      .join(", ")
                  : null
              }
            />
            <CriteriaRow
              label="Budget"
              value={formatBudget(searchProfile.budgetMin, searchProfile.budgetMax)}
            />
            <CriteriaRow
              label="Pièces"
              value={formatRange(searchProfile.roomsMin, searchProfile.roomsMax)}
            />
            <CriteriaRow
              label="Chambres (min)"
              value={
                typeof searchProfile.bedroomsMin === "number"
                  ? String(searchProfile.bedroomsMin)
                  : null
              }
            />
            <CriteriaRow
              label="Surface"
              value={formatRange(searchProfile.livingAreaMin, searchProfile.livingAreaMax, "m²")}
            />
            <CriteriaRow
              label="Étage"
              value={formatRange(searchProfile.floorMin, searchProfile.floorMax)}
            />
            <CriteriaRow label="Terrasse / extérieur" value={formatBool(searchProfile.requiresTerrace)} />
            <CriteriaRow label="Ascenseur" value={formatBool(searchProfile.requiresElevator)} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-navy/70">Aucun profil de recherche actif.</p>
        )}
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
        <h2 className="text-xl font-semibold text-navy">Biens compatibles</h2>
        <div className="mt-4 grid gap-3">
          {matches.length === 0 ? (
            <p className="text-sm opacity-70">
              Aucun rapprochement calculé pour le moment.
            </p>
          ) : (
            matches.map((match) => (
              <article
                key={match.id}
                className="rounded-2xl border border-[rgba(20,20,70,0.14)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-navy">{match.title ?? "Bien sans titre"}</h3>
                    <p className="text-sm text-navy/70">
                      {match.city ?? "-"} · {formatPropertyTypeLabel(match.propertyType) ?? "-"} ·{" "}
                      {formatPrice(match.priceAmount) ?? "Prix n.c."} · Score {match.score}/100
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
  );
}
