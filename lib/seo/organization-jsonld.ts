import {
  SILLAGE_ADDRESS_CITY,
  SILLAGE_ADDRESS_POSTAL_CODE,
  SILLAGE_ADDRESS_STREET,
  SILLAGE_CONTACT_EMAIL,
  SILLAGE_LEGAL,
  SILLAGE_PHONE_RAW,
} from "@/lib/brand/company";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

/**
 * Données structurées de l'agence (schema.org RealEstateAgent) pour l'accueil :
 * nom, adresse, téléphone, zone desservie, langues. Pas d'horaires ni de note
 * tant que la fiche Google Business Profile n'est pas corrigée (on n'invente
 * rien). `sameAs` à compléter avec la fiche Google et les réseaux le moment venu.
 */
export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: SILLAGE_LEGAL.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-sillage.png`,
    image: `${SITE_URL}/home-hero-windows-nice.webp`,
    telephone: SILLAGE_PHONE_RAW,
    email: SILLAGE_CONTACT_EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: SILLAGE_ADDRESS_STREET,
      postalCode: SILLAGE_ADDRESS_POSTAL_CODE,
      addressLocality: SILLAGE_ADDRESS_CITY,
      addressCountry: "FR",
    },
    geo: { "@type": "GeoCoordinates", latitude: 43.70322, longitude: 7.28817 },
    areaServed: [
      { "@type": "City", name: "Nice" },
      { "@type": "AdministrativeArea", name: "Alpes-Maritimes" },
    ],
    knowsLanguage: ["fr", "en", "es", "ru"],
    founder: { "@type": "Person", name: "Yoann Uzzan" },
    identifier: [{ "@type": "PropertyValue", propertyID: "SIREN", value: SILLAGE_LEGAL.siren }],
  };
}
