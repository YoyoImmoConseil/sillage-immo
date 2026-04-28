"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  applyConsentState,
  buildCustomConsent,
  denyAll,
  grantAll,
  loadConsentState,
  saveConsentState,
  type ConsentState,
} from "@/lib/analytics/consent";
import type { AppLocale } from "@/lib/i18n/config";

type Mode = "hidden" | "summary" | "detailed";

const COPY = {
  fr: {
    title: "Cookies & confidentialité",
    body:
      "Nous utilisons des cookies pour mesurer l'audience du site et améliorer nos services. Vous pouvez accepter, refuser, ou personnaliser votre choix à tout moment.",
    accept: "Tout accepter",
    deny: "Tout refuser",
    customize: "Personnaliser",
    save: "Enregistrer mes choix",
    back: "Retour",
    necessaryTitle: "Cookies strictement nécessaires",
    necessaryBody: "Toujours actifs. Indispensables au fonctionnement du site.",
    analyticsTitle: "Mesure d'audience",
    analyticsBody:
      "Nous aide à comprendre comment vous utilisez le site (pages vues, parcours) pour l'améliorer.",
    adsTitle: "Marketing & publicité",
    adsBody:
      "Permet de mesurer l'efficacité de nos communications et d'adapter nos messages.",
    moreInfo: "En savoir plus sur nos cookies",
  },
  en: {
    title: "Cookies & privacy",
    body:
      "We use cookies to measure traffic and improve our services. You can accept, decline, or customize your preferences at any time.",
    accept: "Accept all",
    deny: "Decline all",
    customize: "Customize",
    save: "Save my choices",
    back: "Back",
    necessaryTitle: "Strictly necessary",
    necessaryBody: "Always on. Required for the site to function.",
    analyticsTitle: "Analytics",
    analyticsBody:
      "Helps us understand how you use the site (page views, journeys) to improve it.",
    adsTitle: "Marketing & advertising",
    adsBody: "Used to measure how effective our communications are.",
    moreInfo: "Learn more about our cookies",
  },
  es: {
    title: "Cookies y privacidad",
    body:
      "Utilizamos cookies para medir la audiencia y mejorar nuestros servicios. Puede aceptar, rechazar o personalizar su elección en cualquier momento.",
    accept: "Aceptar todo",
    deny: "Rechazar todo",
    customize: "Personalizar",
    save: "Guardar mis elecciones",
    back: "Volver",
    necessaryTitle: "Cookies estrictamente necesarias",
    necessaryBody: "Siempre activas. Imprescindibles para el funcionamiento del sitio.",
    analyticsTitle: "Medición de audiencia",
    analyticsBody:
      "Nos ayuda a entender cómo usa el sitio (páginas vistas, recorridos) para mejorarlo.",
    adsTitle: "Marketing y publicidad",
    adsBody: "Permite medir la eficacia de nuestras comunicaciones.",
    moreInfo: "Más información sobre nuestras cookies",
  },
  ru: {
    title: "Cookies и конфиденциальность",
    body:
      "Мы используем cookies для измерения посещаемости сайта и улучшения наших услуг. Вы можете принять, отклонить или настроить параметры в любой момент.",
    accept: "Принять все",
    deny: "Отклонить все",
    customize: "Настроить",
    save: "Сохранить выбор",
    back: "Назад",
    necessaryTitle: "Строго необходимые",
    necessaryBody: "Всегда активны. Необходимы для работы сайта.",
    analyticsTitle: "Аналитика посещаемости",
    analyticsBody:
      "Помогает понять, как вы используете сайт (просмотры страниц, маршруты), чтобы его улучшить.",
    adsTitle: "Маркетинг и реклама",
    adsBody: "Позволяет оценить эффективность наших коммуникаций.",
    moreInfo: "Узнать больше о cookies",
  },
} satisfies Record<AppLocale, Record<string, string>>;

