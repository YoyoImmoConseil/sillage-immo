"use client";

import { useState, useTransition } from "react";
import type { AppLocale } from "@/lib/i18n/config";

type SellerMagicLinkFormProps = {
  locale?: AppLocale;
  defaultEmail?: string;
  lockedEmail?: boolean;
  inviteToken?: string;
  nextPath?: string;
  submitLabel: string;
  successMessage: string;
};

export function SellerMagicLinkForm({
  locale = "fr",
  defaultEmail = "",
  lockedEmail = false,
  inviteToken,
  nextPath = "/espace-client",
  submitLabel,
  successMessage,
}: SellerMagicLinkFormProps) {
  const copy = {
    fr: {
      missingEmail: "Veuillez renseigner votre email.",
      unavailable: "Aucun espace client n'est disponible pour cette adresse email.",
      sendError: "Impossible d'envoyer le lien de connexion.",
      email: "Adresse email",
      sending: "Envoi...",
    },
    en: {
      missingEmail: "Please enter your email address.",
      unavailable: "No client portal is available for this email address.",
      sendError: "Unable to send the login link.",
      email: "Email address",
      sending: "Sending...",
    },
    es: {
      missingEmail: "Por favor, indique su email.",
      unavailable: "No hay ningún espacio cliente disponible para este email.",
      sendError: "No se pudo enviar el enlace de conexión.",
      email: "Dirección de email",
      sending: "Envío...",
    },
    ru: {
      missingEmail: "Пожалуйста, укажите email.",
      unavailable: "Для этого email нет доступного клиентского пространства.",
      sendError: "Не удалось отправить ссылку для входа.",
      email: "Email",
      sending: "Отправка...",
    },
  }[locale];
  const [email, setEmail] = useState(defaultEmail);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
          setError(copy.missingEmail);
          return;
        }

        const response = await fetch("/api/espace-client/send-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            nextPath,
            inviteToken: inviteToken ?? null,
          }),
        });

        const result = (await response.json()) as { ok: boolean; message?: string };
        if (!response.ok || !result.ok) {
          setError(result.message ?? copy.unavailable);
          return;
        }

        setFeedback(successMessage);
      } catch {
        setError(copy.sendError);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm text-[#141446]">
        {copy.email}
        <input
          className="mt-1 w-full rounded border border-[rgba(20,20,70,0.16)] bg-white px-3 py-2"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={lockedEmail || isPending}
          required
        />
      </label>
      <button className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60" disabled={isPending}>
        {isPending ? copy.sending : submitLabel}
      </button>
      {feedback ? <p className="text-sm text-green-700">{feedback}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
