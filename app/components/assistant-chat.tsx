"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/data-layer";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { AIConsentNotice } from "./ai-consent-notice";

type AssistantListing = {
  title: string | null;
  city: string | null;
  postalCode: string | null;
  propertyType: string | null;
  businessType: string | null;
  rooms: number | null;
  livingArea: number | null;
  priceLabel: string;
  url: string | null;
  coverImageUrl: string | null;
};

type AiData = {
  reply: string;
  intent: "seller" | "buyer" | "market" | "unclear";
  ctaLabel: string;
  ctaHref: string;
  listings?: AssistantListing[];
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
  listings?: AssistantListing[];
};

const localizeAssistantHref = (href: string, locale: AppLocale) => {
  if (!href.startsWith("/")) return href;
  const [pathname, hash] = href.split("#");
  const localizedPath = localizePath(pathname || "/", locale);
  return hash ? `${localizedPath}#${hash}` : localizedPath;
};

export const ASSISTANT_COPY = {
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
    unavailable: "Assistant temporairement indisponible.",
    networkError: "Erreur réseau, merci de réessayer.",
    aiPrefix: "Sillage IA:",
    userPrefix: "Vous:",
    inputPlaceholder: "Ex : Je veux vendre rapidement mon appartement à Nice",
    sendingAria: "Envoi en cours",
    sendAria: "Envoyer",
    openAssistant: "Ouvrir l'assistant Sillage Immo",
    closeAssistant: "Fermer l'assistant",
    launcherLabel: "Une question ? Sillage IA",
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
    unavailable: "Assistant temporarily unavailable.",
    networkError: "Network error, please try again.",
    aiPrefix: "Sillage AI:",
    userPrefix: "You:",
    inputPlaceholder: "Example: I want to sell my apartment in Nice quickly",
    sendingAria: "Sending",
    sendAria: "Send",
    openAssistant: "Open the Sillage Immo assistant",
    closeAssistant: "Close the assistant",
    launcherLabel: "A question? Sillage AI",
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
    unavailable: "Asistente temporalmente no disponible.",
    networkError: "Error de red, por favor inténtelo de nuevo.",
    aiPrefix: "Sillage IA:",
    userPrefix: "Usted:",
    inputPlaceholder: "Ej.: Quiero vender rápidamente mi apartamento en Niza",
    sendingAria: "Enviando",
    sendAria: "Enviar",
    openAssistant: "Abrir el asistente de Sillage Immo",
    closeAssistant: "Cerrar el asistente",
    launcherLabel: "¿Una pregunta? Sillage IA",
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
    unavailable: "Ассистент временно недоступен.",
    networkError: "Ошибка сети, попробуйте еще раз.",
    aiPrefix: "Sillage AI:",
    userPrefix: "Вы:",
    inputPlaceholder: "Например: я хочу быстро продать свою квартиру в Ницце",
    sendingAria: "Отправка",
    sendAria: "Отправить",
    openAssistant: "Открыть ассистента Sillage Immo",
    closeAssistant: "Закрыть ассистента",
    launcherLabel: "Вопрос? Sillage AI",
  },
} satisfies Record<AppLocale, Record<string, string>>;

export function AssistantChat({
  locale = "fr",
  variant = "inline",
  persistKey,
}: {
  locale?: AppLocale;
  variant?: "inline" | "floating";
  persistKey?: string;
}) {
  const copy = ASSISTANT_COPY[locale];
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: copy.greeting,
    },
  ]);

  const storageKey = persistKey ? `sillage_assistant_${persistKey}_${locale}` : null;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hydratedRef = useRef(false);

  // Rehydrate a persisted conversation (floating variant) once, after mount, to
  // avoid SSR/CSR hydration mismatches on the deterministic greeting.
  useEffect(() => {
    if (!storageKey || hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChat(parsed);
        }
      }
    } catch {
      // ignore corrupted storage
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !hydratedRef.current) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(chat.slice(-30)));
    } catch {
      // storage unavailable / quota — non-blocking
    }
  }, [chat, storageKey]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [chat, loading]);

  const ask = async (overrideText?: string) => {
    const trimmed = (overrideText ?? message).trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const historyForApi = chat
      .slice(-10)
      .map((item) => ({ role: item.role, text: item.text }));
    setChat((prev) => [...prev, { role: "user", text: trimmed }]);
    if (!overrideText) setMessage("");
    track("ai_assistant_message_sent", {
      locale,
      message_length: trimmed.length,
      history_size: historyForApi.length,
      surface: variant,
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
          listings: data.data?.listings,
        },
      ]);
    } catch {
      setError(copy.networkError);
    } finally {
      setLoading(false);
    }
  };

  const panelClass =
    variant === "floating"
      ? "flex-1 min-h-0 overflow-auto rounded-xl bg-[rgba(244,236,228,0.9)] p-3 text-navy space-y-2"
      : "max-h-64 overflow-auto rounded-xl bg-[rgba(244,236,228,0.9)] p-3 text-navy space-y-2";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link href={localizePath("/estimation", locale)} className="sillage-chip rounded-full px-3 py-1 text-sm">
          {copy.sell}
        </Link>
        <Link href={localizePath("/recherche/nouvelle", locale)} className="sillage-chip rounded-full px-3 py-1 text-sm">
          {copy.buy}
        </Link>
        <button
          type="button"
          className="sillage-chip rounded-full px-3 py-1 text-sm disabled:opacity-60"
          disabled={loading}
          onClick={() => void ask(copy.marketUser)}
        >
          {copy.market}
        </button>
      </div>

      <div ref={scrollRef} className={panelClass}>
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
            {item.role === "assistant" && item.listings && item.listings.length > 0 ? (
              <div className="mt-2 space-y-2">
                {item.listings.map((listing, listingIndex) => {
                  const href = listing.url
                    ? localizeAssistantHref(listing.url, locale)
                    : null;
                  const details = [
                    listing.propertyType,
                    listing.rooms ? `${listing.rooms} pièces` : null,
                    listing.livingArea ? `${listing.livingArea} m²` : null,
                    listing.city,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const card = (
                    <div className="flex gap-3 rounded-lg bg-white/70 p-2">
                      {listing.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listing.coverImageUrl}
                          alt={listing.title ?? "Bien Sillage Immo"}
                          className="h-16 w-20 flex-none rounded object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {listing.title ?? "Bien Sillage Immo"}
                        </p>
                        {details ? (
                          <p className="truncate text-xs opacity-70">{details}</p>
                        ) : null}
                        <p className="text-xs font-semibold">{listing.priceLabel}</p>
                      </div>
                    </div>
                  );
                  return href ? (
                    <Link
                      key={`listing-${index}-${listingIndex}`}
                      href={href}
                      className="block transition hover:opacity-80"
                    >
                      {card}
                    </Link>
                  ) : (
                    <div key={`listing-${index}-${listingIndex}`}>{card}</div>
                  );
                })}
              </div>
            ) : null}
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

      <AIConsentNotice locale={locale} />
    </>
  );
}
