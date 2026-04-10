"use client";

import { useState, useTransition } from "react";
import { createAdminOAuthBrowserClient } from "@/lib/supabase/admin-oauth-browser";

export function AdminBootstrapForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [bootstrapKey, setBootstrapKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/auth/bootstrap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            bootstrapKey,
          }),
        });

        const payload = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !payload.ok) {
          setError(payload.message ?? "Bootstrap impossible.");
          return;
        }

        const supabase = createAdminOAuthBrowserClient();
        const redirectTo = `${window.location.origin}/auth/callback`;
        try {
          window.sessionStorage.setItem("admin-auth-next", "/admin");
        } catch {}
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }
      } catch {
        setError("Bootstrap impossible.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          Prenom
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Nom
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </label>
      </div>
      <label className="block text-sm">
        Email
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Cle de bootstrap admin
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          type="password"
          value={bootstrapKey}
          onChange={(event) => setBootstrapKey(event.target.value)}
          required
        />
      </label>
      <p className="text-sm text-[#141446]/70">
        Cette adresse email sera autorisee comme premier administrateur, puis connectee via Google.
      </p>
      <button className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60" disabled={isPending}>
        {isPending ? "Preparation..." : "Autoriser puis continuer avec Google"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
