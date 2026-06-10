"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";

// Lightweight transparency notice shown once per browser when the
// homepage AI assistant is opened. Lets the visitor either acknowledge
// (the conversation is logged for 90 days for service-quality + market
// analytics) or opt out (no conversation is recorded thereafter).
//
// Opt-out is stored client-side in a `sillage_ai_optout` cookie that
// `/api/home-assistant` reads on every turn — see route handler.

const STORAGE_KEY = "sillage_ai_notice_seen_v1";
const OPT_OUT_COOKIE = "sillage_ai_optout";

const COPY = {
  fr: {
    title: "Vos conversations avec l'IA Sillage",
    body:
      "Pour améliorer notre accompagnement et mieux comprendre les attentes du marché niçois, nous conservons vos échanges avec l'assistant IA pendant 90 jours, sous forme anonymisée (e-mails et numéros masqués automatiquement). Vous pouvez à tout moment refuser ce traitement.",
    accept: "J'ai compris",
    optOut: "Refuser",
    learnMore: "Politique de confidentialité",
  },
  en: {
    title: "Your conversations with Sillage AI",
    body:
      "To improve our service and understand market expectations in Nice, we keep your conversations with the AI assistant for 90 days in anonymized form (emails and phone numbers are masked automatically). You can opt out at any time.",
    accept: "I understand",
    optOut: "Opt out",
    learnMore: "Privacy policy",
  },
  es: {
    title: "Sus conversaciones con la IA de Sillage",
    body:
      "Para mejorar nuestro servicio y comprender el mercado de Niza, conservamos sus conversaciones con el asistente IA durante 90 días de forma anonimizada (los correos y números se enmascaran automáticamente). Puede oponerse en cualquier momento.",
    accept: "Entendido",
    optOut: "Rechazar",
    learnMore: "Política de privacidad",
  },
  ru: {
    title: "Ваши разговоры с ИИ Sillage",
    body:
      "Чтобы улучшить наш сервис и понять рынок Ниццы, мы храним ваши разговоры с ИИ-ассистентом в течение 90 дней в обезличенной форме (эл. почта и телефоны маскируются автоматически). Вы можете отказаться в любое время.",
    accept: "Понятно",
    optOut: "Отказаться",
    learnMore: "Политика конфиденциальности",
  },
} satisfies Record<AppLocale, Record<string, string>>;

const setOptOutCookie = (value: "0" | "1") => {
  if (typeof document === "undefined") return;
  const maxAge = 90 * 24 * 60 * 60;
  document.cookie = `${OPT_OUT_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
};

const markAcknowledged = () => {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage may be unavailable (Safari private mode, etc.) — the
    // cookie below is enough to remember the choice across reloads.
  }
};

export function AIConsentNotice({
  locale = "fr",
  forceVisible = false,
}: {
  locale?: AppLocale;
  forceVisible?: boolean;
}) {
  const t = COPY[locale];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer the visibility flip to a microtask: this avoids the
    // "setState in effect body" lint warning while keeping the behavior
    // identical from the user's POV (the banner appears right after
    // first paint).
    let shouldShow = forceVisible;
    if (!shouldShow) {
      try {
        shouldShow = !localStorage.getItem(STORAGE_KEY);
      } catch {
        shouldShow = true;
      }
    }
    if (!shouldShow) return;
    const id = window.setTimeout(() => setVisible(true), 0);
    return () => window.clearTimeout(id);
  }, [forceVisible]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t.title}
      className="mt-3 rounded-lg border border-[rgba(20,20,70,0.18)] bg-sand/80 px-3 py-2 text-xs text-navy backdrop-blur"
    >
      <p className="font-semibold">{t.title}</p>
      <p className="mt-1 leading-relaxed opacity-85">{t.body}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/confidentialite"
          className="underline underline-offset-2 hover:opacity-100 opacity-75"
        >
          {t.learnMore}
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-[rgba(20,20,70,0.4)] px-3 py-1 hover:bg-[rgba(20,20,70,0.05)]"
            data-track-cta="ai_notice_opt_out"
            onClick={() => {
              setOptOutCookie("1");
              markAcknowledged();
              setVisible(false);
            }}
          >
            {t.optOut}
          </button>
          <button
            type="button"
            className="rounded-md bg-navy px-3 py-1 font-medium text-sand hover:bg-[#1c1c5a]"
            data-track-cta="ai_notice_accept"
            onClick={() => {
              setOptOutCookie("0");
              markAcknowledged();
              setVisible(false);
            }}
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
