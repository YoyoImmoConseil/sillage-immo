"use client";

import { useRouter } from "next/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import { SellerResultChat } from "./seller-result-chat";
import { SELLER_ESTIMATION_RESULT_COPY } from "./_copy/flow-copy";
import type { FlowForm, ValuationResult } from "./seller-api-first-flow.shared";

type SellerEstimationResultSectionProps = {
  locale?: AppLocale;
  valuation: ValuationResult;
  form: FlowForm;
  thankYouAccessToken: string;
  portalAccessEmail: string | null;
  portalAccessStatus: "idle" | "sending" | "sent" | "error";
  portalAccessMessage: string | null;
  onResendPortalAccess?: () => void;
};

export function SellerEstimationResultSection({
  locale = "fr",
  valuation,
  form,
  thankYouAccessToken,
  portalAccessEmail,
  portalAccessStatus,
  portalAccessMessage,
  onResendPortalAccess,
}: SellerEstimationResultSectionProps) {
  const router = useRouter();
  const copy = SELLER_ESTIMATION_RESULT_COPY[locale];
  const formatLocalizedEur = (value: number) => formatCurrency(value, locale, "EUR");

  return (
    <section className="rounded-2xl border border-[rgba(20,20,70,0.2)] bg-[#f4ece4] p-6 space-y-3">
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="text-sm opacity-75">
        {valuation.addressLabel ?? form.propertyAddress} {valuation.cityZipCode ?? form.postalCode}{" "}
        {valuation.cityName ?? form.city}
      </p>
      <p className="text-sm">
        {valuation.valuationPriceLow !== null || valuation.valuationPriceHigh !== null ? (
          <>
            {copy.range} :{" "}
            <strong>
              {valuation.valuationPriceLow !== null ? formatLocalizedEur(valuation.valuationPriceLow) : "-"} -{" "}
              {valuation.valuationPriceHigh !== null ? formatLocalizedEur(valuation.valuationPriceHigh) : "-"}
            </strong>
          </>
        ) : valuation.valuationPrice !== null ? (
          <>
            {copy.value} : <strong>{formatLocalizedEur(valuation.valuationPrice)}</strong>
          </>
        ) : (
          <>{copy.pending}</>
        )}
      </p>
      <div className="rounded-xl border border-[rgba(20,20,70,0.22)] bg-[rgba(244,236,228,0.9)] p-4 space-y-2">
        <h3 className="text-sm font-semibold">{copy.why}</h3>
        <ul className="text-sm space-y-2 list-disc pl-5">
          <li>
            Positionnement premium local à Nice et sur la Côte d&apos;Azur pour capter des acheteurs
            qualifiés.
          </li>
          <li>
            Stratégie de mise en vente sur mesure (prix, présentation, ciblage, diffusion) pour
            accélérer les visites utiles.
          </li>
          <li>
            Accompagnement complet : diagnostics, documents syndic, cadrage juridique et négociation.
          </li>
        </ul>
        <p className="text-xs opacity-70">
          Objectif : vous aider à vendre au bon prix, dans le bon délai, avec un pilotage clair à
          chaque étape.
        </p>
      </div>
      <div className="rounded-xl border border-[rgba(20,20,70,0.22)] p-4 space-y-1">
        <p className="text-sm font-medium">{copy.next}</p>
        <p className="text-sm opacity-80">
          Finalisez votre demande pour recevoir un appel de cadrage avec un interlocuteur unique et un
          plan de commercialisation sur-mesure.
        </p>
      </div>
      {portalAccessStatus !== "idle" || portalAccessMessage ? (
        <div className="rounded-xl border border-[rgba(20,20,70,0.22)] bg-[rgba(244,236,228,0.9)] p-4 space-y-2">
          <p className="text-sm font-medium">{copy.portal}</p>
          {portalAccessMessage ? <p className="text-sm opacity-80">{portalAccessMessage}</p> : null}
          {portalAccessStatus === "sent" && portalAccessEmail ? (
            <p className="text-xs opacity-70">
              {copy.portalHint}
            </p>
          ) : null}
          {portalAccessStatus === "sending" ? (
            <p className="text-xs opacity-70">{copy.portalSending}</p>
          ) : null}
          {portalAccessStatus === "error" && onResendPortalAccess ? (
            <button
              type="button"
              className="rounded border border-[#141446]/20 px-4 py-2 text-sm text-[#141446]"
              onClick={onResendPortalAccess}
            >
              {copy.resend}
            </button>
          ) : null}
        </div>
      ) : null}
      <SellerResultChat accessToken={thankYouAccessToken} locale={locale} />
      <button
        type="button"
        className="sillage-btn rounded px-4 py-2 text-sm"
        onClick={() =>
          router.push(
            `${localizePath("/merci-vendeur", locale)}?access=${encodeURIComponent(thankYouAccessToken)}`
          )
        }
      >
        {copy.finalize}
      </button>
    </section>
  );
}
