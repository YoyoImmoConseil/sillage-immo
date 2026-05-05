import {
  listVisitsForProperty,
  type PropertyVisitAdminView,
} from "@/services/properties/property-visit.service";

type PropertyVisitsAdminPanelProps = {
  propertyId: string;
};

const formatDateTime = (iso: string | null): string => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const STATUS_LABEL: Record<PropertyVisitAdminView["status"], string> = {
  scheduled: "Planifiée",
  updated: "Modifiée",
  cancelled: "Annulée",
  completed: "Effectuée",
};

const STATUS_BADGE_CLASS: Record<PropertyVisitAdminView["status"], string> = {
  scheduled: "bg-[#141446]/10 text-[#141446]",
  updated: "bg-amber-100 text-amber-900",
  cancelled: "bg-rose-100 text-rose-900",
  completed: "bg-emerald-100 text-emerald-900",
};

const formatDuration = (minutes: number | null): string => {
  if (typeof minutes !== "number") return "—";
  return `${minutes} min`;
};

const renderContact = (contact: PropertyVisitAdminView["contact"]) => {
  const lines: string[] = [];
  if (contact.name) lines.push(contact.name);
  const meta: string[] = [];
  if (contact.email) meta.push(contact.email);
  if (contact.phone) meta.push(contact.phone);
  if (meta.length > 0) lines.push(meta.join(" · "));
  if (lines.length === 0) return "—";
  return lines.join(" — ");
};

const VisitCard = ({ visit }: { visit: PropertyVisitAdminView }) => {
  const hasFeedback =
    visit.feedback.commentInternal !== null ||
    visit.feedback.commentPublic !== null ||
    visit.feedback.rating !== null ||
    visit.feedback.offerAmount !== null;

  return (
    <article className="rounded-2xl border border-[rgba(20,20,70,0.12)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#141446]">
            {formatDateTime(visit.scheduledAt)}
            {visit.endedAt ? (
              <span className="ml-1 text-[#141446]/70">
                → {formatDateTime(visit.endedAt)}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-[#141446]/60">
            Durée : {formatDuration(visit.durationMinutes)} · Reçu via Zapier ({visit.zapierEvent})
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[visit.status]}`}
        >
          {STATUS_LABEL[visit.status]}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#141446]/60">
            Conseiller en charge
          </dt>
          <dd className="text-[#141446]">
            {visit.negotiator.name ?? "—"}
            {visit.negotiator.email ? (
              <span className="block text-xs text-[#141446]/60">
                {visit.negotiator.email}
                {visit.negotiator.phone ? ` · ${visit.negotiator.phone}` : ""}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#141446]/60">
            Contact (acquéreur)
          </dt>
          <dd className="text-[#141446]">
            {renderContact(visit.contact)}
            <span className="block text-xs text-[#141446]/50">
              Initiales affichées au vendeur : {visit.contactInitials}
            </span>
          </dd>
        </div>
      </dl>

      {hasFeedback ? (
        <div className="mt-4 rounded-xl bg-[#141446]/5 p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-[#141446]/60">
            Retour de visite
          </p>
          {visit.feedback.rating !== null ? (
            <p className="mt-1 text-[#141446]">
              Note : {visit.feedback.rating} / 5
            </p>
          ) : null}
          {visit.feedback.offerAmount !== null ? (
            <p className="mt-1 text-[#141446]">
              Offre : {visit.feedback.offerAmount.toLocaleString("fr-FR")} €
            </p>
          ) : null}
          {visit.feedback.commentPublic ? (
            <p className="mt-2 text-[#141446]">
              <span className="text-xs uppercase tracking-wide text-[#141446]/60">
                Commentaire public :
              </span>{" "}
              {visit.feedback.commentPublic}
            </p>
          ) : null}
          {visit.feedback.commentInternal ? (
            <p className="mt-2 text-[#141446]">
              <span className="text-xs uppercase tracking-wide text-[#141446]/60">
                Commentaire interne :
              </span>{" "}
              {visit.feedback.commentInternal}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

export async function PropertyVisitsAdminPanel({
  propertyId,
}: PropertyVisitsAdminPanelProps) {
  let visits: PropertyVisitAdminView[] = [];
  let loadError: string | null = null;
  try {
    visits = await listVisitsForProperty(propertyId, "admin");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Erreur inconnue.";
  }

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-[#141446]">Visites</h2>
        <p className="text-xs text-[#141446]/60">
          Source : Zapier → SweepBright (toutes les PII sont visibles ici, masquées dans l&apos;espace client).
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {loadError ? (
          <p className="text-sm text-rose-700">
            Impossible de charger les visites : {loadError}
          </p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-[#141446]/70">
            Aucune visite reçue pour ce bien.
          </p>
        ) : (
          visits.map((visit) => <VisitCard key={visit.id} visit={visit} />)
        )}
      </div>
    </section>
  );
}
