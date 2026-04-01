"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createAdminOAuthBrowserClient } from "@/lib/supabase/admin-oauth-browser";

export function AdminLoginForm({
  canBootstrap,
}: {
  canBootstrap: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const signInWithGoogle = () => {
    setError(null);

    startTransition(async () => {
      try {
        const supabase = createAdminOAuthBrowserClient();
        const redirectTo = `${window.location.origin}/auth/callback`;
        try {
          window.sessionStorage.setItem("admin-auth-next", "/admin");
        } catch {}
        // #region agent log
        fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
          body: JSON.stringify({
            sessionId: "cada68",
            runId: `admin-login-${Date.now()}`,
            hypothesisId: "H3",
            location: "app/admin/login/login-form.tsx:signInWithGoogle",
            message: "Starting Google OAuth from admin login",
            data: {
              origin: window.location.origin,
              redirectPath: "/auth/callback",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        const { data, error: signInError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        // #region agent log
        fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
          body: JSON.stringify({
            sessionId: "cada68",
            runId: `admin-login-${Date.now()}`,
            hypothesisId: "H9",
            location: "app/admin/login/login-form.tsx:signInWithGoogle",
            message: "OAuth URL returned by Supabase client",
            data: {
              hasError: Boolean(signInError),
              hasUrl: Boolean(data?.url),
              urlPrefix: typeof data?.url === "string" ? data.url.slice(0, 200) : null,
              containsLocalRedirect:
                typeof data?.url === "string" ? data.url.includes(encodeURIComponent(redirectTo)) : false,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

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
