"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPathLocale, localizePath } from "@/lib/i18n/routing";
import { SellerSignOutButton } from "./_components/seller-sign-out-button";

// Client-space scoped error boundary. Catches both server and client render
// errors thrown below /espace-client/* and presents a recoverable UI instead
// of Next.js' raw "Application error" screen — which is what Laurent saw
// (digest 2265867871@E394). The error has already been forwarded to
// Vercel's runtime logs by Next; we additionally log it client-side so it
// surfaces in browser tooling during reproduction.
export default function ClientSpaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname() ?? "/espace-client";
  const locale = getPathLocale(pathname);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[espace-client] render error", {
        digest: error.digest,
        message: error.message,
        pathname,
      });
    }
  }, [error, pathname]);

  const copy = {
    fr: {
      title: "Votre espace n'a pas pu se charger",
      body: "Une erreur côté serveur a interrompu l'affichage de votre espace client. C'est temporaire dans la grande majorité des cas. Vous pouvez réessayer ci-dessous, ou nous contacter en partageant la référence d'erreur.",
      retry: "Réessayer",
      backHome: "Retour à l'accueil",
      contact: "Contacter Sillage Immo",
      reference: "Référence d'erreur",
      noReference: "non disponible",
    },
    en: {
      title: "Your portal could not load",
      body: "A server-side error interrupted the rendering of your client portal. It is transient in the vast majority of cases. You can retry below, or contact us by sharing the error reference.",
      retry: "Retry",
      backHome: "Back to homepage",
      contact: "Contact Sillage Immo",
      reference: "Error reference",
      noReference: "unavailable",
    },
    es: {
      title: "Su espacio no se pudo cargar",
      body: "Un error del servidor ha interrumpido la visualización de su espacio cliente. En la mayoría de los casos es temporal. Puede reintentar a continuación o contactar con nosotros compartiendo la referencia del error.",
      retry: "Reintentar",
      backHome: "Volver al inicio",
      contact: "Contactar con Sillage Immo",
      reference: "Referencia de error",
      noReference: "no disponible",
    },
    ru: {
      title: "Кабинет не удалось загрузить",
      body: "Серверная ошибка прервала отображение клиентского пространства. В большинстве случаев это временно. Вы можете повторить попытку ниже или связаться с нами, сообщив идентификатор ошибки.",
      retry: "Повторить",
      backHome: "Вернуться на главную",
      contact: "Связаться с Sillage Immo",
      reference: "Идентификатор ошибки",
      noReference: "недоступен",
    },
  }[locale];

  return (
    <main className="min-h-screen bg-[#f4ece4] px-6 py-16 md:px-10 xl:px-14 2xl:px-20">
      <section className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/80 p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[#141446]">{copy.title}</h1>
          <p className="text-sm text-[#141446]/80">{copy.body}</p>
        </div>
        <p className="rounded-xl bg-[#141446]/[0.04] px-4 py-3 text-xs text-[#141446]/70">
          {copy.reference} :{" "}
          <code className="font-mono text-[#141446]">{error.digest ?? copy.noReference}</code>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-full bg-[#141446] px-5 py-2.5 text-sm font-semibold text-[#f4ece4] transition hover:opacity-95"
          >
            {copy.retry}
          </button>
          <Link
            href={localizePath("/", locale)}
            className="inline-flex items-center justify-center rounded-full border border-[#141446] px-5 py-2.5 text-sm font-semibold text-[#141446] transition hover:bg-[#141446]/5"
          >
            {copy.backHome}
          </Link>
          <a
            href="mailto:contact@sillage-immo.com"
            className="text-sm text-[#141446] underline"
          >
            {copy.contact}
          </a>
          <SellerSignOutButton />
        </div>
      </section>
    </main>
  );
}
