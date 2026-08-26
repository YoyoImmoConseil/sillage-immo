import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";
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

const formatRentalLegalAmount = (value: number, locale: AppLocale, currency: string) => {
  return formatCurrency(value, locale, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const inferListingTransactionKind = (
  negotiation: string | null | undefined
): "sale" | "rental" => {
  return negotiation === "let" ? "rental" : "sale";
};

export const getListingDisplayAmount = (
  price: PropertyPriceSnapshot,
  fallbackAmount: number | null
) => {
  if (price.kind === "rental") {
    return price.rentIncludingCharges ?? price.rentExcludingCharges ?? fallbackAmount;
  }
  return fallbackAmount;
};

export const formatListingPrice = (input: {
  amount: number | null;
  currency: string;
  locale?: AppLocale;
  periodSuffix?: string;
}) => {
  const locale = input.locale ?? "fr";
  if (typeof input.amount !== "number") {
    return LISTING_PRICE_COPY[locale].priceOnRequest;
  }
  const formatted = formatCurrency(input.amount, locale, input.currency || "EUR");
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
    if (input.price.feeChargeBearer !== "buyer" || typeof input.price.feeAmount !== "number") {
      return [];
    }
    return [
      {
        key: "saleFees",
        text: copy.saleBuyerFees(formatCurrency(input.price.feeAmount, input.locale, currency)),
      },
    ];
  }

  const lines: ListingPriceSubline[] = [];
  if ((input.price.chargesProvision ?? 0) > 0) {
    lines.push({
      key: "charges",
      text: copy.chargesProvision(
        formatRentalLegalAmount(input.price.chargesProvision as number, input.locale, currency)
      ),
    });
  }

  if ((input.price.totalTenantFees ?? 0) > 0) {
    const total = formatRentalLegalAmount(
      input.price.totalTenantFees as number,
      input.locale,
      currency
    );
    lines.push({
      key: "fees",
      text:
        (input.price.inventoryReportFees ?? 0) > 0
          ? copy.tenantFeesWithInventory(
              total,
              formatRentalLegalAmount(
                input.price.inventoryReportFees as number,
                input.locale,
                currency
              )
            )
          : copy.tenantFees(total),
    });
  }

  if ((input.price.securityDeposit ?? 0) > 0) {
    lines.push({
      key: "deposit",
      text: copy.securityDeposit(
        formatRentalLegalAmount(input.price.securityDeposit as number, input.locale, currency)
      ),
    });
  }

  if ((input.price.rentSupplement ?? 0) > 0) {
    lines.push({
      key: "supplement",
      text: copy.rentSupplement(
        formatRentalLegalAmount(input.price.rentSupplement as number, input.locale, currency)
      ),
    });
  }

  return lines;
};
