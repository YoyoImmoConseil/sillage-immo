import Image from "next/image";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { BuyerSearchForm } from "./components/buyer-search-form";
import { HomeCommercialAssistant } from "./components/home-commercial-assistant";
import { HomeTeamSection } from "./components/home-team-section";
import { SillageLogo } from "./components/sillage-logo";
import Link from "next/link";

const methodSteps = [
  {
    title: "Estimation fiable et argumentée",
    description:
      "Analyse locale précise du bien et de son environnement pour fixer une stratégie de prix solide.",
  },
  {
    title: "Mise en valeur premium",
    description:
      "Photos HD, visite immersive et présentation de qualité pour maximiser l'attractivité.",
  },
  {
    title: "Diffusion large et ciblée",
    description:
      "Visibilité portails + réseau inter-agences, avec un interlocuteur unique pour vous.",
  },
  {
    title: "Qualification acquéreurs",
    description:
      "Tri des contacts et vérification des dossiers pour éviter les visites peu qualifiées.",
  },
  {
    title: "Suivi transparent",
    description:
      "Pilotage pas à pas des actions de commercialisation avec retour clair à chaque étape.",
  },
  {
    title: "Accompagnement jusqu'à la signature",
    description:
      "Coordination du dossier et accompagnement administratif pour vendre dans de bonnes conditions.",
  },
];

const neighborhoods = ["Carré d'Or", "Mont Boron", "Cimiez", "Le Port", "Wilson", "Libération"];

