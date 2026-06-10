import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";
import {
  formatPropertyTypeLabel as formatLocalizedPropertyTypeLabel,
  getMandateStatusLabel,
  getSellerProjectStatusLabel,
} from "@/lib/i18n/domain";
import { localizePath } from "@/lib/i18n/routing";
import type { SellerPortalProjectDetail } from "@/services/clients/seller-portal.service";
import type { AppLocale } from "@/lib/i18n/config";
import { getSellerEventCopy } from "./seller-event-copy";
import { sellerProjectCopy } from "./seller-project-copy";

export function SellerProjectDetailView({
  detail,
  locale,
}: {
  detail: SellerPortalProjectDetail;
  locale: AppLocale;
}) {
  const copy = sellerProjectCopy[locale];
  const formatPortalDate = (value: string) => formatDateTime(value, locale);
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
        <Link href={localizePath("/espace-client", locale)} className="text-sm underline text-navy">
          {copy.back}
        </Link>
      </div>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-navy/60">{copy.sellerProject}</p>
        <h2 className="mt-2 text-2xl font-semibold text-navy">
          {detail.project.title ?? copy.sellerProject}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-navy/60">{copy.projectStatus}</p>
            <p className="mt-2 text-navy">
              {getSellerProjectStatusLabel(detail.project.projectStatus, locale) ?? copy.notDefined}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-navy/60">{copy.mandate}</p>
            <p className="mt-2 text-navy">
              {getMandateStatusLabel(detail.project.mandateStatus, locale) ?? copy.none}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-navy/60">{copy.lastLogin}</p>
            <p className="mt-2 text-navy">
              {detail.client.lastLoginAt ? formatPortalDate(detail.client.lastLoginAt) : copy.firstLogin}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-navy">{copy.valuation}</h3>
            {detail.valuation ? (
              <div className="mt-4 space-y-2 text-navy">
                <p>
                  {copy.indicative} :{" "}
                  <strong>
                    {detail.valuation.estimatedPrice
                      ? formatCurrency(detail.valuation.estimatedPrice, locale, "EUR")
                      : copy.unavailable}
                  </strong>
                </p>
                {(detail.valuation.valuationLow || detail.valuation.valuationHigh) && (
                  <p className="text-sm text-navy/75">
                    {copy.range} :
                    {detail.valuation.valuationLow
                      ? ` ${formatCurrency(detail.valuation.valuationLow, locale, "EUR")}`
                      : " n/a"}
                    {" - "}
                    {detail.valuation.valuationHigh
                      ? `${formatCurrency(detail.valuation.valuationHigh, locale, "EUR")}`
                      : "n/a"}
                  </p>
                )}
                <p className="text-sm text-navy/75">
                  {copy.source} : {detail.valuation.provider ?? "Sillage Immo"}
                  {detail.valuation.syncedAt ? ` · ${copy.updated} ${formatPortalDate(detail.valuation.syncedAt)}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-navy/75">
                {copy.noValuation}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-navy">{copy.linkedProperty}</h3>
            {detail.properties.length === 0 ? (
              <p className="mt-4 text-sm text-navy/75">{copy.noProperty}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.properties.map((property) => (
                  <Link
                    key={property.id}
                    href={localizePath(`/espace-client/biens/${property.id}`, locale)}
                    className="block rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4 transition-colors hover:border-[rgba(20,20,70,0.3)]"
                  >
                    <p className="font-medium text-navy">
                      {property.formattedAddress ?? copy.syncingAddress}
                    </p>
                    <p className="mt-1 text-sm text-navy/75">
                      {property.propertyType
                        ? formatLocalizedPropertyTypeLabel(property.propertyType, locale)
                        : copy.unknownType}
                      {property.livingArea ? ` · ${property.livingArea} m²` : ""}
                      {property.isPrimary ? ` · ${copy.primaryProperty}` : ""}
                    </p>
                    <p className="mt-3 text-sm underline text-navy">{copy.openProperty}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-navy">{copy.history}</h3>
            {detail.events.length === 0 ? (
              <p className="mt-4 text-sm text-navy/75">{copy.noEvents}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.events.map((event) => (
                  <div key={event.id} className="flex flex-col gap-1 rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                    {(() => {
                      const eventCopy = getSellerEventCopy(event.eventName, event.eventCategory, locale);
                      return (
                        <>
                          <span className="text-xs uppercase text-navy/55">{formatPortalDate(event.createdAt)}</span>
                          <span className="text-sm font-medium text-navy">{eventCopy.title}</span>
                          <span className="text-sm text-navy/72">{eventCopy.body}</span>
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
            <h3 className="text-xl font-semibold text-navy">{copy.advisor}</h3>
            {detail.advisor ? (
              <div className="mt-4 space-y-2 text-sm text-navy">
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
                {detail.advisor.bookingUrl ? (
                  <div className="pt-3">
                    <p className="mb-3 text-navy/75">{copy.advisorAvailability}</p>
                    <a
                      href={detail.advisor.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded bg-navy px-4 py-2 text-sand"
                      data-track-cta="client_advisor_booking_clicked"
                      data-track-location="project_advisor_card"
                    >
                      {copy.bookWithAdvisor}
                    </a>
                  </div>
                ) : (
                  <p className="pt-3 text-navy/75">{copy.advisorBookingPending}</p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-navy/75">
                {copy.noAdvisor}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-navy">{copy.nextAction}</h3>
            <div className="mt-4 space-y-3 text-sm text-navy">
              {appointmentUrl ? (
                <a
                  href={appointmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded bg-navy px-4 py-2 text-sand"
                  data-track-cta="client_advisor_booking_clicked"
                  data-track-location="project_next_action"
                >
                  {copy.book}
                </a>
              ) : null}
              {detail.advisor ? (
                <a href={`mailto:${detail.advisor.email}`} className="block underline">
                  {copy.contactAdvisor}
                </a>
              ) : (
                <a href="mailto:contact@sillage-immo.com" className="block underline">
                  {copy.contactTeam}
                </a>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
