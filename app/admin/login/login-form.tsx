"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminLoginForm({ canBootstrap }: { canBootstrap: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const signInWithGoogle = () => {
    setError(null);

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const redirectTo = `${window.location.origin}/auth/callback?next=/admin`;
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });

        if (signInError) {
          setError(signInError.message);
        }
      } catch {
        setError("Connexion Google impossible.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-[#141446]/[0.03] p-4 text-sm text-[#141446]/78">
        Connecte-toi avec Google en utilisant une adresse deja autorisee dans le back-office.
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
          onClick={signInWithGoogle}
          disabled={isPending}
        >
          {isPending ? "Redirection..." : "Continuer avec Google"}
        </button>
        {canBootstrap ? (
          <Link href="/admin/bootstrap" className="text-sm underline">
            Creer le premier administrateur
          </Link>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
