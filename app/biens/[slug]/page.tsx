import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/request";
import { PublicListingDetailPage, buildPublicListingMetadata } from "@/app/components/public-listing-detail-page";
import { getPublicPropertyListingBySlug } from "@/services/properties/property-listing.service";

type ListingDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ListingDetailPageProps): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { slug } = await params;
  const listing = await getPublicPropertyListingBySlug(slug, locale);
  return buildPublicListingMetadata(listing, locale);
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const locale = await getRequestLocale();
  const { slug } = await params;
  const listing = await getPublicPropertyListingBySlug(slug, locale);

  if (!listing) {
    notFound();
  }

  return <PublicListingDetailPage listing={listing} locale={locale} />;
}
