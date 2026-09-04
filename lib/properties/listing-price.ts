import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";
import { fromCents, toCents } from "@/lib/properties/money";
import type { PropertyPriceSnapshot } from "@/types/domain/properties";

export const LISTING_PRICE_COPY = {
  fr: {
    priceOnRequest: "Prix sur demande",
    perMonth: "/mois",
    chargesProvision: (amount: string) => `dont ${amount} de provision sur charges`,
    tenantFees: (total: string) => `Honoraires TTC à la charge du locataire : ${total}`,
    tenantFeesWithInventory: (total: string, inventory: string) =>
      `Honoraires TTC à la charge du locataire : ${total}, dont ${inventory} au titre de l'état des lieux`,
    securityDeposit: (amount: string) => `Dépôt de garantie : ${amount}`,
    rentSupplement: (amount: string) => `Complément de loyer : ${amount}`,
    saleBuyerFees: (amount: string) =>
      `Incluant ${amount} d'honoraires TTC à la charge de l'acquéreur`,
    saleBuyerFeesWithRate: (amount: string, rate: string) =>
      `Incluant ${amount} d'honoraires TTC à la charge de l'acquéreur (${rate} du prix hors honoraires)`,
    saleBuyerFeesUnknown: "Honoraires TTC à la charge de l'acquéreur",
    saleVendorFees: "Honoraires à la charge du vendeur",
  },
  en: {
    priceOnRequest: "Price on request",
    perMonth: "/mo",
    chargesProvision: (amount: string) => `of which ${amount} service charge provision`,
    tenantFees: (total: string) => `Tenant fees (incl. VAT): ${total}`,
    tenantFeesWithInventory: (total: string, inventory: string) =>
      `Tenant fees (incl. VAT): ${total}, of which ${inventory} for the inventory of fixtures`,
    securityDeposit: (amount: string) => `Security deposit: ${amount}`,
    rentSupplement: (amount: string) => `Rent supplement: ${amount}`,
    saleBuyerFees: (amount: string) => `Including ${amount} agency fees (incl. VAT) payable by the buyer`,
    saleBuyerFeesWithRate: (amount: string, rate: string) =>
      `Including ${amount} agency fees (incl. VAT) payable by the buyer (${rate} of the net price)`,
    saleBuyerFeesUnknown: "Agency fees (incl. VAT) payable by the buyer",
    saleVendorFees: "Agency fees payable by the vendor",
  },
  es: {
    priceOnRequest: "Precio a consultar",
    perMonth: "/mes",
    chargesProvision: (amount: string) => `de los cuales ${amount} de provisión de gastos`,
    tenantFees: (total: string) => `Honorarios IVA incl. a cargo del inquilino: ${total}`,
    tenantFeesWithInventory: (total: string, inventory: string) =>
      `Honorarios IVA incl. a cargo del inquilino: ${total}, de los cuales ${inventory} por el inventario`,
    securityDeposit: (amount: string) => `Depósito de garantía: ${amount}`,
    rentSupplement: (amount: string) => `Complemento de alquiler: ${amount}`,
    saleBuyerFees: (amount: string) =>
      `Incluye ${amount} de honorarios IVA incl. a cargo del comprador`,
    saleBuyerFeesWithRate: (amount: string, rate: string) =>
      `Incluye ${amount} de honorarios IVA incl. a cargo del comprador (${rate} del precio sin honorarios)`,
    saleBuyerFeesUnknown: "Honorarios IVA incl. a cargo del comprador",
    saleVendorFees: "Honorarios a cargo del vendedor",
  },
  ru: {
    priceOnRequest: "Цена по запросу",
    perMonth: "/мес",
    chargesProvision: (amount: string) => `в т.ч. ${amount} резерв на расходы`,
    tenantFees: (total: string) => `Комиссия с НДС за счет арендатора: ${total}`,
    tenantFeesWithInventory: (total: string, inventory: string) =>
      `Комиссия с НДС за счет арендатора: ${total}, из них ${inventory} за акт приёма-передачи`,
    securityDeposit: (amount: string) => `Залог: ${amount}`,
    rentSupplement: (amount: string) => `Доплата к аренде: ${amount}`,
    saleBuyerFees: (amount: string) => `Включая ${amount} комиссии с НДС за счет покупателя`,
    saleBuyerFeesWithRate: (amount: string, rate: string) =>
      `Включая ${amount} комиссии с НДС за счет покупателя (${rate} от цены без комиссии)`,
    saleBuyerFeesUnknown: "Комиссия с НДС за счет покупателя",
    saleVendorFees: "Комиссия за счет продавца",
  },
} as const;

export type ListingPriceSubline = {
  key: "charges" | "fees" | "deposit" | "supplement" | "saleFees";
  text: string;
};

