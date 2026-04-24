import { HomeCommercialAssistant } from "@/app/components/home-commercial-assistant";
import type { AppLocale } from "@/lib/i18n/config";
import { HOME_COPY } from "../copy";

type Props = { locale: AppLocale };

export function AssistantSection({ locale }: Props) {
  const copy = HOME_COPY[locale].assistant;
  return (
    <section
      aria-labelledby="assistant-title"
      className="sillage-section-light"
    >
      <div className="w-full px-6 py-14 md:px-10 md:py-20 xl:px-14 2xl:px-20 space-y-8">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
            {copy.eyebrow}
          </p>
          <h2 id="assistant-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#141446]/80">{copy.body}</p>
          <p className="text-sm text-[#141446]/60">{copy.microcopy}</p>
        </div>
        <HomeCommercialAssistant locale={locale} />
      </div>
    </section>
  );
}
