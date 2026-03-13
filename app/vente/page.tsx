import type { Metadata } from "next";
import { PublicListingsPage } from "../components/public-listings-page";

export const metadata: Metadata = {
  title: "Nos biens en vente | Sillage Immo",
  description:
    "Decouvrez une selection de biens en vente proposes par Sillage Immo a Nice et sur la Cote d'Azur.",
};

type VentePageProps = {
  searchParams?: Promise<{
    city?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
};

export default async function VentePage({ searchParams }: VentePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <PublicListingsPage
      businessType="sale"
      title="Nos biens en vente"
      intro="Une selection de biens a vendre suivis par Sillage Immo, avec une approche locale, premium et un accompagnement sur-mesure."
      searchParams={resolvedSearchParams}
    />
  );
}
