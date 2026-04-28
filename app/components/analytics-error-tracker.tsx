"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/data-layer";

/**
 * Captures unhandled JS errors and unhandled promise rejections and
 * pushes them as `js_error` events. We deduplicate identical messages
 * inside a short window to avoid flooding GA4 if a render loop throws.
 */
export function AnalyticsErrorTracker() {
  const recentRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const DEDUP_WINDOW_MS = 5000;
    const recent = recentRef.current;

    const shouldEmit = (key: string) => {
      const now = Date.now();
      const last = recent.get(key) ?? 0;
      if (now - last < DEDUP_WINDOW_MS) return false;
      recent.set(key, now);
      // Trim map opportunistically.
      if (recent.size > 50) {
        for (const [k, ts] of recent) {
          if (now - ts > DEDUP_WINDOW_MS * 4) recent.delete(k);
        }
      }
      return true;
    };

    const onError = (event: ErrorEvent) => {
      const message = event.message?.slice(0, 180) ?? "unknown";
      const file = event.filename ? new URL(event.filename, window.location.href).pathname : null;
      const key = `${message}|${file}|${event.lineno ?? 0}`;
      if (!shouldEmit(key)) return;
      track("js_error", {
        message,
        file: file ?? undefined,
        line: event.lineno ?? undefined,
        column: event.colno ?? undefined,
        page_path: window.location.pathname,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "unhandled_rejection";
      const key = `rejection|${message.slice(0, 180)}`;
      if (!shouldEmit(key)) return;
      track("js_error", {
        message: message.slice(0, 180),
        kind: "unhandled_rejection",
        page_path: window.location.pathname,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
