"use client";

import { Card, Title, Text, Badge } from "@tremor/react";
import type { SynthesisResult } from "@/services/admin/dashboard-syntheses.service";

const SECTION_LABELS: Record<SynthesisResult["section"], string> = {
  market_trends: "Tendances marché",
  risk_signals: "Risques détectés",
  matching_opportunities: "Opportunités matching",
  market_voice: "Voix du marché",
};

const SECTION_BADGE_COLORS: Record<
  SynthesisResult["section"],
  "indigo" | "amber" | "emerald" | "sky"
> = {
  market_trends: "indigo",
  risk_signals: "amber",
  matching_opportunities: "emerald",
  market_voice: "sky",
};

const formatGeneratedAt = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export function SynthesesGrid({
  syntheses,
  periodLabel,
}: {
  syntheses: SynthesisResult[];
  periodLabel?: string;
}) {
  if (syntheses.length === 0) {
    return (
      <Card className="bg-white/80">
        <Title className="text-navy">Synthèses IA</Title>
        <Text className="mt-2 text-navy/60">
          Aucune synthèse n&apos;a pu être générée. Vérifiez la clé OpenAI.
        </Text>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {periodLabel ? (
        <p className="text-xs text-navy/60">
          Synthèses IA calculées sur la période :{" "}
          <span className="font-semibold text-navy">{periodLabel}</span>.
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {syntheses.map((synthesis) => (
          <Card key={synthesis.section} className="bg-white/80">
            <div className="flex items-start justify-between gap-2">
              <Title className="text-navy">
                {SECTION_LABELS[synthesis.section]}
              </Title>
              <Badge color={SECTION_BADGE_COLORS[synthesis.section]}>IA</Badge>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-navy/85">
              {synthesis.body}
            </p>
            <p className="mt-3 text-xs text-navy/55">
              Généré le {formatGeneratedAt(synthesis.generatedAt)} •{" "}
              {synthesis.model}
              {synthesis.warning ? (
                <span className="ml-2 text-amber-700">
                  ({synthesis.warning})
                </span>
              ) : null}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
