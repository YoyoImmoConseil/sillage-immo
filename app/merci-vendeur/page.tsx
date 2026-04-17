import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { formatCurrency } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readMerciVendeurAccessToken } from "@/lib/sellers/merci-vendeur-access";
import { getSellerMetadataSections } from "@/services/sellers/seller-metadata";

type MerciVendeurPageProps = {
  searchParams: Promise<{ access?: string; leadId?: string }>;
};

export default async function MerciVendeurPage({ searchParams }: MerciVendeurPageProps) {
  const locale = await getRequestLocale();
  const params = await searchParams;
  const access = readMerciVendeurAccessToken(params.access ?? null);
  let valuation: {
    addressLabel: string | null;
    cityName: string | null;
    cityZipCode: string | null;
    valuationPrice: number | null;
    valuationPriceLow: number | null;
    valuationPriceHigh: number | null;
  } | null = null;

  if (access?.leadId) {
    const { data } = await supabaseAdmin
      .from("seller_leads")
      .select("property_address, city, postal_code, metadata")
      .eq("id", access.leadId)
      .maybeSingle();

    if (data?.metadata) {
      const { valuation: rawValuation } = getSellerMetadataSections(data.metadata);
      const normalized =
        rawValuation?.normalized && typeof rawValuation.normalized === "object"
          ? (rawValuation.normalized as Record<string, unknown>)
          : null;

      valuation = {
        addressLabel:
          (typeof normalized?.addressLabel === "string" ? normalized.addressLabel : null) ??
          data.property_address ??
          null,
        cityName:
          (typeof normalized?.cityName === "string" ? normalized.cityName : null) ?? data.city ?? null,
        cityZipCode:
          (typeof normalized?.cityZipCode === "string" ? normalized.cityZipCode : null) ??
          data.postal_code ??
          null,
        valuationPrice:
          typeof normalized?.valuationPrice === "number" ? normalized.valuationPrice : null,
        valuationPriceLow:
          typeof normalized?.valuationPriceLow === "number" ? normalized.valuationPriceLow : null,
        valuationPriceHigh:
          typeof normalized?.valuationPriceHigh === "number" ? normalized.valuationPriceHigh : null,
      };
    }
  }

  const copy = {
    fr: {
      title: "Merci, votre demande est bien enregistrée.",
      property: "Votre bien",
      range: "Fourchette estimée",
      value: "Valeur estimée indicative",
      pending:
        "Votre estimation automatique est en cours de finalisation. Un conseiller Sillage Immo vous partage très rapidement une fourchette fiable et contextualisée.",
      body:
        "Un conseiller Sillage Immo vous recontacte rapidement pour cadrer la mise en vente et vous accompagner pas à pas jusqu'à la concrétisation de votre projet.",
      back: "Revenir au parcours vendeur",
    },
    en: {
      title: "Thank you, your request has been recorded.",
      property: "Your property",
      range: "Estimated range",
      value: "Indicative estimated value",
      pending:
        "Your automatic valuation is being finalized. A Sillage Immo advisor will very soon share a reliable and contextualized range with you.",
      body:
        "A Sillage Immo advisor will contact you shortly to frame the sale and guide you step by step toward a successful outcome.",
      back: "Return to the seller journey",
    },
    es: {
      title: "Gracias, su solicitud ha quedado registrada.",
      property: "Su inmueble",
      range: "Rango estimado",
      value: "Valor estimado orientativo",
      pending:
        "Su valoración automática se está finalizando. Un asesor de Sillage Immo le compartirá muy pronto una horquilla fiable y contextualizada.",
      body:
        "Un asesor de Sillage Immo se pondrá en contacto con usted rápidamente para estructurar la venta y acompañarle paso a paso hasta la concreción de su proyecto.",
      back: "Volver al recorrido vendedor",
    },
    ru: {
      title: "Спасибо, ваша заявка успешно зарегистрирована.",
      property: "Ваш объект",
      range: "Оценочный диапазон",
      value: "Ориентировочная стоимость",
      pending:
        "Автоматическая оценка находится на финальной стадии. Консультант Sillage Immo очень скоро сообщит вам надежный и контекстный диапазон стоимости.",
      body:
        "Консультант Sillage Immo свяжется с вами в ближайшее время, чтобы структурировать продажу и сопровождать вас шаг за шагом до успешного завершения проекта.",
      back: "Вернуться к сценарию продавца",
    },
  }[locale];
  const formatEur = (value: number) => formatCurrency(value, locale, "EUR");

  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-12 md:px-10 xl:px-14 2xl:px-20">
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
        </div>
      </section>
      <section className="bg-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-6 space-y-5">
            {valuation ? (
              <div className="rounded-xl border border-[rgba(20,20,70,0.16)] bg-white/60 p-4 space-y-2">
                <p className="text-sm opacity-70">{copy.property}</p>
                <p className="font-medium text-[#141446]">
                  {[valuation.addressLabel, valuation.cityZipCode, valuation.cityName]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <p className="sillage-editorial-text text-[#141446]">
                  {valuation.valuationPriceLow !== null || valuation.valuationPriceHigh !== null ? (
                    <>
                      {copy.range} :{" "}
                      <strong>
                        {valuation.valuationPriceLow !== null
                          ? formatEur(valuation.valuationPriceLow)
                          : "-"}{" "}
                        -{" "}
                        {valuation.valuationPriceHigh !== null
                          ? formatEur(valuation.valuationPriceHigh)
                          : "-"}
                      </strong>
                    </>
                  ) : valuation.valuationPrice !== null ? (
                    <>
                      {copy.value} : <strong>{formatEur(valuation.valuationPrice)}</strong>
                    </>
                  ) : (
                    copy.pending
                  )}
                </p>
              </div>
            ) : null}
            <p className="sillage-editorial-text opacity-75">{copy.body}</p>
            <Link className="sillage-btn inline-block rounded px-4 py-2" href={localizePath("/estimation", locale)}>
              {copy.back}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
