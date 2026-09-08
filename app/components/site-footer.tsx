"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SILLAGE_ADDRESS_DISPLAY,
  SILLAGE_CONTACT_EMAIL,
  SILLAGE_MAPS_URL,
  SILLAGE_PHONE_DISPLAY,
  SILLAGE_PHONE_RAW,
} from "@/lib/brand/company";
import type { AppLocale } from "@/lib/i18n/config";
import { getPathLocale, localizePath } from "@/lib/i18n/routing";
import { SITE_HEADER_COPY } from "./site-header-copy";

type FooterCopy = {
  tagline: string;
  navigate: string;
  contact: string;
  legal: string;
  mentions: string;
  fees: string;
  privacy: string;
  deleteConversations: string;
  rights: string;
};

const FOOTER_COPY: Record<AppLocale, FooterCopy> = {
  fr: {
    tagline: "Agence immobilière indépendante à Nice — estimation, vente, location et recherche accompagnée.",
    navigate: "Le site",
    contact: "Nous contacter",
    legal: "Informations légales",
    mentions: "Mentions légales",
    fees: "Honoraires",
    privacy: "Confidentialité et cookies",
    deleteConversations: "Supprimer mes conversations IA",
    rights: "Tous droits réservés.",
  },
  en: {
    tagline: "Independent real estate agency in Nice — valuation, sales, rentals and guided property search.",
    navigate: "Explore",
    contact: "Contact us",
    legal: "Legal",
    mentions: "Legal notice",
    fees: "Agency fees",
    privacy: "Privacy and cookies",
    deleteConversations: "Delete my AI conversations",
    rights: "All rights reserved.",
  },
  es: {
    tagline: "Agencia inmobiliaria independiente en Niza — valoración, venta, alquiler y búsqueda acompañada.",
    navigate: "El sitio",
    contact: "Contacto",
    legal: "Información legal",
    mentions: "Aviso legal",
    fees: "Honorarios",
    privacy: "Privacidad y cookies",
    deleteConversations: "Eliminar mis conversaciones con la IA",
    rights: "Todos los derechos reservados.",
  },
  ru: {
    tagline: "Независимое агентство недвижимости в Ницце — оценка, продажа, аренда и подбор объектов.",
    navigate: "Разделы",
    contact: "Контакты",
    legal: "Правовая информация",
    mentions: "Правовая информация",
    fees: "Комиссия агентства",
    privacy: "Конфиденциальность и cookies",
    deleteConversations: "Удалить мои беседы с ИИ",
    rights: "Все права защищены.",
  },
};

const linkClass = "w-fit text-sand/80 underline-offset-4 transition hover:text-sand hover:underline";

export function SiteFooter() {
  const pathname = usePathname() ?? "/";
  const isAdminArea =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/auth/callback";

  if (isAdminArea) return null;

  const locale = getPathLocale(pathname);
  const copy = FOOTER_COPY[locale];
  const nav = SITE_HEADER_COPY[locale];
  const year = new Date().getFullYear();

  const navLinks = [
    { href: localizePath("/acheter", locale), label: nav.buy },
    { href: localizePath("/vendre", locale), label: nav.sell },
    { href: localizePath("/louer", locale), label: nav.rent },
    { href: localizePath("/estimation", locale), label: nav.valuation },
    { href: localizePath("/agence", locale), label: nav.agency },
    { href: localizePath("/vente", locale), label: nav.sale },
    { href: localizePath("/location", locale), label: nav.rental },
    { href: localizePath("/espace-client/login", locale), label: nav.clientSpace },
  ];

  const legalLinks = [
    { href: localizePath("/mentions-legales", locale), label: copy.mentions },
    { href: localizePath("/honoraires", locale), label: copy.fees },
    { href: localizePath("/confidentialite", locale), label: copy.privacy },
    { href: localizePath("/confidentialite/conversations", locale), label: copy.deleteConversations },
  ];

  return (
    // touch:pb-28 : réserve sous la barre d'action fixe des téléphones.
    <footer className="bg-navy text-sand touch:pb-28">
      <div className="w-full px-6 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <p className="text-base uppercase tracking-[0.18em] text-sand">Sillage Immo</p>
            <p className="max-w-sm text-sm leading-relaxed text-sand/75">{copy.tagline}</p>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-sand/55">{copy.navigate}</p>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-sand/55">{copy.contact}</p>
            <a href={SILLAGE_MAPS_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {SILLAGE_ADDRESS_DISPLAY}
            </a>
            <a href={`tel:${SILLAGE_PHONE_RAW}`} className={linkClass}>
              {SILLAGE_PHONE_DISPLAY}
            </a>
            <a href={`mailto:${SILLAGE_CONTACT_EMAIL}`} className={linkClass}>
              {SILLAGE_CONTACT_EMAIL}
            </a>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-sand/55">{copy.legal}</p>
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-sand/15 pt-6 text-xs text-sand/55">
          © {year} Sillage Immo · {copy.rights}
        </div>
      </div>
    </footer>
  );
}
