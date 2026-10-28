import {
  SILLAGE_ADDRESS_CITY,
  SILLAGE_ADDRESS_POSTAL_CODE,
  SILLAGE_ADDRESS_STREET,
} from "@/lib/brand/company";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export type TeamCardJsonLdInput = {
  cardUrl: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string | null;
  email: string;
  phoneE164: string | null;
  imageUrl: string | null;
};

/**
 * schema.org Person rattaché à l'agence (RealEstateAgent déjà déclaré sur
 * l'accueil via son @id). Uniquement des données publiques de la carte :
 * nom, poste, téléphone, e-mail, photo, lieu de travail.
 */
export const buildTeamCardJsonLd = (input: TeamCardJsonLdInput) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${input.cardUrl}#person`,
  name: input.fullName,
  givenName: input.firstName,
  familyName: input.lastName,
  ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
  email: input.email,
  ...(input.phoneE164 ? { telephone: input.phoneE164 } : {}),
  ...(input.imageUrl ? { image: input.imageUrl } : {}),
  url: input.cardUrl,
  worksFor: {
    "@type": "RealEstateAgent",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
  },
  workLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      streetAddress: SILLAGE_ADDRESS_STREET,
      postalCode: SILLAGE_ADDRESS_POSTAL_CODE,
      addressLocality: SILLAGE_ADDRESS_CITY,
      addressCountry: "FR",
    },
  },
});
