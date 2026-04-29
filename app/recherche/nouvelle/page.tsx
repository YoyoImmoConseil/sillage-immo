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
      title: "Confier ma recherche immobilière | Sillage Immo",
      description:
        "Confiez-nous votre recherche immobilière à Nice et sur la Côte d'Azur : zone dessinée, alertes ciblées et accompagnement possible par un conseiller Sillage.",
    },
    en: {
      title: "Entrust my property search | Sillage Immo",
      description:
        "Entrust your property search in Nice and on the French Riviera: custom drawn zone, targeted alerts and optional follow-up by a Sillage advisor.",
    },
    es: {
      title: "Confiar mi búsqueda inmobiliaria | Sillage Immo",
      description:
        "Confíe su búsqueda inmobiliaria en Niza y en la Costa Azul: zona dibujada, alertas específicas y acompañamiento posible por un asesor Sillage.",
    },
    ru: {
      title: "Доверить мой запрос на недвижимость | Sillage Immo",
      description:
        "Доверьте нам поиск недвижимости в Ницце и на Лазурном Берегу: нарисованная зона, целевые уведомления и возможность сопровождения консультантом Sillage.",
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
  const [dbSaleTypes, dbRentalTypes] = await Promise.all([
    listPropertyTypesForBusinessType("sale").catch(() => [] as string[]),
    listPropertyTypesForBusinessType("rental").catch(() => [] as string[]),
  ]);
  const saleTypes = mergeWithCanonicalPropertyTypes("sale", dbSaleTypes);
  const rentalTypes = mergeWithCanonicalPropertyTypes("rental", dbRentalTypes);

  const copy = {
    fr: {
      kicker: "Recherche acquéreur accompagnée",
      title: "Confiez-nous votre recherche immobilière à Nice et sur la Côte d'Azur",
      intro:
        "Dessinez votre zone, indiquez vos critères et recevez les biens qui correspondent vraiment à votre projet. Votre recherche peut aussi être suivie par un conseiller Sillage, qui l'active dans nos outils métier et notre réseau professionnel Côte d'Azur.",
      microProofs: [
        "Zone dessinée sur carte",
        "Alertes automatiques",
        "Conseiller Sillage",
        "Réseau professionnel Côte d'Azur",
      ],
      whyTitle: "Pourquoi créer une recherche Sillage ?",
      whyCards: [
        {
          title: "Une zone précise, pas une ville entière",
          body: "Tracez les rues, quartiers ou secteurs qui comptent vraiment pour vous.",
        },
        {
          title: "Des alertes plus pertinentes",
          body: "Recevez moins de biens hors sujet et plus d'opportunités réellement compatibles.",
        },
        {
          title: "Un conseiller peut prendre le relais",
          body: "Votre recherche peut être analysée, affinée et activée dans nos outils métier par un conseiller Sillage.",
        },
      ],
      afterTitle: "Ce qui se passe après votre recherche",
      afterSteps: [
        {
          title: "Votre recherche est enregistrée",
          body: "Vos critères, votre budget et votre zone sont centralisés dans votre espace Sillage pour être suivis et ajustés facilement.",
        },
        {
          title: "Notre système surveille les biens",
          body: "Vous recevez une alerte lorsqu'un bien correspond à vos critères, avec un matching plus précis qu'une simple recherche par ville.",
        },
        {
          title: "Un conseiller Sillage peut l'analyser",
          body: "Votre projet peut être relu par un conseiller pour affiner les critères, comprendre vos priorités et éviter les opportunités hors sujet.",
        },
        {
          title: "Nous activons notre réseau professionnel",
          body: "Lorsque votre projet le justifie, nous pouvons rechercher des opportunités au-delà de notre propre catalogue, via nos bases métier et notre réseau d'agences partenaires sur la Côte d'Azur.",
        },
      ],
      differentiation:
        "Votre recherche ne reste pas une simple alerte : elle peut devenir un vrai brief acquéreur, suivi par un conseiller et activé dans notre réseau professionnel Côte d'Azur.",
      existingAccountTitle: "Déjà un Espace Sillage (vendeur ou acheteur) ?",
      existingAccountBody:
        "Connectez-vous pour associer cette nouvelle recherche à votre espace existant.",
      existingAccountCta: "Me connecter",
      newAccountTitle: "Je n'ai pas encore de compte",
      newAccountBody:
        "Remplissez le formulaire ci-dessous. Nous créons votre espace Sillage et vous envoyons un lien magique par email pour l'activer, sans mot de passe.",
    },
    en: {
      kicker: "Supported buyer search",
      title: "Entrust us with your property search in Nice and on the French Riviera",
      intro:
        "Draw your zone, set your criteria and receive properties that truly match your project. Your search can also be followed by a Sillage advisor, who activates it in our professional tools and our French Riviera partner network.",
      microProofs: [
        "Zone drawn on the map",
        "Automatic alerts",
        "Sillage advisor",
        "French Riviera partner network",
      ],
      whyTitle: "Why create a Sillage search?",
      whyCards: [
        {
          title: "A precise zone, not a whole city",
          body: "Draw the streets, neighborhoods or sectors that really matter to you.",
        },
        {
          title: "Alerts that actually fit",
          body: "Fewer irrelevant listings and more opportunities that truly match your project.",
        },
        {
          title: "An advisor can take over",
          body: "Your search can be reviewed, refined and activated in our professional tools by a Sillage advisor.",
        },
      ],
      afterTitle: "What happens after your search",
      afterSteps: [
        {
          title: "Your search is saved",
          body: "Your criteria, budget and zone are centralized in your Sillage space, easy to follow and adjust.",
        },
        {
          title: "Our system monitors listings",
          body: "You receive an alert when a property matches your criteria, with sharper matching than a simple city search.",
        },
        {
          title: "A Sillage advisor can review it",
          body: "Your project can be read by an advisor to refine the criteria, understand your priorities and avoid off-target opportunities.",
        },
        {
          title: "We activate our partner network",
          body: "When your project justifies it, we can search for opportunities beyond our own catalogue, through our professional databases and our partner agencies on the French Riviera.",
        },
      ],
      differentiation:
        "Your search is more than a simple alert: it can become a real buyer brief, followed by an advisor and activated in our French Riviera partner network.",
      existingAccountTitle: "Already have a Sillage Space (seller or buyer)?",
      existingAccountBody:
        "Sign in to attach this new search to your existing space.",
      existingAccountCta: "Sign in",
      newAccountTitle: "I don't have an account yet",
      newAccountBody:
        "Fill out the form below. We create your Sillage account and send you a magic login link by email, no password required.",
    },
    es: {
      kicker: "Búsqueda comprador acompañada",
      title: "Confíenos su búsqueda inmobiliaria en Niza y en la Costa Azul",
      intro:
        "Dibuje su zona, indique sus criterios y reciba los bienes que realmente corresponden a su proyecto. Su búsqueda también puede ser seguida por un asesor Sillage, que la activa en nuestras herramientas profesionales y en nuestra red de la Costa Azul.",
      microProofs: [
        "Zona dibujada en el mapa",
        "Alertas automáticas",
        "Asesor Sillage",
        "Red profesional Costa Azul",
      ],
      whyTitle: "¿Por qué crear una búsqueda Sillage?",
      whyCards: [
        {
          title: "Una zona precisa, no una ciudad entera",
          body: "Trace las calles, barrios o sectores que realmente cuentan para usted.",
        },
        {
          title: "Alertas más pertinentes",
          body: "Reciba menos bienes fuera de contexto y más oportunidades realmente compatibles.",
        },
        {
          title: "Un asesor puede tomar el relevo",
          body: "Su búsqueda puede ser analizada, afinada y activada en nuestras herramientas profesionales por un asesor Sillage.",
        },
      ],
      afterTitle: "Lo que sucede después de su búsqueda",
      afterSteps: [
        {
          title: "Su búsqueda queda registrada",
          body: "Sus criterios, su presupuesto y su zona se centralizan en su espacio Sillage, fáciles de seguir y de ajustar.",
        },
        {
          title: "Nuestro sistema vigila los bienes",
          body: "Recibe una alerta cuando un bien coincide con sus criterios, con un matching más preciso que una simple búsqueda por ciudad.",
        },
        {
          title: "Un asesor Sillage puede analizarla",
          body: "Su proyecto puede ser revisado por un asesor para afinar los criterios, entender sus prioridades y evitar oportunidades fuera de contexto.",
        },
        {
          title: "Activamos nuestra red profesional",
          body: "Cuando su proyecto lo justifica, podemos buscar oportunidades más allá de nuestro propio catálogo, a través de nuestras bases profesionales y nuestra red de agencias asociadas en la Costa Azul.",
        },
      ],
      differentiation:
        "Su búsqueda no se queda en una simple alerta: puede convertirse en un verdadero brief de comprador, seguido por un asesor y activado en nuestra red profesional de la Costa Azul.",
      existingAccountTitle: "¿Ya tiene un Espacio Sillage (vendedor o comprador)?",
      existingAccountBody:
        "Inicie sesión para añadir esta búsqueda a su espacio existente.",
      existingAccountCta: "Iniciar sesión",
      newAccountTitle: "Aún no tengo cuenta",
      newAccountBody:
        "Complete el formulario de abajo. Creamos su espacio Sillage y le enviamos un enlace mágico por email para activarlo, sin contraseña.",
    },
    ru: {
      kicker: "Сопровождаемый поиск покупателя",
      title: "Доверьте нам поиск недвижимости в Ницце и на Лазурном Берегу",
      intro:
        "Нарисуйте зону, укажите критерии и получайте объекты, действительно соответствующие вашему проекту. Вашу заявку также может вести консультант Sillage — он активирует её в наших профессиональных инструментах и в нашей партнёрской сети Лазурного Берега.",
      microProofs: [
        "Зона, нарисованная на карте",
        "Автоматические уведомления",
        "Консультант Sillage",
        "Профсеть Лазурного Берега",
      ],
      whyTitle: "Зачем создавать поиск Sillage?",
      whyCards: [
        {
          title: "Точная зона, а не целый город",
          body: "Обозначьте улицы, кварталы или районы, которые действительно для вас важны.",
        },
        {
          title: "Более релевантные уведомления",
          body: "Меньше нерелевантных объектов, больше реально подходящих возможностей.",
        },
        {
          title: "Консультант может подхватить",
          body: "Ваш поиск может быть проанализирован, уточнён и активирован в наших профессиональных инструментах консультантом Sillage.",
        },
      ],
      afterTitle: "Что происходит после вашего запроса",
      afterSteps: [
        {
          title: "Ваш запрос сохранён",
          body: "Критерии, бюджет и зона централизованы в вашем кабинете Sillage — их легко отслеживать и корректировать.",
        },
        {
          title: "Система наблюдает за объектами",
          body: "Вы получаете уведомление, когда объект соответствует критериям, с более точным подбором, чем простой поиск по городу.",
        },
        {
          title: "Консультант может его рассмотреть",
          body: "Ваш проект может быть прочитан консультантом, чтобы уточнить критерии, понять приоритеты и избежать нерелевантных предложений.",
        },
        {
          title: "Мы активируем профессиональную сеть",
          body: "Когда это оправдано проектом, мы ищем возможности за пределами нашего собственного каталога — через профессиональные базы и сеть партнёрских агентств Лазурного Берега.",
        },
      ],
      differentiation:
        "Ваш поиск — не просто уведомление: он может стать настоящим брифом покупателя, который ведёт консультант и который активируется в нашей профессиональной сети Лазурного Берега.",
      existingAccountTitle: "Уже есть кабинет Sillage (продавец или покупатель)?",
      existingAccountBody:
        "Войдите, чтобы привязать этот запрос к существующему кабинету.",
      existingAccountCta: "Войти",
      newAccountTitle: "У меня ещё нет аккаунта",
      newAccountBody:
        "Заполните форму ниже. Мы создадим кабинет Sillage и отправим ссылку для входа на email — без пароля.",
    },
  }[locale];

  const loginHref = localizePath("/espace-client/login", locale);

  return (
    <main className="min-h-screen">
      <section
        aria-labelledby="recherche-hero-title"
        className="bg-[#141446] text-[#f4ece4]"
      >
        <div className="w-full px-6 py-12 md:px-10 md:py-20 xl:px-14 xl:py-24 2xl:px-20 space-y-5">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.22em] text-[#f4ece4]/75">
            {copy.kicker}
          </p>
          <h1
            id="recherche-hero-title"
            className="sillage-section-title-font text-3xl md:text-5xl xl:text-[52px] font-semibold leading-[1.1] tracking-tight max-w-4xl"
          >
            {copy.title}
          </h1>
          <p className="sillage-editorial-text max-w-3xl text-[#f4ece4]/90">{copy.intro}</p>
          <ul
            aria-label={copy.kicker}
            className="flex flex-col gap-1.5 pt-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1.5"
          >
            {copy.microProofs.map((proof) => (
              <li
                key={proof}
                className="inline-flex items-center gap-2 text-xs md:text-[13px] text-[#f4ece4]/85"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 shrink-0 text-[#f4c47a]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8.5l3 3 7-7" />
                </svg>
                <span>{proof}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="recherche-why-title"
        className="bg-[#f4ece4] text-[#141446] border-b border-[#141446]/10"
      >
        <div className="w-full px-6 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20 space-y-8">
          <h2 id="recherche-why-title" className="sillage-section-title max-w-3xl">
            {copy.whyTitle}
          </h2>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {copy.whyCards.map((card) => (
              <li
                key={card.title}
                className="rounded-[20px] bg-white p-5 ring-1 ring-[#141446]/5"
              >
                <h3 className="font-serif text-base font-semibold text-[#141446]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#141446]/75">{card.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="recherche-after-title"
        className="bg-[#f4ece4] text-[#141446]"
      >
        <div className="w-full px-6 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20 space-y-8">
          <h2 id="recherche-after-title" className="sillage-section-title max-w-3xl">
            {copy.afterTitle}
          </h2>
          <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {copy.afterSteps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-[24px] bg-white p-6 ring-1 ring-[#141446]/5"
              >
                <span className="font-serif text-sm text-[#141446]/50">
                  0{index + 1}
                </span>
                <h3 className="mt-2 font-serif text-lg font-semibold text-[#141446]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#141446]/75">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
          <p className="max-w-4xl rounded-[20px] border-l-4 border-[#141446] bg-white/70 px-5 py-4 text-sm md:text-base italic text-[#141446]/85 leading-relaxed">
            {copy.differentiation}
          </p>
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
