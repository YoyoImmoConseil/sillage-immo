"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPathLocale, localizePath } from "@/lib/i18n/routing";

// Root-level error boundary for any page rendered under app/. Without this
// file, Next.js falls back to its built-in "Application error: a server-side
// exception has occurred" screen — which is what Laurent first saw on the
// homepage. Replacing it with a branded recovery UI keeps the user oriented
// and lets us collect the digest for support tickets.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const locale = getPathLocale(pathname);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[app] render error", {
        digest: error.digest,
        message: error.message,
        pathname,
      });
    }
  }, [error, pathname]);

  const copy = {
    fr: {
      title: "Une page n'a pas pu se charger",
      body: "Une erreur côté serveur est survenue. C'est presque toujours temporaire. Vous pouvez réessayer ou revenir à l'accueil.",
      retry: "Réessayer",
      backHome: "Retour à l'accueil",
      contact: "Contacter Sillage Immo",
      reference: "Référence d'erreur",
      noReference: "non disponible",
    },
    en: {
      title: "A page could not load",
      body: "A server-side error occurred. It is almost always transient. You can retry or go back to the homepage.",
      retry: "Retry",
      backHome: "Back to homepage",
      contact: "Contact Sillage Immo",
      reference: "Error reference",
      noReference: "unavailable",
    },
    es: {
      title: "Una página no pudo cargarse",
      body: "Se ha producido un error en el servidor. Casi siempre es temporal. Puede reintentar o volver al inicio.",
      retry: "Reintentar",
      backHome: "Volver al inicio",
      contact: "Contactar con Sillage Immo",
      reference: "Referencia de error",
      noReference: "no disponible",
    },
    ru: {
      title: "Страница не смогла загрузиться",
      body: "Произошла серверная ошибка. Почти всегда это временно. Вы можете повторить попытку или вернуться на главную.",
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
          <a href="mailto:contact@sillage-immo.com" className="text-sm text-[#141446] underline">
            {copy.contact}
          </a>
        </div>
      </section>
    </main>
  );
}