export default async function Home() {
  const locale = await getRequestLocale();
  const copy = {
    fr: {
      heroEyebrow: "Immobilier premium à Nice et sur la Côte d'Azur",
      heroTitle: "Vendre, acheter, louer : un accompagnement global et sur mesure",
      heroBody:
        "Sillage Immo vous accompagne sur l'ensemble de votre projet immobilier : estimation, commercialisation, acquisition, location et gestion locative avec un niveau de service premium.",
      saleCta: "Voir nos biens en vente",
      rentalCta: "Voir nos biens en location",
      valuationCta: "Découvrir la valeur de mon bien",
      advisorCta: "Parler à un conseiller",
      googleRating: "Note Google",
      sellersHelped: "Vendeurs accompagnés",
      experience: "Expérience locale",
      availability: "Disponibilité conseiller",
      saleCatalog: "Catalogue vente",
      saleCatalogTitle: "Nos biens en vente",
      saleCatalogBody: "Appartements, maisons, villas et biens premium diffusés par Sillage Immo.",
      exploreSelection: "Explorer la sélection",
      rentalCatalog: "Catalogue location",
      rentalCatalogTitle: "Nos biens en location",
      rentalCatalogBody: "Une sélection de biens à louer, avec un accompagnement locatif clair et réactif.",
      rentalCatalogCta: "Voir les opportunités",
      methodTitle: "Vous vendez ? Notre méthode en 6 étapes",
      methodBody: "Une exécution claire, orientée résultat, pour vendre au bon prix et dans les meilleures conditions.",
      launchValuation: "Lancer mon estimation",
      sellAlone: "Vendre seul",
      withSillage: "Avec Sillage Immo",
      neighborhoodsTitle: "Nos quartiers, notre territoire",
      neighborhoodsBody:
        "De Wilson à Cimiez, du Port au Carré d'Or : nous adaptons la stratégie à la micro-zone et au profil acquéreur ciblé.",
      contactTitle: "Parlez à un conseiller Sillage Immo",
      contactBody:
        "Vous souhaitez cadrer votre projet vendeur, acquéreur ou locatif ? Notre équipe est à votre disposition pour une recommandation claire et personnalisée.",
      contactCta: "Parler à un expert",
    },
    en: {
      heroEyebrow: "Premium real estate in Nice and on the French Riviera",
      heroTitle: "Sell, buy, rent: full-service support tailored to your project",
      heroBody:
        "Sillage Immo supports every stage of your real estate project: valuation, marketing, acquisition, rental and property management with a premium level of service.",
      saleCta: "See properties for sale",
      rentalCta: "See rental properties",
      valuationCta: "Discover my property's value",
      advisorCta: "Speak with an advisor",
      googleRating: "Google rating",
      sellersHelped: "Sellers supported",
      experience: "Years of local experience",
      availability: "Advisor availability",
      saleCatalog: "Sales catalogue",
      saleCatalogTitle: "Our properties for sale",
      saleCatalogBody: "Apartments, houses, villas and premium properties marketed by Sillage Immo.",
      exploreSelection: "Explore the selection",
      rentalCatalog: "Rental catalogue",
      rentalCatalogTitle: "Our rental properties",
      rentalCatalogBody: "A curated selection of rental properties with clear and responsive support.",
      rentalCatalogCta: "See opportunities",
      methodTitle: "Selling? Our 6-step method",
      methodBody: "A clear, results-driven execution to sell at the right price and in the best conditions.",
      launchValuation: "Start my valuation",
      sellAlone: "Selling alone",
      withSillage: "With Sillage Immo",
      neighborhoodsTitle: "Our neighborhoods, our market",
      neighborhoodsBody:
        "From Wilson to Cimiez and from the Port to Carré d'Or, we adapt the strategy to each micro-market and buyer profile.",
      contactTitle: "Speak with a Sillage Immo advisor",
      contactBody:
        "Would you like to frame your seller, buyer or rental project? Our team is available to provide a clear and tailored recommendation.",
      contactCta: "Speak with an expert",
    },
    es: {
      heroEyebrow: "Inmobiliaria premium en Niza y en la Costa Azul",
      heroTitle: "Vender, comprar, alquilar: un acompañamiento global y a medida",
      heroBody:
        "Sillage Immo le acompaña en todo su proyecto inmobiliario: valoración, comercialización, adquisición, alquiler y gestión locativa con un nivel de servicio premium.",
      saleCta: "Ver propiedades en venta",
      rentalCta: "Ver propiedades en alquiler",
      valuationCta: "Descubrir el valor de mi inmueble",
      advisorCta: "Hablar con un asesor",
      googleRating: "Nota de Google",
      sellersHelped: "Vendedores acompañados",
      experience: "Experiencia local",
      availability: "Disponibilidad del asesor",
      saleCatalog: "Catálogo venta",
      saleCatalogTitle: "Nuestras propiedades en venta",
      saleCatalogBody: "Apartamentos, casas, villas y propiedades premium comercializadas por Sillage Immo.",
      exploreSelection: "Explorar la selección",
      rentalCatalog: "Catálogo alquiler",
      rentalCatalogTitle: "Nuestras propiedades en alquiler",
      rentalCatalogBody: "Una selección de inmuebles en alquiler con un acompañamiento claro y reactivo.",
      rentalCatalogCta: "Ver oportunidades",
      methodTitle: "¿Quiere vender? Nuestro método en 6 etapas",
      methodBody: "Una ejecución clara y orientada a resultados para vender al precio adecuado y en las mejores condiciones.",
      launchValuation: "Iniciar mi valoración",
      sellAlone: "Vender solo",
      withSillage: "Con Sillage Immo",
      neighborhoodsTitle: "Nuestros barrios, nuestro territorio",
      neighborhoodsBody:
        "De Wilson a Cimiez y del Puerto al Carré d'Or: adaptamos la estrategia a cada microzona y al perfil comprador objetivo.",
      contactTitle: "Hable con un asesor de Sillage Immo",
      contactBody:
        "¿Desea estructurar su proyecto de venta, compra o alquiler? Nuestro equipo está a su disposición para ofrecerle una recomendación clara y personalizada.",
      contactCta: "Hablar con un experto",
    },
    ru: {
      heroEyebrow: "Премиальная недвижимость в Ницце и на Лазурном Берегу",
      heroTitle: "Продажа, покупка, аренда: комплексное сопровождение под ваш проект",
      heroBody:
        "Sillage Immo сопровождает все этапы вашего проекта: оценку, продвижение, покупку, аренду и управление недвижимостью с премиальным уровнем сервиса.",
      saleCta: "Посмотреть объекты на продажу",
      rentalCta: "Посмотреть объекты в аренду",
      valuationCta: "Узнать стоимость моей недвижимости",
      advisorCta: "Поговорить с консультантом",
      googleRating: "Рейтинг Google",
      sellersHelped: "Сопровождено продавцов",
      experience: "Локальный опыт",
      availability: "Доступность консультанта",
      saleCatalog: "Каталог продаж",
      saleCatalogTitle: "Наши объекты на продажу",
      saleCatalogBody: "Квартиры, дома, виллы и премиальные объекты, представленные Sillage Immo.",
      exploreSelection: "Смотреть подборку",
      rentalCatalog: "Каталог аренды",
      rentalCatalogTitle: "Наши объекты в аренду",
      rentalCatalogBody: "Подборка объектов в аренду с понятным и оперативным сопровождением.",
      rentalCatalogCta: "Посмотреть варианты",
      methodTitle: "Хотите продать? Наш метод в 6 этапов",
      methodBody: "Четкий, ориентированный на результат подход, чтобы продать по правильной цене и на лучших условиях.",
      launchValuation: "Начать оценку",
      sellAlone: "Продавать самостоятельно",
      withSillage: "С Sillage Immo",
      neighborhoodsTitle: "Наши районы, наш рынок",
      neighborhoodsBody:
        "От Wilson до Cimiez и от Port до Carré d'Or: мы адаптируем стратегию под каждый микрорайон и профиль покупателя.",
      contactTitle: "Поговорите с консультантом Sillage Immo",
      contactBody:
        "Хотите структурировать ваш проект продажи, покупки или аренды? Наша команда готова дать ясную и персонализированную рекомендацию.",
      contactCta: "Поговорить с экспертом",
    },
  }[locale];

  const methodStepsByLocale = {
    fr: methodSteps,
    en: [
      { title: "Reliable, evidence-based valuation", description: "Precise local analysis of the property and its environment to set a sound pricing strategy." },
      { title: "Premium presentation", description: "HD photos, immersive tours and high-quality presentation to maximize appeal." },
      { title: "Wide, targeted exposure", description: "Portal visibility plus inter-agency network, with a single point of contact for you." },
      { title: "Buyer qualification", description: "Contact triage and file verification to avoid low-quality viewings." },
      { title: "Transparent follow-up", description: "Step-by-step oversight of marketing actions with clear updates at each stage." },
      { title: "Support through to signature", description: "File coordination and administrative support to sell under the right conditions." },
    ],
    es: [
      { title: "Valoración fiable y argumentada", description: "Análisis local preciso del inmueble y de su entorno para fijar una estrategia de precio sólida." },
      { title: "Presentación premium", description: "Fotos HD, visita inmersiva y presentación de calidad para maximizar el atractivo." },
      { title: "Difusión amplia y segmentada", description: "Visibilidad en portales y red interagencias, con un interlocutor único para usted." },
      { title: "Cualificación de compradores", description: "Selección de contactos y verificación de expedientes para evitar visitas poco cualificadas." },
      { title: "Seguimiento transparente", description: "Pilotaje paso a paso de las acciones de comercialización con retorno claro en cada etapa." },
      { title: "Acompañamiento hasta la firma", description: "Coordinación del expediente y acompañamiento administrativo para vender en buenas condiciones." },
    ],
    ru: [
      { title: "Надежная и аргументированная оценка", description: "Точный локальный анализ объекта и его окружения для выстраивания верной ценовой стратегии." },
      { title: "Премиальная подача объекта", description: "HD-фото, иммерсивный тур и качественная презентация для максимальной привлекательности." },
      { title: "Широкое и точечное продвижение", description: "Порталы и межагентская сеть с единым контактным лицом для вас." },
      { title: "Квалификация покупателей", description: "Отбор контактов и проверка досье, чтобы избежать некачественных просмотров." },
      { title: "Прозрачное сопровождение", description: "Пошаговый контроль маркетинговых действий с понятной обратной связью на каждом этапе." },
      { title: "Сопровождение до подписания", description: "Координация сделки и административная поддержка для продажи на лучших условиях." },
    ],
  }[locale];

  const comparisonCopy = {
    fr: {
      alone: [
        "Estimation souvent approximative",
        "Diffusion et visibilité limitées",
        "Visites parfois peu qualifiées",
        "Charge administrative et juridique plus lourde",
      ],
      withSillage: [
        "Stratégie de prix et de commercialisation personnalisée",
        "Diffusion multi-canal + réseau inter-agences",
        "Qualification des acquéreurs et meilleur pilotage",
        "Accompagnement complet jusqu'à la signature notaire",
      ],
    },
    en: {
      alone: [
        "Valuation is often approximate",
        "Limited exposure and visibility",
        "Viewings may be poorly qualified",
        "Heavier administrative and legal workload",
      ],
      withSillage: [
        "Personalized pricing and marketing strategy",
        "Multi-channel exposure plus inter-agency network",
        "Buyer qualification and tighter control",
        "Full support through to the notary signature",
      ],
    },
    es: {
      alone: [
        "Valoración a menudo aproximada",
        "Difusión y visibilidad limitadas",
        "Visitas a veces poco cualificadas",
        "Carga administrativa y jurídica más pesada",
      ],
      withSillage: [
        "Estrategia personalizada de precio y comercialización",
        "Difusión multicanal + red interagencias",
        "Cualificación de compradores y mejor pilotaje",
        "Acompañamiento completo hasta la firma notarial",
      ],
    },
    ru: {
      alone: [
        "Оценка часто бывает приблизительной",
        "Ограниченное продвижение и видимость",
        "Просмотры нередко бывают нецелевыми",
        "Более тяжелая административная и юридическая нагрузка",
      ],
      withSillage: [
        "Персональная стратегия цены и продвижения",
        "Мультиканальное продвижение и межагентская сеть",
        "Квалификация покупателей и более точное управление",
        "Полное сопровождение до нотариального подписания",
      ],
    },
  }[locale];

  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="relative isolate overflow-hidden">
          <Image
            src="/home-hero-windows-nice.png"
            alt="Façade niçoise ensoleillée"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#141446]/46" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141446]/66 via-[#141446]/38 to-[#141446]/24" />
          <div className="relative w-full px-6 py-10 md:px-10 md:py-16 xl:px-14 2xl:px-20">
            <div className="grid gap-8 lg:grid-cols-[45%_55%] lg:items-center">
              <div className="max-w-[640px]">
                <SillageLogo priority className="h-auto w-full" />
              </div>
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#f4ece4]/70">
                  {copy.heroEyebrow}
                </p>
                <h1 className="sillage-section-title-font text-3xl md:text-5xl font-semibold leading-tight">
                  {copy.heroTitle}
                </h1>
                <p className="sillage-editorial-text text-[#f4ece4]/85 max-w-3xl">
                  {copy.heroBody}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={localizePath("/vente", locale)}
                    className="inline-block rounded border border-[#f4ece4] px-5 py-2.5 text-sm text-[#f4ece4] hover:bg-[#f4ece4] hover:text-[#141446] transition-colors"
                  >
                    {copy.saleCta}
                  </Link>
                  <Link
                    href={localizePath("/location", locale)}
                    className="inline-block rounded border border-[#f4ece4] px-5 py-2.5 text-sm text-[#f4ece4] hover:bg-[#f4ece4] hover:text-[#141446] transition-colors"
                  >
                    {copy.rentalCta}
                  </Link>
                  <Link
                    href={localizePath("/estimation", locale)}
                    className="inline-block rounded bg-[#f4ece4] px-5 py-2.5 text-sm text-[#141446] hover:opacity-90 transition-opacity"
                  >
                    {copy.valuationCta}
                  </Link>
                  <a
                    href="tel:+33423450485"
                    className="inline-block rounded border border-[#f4ece4] px-5 py-2.5 text-sm text-[#f4ece4] hover:bg-[#f4ece4] hover:text-[#141446] transition-colors"
                  >
                    {copy.advisorCta}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sillage-section-light">
        <div className="w-full px-6 py-8 md:px-10 md:py-12 xl:px-14 2xl:px-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="py-2">
            <p className="text-4xl font-medium">4.9/5</p>
            <p className="text-sm opacity-70">{copy.googleRating}</p>
          </div>
          <div className="py-2">
            <p className="text-4xl font-medium">+350</p>
            <p className="text-sm opacity-70">{copy.sellersHelped}</p>
          </div>
          <div className="py-2">
            <p className="text-4xl font-medium">+10 ans</p>
            <p className="text-sm opacity-70">{copy.experience}</p>
          </div>
          <div className="py-2">
            <p className="text-4xl font-medium">7j/7</p>
            <p className="text-sm opacity-70">{copy.availability}</p>
          </div>
        </div>
      </section>

      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-6">
          <HomeCommercialAssistant locale={locale} />
        </div>
      </section>

      <section className="sillage-section-light">
        <div className="w-full px-6 py-10 md:px-10 md:py-16 xl:px-14 2xl:px-20 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.16em] opacity-70">{copy.saleCatalog}</p>
              <h2 className="sillage-section-title">{copy.saleCatalogTitle}</h2>
              <p className="sillage-editorial-text opacity-75">
                {copy.saleCatalogBody}
              </p>
              <Link href={localizePath("/vente", locale)} className="sillage-btn inline-block rounded px-4 py-2 text-sm">
                {copy.exploreSelection}
              </Link>
            </article>
            <article className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.16em] opacity-70">{copy.rentalCatalog}</p>
              <h2 className="sillage-section-title">{copy.rentalCatalogTitle}</h2>
              <p className="sillage-editorial-text opacity-75">
                {copy.rentalCatalogBody}
              </p>
              <Link
                href={localizePath("/location", locale)}
                className="sillage-btn inline-block rounded px-4 py-2 text-sm"
              >
                {copy.rentalCatalogCta}
              </Link>
            </article>
          </div>
          <h2 className="sillage-section-title">{copy.methodTitle}</h2>
          <p className="sillage-editorial-text opacity-75 max-w-3xl">{copy.methodBody}</p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {methodStepsByLocale.map((step, index) => (
              <article key={step.title} className="space-y-2">
                <p className="text-2xl font-semibold opacity-70">{index + 1}</p>
                <h3 className="font-medium">{step.title}</h3>
                <p className="sillage-editorial-text opacity-75">{step.description}</p>
              </article>
            ))}
          </div>
          <div className="flex justify-center">
            <Link href={localizePath("/estimation", locale)} className="sillage-btn inline-block rounded px-4 py-2 text-sm">
              {copy.launchValuation}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 grid gap-8 md:grid-cols-2">
          <article className="space-y-3">
            <h2 className="sillage-section-title">{copy.sellAlone}</h2>
            <ul className="sillage-editorial-text opacity-80 space-y-1">
              {comparisonCopy.alone.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="space-y-3">
            <h2 className="sillage-section-title">{copy.withSillage}</h2>
            <ul className="sillage-editorial-text opacity-80 space-y-1">
              {comparisonCopy.withSillage.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="sillage-section-light">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-5">
          <h2 className="sillage-section-title">{copy.neighborhoodsTitle}</h2>
          <p className="sillage-editorial-text max-w-3xl opacity-75">{copy.neighborhoodsBody}</p>
          <div className="flex flex-wrap gap-2">
            {neighborhoods.map((area) => (
              <span key={area} className="sillage-chip rounded-full px-3 py-1 text-sm">
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20">
          <BuyerSearchForm locale={locale} />
        </div>
      </section>

      <HomeTeamSection locale={locale} />

      <section id="contact-expert" className="sillage-section-light">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-3">
          <h2 className="sillage-section-title">{copy.contactTitle}</h2>
          <p className="sillage-editorial-text opacity-80 max-w-3xl">{copy.contactBody}</p>
          <a
            href="tel:+33423450485"
            className="inline-block rounded border border-[#141446] px-5 py-2.5 text-sm text-[#141446] hover:bg-[#141446] hover:text-[#f4ece4] transition-colors"
          >
            {copy.contactCta}
          </a>
        </div>
      </section>
    </main>
  );
}