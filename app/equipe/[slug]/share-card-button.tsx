"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

type ShareCardButtonProps = {
  url: string;
  title: string;
  text: string;
  label: string;
  copiedLabel: string;
};

/**
 * « Partager ma carte » : feuille de partage native sur iPhone et Android
 * (Messages, WhatsApp, Mail, AirDrop…) ; sur ordinateur, copie du lien.
 */
export function ShareCardButton({ url, title, text, label, copiedLabel }: ShareCardButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // Annulation par l'utilisateur : rien à faire. Autre erreur : on copie le lien.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papiers indisponible (navigateur ancien) : le lien reste dans la barre d'adresse.
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-sand/60 px-6 py-4 text-base font-semibold text-sand transition hover:bg-sand/10"
      data-track-cta="team_card_share"
      data-track-location="team_card"
    >
      {copied ? (
        <Check aria-hidden className="h-5 w-5" strokeWidth={2} />
      ) : (
        <Share2 aria-hidden className="h-5 w-5" strokeWidth={2} />
      )}
      {copied ? copiedLabel : label}
    </button>
  );
}
