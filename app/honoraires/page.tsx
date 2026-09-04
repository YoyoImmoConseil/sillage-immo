import type { Metadata } from "next";
import { SILLAGE_FEES } from "@/lib/brand/company";
import { getRequestLocale } from "@/lib/i18n/request";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import { LegalPage, LegalSection } from "@/app/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({
    path: "/honoraires",
    locale,
    title: "Honoraires de l’agence | Sillage Immo",
    description:
      "Barème des honoraires de Sillage Immo à Nice : vente, location et gestion. Affichage conforme à l’arrêté du 10 janvier 2017.",
  });
}

export default function HonorairesPage() {
  return (
    <LegalPage
      eyebrow="Barème"
      title="Honoraires de l’agence"
      intro="Barème applicable à compter de la date indiquée, affiché conformément à l’arrêté du 10 janvier 2017 relatif à l’information des consommateurs par les professionnels intervenant dans une transaction immobilière."
      updatedAt={SILLAGE_FEES.updatedAt}
    >
      <LegalSection title="Transaction — vente">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[rgba(20,20,70,0.2)] text-xs uppercase tracking-[0.12em] text-navy/60">
                <th className="py-2 pr-4 font-semibold">Prix de vente</th>
                <th className="py-2 font-semibold">Honoraires TTC</th>
              </tr>
            </thead>
            <tbody>
              {SILLAGE_FEES.saleTiers.map((tier) => (
                <tr key={tier.range} className="border-b border-[rgba(20,20,70,0.1)]">
                  <td className="py-2 pr-4">{tier.range}</td>
                  <td className="py-2 font-medium text-navy">{tier.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-navy/75">{SILLAGE_FEES.saleNote}</p>
      </LegalSection>

      <LegalSection title="Location">
        <p>{SILLAGE_FEES.rentalTenant}</p>
        <p>{SILLAGE_FEES.rentalLandlord}</p>
        <p className="text-sm text-navy/75">
          Le détail des honoraires (part locataire, état des lieux, dépôt de garantie) figure sur
          chaque annonce de location.
        </p>
      </LegalSection>

      <LegalSection title="Estimation">
        <p>
          L’estimation de votre bien et le premier rendez-vous conseil sont gratuits et sans
          engagement.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
