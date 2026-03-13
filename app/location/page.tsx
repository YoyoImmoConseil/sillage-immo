import type { Metadata } from "next";
import { PublicListingsPage } from "../components/public-listings-page";

export const metadata: Metadata = {
  title: "Nos biens en location | Sillage Immo",
  description:
    "Consultez les biens en location proposes par Sillage Immo a Nice et sur la Cote d'Azur.",
};

type LocationPageProps = {
  searchParams?: Promise<{
    city?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
};

export default async function LocationPage({ searchParams }: LocationPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <PublicListingsPage
      businessType="rental"
      title="Nos biens en location"
      intro="Une selection de biens a louer administres ou commercialises par Sillage Immo, avec un accompagnement clair pour candidats et proprietaires."
      searchParams={resolvedSearchParams}
    />
  );
}
