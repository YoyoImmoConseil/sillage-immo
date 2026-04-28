"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics/data-layer";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Pushes a `spa_page_view` event into the dataLayer on every client-side
 * route change. This is required because Next.js App Router only loads
 * the GTM script once and otherwise GTM would only see the initial
 * server-rendered page.
 *
 * Mounted in the root layout. Must be wrapped in <Suspense> by the
 * caller because `useSearchParams()` opts the route into dynamic
 * rendering otherwise.
 */
export function AnalyticsPageTracker({ locale = "fr" }: { locale?: AppLocale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const search = searchParams?.toString() ?? "";
    const fullPath = search ? `${pathname}?${search}` : pathname;
    if (lastPath.current === fullPath) return;
    lastPath.current = fullPath;
    track("spa_page_view", {
      page_path: pathname,
      page_search: search || undefined,
      page_full_path: fullPath,
      page_title: typeof document !== "undefined" ? document.title : undefined,
      locale,
    });
  }, [pathname, searchParams, locale]);

  return null;
}
