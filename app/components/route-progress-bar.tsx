"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top-of-page progress bar shown between a client-side navigation click
 * and the rendering of the new route. Uses a heuristic: we listen to
 * internal link clicks and stop when pathname/searchParams change.
 *
 * Kept framework-free (no nprogress dependency).
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const start = () => {
      stopTimer();
      setVisible(true);
      setProgress(8);
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          const delta = prev < 30 ? 6 : prev < 60 ? 3 : prev < 80 ? 1.5 : 0.5;
          return Math.min(prev + delta, 90);
        });
      }, 180);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = (event.target as Element | null)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      if (target.getAttribute("target") === "_blank") return;
      if (target.hasAttribute("download")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return;

      let destination: URL;
      try {
        destination = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return;
      }

      start();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      stopTimer();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    const hide = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
    return () => window.clearTimeout(hide);
  }, [pathname, searchParams, visible]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 220ms ease" }}
    >
      <div
        className="h-full bg-[#141446]"
        style={{
          width: `${progress}%`,
          transition: "width 180ms ease",
          boxShadow: "0 0 8px rgba(20,20,70,0.35)",
        }}
      />
    </div>
  );
}
