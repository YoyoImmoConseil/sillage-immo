import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { listPropertyTypesForBusinessType } from "@/services/properties/property-listing.service";
import { mergeWithCanonicalPropertyTypes } from "@/lib/properties/canonical-types";
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
  // A buyer must be able to express intent regardless of the current stock,
  // so we start from a canonical list and enrich it with anything currently
  // in the DB that the canonical list does not already cover.
  const [dbSaleTypes, dbRentalTypes] = await Promise.all([
    listPropertyTypesForBusinessType("sale").catch(() => [] as string[]),
    listPropertyTypesForBusinessType("rental").catch(() => [] as string[]),
  ]);
  const saleTypes = mergeWithCanonicalPropertyTypes("sale", dbSaleTypes);
  const rentalTypes = mergeWithCanonicalPropertyTypes("rental", dbRentalTypes);

  const copy = {
    fr: {
      kicker: "Votre espace acquéreur Sillage",
      title: "Créez votre recherche et recevez des alertes",
      intro:
        "Définissez vos critères et la zone sur la carte. Nous vous préviendrons par email dès qu'un bien correspond à votre recherche.",
      existingAccountTitle: "Déjà un Espace Sillage (vendeur ou acheteur) ?",
      existingAccountBody:
        "Connectez-vous pour associer cette nouvelle recherche à votre espace existant.",
      existingAccountCta: "Me connecter",
      newAccountTitle: "Je n'ai pas encore de compte",
      newAccountBody:
        "Remplissez le formulaire ci-dessous. Nous créerons votre espace Sillage et vous enverrons un lien magique par email pour l'activer.",
      steps: [
        { label: "Vos critères", hint: "Localisation, zone sur carte, budget..." },
        { label: "Vos coordonnées", hint: "Nom, email, téléphone pour l'alerte" },
      ],
    },
    en: {
      kicker: "Your Sillage buyer account",
      title: "Create your search and get alerts",
      intro:
        "Set your criteria and draw the area on the map. We'll email you as soon as a matching property is listed.",
      existingAccountTitle: "Already have a Sillage Space (seller or buyer)?",
      existingAccountBody:
        "Sign in to attach this new search to your existing space.",
      existingAccountCta: "Sign in",
      newAccountTitle: "I don't have an account yet",
      newAccountBody:
        "Fill out the form below. We'll create your Sillage account and send you a magic login link by email.",
      steps: [
        { label: "Your criteria", hint: "Location, area on map, budget..." },
        { label: "Your contact details", hint: "Name, email, phone for alerts" },
      ],
    },
    es: {
      kicker: "Su espacio comprador Sillage",
      title: "Cree su búsqueda y reciba alertas",
      intro:
        "Defina sus criterios y dibuje la zona en el mapa. Le avisaremos por email en cuanto se publique un inmueble que coincida.",
      existingAccountTitle: "¿Ya tiene un Espacio Sillage (vendedor o comprador)?",
      existingAccountBody:
        "Inicie sesión para añadir esta búsqueda a su espacio existente.",
      existingAccountCta: "Iniciar sesión",
      newAccountTitle: "Aún no tengo cuenta",
      newAccountBody:
        "Complete el formulario de abajo. Crearemos su espacio Sillage y le enviaremos un enlace mágico por email para activarlo.",
      steps: [
        { label: "Sus criterios", hint: "Localización, zona en mapa, presupuesto..." },
        { label: "Sus datos", hint: "Nombre, email y teléfono para las alertas" },
      ],
    },
    ru: {
      kicker: "Ваш кабинет покупателя Sillage",
      title: "Создайте запрос и получайте уведомления",
      intro:
        "Укажите критерии и нарисуйте зону на карте. Мы сообщим по email, как только появится подходящий объект.",
      existingAccountTitle: "Уже есть кабинет Sillage (продавец или покупатель)?",
      existingAccountBody:
        "Войдите, чтобы привязать этот запрос к существующему кабинету.",
      existingAccountCta: "Войти",
      newAccountTitle: "У меня ещё нет аккаунта",
      newAccountBody:
        "Заполните форму ниже. Мы создадим ваш кабинет Sillage и отправим ссылку для входа.",
      steps: [
        { label: "Ваши критерии", hint: "Район, зона на карте, бюджет..." },
        { label: "Ваши контакты", hint: "Имя, email и телефон для уведомлений" },
      ],
    },
  }[locale];

  const loginHref = localizePath("/espace-client/login", locale);

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
        <div className="w-full px-6 py-10 md:px-10 xl:px-14 2xl:px-20 space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-5 shadow-sm">
              <h2 className="text-base font-semibold uppercase tracking-[0.12em] text-[#141446]">
                {copy.existingAccountTitle}
              </h2>
              <p className="mt-2 text-sm text-[#141446]/80">{copy.existingAccountBody}</p>
              <Link
                href={loginHref}
                className="sillage-btn-secondary mt-4 inline-flex rounded px-4 py-2 text-sm"
              >
                {copy.existingAccountCta}
              </Link>
            </article>
            <article className="rounded-2xl border border-[#141446] bg-[#141446] p-5 text-[#f4ece4] shadow-sm">
              <h2 className="text-base font-semibold uppercase tracking-[0.12em] text-[#f4c47a]">
                {copy.newAccountTitle}
              </h2>
              <p className="mt-2 text-sm text-[#f4ece4]/82">{copy.newAccountBody}</p>
            </article>
          </div>

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
