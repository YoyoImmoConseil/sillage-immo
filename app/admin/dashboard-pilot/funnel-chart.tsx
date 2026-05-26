"use client";

import { Card, Title, BarList } from "@tremor/react";
import type { FunnelStep } from "@/services/admin/dashboard-aggregator.service";

export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const data = steps.map((step) => ({
    name: step.label,
    value: step.count,
  }));

  return (
    <Card className="bg-white/80">
      <Title className="text-[#141446]">Funnel d&apos;acquisition (30 j)</Title>
      <BarList
        data={data}
        className="mt-4"
        valueFormatter={(value: number) => value.toLocaleString("fr-FR")}
      />
      <p className="mt-3 text-xs text-[#141446]/60">
        Du visiteur anonyme qui converse avec l&apos;IA au mandat signé.
      </p>
    </Card>
  );
}
