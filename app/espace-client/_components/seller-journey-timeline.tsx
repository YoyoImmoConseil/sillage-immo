import type { AppLocale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import type { SellerJourneyStep, SellerJourneyStepKey } from "@/lib/client-space/seller-journey";

const STEP_COPY: Record<AppLocale, Record<SellerJourneyStepKey, { title: string; hint: string }>> = {
  fr: {
    estimation: { title: "Estimation", hint: "Analyse du bien et fourchette de valeur" },
    strategy: { title: "Stratégie", hint: "Prix, calendrier et mandat" },
    staging: { title: "Mise en valeur", hint: "Photos, plans, visite virtuelle" },
    marketing: { title: "Diffusion", hint: "Annonce publiée, visites organisées" },
    qualification: { title: "Qualification", hint: "Offres reçues et négociation" },
    signature: { title: "Signature", hint: "Compromis puis acte authentique" },
  },
  en: {
    estimation: { title: "Valuation", hint: "Property analysis and value range" },
    strategy: { title: "Strategy", hint: "Price, timing and mandate" },
    staging: { title: "Presentation", hint: "Photos, plans, virtual tour" },
    marketing: { title: "Marketing", hint: "Listing live, viewings organised" },
    qualification: { title: "Qualification", hint: "Offers received and negotiation" },
    signature: { title: "Signing", hint: "Preliminary contract, then deed" },
  },
  es: {
    estimation: { title: "Valoración", hint: "Análisis del inmueble y rango de valor" },
    strategy: { title: "Estrategia", hint: "Precio, calendario y mandato" },
    staging: { title: "Presentación", hint: "Fotos, planos, visita virtual" },
    marketing: { title: "Difusión", hint: "Anuncio publicado, visitas organizadas" },
    qualification: { title: "Cualificación", hint: "Ofertas recibidas y negociación" },
    signature: { title: "Firma", hint: "Contrato de arras y escritura" },
  },
  ru: {
    estimation: { title: "Оценка", hint: "Анализ объекта и диапазон стоимости" },
    strategy: { title: "Стратегия", hint: "Цена, сроки и мандат" },
    staging: { title: "Подготовка", hint: "Фото, планы, виртуальный тур" },
    marketing: { title: "Продвижение", hint: "Объявление опубликовано, показы" },
    qualification: { title: "Отбор", hint: "Полученные предложения и переговоры" },
    signature: { title: "Подписание", hint: "Предварительный договор, затем акт" },
  },
};

const TITLE: Record<AppLocale, { heading: string; current: string }> = {
  fr: { heading: "Où en est votre vente", current: "Étape en cours" },
  en: { heading: "Where your sale stands", current: "Current step" },
  es: { heading: "Estado de su venta", current: "Etapa en curso" },
  ru: { heading: "Статус вашей продажи", current: "Текущий этап" },
};

/** Frise des six étapes de la méthode Sillage, avec l'étape courante mise en évidence. */
export function SellerJourneyTimeline({ steps, locale }: { steps: SellerJourneyStep[]; locale: AppLocale }) {
  const copy = STEP_COPY[locale];
  const title = TITLE[locale];
  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6 md:p-8">
      <h3 className="sillage-section-title-font text-xl font-semibold text-navy">{title.heading}</h3>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-2">
        {steps.map((step, index) => {
          const isDone = step.state === "done";
          const isCurrent = step.state === "current";
          return (
            <li key={step.key} className="relative flex gap-3 lg:flex-col lg:gap-3">
              {/* Trait de liaison entre les étapes (grand écran) */}
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={`absolute left-4 top-8 h-[calc(100%-1rem)] w-px lg:left-8 lg:top-4 lg:h-px lg:w-[calc(100%-2rem)] ${
                    isDone ? "bg-navy" : "bg-navy/15"
                  }`}
                />
              ) : null}
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone
                    ? "bg-navy text-sand"
                    : isCurrent
                      ? "border-2 border-navy bg-white text-navy"
                      : "border border-navy/25 bg-white text-navy/45"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <div className="min-w-0">
                {isCurrent ? (
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-navy/60">{title.current}</p>
                ) : null}
                <p className={`text-sm font-semibold ${isCurrent || isDone ? "text-navy" : "text-navy/55"}`}>
                  {copy[step.key].title}
                </p>
                <p className={`text-xs leading-snug ${isCurrent ? "text-navy/75" : "text-navy/50"}`}>
                  {step.at ? formatDate(step.at, locale) : copy[step.key].hint}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