export function AnalyticsConsentBanner({ locale = "fr" }: { locale?: AppLocale }) {
  const t = COPY[locale];
  const [mode, setMode] = useState<Mode>("hidden");
  const [analyticsChecked, setAnalyticsChecked] = useState(true);
  const [adsChecked, setAdsChecked] = useState(false);

  useEffect(() => {
    const stored = loadConsentState();
    if (stored) {
      // Replay user's prior choice into GTM Consent Mode so tags unblock.
      applyConsentState(stored);
      return;
    }
    // Defer to a microtask to avoid a synchronous setState in the effect body
    // (react-hooks/set-state-in-effect). The banner appears right after first
    // paint, which is fine for a GDPR overlay.
    const id = window.setTimeout(() => setMode("summary"), 0);
    return () => window.clearTimeout(id);
  }, []);

  const persist = (state: ConsentState) => {
    saveConsentState(state);
    applyConsentState(state);
    setMode("hidden");
  };

  if (mode === "hidden") return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t.title}
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-[rgba(20,20,70,0.18)] bg-[#f4ece4]/98 px-4 py-4 shadow-[0_-8px_24px_rgba(20,20,70,0.12)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-[#141446] sm:flex-row sm:items-start sm:justify-between">
        {mode === "summary" ? (
          <>
            <div className="max-w-3xl space-y-1">
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-sm opacity-85">{t.body}</p>
              <p className="text-xs opacity-70">
                <Link
                  href="/confidentialite"
                  className="underline underline-offset-2 hover:opacity-100"
                >
                  {t.moreInfo}
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-[rgba(20,20,70,0.4)] px-4 py-2 text-sm hover:bg-[rgba(20,20,70,0.05)]"
                data-track-cta="consent_decline"
                onClick={() => persist(denyAll())}
              >
                {t.deny}
              </button>
              <button
                type="button"
                className="rounded-md border border-[rgba(20,20,70,0.4)] px-4 py-2 text-sm hover:bg-[rgba(20,20,70,0.05)]"
                data-track-cta="consent_customize"
                onClick={() => setMode("detailed")}
              >
                {t.customize}
              </button>
              <button
                type="button"
                className="rounded-md bg-[#141446] px-4 py-2 text-sm font-medium text-[#f4ece4] hover:bg-[#1c1c5a]"
                data-track-cta="consent_accept_all"
                onClick={() => persist(grantAll())}
              >
                {t.accept}
              </button>
            </div>
          </>
        ) : (
          <div className="w-full space-y-3">
            <p className="text-sm font-semibold">{t.title}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-[rgba(20,20,70,0.18)] bg-white/60 p-3">
                <p className="text-sm font-medium">{t.necessaryTitle}</p>
                <p className="mt-1 text-xs opacity-75">{t.necessaryBody}</p>
                <label className="mt-2 inline-flex items-center gap-2 text-xs">
                  <input type="checkbox" checked disabled />
                  <span>Always on</span>
                </label>
              </div>
              <div className="rounded-md border border-[rgba(20,20,70,0.18)] bg-white/60 p-3">
                <p className="text-sm font-medium">{t.analyticsTitle}</p>
                <p className="mt-1 text-xs opacity-75">{t.analyticsBody}</p>
                <label className="mt-2 inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={analyticsChecked}
                    onChange={(event) => setAnalyticsChecked(event.target.checked)}
                  />
                  <span>{t.analyticsTitle}</span>
                </label>
              </div>
              <div className="rounded-md border border-[rgba(20,20,70,0.18)] bg-white/60 p-3">
                <p className="text-sm font-medium">{t.adsTitle}</p>
                <p className="mt-1 text-xs opacity-75">{t.adsBody}</p>
                <label className="mt-2 inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={adsChecked}
                    onChange={(event) => setAdsChecked(event.target.checked)}
                  />
                  <span>{t.adsTitle}</span>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[rgba(20,20,70,0.4)] px-4 py-2 text-sm hover:bg-[rgba(20,20,70,0.05)]"
                onClick={() => setMode("summary")}
              >
                {t.back}
              </button>
              <button
                type="button"
                className="rounded-md bg-[#141446] px-4 py-2 text-sm font-medium text-[#f4ece4] hover:bg-[#1c1c5a]"
                data-track-cta="consent_save_custom"
                onClick={() =>
                  persist(
                    buildCustomConsent({
                      analytics: analyticsChecked ? "granted" : "denied",
                      ads: adsChecked ? "granted" : "denied",
                      functional: analyticsChecked ? "granted" : "denied",
                    })
                  )
                }
              >
                {t.save}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
