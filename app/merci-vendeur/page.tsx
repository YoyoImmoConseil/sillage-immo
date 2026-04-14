import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readMerciVendeurAccessToken } from "@/lib/sellers/merci-vendeur-access";
import { getSellerMetadataSections } from "@/services/sellers/seller-metadata";

type MerciVendeurPageProps = {
  searchParams: Promise<{ access?: string; leadId?: string }>;
};

const formatEur = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

export default async function MerciVendeurPage({ searchParams }: MerciVendeurPageProps) {
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

  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-12 md:px-10 xl:px-14 2xl:px-20">
          <h1 className="text-2xl font-semibold">Merci, votre demande est bien enregistrée.</h1>
        </div>
      </section>
      <section className="bg-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-6 space-y-5">
            {valuation ? (
              <div className="rounded-xl border border-[rgba(20,20,70,0.16)] bg-white/60 p-4 space-y-2">
                <p className="text-sm opacity-70">Votre bien</p>
                <p className="font-medium text-[#141446]">
                  {[valuation.addressLabel, valuation.cityZipCode, valuation.cityName]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <p className="sillage-editorial-text text-[#141446]">
                  {valuation.valuationPriceLow !== null || valuation.valuationPriceHigh !== null ? (
                    <>
                      Fourchette estimée :{" "}
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
                      Valeur estimée indicative : <strong>{formatEur(valuation.valuationPrice)}</strong>
                    </>
                  ) : (
                    "Votre estimation automatique est en cours de finalisation. Un conseiller Sillage Immo vous partage très rapidement une fourchette fiable et contextualisée."
                  )}
                </p>
              </div>
            ) : null}
            <p className="sillage-editorial-text opacity-75">
              Un conseiller Sillage Immo vous recontacte rapidement pour cadrer la mise en vente
              et vous accompagner pas à pas jusqu&apos;à la concrétisation de votre projet.
            </p>
            <Link className="sillage-btn inline-block rounded px-4 py-2" href="/estimation">
              Revenir au parcours vendeur
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
