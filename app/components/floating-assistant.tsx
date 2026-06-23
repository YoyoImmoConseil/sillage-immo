"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { getPathLocale, stripLocalePrefix } from "@/lib/i18n/routing";
import { ASSISTANT_COPY, AssistantChat } from "./assistant-chat";

// Site-wide commercial assistant launcher. Mounted once in the root layout so
// the conversation follows the visitor across client navigations. Shown on all
// public pages (including the homepage, alongside the inline assistant) and
// hidden only on the admin / client space / auth areas, which are not
// commercial surfaces.
export function FloatingAssistant() {
  const pathname = usePathname() ?? "/";
  const locale = getPathLocale(pathname);
  const [open, setOpen] = useState(false);

  const withoutLocale = stripLocalePrefix(pathname);
  const hidden =
    withoutLocale.startsWith("/admin") ||
    withoutLocale.startsWith("/espace-client") ||
    withoutLocale.startsWith("/auth");

  if (hidden) return null;

  const copy = ASSISTANT_COPY[locale];

  return (
    <>
      {open ? (
        <div className="fixed bottom-24 right-4 z-50 w-[min(92vw,400px)] h-[min(72vh,560px)]">
          <div className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--sillage-border)] bg-sand p-4 text-navy shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="sillage-section-title text-base leading-tight">{copy.title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={copy.closeAssistant}
                className="-mr-1 -mt-1 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-navy/70 transition hover:bg-[rgba(20,20,70,0.08)] hover:text-navy"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <AssistantChat locale={locale} variant="floating" persistKey="floating" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={copy.openAssistant}
          aria-expanded={false}
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-3 text-sand shadow-xl transition hover:opacity-90"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none">
            <path
              d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden text-sm sm:inline">{copy.launcherLabel}</span>
        </button>
      )}
    </>
  );
}
