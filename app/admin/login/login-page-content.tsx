"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminLoginForm } from "./login-form";

const getErrorMessage = (errorCode: string | null) => {
  switch (errorCode) {
    case "missing_code":
      return "Le retour Google ne contenait pas le code d'authentification attendu.";
    case "oauth_exchange_failed":
      return "La session Google n'a pas pu etre finalisee.";
    case "oauth_callback_timeout":
      return "La finalisation de la connexion Google a pris trop de temps. Reessaie dans quelques secondes.";
    case "missing_user":
      return "Le compte Google retourne n'est pas exploitable.";
    case "oauth_start_failed":
      return "La redirection vers Google a echoue.";
    default:
      return null;
  }
};

export function AdminLoginPageContent() {
  const searchParams = useSearchParams();
  const errorMessage = getErrorMessage(searchParams.get("error"));

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
      body: JSON.stringify({
        sessionId: "cada68",
        runId: `admin-login-page-${Date.now()}`,
        hypothesisId: "H14",
        location: "app/admin/login/login-page-content.tsx:useEffect",
        message: "Mounted admin login page in browser",
        data: {
          errorCode: searchParams.get("error"),
          hasErrorMessage: Boolean(errorMessage),
          href: window.location.href,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [errorMessage, searchParams]);

  return (
    <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
      <section className="mx-auto max-w-xl space-y-6 rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">Sillage Immo</p>
          <h1 className="text-3xl font-semibold text-[#141446]">Connexion back-office</h1>
          <p className="text-sm text-[#141446]/75">
            Acces reserve aux collaborateurs, managers et administrateurs via Google SSO.
          </p>
        </div>
        {errorMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        <AdminLoginForm canBootstrap />
        <Link href="/" className="inline-block text-sm underline text-[#141446]">
          Retour au site
        </Link>
      </section>
    </main>
  );
}
