import Link from "next/link";
import { formatDateTime } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import type { ClientPortalProjectDetailResolver } from "@/services/clients/client-portal.service";
import type { AppLocale } from "@/lib/i18n/config";
import { buyerProjectCopy } from "./buyer-project-copy";

export function BuyerProjectDetailView({
  detail,
  locale,
}: {
  detail: Exclude<ClientPortalProjectDetailResolver, { kind: "seller" }>;
  locale: AppLocale;
}) {
  const copy = buyerProjectCopy[locale];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Link href={localizePath("/espace-client", locale)} className="text-sm underline text-navy">
          {copy.back}
        </Link>
      </div>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-navy/60">
          {detail.kind === "buyer" ? copy.buyer : detail.detail.projectTypeLabel}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-navy">
          {detail.detail.title ?? (detail.kind === "buyer" ? copy.buyer : copy.client)}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-navy/60">{copy.status}</p>
            <p className="mt-2 text-navy">{detail.detail.status}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-navy/60">{copy.createdAt}</p>
            <p className="mt-2 text-navy">
              {formatDateTime(detail.detail.createdAt, locale)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h3 className="text-xl font-semibold text-navy">
          {detail.kind === "buyer" ? copy.linkedSearch : copy.preparing}
        </h3>
        <p className="mt-4 text-sm text-navy/75">{detail.detail.message}</p>
        {detail.kind === "buyer" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-navy/60">{copy.searchArea}</p>
              <p className="mt-2 text-navy">
                {detail.detail.locationLabel ?? copy.searchAreaFallback}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-navy/60">{copy.budget}</p>
              <p className="mt-2 text-navy">
                {detail.detail.budgetLabel ?? copy.budgetFallback}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-navy/60">{copy.searchStatus}</p>
              <p className="mt-2 text-navy">
                {detail.detail.searchStatus ?? copy.searchStatusFallback}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-navy/60">{copy.financing}</p>
              <p className="mt-2 text-navy">
                {detail.detail.financingStatus ?? copy.financingFallback}
              </p>
            </div>
          </div>
        ) : null}
        {detail.kind === "buyer" && (detail.detail.propertyTypes.length > 0 || detail.detail.roomsMin || detail.detail.livingAreaMin) ? (
          <p className="mt-4 text-sm text-navy/70">
            {detail.detail.propertyTypes.length > 0
              ? `${copy.searchedTypes} : ${detail.detail.propertyTypes.join(", ")}`
              : copy.typesFallback}
            {detail.detail.roomsMin ? ` · ${detail.detail.roomsMin} pièce(s) min.` : ""}
            {detail.detail.livingAreaMin ? ` · ${detail.detail.livingAreaMin} m² min.` : ""}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-navy/70">
          {copy.multiProject}
        </p>
      </section>
    </div>
  );
}
