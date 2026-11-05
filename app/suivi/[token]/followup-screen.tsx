import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { FollowupScreen } from "./copy";

/**
 * Écran de confirmation des relances : bloc bleu nuit plein écran, à la
 * charte (même composition que la page 404), un appel à l'action principal.
 */
export function FollowupScreenView({
  screen,
  title,
  body,
  children,
}: {
  screen: FollowupScreen;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const primaryClass =
    "inline-flex min-h-11 items-center justify-center rounded-full bg-sand px-5 text-sm font-semibold text-navy transition hover:bg-sand/90";
  const secondaryClass =
    "inline-flex min-h-11 items-center justify-center rounded-full border border-sand/60 px-5 text-sm font-semibold text-sand transition hover:bg-sand/10";
  const renderLink = (link: { label: string; href: string; track?: string }, className: string) =>
    link.href.startsWith("/") ? (
      <Link href={link.href} className={className} data-track-cta={link.track} data-track-location="followup">
        {link.label}
      </Link>
    ) : (
      <a href={link.href} className={className} data-track-cta={link.track} data-track-location="followup">
        {link.label}
      </a>
    );

  return (
    <main>
      <section
        aria-labelledby="followup-title"
        className="relative isolate flex min-h-[70vh] items-center overflow-hidden bg-navy text-sand"
      >
        <Image
          src="/decor-sillage-blue.svg"
          alt=""
          width={320}
          height={310}
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 opacity-[0.10]"
        />
        <div className="relative w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
          <div className="max-w-3xl space-y-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-sand/75 md:text-xs">{screen.eyebrow}</p>
            <h1
              id="followup-title"
              className="sillage-section-title-font text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl xl:text-[52px]"
            >
              {title}
            </h1>
            <p className="sillage-editorial-text max-w-2xl text-sand/90">{body}</p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {children ?? (
                <>
                  {screen.primary ? renderLink(screen.primary, primaryClass) : null}
                  {screen.secondary ? renderLink(screen.secondary, secondaryClass) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
