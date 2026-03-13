import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicListingDetailPage, buildPublicListingMetadata } from "@/app/components/public-listing-detail-page";
import { getPublicPropertyListingByExternalId } from "@/services/properties/property-listing.service";

type ListingDetailByExternalIdPageProps = {
  params: Promise<{ postalCode: string; propertyId: string }>;
};

export async function generateMetadata({
  params,
}: ListingDetailByExternalIdPageProps): Promise<Metadata> {
  const { postalCode, propertyId } = await params;
  const listing = await getPublicPropertyListingByExternalId({ postalCode, propertyId });
  return buildPublicListingMetadata(listing);
}

export default async function ListingDetailByExternalIdPage({
  params,
}: ListingDetailByExternalIdPageProps) {
  const { postalCode, propertyId } = await params;
  const listing = await getPublicPropertyListingByExternalId({ postalCode, propertyId });

  if (!listing) {
    notFound();
  }

  return <PublicListingDetailPage listing={listing} />;
}
