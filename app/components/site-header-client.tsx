"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/vente", label: "Vente" },
  { href: "/location", label: "Location" },
  { href: "/estimation", label: "Estimation" },
] as const;

type SiteHeaderClientProps = {
  isMobileOs: boolean;
};

export function SiteHeaderClient({ isMobileOs }: SiteHeaderClientProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-[#141446] text-[#f4ece4]">
      <div className="relative flex min-h-[90px] w-full items-center justify-between px-6 md:px-10 xl:px-14 2xl:px-20">
        <Link
          href="/"
          className="text-base tracking-[0.16em] uppercase text-[#f4ece4]/90 md:text-[1.05rem]"
        >
          Accueil
        </Link>

        {isMobileOs ? (
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center text-[#f4ece4]"
              aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
                  <a
                    href="tel:+33423450485"
                    className="rounded-xl px-3 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Conseiller
                  </a>
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
            <a href="tel:+33423450485" className="hover:opacity-80 transition-opacity">
              Conseiller
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
