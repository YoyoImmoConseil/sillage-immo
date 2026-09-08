import type { Metadata } from "next";
import Link from "next/link";
import {
  SILLAGE_ADDRESS_DISPLAY,
  SILLAGE_CONTACT_EMAIL,
  SILLAGE_LEGAL,
  SILLAGE_PHONE_DISPLAY,
  SILLAGE_PHONE_RAW,
} from "@/lib/brand/company";
import { getRequestLocale } from "@/lib/i18n/request";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import { LegalFacts, LegalPage, LegalSection } from "@/app/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({
    path: "/mentions-legales",
    locale,
    title: "Mentions légales | Sillage Immo",
    description:
      "Identité de l’éditeur du site sillage-immo.com, carte professionnelle, garantie financière, hébergeur et médiateur de la consommation.",
  });
}

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      eyebrow="Informations légales"
      title="Mentions légales"
      intro="Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique et à la loi n° 70-9 du 2 janvier 1970 (loi Hoguet)."
    >
      <LegalSection title="Éditeur du site">
        <LegalFacts
          items={[
            { label: "Dénomination sociale", value: SILLAGE_LEGAL.legalName },
            { label: "Nom commercial", value: SILLAGE_LEGAL.tradeName },
            { label: "Forme juridique", value: SILLAGE_LEGAL.legalForm },
            { label: "Capital social", value: SILLAGE_LEGAL.shareCapital },
            { label: "Siège social", value: SILLAGE_ADDRESS_DISPLAY },
            { label: "Immatriculation", value: SILLAGE_LEGAL.rcs },
            { label: "TVA intracommunautaire", value: SILLAGE_LEGAL.vatNumber },
            { label: "Représentant légal", value: SILLAGE_LEGAL.legalRepresentative },
            { label: "Directeur de la publication", value: SILLAGE_LEGAL.publicationDirector },
            { label: "Téléphone", value: SILLAGE_PHONE_DISPLAY },
            { label: "Email", value: SILLAGE_CONTACT_EMAIL },
          ]}
        />
      </LegalSection>

      <LegalSection title="Activité réglementée">
        <LegalFacts
          items={[
            { label: "Carte professionnelle", value: SILLAGE_LEGAL.professionalCard },
            {
              label: "Délivrée par",
              value: `${SILLAGE_LEGAL.professionalCardIssuer}, le ${SILLAGE_LEGAL.professionalCardIssuedAt}`,
            },
            { label: "Détention de fonds", value: SILLAGE_LEGAL.fundsHandlingTransaction },
            { label: "", value: SILLAGE_LEGAL.fundsHandlingManagement },
            { label: "Garantie financière", value: SILLAGE_LEGAL.financialGuarantee },
            { label: "Assurance RC professionnelle", value: SILLAGE_LEGAL.liabilityInsurance },
          ]}
        />
        <p>
          Les honoraires de l’agence sont consultables sur la page{" "}
          <Link href="/honoraires" className="underline underline-offset-2">
            Honoraires
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Médiation de la consommation">
        <p>
          Conformément aux articles L.611-1 et suivants du Code de la consommation, en cas de
          litige non résolu avec l’agence, vous pouvez recourir gratuitement au médiateur de la
          consommation suivant : {SILLAGE_LEGAL.mediator}. Toute réclamation doit d’abord être
          adressée par écrit à l’agence ({SILLAGE_CONTACT_EMAIL} ou par courrier au siège).
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>{SILLAGE_LEGAL.host}</p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L’ensemble des contenus du site (textes, photographies, logo, charte graphique, base de
          données d’annonces) est protégé par le droit d’auteur et le droit des bases de données.
          Toute reproduction ou réutilisation sans autorisation écrite de Sillage Immo est
          interdite. Les photographies des biens restent la propriété de leurs auteurs.
        </p>
        <p>
          Photographies d’illustration de Nice (pages Acheter, Vendre, Louer, L’agence) : Constantin,
          John Jason, Paul Rysz, Gabriel Tovar et Nick Karvounis, via Unsplash (licence Unsplash).
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>
          Les traitements de données personnelles réalisés via ce site sont décrits dans notre{" "}
          <Link href="/confidentialite" className="underline underline-offset-2">
            politique de confidentialité
          </Link>
          . Pour toute question : {SILLAGE_CONTACT_EMAIL} ·{" "}
          <a href={`tel:${SILLAGE_PHONE_RAW}`} className="underline underline-offset-2">
            {SILLAGE_PHONE_DISPLAY}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
