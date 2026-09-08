"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { getPathLocale, localizePath } from "@/lib/i18n/routing";
import { SITE_HEADER_COPY } from "./site-header-copy";

export function SiteHeaderClient() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname() ?? "/";

  // Fermer le menu mobile au défilement, au toucher en dehors et à Échap :
  // sinon il restait ouvert par-dessus le contenu (les liens le ferment déjà).
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("scroll", close, { passive: true });
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", close);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);
  const locale = getPathLocale(pathname);
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/auth/callback";

  const copy = SITE_HEADER_COPY[locale];

  const navItems = [
    { href: localizePath("/acheter", locale), label: copy.buy, ctaId: "header_nav_buy" },
    { href: localizePath("/vendre", locale), label: copy.sell, ctaId: "header_nav_sell" },
    { href: localizePath("/louer", locale), label: copy.rent, ctaId: "header_nav_rent" },
    {
      href: localizePath("/estimation", locale),
      label: copy.valuation,
      ctaId: "header_nav_valuation",
    },
    { href: localizePath("/agence", locale), label: copy.agency, ctaId: "header_nav_agency" },
  ] as const;

  const clientSpaceItem = {
    href: localizePath("/espace-client/login", locale),
    label: copy.clientSpace,
    ctaId: "header_nav_client_space",
  } as const;

  return (
    <header className="sticky top-0 z-50 bg-navy text-sand">
      <div className="relative flex min-h-[90px] w-full items-center justify-between px-6 md:px-10 xl:px-14 2xl:px-20">
        <Link
          href={localizePath("/", locale)}
          className="text-base tracking-[0.16em] uppercase text-sand/90 md:text-[1.05rem]"
          data-track-cta="header_nav_home"
          data-track-location="header"
        >
          {copy.home}
        </Link>

        {/* Nav repliée (hamburger) — jusqu'à lg, car la nav déployée réclame
            ~900px (logo + liens + sélecteur de langue) et débordait sur iPad
            portrait et sur les fenêtres étroites. */}
        <div ref={menuRef} className="relative lg:hidden">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center text-sand"
            aria-label={isOpen ? copy.closeMenu : copy.openMenu}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>

          {isOpen ? (
            <nav className="absolute right-0 top-[calc(100%+0.5rem)] min-w-[15.5rem] rounded-2xl border border-white/12 bg-[#1b1b56] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
              <div className="flex flex-col gap-1 text-sm uppercase tracking-[0.14em] text-sand/92">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-3 py-2"
                    onClick={() => setIsOpen(false)}
                    data-track-cta={item.ctaId}
                    data-track-location="header_mobile"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href={clientSpaceItem.href}
                  className="whitespace-nowrap rounded-xl border border-white/16 px-3 py-2"
                  onClick={() => setIsOpen(false)}
                  data-track-cta={clientSpaceItem.ctaId}
                  data-track-location="header_mobile"
                >
                  {clientSpaceItem.label}
                </Link>
                {!isAdminArea ? <LanguageSwitcher /> : null}
              </div>
            </nav>
          ) : null}
        </div>

        {/* Nav déployée — à partir de lg seulement (cf. commentaire ci-dessus). */}
        <nav className="hidden items-center gap-5 text-sm uppercase tracking-[0.14em] text-sand/90 lg:flex lg:text-[0.95rem]">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:opacity-80 transition-opacity"
              data-track-cta={item.ctaId}
              data-track-location="header"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={clientSpaceItem.href}
            className="rounded border border-white/16 px-3 py-2 text-sand transition-opacity hover:opacity-80"
            data-track-cta={clientSpaceItem.ctaId}
            data-track-location="header"
          >
            {clientSpaceItem.label}
          </Link>
          {!isAdminArea ? <LanguageSwitcher /> : null}
        </nav>
      </div>
    </header>
  );
}
