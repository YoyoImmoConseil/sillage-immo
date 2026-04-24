import Image from "next/image";
import { SellerApiFirstFlow } from "./seller-api-first-flow";
import { SillageLogo } from "../components/sillage-logo";
import { getRequestLocale } from "@/lib/i18n/request";

type HeroCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  imageAlt: string;
  microProofs: string[];
  reassurance: { title: string; body: string }[];
  whatYouGet: {
    eyebrow: string;
    title: string;
    cards: { title: string; body: string }[];
  };
  differentiation: string;
};

const COPY: Record<"fr" | "en" | "es" | "ru", HeroCopy> = {
  fr: {
    eyebrow: "Estimation vendeur Sillage Immo",
    title: "Estimez votre bien à Nice avec une lecture claire du marché",
    subtitle:
      "Obtenez une première estimation structurée, puis échangez avec un conseiller Sillage pour définir le bon prix, le bon calendrier et la meilleure stratégie de mise en vente.",
    imageAlt: "Vue sur Nice et la baie des Anges depuis un appartement premium",
    microProofs: [
      "Estimation fondée sur les données du marché",
      "Expertise locale",
      "Accompagnement humain",
      "Espace client sécurisé",
    ],
    reassurance: [
      {
        title: "Données de marché",
        body: "Une première valeur fondée sur les caractéristiques réelles de votre bien.",
      },
      {
        title: "Expertise locale",
        body: "Nice et la Côte d'Azur se lisent quartier par quartier, parfois rue par rue.",
      },
      {
        title: "Conseiller humain",
        body: "Votre demande est relue pour tenir compte des éléments sensibles : étage, vue, état, terrasse, immeuble.",
      },
      {
        title: "Sans engagement",
        body: "Votre demande sert à préparer une analyse, pas à vous enfermer dans une décision.",
      },
    ],
    whatYouGet: {
      eyebrow: "Ce que vous obtenez",
      title: "Ce que vous obtenez après votre demande",
      cards: [
        {
          title: "Une première fourchette de valeur",
          body: "Pour situer votre bien dans le marché réel de Nice et de la Côte d'Azur.",
        },
        {
          title: "Une analyse humaine complémentaire",
          body: "Votre conseiller relit les éléments sensibles : état, étage, vue, terrasse, immeuble et contexte de vente.",
        },
        {
          title: "Une stratégie de mise en vente",
          body: "Prix, calendrier, présentation, diagnostics, documents syndic et qualification des acquéreurs.",
        },
      ],
    },
    differentiation:
      "Contrairement à une estimation automatique isolée, votre demande sert de point de départ à une vraie stratégie de vente : prix, présentation, calendrier, documents, diffusion et qualification des acquéreurs.",
  },
  en: {
    eyebrow: "Sillage Immo seller valuation",
    title: "Value your property in Nice with a clear reading of the market",
    subtitle:
      "Get a first structured valuation, then speak with a Sillage advisor to set the right price, the right timing and the best go-to-market strategy.",
    imageAlt: "View over Nice and the Baie des Anges from a premium apartment",
    microProofs: [
      "Valuation grounded in market data",
      "Local expertise",
      "Human support",
      "Secure client space",
    ],
    reassurance: [
      {
        title: "Market data",
        body: "A first value grounded in the actual features of your property.",
      },
      {
        title: "Local expertise",
        body: "Nice and the French Riviera are read neighborhood by neighborhood, sometimes street by street.",
      },
      {
        title: "Human advisor",
        body: "Your request is reviewed to factor the sensitive details: floor, view, condition, terrace, building.",
      },
      {
        title: "No commitment",
        body: "Your request prepares an analysis; it doesn't lock you into any decision.",
      },
    ],
    whatYouGet: {
      eyebrow: "What you get",
      title: "What you get after your request",
      cards: [
        {
          title: "A first value range",
          body: "To position your property in the real market of Nice and the French Riviera.",
        },
        {
          title: "A complementary human review",
          body: "Your advisor re-reads the sensitive items: condition, floor, view, terrace, building and sale context.",
        },
        {
          title: "A go-to-market strategy",
          body: "Price, timing, presentation, diagnostics, condo documents and buyer qualification.",
        },
      ],
    },
    differentiation:
      "Unlike a single automated valuation, your request is the starting point of a real sales strategy: price, presentation, timing, documents, diffusion and buyer qualification.",
  },
  es: {
    eyebrow: "Valoración vendedor Sillage Immo",
    title: "Valore su inmueble en Niza con una lectura clara del mercado",
    subtitle:
      "Obtenga una primera valoración estructurada y luego hable con un asesor Sillage para definir el precio adecuado, el calendario y la mejor estrategia de comercialización.",
    imageAlt: "Vista de Niza y la Bahía de los Ángeles desde un apartamento premium",
    microProofs: [
      "Valoración basada en los datos del mercado",
      "Experiencia local",
      "Acompañamiento humano",
      "Espacio cliente seguro",
    ],
    reassurance: [
      {
        title: "Datos de mercado",
        body: "Un primer valor basado en las características reales de su inmueble.",
      },
      {
        title: "Experiencia local",
        body: "Niza y la Costa Azul se leen barrio por barrio, a veces calle por calle.",
      },
      {
        title: "Asesor humano",
        body: "Su solicitud es revisada para tener en cuenta los elementos sensibles: planta, vistas, estado, terraza, edificio.",
      },
      {
        title: "Sin compromiso",
        body: "Su solicitud sirve para preparar un análisis, no para encerrarle en una decisión.",
      },
    ],
    whatYouGet: {
      eyebrow: "Lo que obtiene",
      title: "Lo que obtiene después de su solicitud",
      cards: [
        {
          title: "Una primera horquilla de valor",
          body: "Para situar su inmueble en el mercado real de Niza y la Costa Azul.",
        },
        {
          title: "Un análisis humano complementario",
          body: "Su asesor revisa los elementos sensibles: estado, planta, vistas, terraza, edificio y contexto de venta.",
        },
        {
          title: "Una estrategia de comercialización",
          body: "Precio, calendario, presentación, diagnósticos, documentación de copropiedad y cualificación de los compradores.",
        },
      ],
    },
    differentiation:
      "A diferencia de una valoración automática aislada, su solicitud es el punto de partida de una verdadera estrategia de venta: precio, presentación, calendario, documentos, difusión y cualificación de los compradores.",
  },
  ru: {
    eyebrow: "Оценка продавца Sillage Immo",
    title: "Оцените ваш объект в Ницце с ясным пониманием рынка",
    subtitle:
      "Получите первичную структурированную оценку, а затем обсудите с консультантом Sillage правильную цену, календарь и лучшую стратегию выхода на рынок.",
    imageAlt: "Вид на Ниццу и бухту Ангелов из премиальной квартиры",
    microProofs: [
      "Оценка на основе рыночных данных",
      "Локальная экспертиза",
      "Человеческое сопровождение",
      "Защищённый кабинет клиента",
    ],
    reassurance: [
      {
        title: "Рыночные данные",
        body: "Первичная стоимость, основанная на реальных характеристиках вашего объекта.",
      },
      {
        title: "Локальная экспертиза",
        body: "Ницца и Лазурный Берег читаются квартал за кварталом, иногда улица за улицей.",
      },
      {
        title: "Живой консультант",
        body: "Ваша заявка перечитывается, чтобы учесть важные детали: этаж, вид, состояние, террасу, здание.",
      },
      {
        title: "Без обязательств",
        body: "Ваша заявка служит для подготовки анализа, а не для того, чтобы загнать вас в решение.",
      },
    ],
    whatYouGet: {
      eyebrow: "Что вы получаете",
      title: "Что вы получаете после вашей заявки",
      cards: [
        {
          title: "Первичный диапазон стоимости",
          body: "Чтобы расположить ваш объект на реальном рынке Ниццы и Лазурного Берега.",
        },
        {
          title: "Дополнительный человеческий анализ",
          body: "Ваш консультант перечитывает важные элементы: состояние, этаж, вид, террасу, здание и контекст продажи.",
        },
        {
          title: "Стратегия выхода на рынок",
          body: "Цена, календарь, презентация, диагностика, документы кондоминиума и квалификация покупателей.",
        },
      ],
    },
    differentiation:
      "В отличие от изолированной автоматической оценки, ваша заявка — отправная точка реальной стратегии продажи: цена, презентация, календарь, документы, продвижение и квалификация покупателей.",
  },
};

