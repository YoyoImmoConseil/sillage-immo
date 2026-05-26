"use client";

import { Card, BadgeDelta, Metric, Text, Flex } from "@tremor/react";
import type { DashboardKpi } from "@/services/admin/dashboard-aggregator.service";

const TREND_TO_DELTA: Record<
  DashboardKpi["trend"],
  "increase" | "decrease" | "unchanged"
> = {
  up: "increase",
  down: "decrease",
  flat: "unchanged",
};

const formatDelta = (kpi: DashboardKpi) => {
  if (kpi.deltaPct === null) return "n/a";
  const sign = kpi.deltaPct > 0 ? "+" : "";
  return `${sign}${kpi.deltaPct}%`;
};

export function KpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="bg-white/80">
          <Flex alignItems="start">
            <Text className="text-[#141446]/75">{kpi.label}</Text>
            <BadgeDelta deltaType={TREND_TO_DELTA[kpi.trend]}>
              {formatDelta(kpi)}
            </BadgeDelta>
          </Flex>
          <Metric className="mt-2 text-[#141446]">{kpi.value}</Metric>
          <Text className="mt-1 text-xs text-[#141446]/60">
            {kpi.previousValue} sur la période précédente
          </Text>
        </Card>
      ))}
    </div>
  );
}
