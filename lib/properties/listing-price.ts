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
      `Incluant ${amount} d'honoraires à la charge de l'acquéreur`,
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
    saleBuyerFees: (amount: string) => `Including ${amount} fees payable by the buyer`,
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
      `Incluye ${amount} de honorarios a cargo del comprador`,
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
    saleBuyerFees: (amount: string) => `Включая ${amount} комиссии за счет покупателя`,
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
}): ListingPriceSubline[] => {
  const copy = LISTING_PRICE_COPY[input.locale];
  const currency = input.currency || "EUR";

  if (input.price.kind === "sale") {
    if (input.price.feeChargeBearer !== "buyer" || typeof input.price.feeAmountCents !== "number") {
      return [];
    }
    return [
      {
        key: "saleFees",
        text: copy.saleBuyerFees(
          formatCurrency(fromCents(input.price.feeAmountCents), input.locale, currency)
        ),
      },
    ];
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
