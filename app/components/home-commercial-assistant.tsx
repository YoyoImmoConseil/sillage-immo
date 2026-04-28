"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics/data-layer";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";

type AiData = {
  reply: string;
  intent: "seller" | "buyer" | "market" | "unclear";
  ctaLabel: string;
  ctaHref: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
};

const localizeAssistantHref = (href: string, locale: AppLocale) => {
  if (!href.startsWith("/")) return href;
  const [pathname, hash] = href.split("#");
  const localizedPath = localizePath(pathname || "/", locale);
  return hash ? `${localizedPath}#${hash}` : localizedPath;
};

const COPY = {
  fr: {
    greeting:
      "Bonjour et bienvenue chez Sillage Immo. Décrivez votre projet, je vous oriente vers le bon parcours.",
    title: "Assistant commercial Sillage Immo",
    intro:
      "Dites-nous votre projet. Nous vous orientons vers le parcours le plus pertinent, avec un accompagnement sur-mesure.",
    sell: "Je veux vendre mon bien",
    buy: "Je veux acheter un bien",
    market: "Je veux me renseigner sur le marché",
    marketUser: "Je veux juste me renseigner sur le marché",
    marketAnswer:
      "Le marché niçois reste dynamique mais sélectif. Une bonne stratégie de prix, de présentation et de timing fait la différence. Nos experts vous donnent une lecture locale claire, actionnable et adaptée à votre projet.",
    marketCta: "Rencontrer un expert Sillage Immo",
    unavailable: "Assistant temporairement indisponible.",
    networkError: "Erreur réseau, merci de réessayer.",
    aiPrefix: "Sillage IA:",
    userPrefix: "Vous:",
    inputPlaceholder: "Ex : Je veux vendre rapidement mon appartement à Nice",
    sendingAria: "Envoi en cours",
    sendAria: "Envoyer",
  },
  en: {
    greeting:
      "Hello and welcome to Sillage Immo. Describe your project and I will guide you to the right path.",
    title: "Sillage Immo Sales Assistant",
    intro:
      "Tell us about your project. We will guide you to the most relevant path, with tailored support.",
    sell: "I want to sell my property",
    buy: "I want to buy a property",
    market: "I want market guidance",
    marketUser: "I just want information about the market",
    marketAnswer:
      "The Nice market remains dynamic but selective. The right pricing, presentation and timing strategy makes all the difference. Our experts provide a clear local view that is practical and adapted to your project.",
    marketCta: "Speak with a Sillage expert",
    unavailable: "Assistant temporarily unavailable.",
    networkError: "Network error, please try again.",
    aiPrefix: "Sillage AI:",
    userPrefix: "You:",
    inputPlaceholder: "Example: I want to sell my apartment in Nice quickly",
    sendingAria: "Sending",
    sendAria: "Send",
  },
  es: {
    greeting:
      "Hola y bienvenido a Sillage Immo. Describa su proyecto y le orientaré hacia el recorrido adecuado.",
    title: "Asistente comercial Sillage Immo",
    intro:
      "Cuéntenos su proyecto. Le orientamos hacia el recorrido más pertinente, con un acompañamiento a medida.",
    sell: "Quiero vender mi inmueble",
    buy: "Quiero comprar un inmueble",
    market: "Quiero informarme sobre el mercado",
    marketUser: "Solo quiero informarme sobre el mercado",
    marketAnswer:
      "El mercado de Niza sigue siendo dinámico pero selectivo. Una buena estrategia de precio, presentación y calendario marca la diferencia. Nuestros expertos le ofrecen una visión local clara, útil y adaptada a su proyecto.",
    marketCta: "Hablar con un experto de Sillage",
    unavailable: "Asistente temporalmente no disponible.",
    networkError: "Error de red, por favor inténtelo de nuevo.",
    aiPrefix: "Sillage IA:",
    userPrefix: "Usted:",
    inputPlaceholder: "Ej.: Quiero vender rápidamente mi apartamento en Niza",
    sendingAria: "Enviando",
    sendAria: "Enviar",
  },
  ru: {
    greeting:
      "Здравствуйте и добро пожаловать в Sillage Immo. Опишите ваш проект, и я направлю вас по подходящему сценарию.",
    title: "Коммерческий ассистент Sillage Immo",
    intro:
      "Расскажите о вашем проекте. Мы подскажем наиболее подходящий сценарий и предложим индивидуальное сопровождение.",
    sell: "Я хочу продать недвижимость",
    buy: "Я хочу купить недвижимость",
    market: "Я хочу узнать о рынке",
    marketUser: "Я хочу просто узнать о рынке",
    marketAnswer:
      "Рынок Ниццы остаётся активным, но избирательным. Правильная стратегия цены, презентации и тайминга имеет решающее значение. Наши эксперты дают понятный локальный анализ, полезный именно для вашего проекта.",
    marketCta: "Поговорить с экспертом Sillage",
    unavailable: "Ассистент временно недоступен.",
    networkError: "Ошибка сети, попробуйте еще раз.",
    aiPrefix: "Sillage AI:",
    userPrefix: "Вы:",
    inputPlaceholder: "Например: я хочу быстро продать свою квартиру в Ницце",
    sendingAria: "Отправка",
    sendAria: "Отправить",
  },
} satisfies Record<AppLocale, Record<string, string>>;

