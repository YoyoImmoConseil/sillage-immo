"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { getPathLocale, localizePath } from "@/lib/i18n/routing";

type SiteHeaderClientProps = {
  isMobileOs: boolean;
};

export function SiteHeaderClient({ isMobileOs }: SiteHeaderClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const locale = getPathLocale(pathname);
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/auth/callback";

  const copy = {
    fr: {
      home: "Accueil",
      sale: "Vente",
      rental: "Location",
      valuation: "Estimation",
      buy: "Acheter",
      clientSpace: "Mon Espace Sillage",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
    },
    en: {
      home: "Home",
      sale: "Sales",
      rental: "Rentals",
      valuation: "Valuation",
      buy: "Buy",
      clientSpace: "My Sillage Space",
      openMenu: "Open menu",
      closeMenu: "Close menu",
    },
    es: {
      home: "Inicio",
      sale: "Venta",
      rental: "Alquiler",
      valuation: "Valoración",
      buy: "Comprar",
      clientSpace: "Mi Espacio Sillage",
      openMenu: "Abrir el menú",
      closeMenu: "Cerrar el menú",
    },
    ru: {
      home: "Главная",
      sale: "Продажа",
      rental: "Аренда",
      valuation: "Оценка",
      buy: "Купить",
      clientSpace: "Моё пространство Sillage",
      openMenu: "Открыть меню",
      closeMenu: "Закрыть меню",
    },
  }[locale];

  const navItems = [
    { href: localizePath("/vente", locale), label: copy.sale },
    { href: localizePath("/location", locale), label: copy.rental },
    { href: localizePath("/estimation", locale), label: copy.valuation },
  ] as const;

  const buyItem = {
    href: localizePath("/recherche/nouvelle", locale),
    label: copy.buy,
  } as const;

  const clientSpaceItem = {
    href: localizePath("/espace-client/login", locale),
    label: copy.clientSpace,
  } as const;

  return (
    <header className="sticky top-0 z-50 bg-[#141446] text-[#f4ece4]">
      <div className="relative flex min-h-[90px] w-full items-center justify-between px-6 md:px-10 xl:px-14 2xl:px-20">
        <Link
          href={localizePath("/", locale)}
          className="text-base tracking-[0.16em] uppercase text-[#f4ece4]/90 md:text-[1.05rem]"
        >
          {copy.home}
        </Link>

        {isMobileOs ? (
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center text-[#f4ece4]"
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
              <nav className="absolute right-0 top-[calc(100%+0.5rem)] min-w-[13rem] rounded-2xl border border-white/12 bg-[#1b1b56] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
                <div className="flex flex-col gap-1 text-sm uppercase tracking-[0.14em] text-[#f4ece4]/92">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl px-3 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href={buyItem.href}
                    className="rounded-xl border border-[#f4c47a] bg-[#f4c47a]/20 px-3 py-2 font-semibold text-[#f4c47a]"
                    onClick={() => setIsOpen(false)}
                  >
                    {buyItem.label}
                  </Link>
                  <Link
                    href={clientSpaceItem.href}
                    className="rounded-xl border border-white/16 px-3 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    {clientSpaceItem.label}
                  </Link>
                  {!isAdminArea ? <LanguageSwitcher /> : null}
                </div>
              </nav>
            ) : null}
          </div>
        ) : (
          <nav className="flex items-center gap-5 text-sm uppercase tracking-[0.14em] text-[#f4ece4]/90 md:text-[0.95rem]">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:opacity-80 transition-opacity">
                {item.label}
              </Link>
            ))}
            <Link
              href={buyItem.href}
              className="rounded border border-[#f4c47a] bg-[#f4c47a]/15 px-3 py-2 font-semibold text-[#f4c47a] transition-colors hover:bg-[#f4c47a]/25"
            >
              {buyItem.label}
            </Link>
            <Link
              href={clientSpaceItem.href}
              className="rounded border border-white/16 px-3 py-2 text-[#f4ece4] transition-opacity hover:opacity-80"
            >
              {clientSpaceItem.label}
            </Link>
            {!isAdminArea ? <LanguageSwitcher /> : null}
          </nav>
        )}
      </div>
    </header>
  );
}
