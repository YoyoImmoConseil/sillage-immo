import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/request";
import { PublicListingsPage } from "../components/public-listings-page";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const metadata = {
    fr: {
      title: "Nos biens en location | Sillage Immo",
      description: "Consultez les biens en location proposés par Sillage Immo à Nice et sur la Côte d'Azur.",
    },
    en: {
      title: "Properties for rent | Sillage Immo",
      description: "Browse rental properties offered by Sillage Immo in Nice and on the French Riviera.",
    },
    es: {
      title: "Propiedades en alquiler | Sillage Immo",
      description: "Consulte los inmuebles en alquiler ofrecidos por Sillage Immo en Niza y la Costa Azul.",
    },
    ru: {
      title: "Недвижимость в аренду | Sillage Immo",
      description: "Посмотрите объекты в аренду от Sillage Immo в Ницце и на Лазурном Берегу.",
    },
  }[locale];
  return metadata;
}

type LocationPageProps = {
  searchParams?: Promise<{
    city?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
};

export default async function LocationPage({ searchParams }: LocationPageProps) {
  const locale = await getRequestLocale();
  const resolvedSearchParams = (await searchParams) ?? {};
  const copy = {
    fr: {
      title: "Nos biens en location",
      intro:
        "Une sélection de biens à louer administrés ou commercialisés par Sillage Immo, avec un accompagnement clair pour candidats et propriétaires.",
    },
    en: {
      title: "Our rental properties",
      intro:
        "A selection of rental properties managed or marketed by Sillage Immo, with clear support for tenants and owners.",
    },
    es: {
      title: "Nuestras propiedades en alquiler",
      intro:
        "Una selección de inmuebles en alquiler gestionados o comercializados por Sillage Immo, con un acompañamiento claro para candidatos y propietarios.",
    },
    ru: {
      title: "Наши объекты в аренду",
      intro:
        "Подборка объектов в аренду, которыми управляет или которые продвигает Sillage Immo, с понятным сопровождением для арендаторов и собственников.",
    },
  }[locale];

  return (
    <PublicListingsPage
      locale={locale}
      businessType="rental"
      title={copy.title}
      intro={copy.intro}
      searchParams={resolvedSearchParams}
    />
  );
}