export default async function EstimationPage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];

  return (
    <main className="min-h-screen">
      <section
        aria-labelledby="estimation-hero-title"
        className="relative isolate overflow-hidden bg-[#141446] text-[#f4ece4]"
      >
        <Image
          src="/decor-sillage-blue.svg"
          alt=""
          width={320}
          height={310}
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 opacity-[0.10]"
        />
        <div className="relative w-full px-6 py-12 md:px-10 md:py-20 xl:px-14 xl:py-24 2xl:px-20">
          <div className="grid gap-10 lg:grid-cols-[38%_62%] lg:items-center">
            <div className="max-w-[420px]">
              <SillageLogo priority className="h-auto w-full" />
            </div>
            <div className="space-y-5 max-w-3xl">
              <p className="text-[11px] md:text-xs uppercase tracking-[0.22em] text-[#f4ece4]/75">
                {copy.eyebrow}
              </p>
              <h1
                id="estimation-hero-title"
                className="sillage-section-title-font text-3xl md:text-5xl xl:text-[52px] font-semibold leading-[1.1] tracking-tight"
              >
                {copy.title}
              </h1>
              <p className="sillage-editorial-text text-[#f4ece4]/90 max-w-3xl">
                {copy.subtitle}
              </p>
              <ul className="flex flex-wrap gap-2 pt-2">
                {copy.microProofs.map((proof) => (
                  <li
                    key={proof}
                    className="inline-flex items-center rounded-full border border-[#f4ece4]/40 bg-[#f4ece4]/5 px-3 py-1.5 text-xs md:text-[13px] text-[#f4ece4]/90"
                  >
                    {proof}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Sillage Immo - réassurance estimation"
        className="bg-[#f4ece4] text-[#141446] border-b border-[#141446]/10"
      >
        <div className="w-full px-6 py-10 md:px-10 md:py-12 xl:px-14 2xl:px-20">
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {copy.reassurance.map((item) => (
              <li
                key={item.title}
                className="rounded-[20px] bg-white p-5 ring-1 ring-[#141446]/5"
              >
                <h2 className="font-serif text-base font-semibold text-[#141446]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#141446]/75">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="estimation-what-title"
        className="bg-[#f4ece4] text-[#141446]"
      >
        <div className="w-full px-6 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20 space-y-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
              {copy.whatYouGet.eyebrow}
            </p>
            <h2 id="estimation-what-title" className="sillage-section-title">
              {copy.whatYouGet.title}
            </h2>
          </div>
          <ul className="grid gap-5 md:grid-cols-3">
            {copy.whatYouGet.cards.map((card, index) => (
              <li
                key={card.title}
                className="rounded-[24px] bg-white p-6 ring-1 ring-[#141446]/5"
              >
                <span className="font-serif text-sm text-[#141446]/50">
                  0{index + 1}
                </span>
                <h3 className="mt-2 font-serif text-lg font-semibold text-[#141446]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#141446]/75">
                  {card.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="max-w-4xl rounded-[20px] border-l-4 border-[#141446] bg-white/70 px-5 py-4 text-sm md:text-base italic text-[#141446]/85 leading-relaxed">
            {copy.differentiation}
          </p>
        </div>
      </section>

      <section className="bg-[#f4ece4] text-[#141446]">
        <div className="w-full px-6 py-8 md:px-10 md:py-12 xl:px-14 2xl:px-20">
          <SellerApiFirstFlow locale={locale} />
        </div>
      </section>
    </main>
  );
}
