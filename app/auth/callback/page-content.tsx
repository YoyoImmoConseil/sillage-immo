"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const getSafeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/")) {
    return "/admin";
  }

  return value;
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  return await Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("timeout")), timeoutMs);
    }),
  ]);
};

export function AuthCallbackPageContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState("Preparation de la connexion...");

  useEffect(() => {
    let isActive = true;

    const finalizeGoogleSignIn = async () => {
      const code = searchParams.get("code");
      const nextPath = getSafeNextPath(searchParams.get("next"));

      if (!code) {
        window.location.replace("/admin/login?error=missing_code");
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        if (isActive) {
          setStep("Echange du code Google avec Supabase...");
        }
        const { error: exchangeError } = await withTimeout(
          supabase.auth.exchangeCodeForSession(code),
          10000
        );

        if (exchangeError) {
          if (isActive) {
            setError(`Echec Supabase: ${exchangeError.message}`);
          }
          return;
        }

        if (isActive) {
          setStep("Verification de la session...");
        }
        const {
          data: { user },
          error: userError,
        } = await withTimeout(supabase.auth.getUser(), 10000);

        if (userError) {
          if (isActive) {
            setError(`Session creee mais utilisateur introuvable: ${userError.message}`);
          }
          return;
        }

        if (!user?.email) {
          if (isActive) {
            setError("Session creee mais aucun email utilisateur n'a ete retourne.");
          }
          return;
        }

        if (isActive) {
          setStep(`Session validee pour ${user.email}. Redirection vers l'administration...`);
        }
        window.location.replace(nextPath);
      } catch (cause) {
        if (!isActive) {
          return;
        }

        const message = cause instanceof Error ? cause.message : "Erreur inconnue.";
        setError(`La finalisation de la connexion Google a echoue: ${message}`);
      }
    };

    void finalizeGoogleSignIn();

    return () => {
      isActive = false;
    };
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
      <section className="mx-auto max-w-xl space-y-4 rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
        <h1 className="text-2xl font-semibold text-[#141446]">Connexion Google</h1>
        <p className="text-sm text-[#141446]/75">{step}</p>
        {error ? (
          <>
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
            <Link href="/admin/login" className="inline-block text-sm underline text-[#141446]">
              Retour a la connexion admin
            </Link>
          </>
        ) : (
          <p className="text-xs text-[#141446]/60">URL attendue ensuite: {getSafeNextPath(searchParams.get("next"))}</p>
        )}
      </section>
    </main>
  );
}
