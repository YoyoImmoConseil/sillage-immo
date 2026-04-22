import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/request";
import { listPropertyTypesForBusinessType } from "@/services/properties/property-listing.service";
import type { PropertyBusinessType } from "@/types/domain/properties";
import { BuyerSignupForm } from "./_components/buyer-signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const metadata = {
    fr: {
      title: "Sauvegarder ma recherche | Sillage Immo",
      description:
        "Créez votre espace Sillage et recevez des alertes dès qu'un bien correspond à votre recherche sur la Côte d'Azur.",
    },
    en: {
      title: "Save my search | Sillage Immo",
      description:
        "Create your Sillage account and receive instant alerts when a matching property is listed on the French Riviera.",
    },
    es: {
      title: "Guardar mi búsqueda | Sillage Immo",
      description:
        "Cree su espacio Sillage y reciba alertas instantáneas cuando se publique una propiedad que coincide con su búsqueda.",
    },
    ru: {
      title: "Сохранить мой запрос | Sillage Immo",
      description:
        "Создайте личный кабинет Sillage и получайте уведомления о новых объектах, соответствующих вашему запросу.",
    },
  }[locale];
  return metadata;
}

type BuyerSignupSearchParams = {
  businessType?: string;
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

type NouvelleRecherchePageProps = {
  searchParams?: Promise<BuyerSignupSearchParams>;
};

const resolveBusinessType = (value: string | undefined): PropertyBusinessType => {
  return value === "rental" ? "rental" : "sale";
};

export default async function NouvelleRecherchePage({ searchParams }: NouvelleRecherchePageProps) {
  const locale = await getRequestLocale();
  const resolvedParams = (await searchParams) ?? {};
  const businessType = resolveBusinessType(resolvedParams.businessType);
  const [saleTypes, rentalTypes] = await Promise.all([
    listPropertyTypesForBusinessType("sale"),
    listPropertyTypesForBusinessType("rental"),
  ]);

  const copy = {
    fr: {
      kicker: "Votre espace acquéreur Sillage",
      title: "Sauvegardez votre recherche et restez alerté",
      intro:
        "En quelques minutes, créez votre compte Sillage, enregistrez vos critères et recevez un email dès qu'un bien correspondant est publié. Vous pourrez ensuite gérer vos recherches depuis Mon Espace Sillage.",
      steps: [
        { label: "Vos critères", hint: "Localisation, type de bien, budget..." },
        { label: "Vos coordonnées", hint: "Nom, email, téléphone pour l'alerte" },
      ],
    },
    en: {
      kicker: "Your Sillage buyer account",
      title: "Save your search and stay alerted",
      intro:
        "In a few minutes, create your Sillage account, save your criteria and get notified as soon as a matching property is listed. You'll then be able to manage your searches from your Sillage account.",
      steps: [
        { label: "Your criteria", hint: "Location, property type, budget..." },
        { label: "Your contact details", hint: "Name, email, phone for alerts" },
      ],
    },
    es: {
      kicker: "Su espacio comprador Sillage",
      title: "Guarde su búsqueda y reciba alertas",
      intro:
        "En pocos minutos cree su espacio Sillage, guarde sus criterios y reciba una alerta en cuanto se publique un inmueble que coincida. Después podrá gestionar sus búsquedas desde Mi Espacio Sillage.",
      steps: [
        { label: "Sus criterios", hint: "Localización, tipo, presupuesto..." },
        { label: "Sus datos", hint: "Nombre, email y teléfono para las alertas" },
      ],
    },
    ru: {
      kicker: "Ваш кабинет покупателя Sillage",
      title: "Сохраните запрос и получайте уведомления",
      intro:
        "За несколько минут создайте кабинет Sillage, сохраните критерии и получайте уведомления, как только появится подходящий объект. Все запросы можно будет менять в личном кабинете Sillage.",
      steps: [
        { label: "Ваши критерии", hint: "Район, тип объекта, бюджет..." },
        { label: "Ваши контакты", hint: "Имя, email и телефон для уведомлений" },
      ],
    },
  }[locale];

  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[#f4ece4]/70">{copy.kicker}</p>
          <h1 className="sillage-section-title text-[#f4ece4]">{copy.title}</h1>
          <p className="sillage-editorial-text max-w-3xl text-[#f4ece4]/82">{copy.intro}</p>
          <ol className="flex flex-wrap gap-4 pt-2 text-sm text-[#f4ece4]/82">
            {copy.steps.map((step, index) => (
              <li key={step.label} className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#f4ece4]/40 text-xs font-semibold">
                  {index + 1}
                </span>
                <span>
                  <strong className="font-semibold">{step.label}</strong>
                  <span className="block text-xs opacity-80">{step.hint}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#f4ece4] text-[#141446]">
        <div className="w-full px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
          <BuyerSignupForm
            locale={locale}
            initialBusinessType={businessType}
            saleTypes={saleTypes}
            rentalTypes={rentalTypes}
            initialFilters={{
              city: resolvedParams.city ?? "",
              type: resolvedParams.type ?? "",
              minPrice: resolvedParams.minPrice ?? "",
              maxPrice: resolvedParams.maxPrice ?? "",
              minRooms: resolvedParams.minRooms ?? "",
              maxRooms: resolvedParams.maxRooms ?? "",
              minSurface: resolvedParams.minSurface ?? "",
              maxSurface: resolvedParams.maxSurface ?? "",
              minFloor: resolvedParams.minFloor ?? "",
              maxFloor: resolvedParams.maxFloor ?? "",
              terrace: resolvedParams.terrace ?? "",
              elevator: resolvedParams.elevator ?? "",
            }}
          />
        </div>
      </section>
    </main>
  );
}
