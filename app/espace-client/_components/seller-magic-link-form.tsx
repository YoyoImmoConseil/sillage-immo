"use client";

import { useState, useTransition } from "react";

type SellerMagicLinkFormProps = {
  defaultEmail?: string;
  lockedEmail?: boolean;
  inviteToken?: string;
  nextPath?: string;
  submitLabel: string;
  successMessage: string;
};

export function SellerMagicLinkForm({
  defaultEmail = "",
  lockedEmail = false,
  inviteToken,
  nextPath = "/espace-client",
  submitLabel,
  successMessage,
}: SellerMagicLinkFormProps) {
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
          setError("Veuillez renseigner votre email.");
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
          setError(result.message ?? "Aucun espace client n'est disponible pour cette adresse email.");
          return;
        }

        setFeedback(successMessage);
      } catch {
        setError("Impossible d'envoyer le lien de connexion.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm text-[#141446]">
        Adresse email
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
        {isPending ? "Envoi..." : submitLabel}
      </button>
      {feedback ? <p className="text-sm text-green-700">{feedback}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
