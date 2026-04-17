import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/request";
import { PublicListingsPage } from "../components/public-listings-page";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const metadata = {
    fr: {
      title: "Nos biens en vente | Sillage Immo",
      description:
        "Découvrez une sélection de biens en vente proposés par Sillage Immo à Nice et sur la Côte d'Azur.",
    },
    en: {
      title: "Properties for sale | Sillage Immo",
      description:
        "Discover a curated selection of properties for sale offered by Sillage Immo in Nice and on the French Riviera.",
    },
    es: {
      title: "Propiedades en venta | Sillage Immo",
      description:
        "Descubra una selección de propiedades en venta ofrecidas por Sillage Immo en Niza y la Costa Azul.",
    },
    ru: {
      title: "Недвижимость на продажу | Sillage Immo",
      description:
        "Откройте для себя подборку объектов на продажу от Sillage Immo в Ницце и на Лазурном Берегу.",
    },
  }[locale];
  return metadata;
}

type VentePageProps = {
  searchParams?: Promise<{
    city?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
};

export default async function VentePage({ searchParams }: VentePageProps) {
  const locale = await getRequestLocale();
  const resolvedSearchParams = (await searchParams) ?? {};
  const copy = {
    fr: {
      title: "Nos biens en vente",
      intro:
        "Une sélection de biens à vendre suivis par Sillage Immo, avec une approche locale, premium et un accompagnement sur-mesure.",
    },
    en: {
      title: "Our properties for sale",
      intro:
        "A curated selection of homes for sale handled by Sillage Immo, with local expertise, premium positioning and tailored support.",
    },
    es: {
      title: "Nuestras propiedades en venta",
      intro:
        "Una selección de inmuebles en venta gestionados por Sillage Immo, con enfoque local, premium y acompañamiento a medida.",
    },
    ru: {
      title: "Наши объекты на продажу",
      intro:
        "Подборка объектов на продажу от Sillage Immo с локальной экспертизой, премиальным подходом и персональным сопровождением.",
    },
  }[locale];

  return (
    <PublicListingsPage
      locale={locale}
      businessType="sale"
      title={copy.title}
      intro={copy.intro}
      searchParams={resolvedSearchParams}
    />
  );
}
