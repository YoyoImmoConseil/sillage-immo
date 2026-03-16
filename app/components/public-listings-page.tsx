import {
  listPropertyTypesForBusinessType,
  listPublicPropertyListings,
} from "@/services/properties/property-listing.service";
import { PublicListingsSearch } from "./public-listings-search";
import type { PropertyBusinessType, PropertyListingSnapshot } from "@/types/domain/properties";

type ListingSearchParams = {
  city?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  minRooms?: string;
  maxRooms?: string;
  minSurface?: string;
  maxSurface?: string;
  minFloor?: string;
  maxFloor?: string;
  terrace?: string;
  elevator?: string;
};

type PublicListingsPageProps = {
  businessType: PropertyBusinessType;
  title: string;
  intro: string;
  searchParams: ListingSearchParams;
};

const toNumber = (value: string | undefined) => {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toBoolean = (value: string | undefined) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

export async function PublicListingsPage(props: PublicListingsPageProps) {
  const [listings, propertyTypes] = await Promise.all([
    listPublicPropertyListings({
      businessType: props.businessType,
      city: props.searchParams.city,
      propertyType: props.searchParams.type,
      minPrice: toNumber(props.searchParams.minPrice),
      maxPrice: toNumber(props.searchParams.maxPrice),
      minRooms: toNumber(props.searchParams.minRooms),
      maxRooms: toNumber(props.searchParams.maxRooms),
      minSurface: toNumber(props.searchParams.minSurface),
      maxSurface: toNumber(props.searchParams.maxSurface),
      minFloor: toNumber(props.searchParams.minFloor),
      maxFloor: toNumber(props.searchParams.maxFloor),
      terrace: toBoolean(props.searchParams.terrace),
      elevator: toBoolean(props.searchParams.elevator),
    }),
    listPropertyTypesForBusinessType(props.businessType),
  ]);

  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[#f4ece4]/70">
            Catalogue Sillage Immo
          </p>
          <h1 className="sillage-section-title text-[#f4ece4]">{props.title}</h1>
          <p className="max-w-3xl text-sm text-[#f4ece4]/82">{props.intro}</p>
        </div>
      </section>

      <section className="bg-[#f4ece4] text-[#141446]">
        <div className="w-full px-6 py-8 md:px-10 xl:px-14 2xl:px-20 space-y-8">
          <PublicListingsSearch
            businessType={props.businessType}
            initialListings={listings as PropertyListingSnapshot[]}
            initialPropertyTypes={propertyTypes}
            initialFilters={{
              city: props.searchParams.city ?? "",
              type: props.searchParams.type ?? "",
              minPrice: props.searchParams.minPrice ?? "",
              maxPrice: props.searchParams.maxPrice ?? "",
              minRooms: props.searchParams.minRooms ?? "",
              maxRooms: props.searchParams.maxRooms ?? "",
              minSurface: props.searchParams.minSurface ?? "",
              maxSurface: props.searchParams.maxSurface ?? "",
              minFloor: props.searchParams.minFloor ?? "",
              maxFloor: props.searchParams.maxFloor ?? "",
              terrace:
                props.searchParams.terrace === "true" || props.searchParams.terrace === "false"
                  ? props.searchParams.terrace
                  : "",
              elevator:
                props.searchParams.elevator === "true" || props.searchParams.elevator === "false"
                  ? props.searchParams.elevator
                  : "",
            }}
          />
        </div>
      </section>
    </main>
  );
}
