"use client";

import { useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";

const COPY: Record<AppLocale, { share: string; whatsapp: string; email: string; copy: string; copied: string; subject: string }> = {
  fr: { share: "Partager", whatsapp: "WhatsApp", email: "Email", copy: "Copier le lien", copied: "Lien copié", subject: "Un bien qui pourrait vous intéresser" },
  en: { share: "Share", whatsapp: "WhatsApp", email: "Email", copy: "Copy link", copied: "Link copied", subject: "A property you might like" },
  es: { share: "Compartir", whatsapp: "WhatsApp", email: "Email", copy: "Copiar enlace", copied: "Enlace copiado", subject: "Un inmueble que podría interesarle" },
  ru: { share: "Поделиться", whatsapp: "WhatsApp", email: "Email", copy: "Скопировать ссылку", copied: "Ссылка скопирована", subject: "Объект, который может вас заинтересовать" },
};

/**
 * Partage d'une annonce : WhatsApp, email, copie du lien — et le partage natif
 * du téléphone quand il existe (iOS/Android). L'aperçu riche (photo + titre)
 * est fourni par les balises Open Graph de la fiche.
 */
export function ListingShareButtons({
  url,
  title,
  locale = "fr",
  tone = "light",
}: {
  url: string;
  title: string;
  locale?: AppLocale;
  tone?: "light" | "dark";
}) {
  const copy = COPY[locale];
  const [copied, setCopied] = useState(false);
  const text = `${title} — ${url}`;

  const base =
    tone === "dark"
      ? "border-sand/35 text-sand hover:bg-sand/10"
      : "border-navy/25 text-navy hover:bg-navy/5";
  const btn = `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${base}`;

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return true;
      } catch {
        /* annulé par l'utilisateur */
      }
    }
    return false;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(copy.copy, url);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-track-location="listing_share">
      <span className={`text-xs uppercase tracking-[0.14em] ${tone === "dark" ? "text-sand/70" : "text-navy/60"}`}>
        {copy.share}
      </span>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
        className={btn}
        data-track-cta="listing_share_whatsapp"
        onClick={async (event) => {
          // Sur téléphone, on préfère la feuille de partage native (contacts, Messages, etc.).
          if (typeof navigator !== "undefined" && "share" in navigator && /Mobi|Android/i.test(navigator.userAgent)) {
            event.preventDefault();
            const done = await nativeShare();
            if (!done) window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
          }
        }}
      >
        {copy.whatsapp}
      </a>
      <a
        href={`mailto:?subject=${encodeURIComponent(copy.subject)}&body=${encodeURIComponent(text)}`}
        className={btn}
        data-track-cta="listing_share_email"
      >
        {copy.email}
      </a>
      <button type="button" className={btn} onClick={copyLink} data-track-cta="listing_share_copy">
        {copied ? copy.copied : copy.copy}
      </button>
    </div>
  );
}
