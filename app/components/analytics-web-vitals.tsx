"use client";

import { useReportWebVitals } from "next/web-vitals";
import { track } from "@/lib/analytics/data-layer";

/**
 * Pushes Core Web Vitals (LCP, CLS, INP, FCP, TTFB) into the GTM
 * dataLayer as `web_vitals` events. We send one event per metric per
 * page so GA4 can aggregate by `metric_name`.
 *
 * GA4 best practice: keep `value` as an integer in milliseconds for
 * time-based metrics (LCP/INP/FCP/TTFB) and as `value * 1000` for
 * unitless ratios (CLS). `metric_rating` carries the qualitative
 * good/needs-improvement/poor bucket Next.js already computes.
 */
export function AnalyticsWebVitals() {
  useReportWebVitals((metric) => {
    const isCls = metric.name === "CLS";
    const value = isCls ? Math.round(metric.value * 1000) : Math.round(metric.value);
    track("web_vitals", {
      metric_name: metric.name,
      metric_id: metric.id,
      metric_value: value,
      metric_rating: metric.rating ?? undefined,
      metric_navigation_type: metric.navigationType ?? undefined,
      page_path:
        typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  });

  return null;
}
