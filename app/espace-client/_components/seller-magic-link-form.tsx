"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type PreparedLoginSuccess = {
  ok: true;
  data: {
    email: string;
    mode: "login" | "invite";
    nextPath: string;
    inviteToken: string | null;
    source:
      | "linked_client_profile"
      | "existing_client_project"
      | "seller_lead_backfill_created"
      | "seller_lead_backfill_existing";
  };
};

type PreparedLoginFailure = {
  ok: false;
  message?: string;
};

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
        const supabase = createSupabaseBrowserClient();
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
          setError("Veuillez renseigner votre email.");
          return;
        }

        let prepared: PreparedLoginSuccess | PreparedLoginFailure;
        if (inviteToken) {
          prepared = {
            ok: true,
            data: {
              email: normalizedEmail,
              mode: "invite",
              nextPath,
              inviteToken,
              source: "existing_client_project",
            },
          };
        } else {
          const prepareResponse = await fetch("/api/espace-client/prepare-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: normalizedEmail,
              nextPath,
            }),
          });

          prepared = (await prepareResponse.json()) as PreparedLoginSuccess | PreparedLoginFailure;
          if (!prepareResponse.ok && !prepared.ok) {
            setError(prepared.message ?? "Aucun espace client n'est disponible pour cette adresse email.");
            return;
          }
        }

        if (!prepared.ok) {
          setError(prepared.message ?? "Aucun espace client n'est disponible pour cette adresse email.");
          return;
        }

        const effectiveInviteToken = inviteToken ?? prepared.data.inviteToken ?? null;
        const redirectTo = (() => {
          if (typeof window === "undefined") return "";

          const url = new URL("/espace-client/auth/confirm", window.location.origin);
          url.searchParams.set("next", prepared.data.nextPath);
          if (effectiveInviteToken) {
            url.searchParams.set("inviteToken", effectiveInviteToken);
          }
          return url.toString();
        })();

        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectTo,
          },
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        setFeedback(
          prepared.data.source === "seller_lead_backfill_created" ||
            prepared.data.source === "seller_lead_backfill_existing"
            ? "Votre espace client vient d'etre prepare. Un lien de connexion a ete envoye a votre adresse email."
            : successMessage
        );
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
