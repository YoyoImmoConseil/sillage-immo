import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/request";
import { PublicListingDetailPage, buildPublicListingMetadata } from "@/app/components/public-listing-detail-page";
import { getPublicPropertyListingByExternalId } from "@/services/properties/property-listing.service";

// Incremental Static Regeneration alignee sur /biens/[slug].
export const revalidate = 600;

type ListingDetailByExternalIdPageProps = {
  params: Promise<{ postalCode: string; propertyId: string }>;
};

export async function generateMetadata({
  params,
}: ListingDetailByExternalIdPageProps): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { postalCode, propertyId } = await params;
  const listing = await getPublicPropertyListingByExternalId({ postalCode, propertyId, locale });
  return buildPublicListingMetadata(listing, locale);
}

export default async function ListingDetailByExternalIdPage({
  params,
}: ListingDetailByExternalIdPageProps) {
  const locale = await getRequestLocale();
  const { postalCode, propertyId } = await params;
  const listing = await getPublicPropertyListingByExternalId({ postalCode, propertyId, locale });

  if (!listing) {
    notFound();
  }

  return <PublicListingDetailPage listing={listing} locale={locale} />;
}