export function HomeCommercialAssistant({ locale = "fr" }: { locale?: AppLocale }) {
  const copy = COPY[locale];
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: copy.greeting,
    },
  ]);

  const ask = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const historyForApi = chat
      .slice(-10)
      .map((item) => ({ role: item.role, text: item.text }));
    setChat((prev) => [...prev, { role: "user", text: trimmed }]);
    setMessage("");
    track("ai_assistant_message_sent", {
      locale,
      message_length: trimmed.length,
      history_size: historyForApi.length,
    });
    try {
      const response = await fetch("/api/home-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
          locale,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: AiData;
      };
      if (!response.ok || !data.ok || !data.data) {
        setError(data.message ?? copy.unavailable);
        return;
      }
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.data?.reply ?? "",
          ctaLabel: data.data?.ctaLabel,
          ctaHref: data.data?.ctaHref,
        },
      ]);
    } catch {
      setError(copy.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="sillage-card p-0 space-y-4">
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="sillage-editorial-text opacity-75">{copy.intro}</p>
      <div className="flex flex-wrap gap-2">
        <Link href={localizePath("/estimation", locale)} className="sillage-chip rounded-full px-3 py-1 text-sm">
          {copy.sell}
        </Link>
        <Link href={`${localizePath("/", locale)}#acquereur-form`} className="sillage-chip rounded-full px-3 py-1 text-sm">
          {copy.buy}
        </Link>
        <button
          type="button"
          className="sillage-chip rounded-full px-3 py-1 text-sm"
          onClick={() => {
            setChat((prev) => [
              ...prev,
              { role: "user", text: copy.marketUser },
              {
                role: "assistant",
                text: copy.marketAnswer,
                ctaLabel: copy.marketCta,
                ctaHref: `${localizePath("/", locale)}#contact-expert`,
              },
            ]);
          }}
        >
          {copy.market}
        </button>
      </div>

      <div className="max-h-64 overflow-auto rounded-xl bg-[rgba(244,236,228,0.9)] p-3 text-[#141446] space-y-2">
        {chat.map((item, index) => (
          <div
            key={`${item.role}-${index}`}
            className={`rounded-lg px-3 py-2 text-sm ${
              item.role === "assistant"
                ? "bg-[rgba(20,20,70,0.06)]"
                : "bg-[rgba(20,20,70,0.14)] font-medium"
            }`}
          >
            <p>
              <span className="mr-1">{item.role === "assistant" ? copy.aiPrefix : copy.userPrefix}</span>
              {item.text}
            </p>
            {item.role === "assistant" && item.ctaLabel && item.ctaHref ? (
              <div className="mt-2">
                <Link href={localizeAssistantHref(item.ctaHref, locale)} className="sillage-btn inline-block rounded px-3 py-1 text-xs">
                  {item.ctaLabel}
                </Link>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder={copy.inputPlaceholder}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void ask();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void ask()}
          className="sillage-btn inline-flex items-center justify-center rounded px-3 py-2 text-sm disabled:opacity-60"
          disabled={loading || message.trim().length < 2}
          aria-label={loading ? copy.sendingAria : copy.sendAria}
        >
          {loading ? (
            "..."
          ) : (
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 11.5L21 3L12.5 21L10 13L3 11.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