/**
 * Legal rental mentions (fees, charges, deposit) always carry their cents:
 * they engage the agency contractually.
 */
export const formatRentalLegalAmount = (
  cents: number,
  locale: AppLocale,
  currency: string
) => {
  return formatCurrency(fromCents(cents), locale, currency || "EUR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const inferListingTransactionKind = (
  negotiation: string | null | undefined
): "sale" | "rental" => {
  return negotiation === "let" ? "rental" : "sale";
};

export const getListingDisplayAmountCents = (
  price: PropertyPriceSnapshot,
  fallbackAmount: number | null
) => {
  if (price.kind === "rental") {
    return (
      price.rentIncludingChargesCents ??
      price.rentExcludingChargesCents ??
      toCents(fallbackAmount)
    );
  }
  return toCents(fallbackAmount);
};

export const formatListingPrice = (input: {
  amountCents: number | null;
  currency: string;
  locale?: AppLocale;
  periodSuffix?: string;
}) => {
  const locale = input.locale ?? "fr";
  if (typeof input.amountCents !== "number") {
    return LISTING_PRICE_COPY[locale].priceOnRequest;
  }
  // Whole euros stay unsuffixed (sale prices, most rents); a headline amount
  // carrying cents shows them rather than being silently rounded.
  const fractionDigits = input.amountCents % 100 === 0 ? 0 : 2;
  const formatted = formatCurrency(
    fromCents(input.amountCents),
    locale,
    input.currency || "EUR",
    { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }
  );
  return input.periodSuffix ? `${formatted}${input.periodSuffix}` : formatted;
};

export const buildListingPriceSublines = (input: {
  price: PropertyPriceSnapshot;
  currency: string;
  locale: AppLocale;
  /**
   * Prix affiché (honoraires inclus), en centimes. Permet d'indiquer le taux
   * d'honoraires acquéreur rapporté au prix hors honoraires (arrêté du
   * 10 janvier 2017). Optionnel : sans lui, seul le montant est affiché.
   */
  displayAmountCents?: number | null;
}): ListingPriceSubline[] => {
  const copy = LISTING_PRICE_COPY[input.locale];
  const currency = input.currency || "EUR";

  if (input.price.kind === "sale") {
    // Mention obligatoire sur toute annonce de vente : qui paie les honoraires.
    // Sans information SweepBright, on considère les honoraires à la charge du
    // vendeur (cas standard de l'agence).
    if (input.price.feeChargeBearer !== "buyer") {
      return [{ key: "saleFees", text: copy.saleVendorFees }];
    }
    if (typeof input.price.feeAmountCents !== "number") {
      return [{ key: "saleFees", text: copy.saleBuyerFeesUnknown }];
    }
    const feeText = formatCurrency(fromCents(input.price.feeAmountCents), input.locale, currency);
    const netCents =
      typeof input.displayAmountCents === "number"
        ? input.displayAmountCents - input.price.feeAmountCents
        : null;
    if (netCents !== null && netCents > 0) {
      const rate = (input.price.feeAmountCents / netCents) * 100;
      const rateText = `${new Intl.NumberFormat(input.locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(rate)} %`;
      return [{ key: "saleFees", text: copy.saleBuyerFeesWithRate(feeText, rateText) }];
    }
    return [{ key: "saleFees", text: copy.saleBuyerFees(feeText) }];
  }

  const lines: ListingPriceSubline[] = [];
  const { chargesProvisionCents, totalTenantFeesCents, inventoryReportFeesCents } = input.price;

  if (typeof chargesProvisionCents === "number") {
    lines.push({
      key: "charges",
      text: copy.chargesProvision(
        formatRentalLegalAmount(chargesProvisionCents, input.locale, currency)
      ),
    });
  }

  if (typeof totalTenantFeesCents === "number") {
    const total = formatRentalLegalAmount(totalTenantFeesCents, input.locale, currency);
    lines.push({
      key: "fees",
      text:
        typeof inventoryReportFeesCents === "number"
          ? copy.tenantFeesWithInventory(
              total,
              formatRentalLegalAmount(inventoryReportFeesCents, input.locale, currency)
            )
          : copy.tenantFees(total),
    });
  }

  if (typeof input.price.securityDepositCents === "number") {
    lines.push({
      key: "deposit",
      text: copy.securityDeposit(
        formatRentalLegalAmount(input.price.securityDepositCents, input.locale, currency)
      ),
    });
  }

  if (typeof input.price.rentSupplementCents === "number") {
    lines.push({
      key: "supplement",
      text: copy.rentSupplement(
        formatRentalLegalAmount(input.price.rentSupplementCents, input.locale, currency)
      ),
    });
  }

  return lines;
};
