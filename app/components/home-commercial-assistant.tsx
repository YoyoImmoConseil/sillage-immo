"use client";

import type { AppLocale } from "@/lib/i18n/config";
import { ASSISTANT_COPY, AssistantChat } from "./assistant-chat";

export function HomeCommercialAssistant({ locale = "fr" }: { locale?: AppLocale }) {
  const copy = ASSISTANT_COPY[locale];

  return (
    <section className="sillage-card p-0 space-y-4">
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="sillage-editorial-text opacity-75">{copy.intro}</p>
      <AssistantChat locale={locale} variant="inline" />
    </section>
  );
}
