"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createAdminOAuthBrowserClient } from "@/lib/supabase/admin-oauth-browser";

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
    const nextPath = getSafeNextPath(searchParams.get("next"));

    const redirectWithUser = (email?: string | null) => {
      if (!isActive) {
        return;
      }
      setStep(`Session validee${email ? ` pour ${email}` : ""}. Redirection vers l'administration...`);
      window.location.replace(nextPath);
    };

    const syncServerSession = async (accessToken: string, refreshToken: string) => {
      const response = await fetch("/api/admin/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken,
          refreshToken,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Synchronisation serveur impossible.");
      }
    };

    const readSession = async () => {
      const supabase = createAdminOAuthBrowserClient();
      const {
        data: { session },
        error: sessionError,
      } = await withTimeout(supabase.auth.getSession(), 5000);

      if (sessionError) {
        throw sessionError;
      }

      return session;
    };

    const finalizeGoogleSignIn = async () => {
      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description");

      if (errorDescription) {
        setError(errorDescription);
        return;
      }

      if (!code) {
        window.location.replace("/admin/login?error=missing_code");
        return;
      }

      try {
        const supabase = createAdminOAuthBrowserClient();
        if (isActive) {
          setStep("Finalisation automatique de la session Google...");
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
            void (async () => {
              try {
                await syncServerSession(session.access_token, session.refresh_token);
                redirectWithUser(session.user.email ?? null);
              } catch (cause) {
                if (!isActive) return;
                const message = cause instanceof Error ? cause.message : "Erreur inconnue.";
                setError(`Impossible de synchroniser la session serveur: ${message}`);
              }
            })();
          }
        });

        if (isActive) {
          setStep("Verification de la session...");
        }

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const session = await readSession();
          if (session?.user) {
            subscription.unsubscribe();
            await syncServerSession(session.access_token, session.refresh_token);
            redirectWithUser(session.user.email ?? null);
            return;
          }

          await withTimeout(new Promise((resolve) => window.setTimeout(resolve, 400)), 1000);
        }

        subscription.unsubscribe();

        setError("Aucune session Google n'a ete creee apres le retour de Google.");
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
