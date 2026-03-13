import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicListingDetailPage, buildPublicListingMetadata } from "@/app/components/public-listing-detail-page";
import { getPublicPropertyListingBySlug } from "@/services/properties/property-listing.service";

type ListingDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ListingDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicPropertyListingBySlug(slug);
  return buildPublicListingMetadata(listing);
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { slug } = await params;
  const listing = await getPublicPropertyListingBySlug(slug);

  if (!listing) {
    notFound();
  }

  return <PublicListingDetailPage listing={listing} />;
}
