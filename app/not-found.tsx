import Image from "next/image";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Page « introuvable » du site, servie en vrai 404.
 *
 * Attention aux `loading.tsx` : un squelette de chargement à la racine
 * (`app/loading.tsx`) ou sur la route d'un bien fait partir la réponse en 200
 * avant que la page ait cherché le bien ; `notFound()` arrive trop tard et Next
 * ne peut plus que rendre cette page avec un `noindex` (« soft 404 »). Ils ont
 * été retirés le 26/10/2026 pour les pages publiques de biens ; ne pas les
 * remettre sans ce compromis en tête (le `RouteProgressBar` assure le retour
 * visuel pendant les navigations).
 *
 * Un seul appel à l'action principal, à la charte : estimation ; les biens à
 * vendre et l'accueil en secondaire.
 */
const COPY: Record<
  AppLocale,
  { eyebrow: string; title: string; body: string; estimate: string; buy: string; home: string }
> = {
  fr: {
    eyebrow: "Erreur 404",
    title: "Cette page n'existe plus.",
    body: "Le bien que vous cherchez a peut-être été vendu, loué ou retiré, ou l'adresse est erronée. Nos biens disponibles et notre service d'estimation, eux, sont bien là.",
    estimate: "Estimez votre bien",
    buy: "Voir les biens à vendre",
    home: "Retour à l'accueil",
  },
  en: {
    eyebrow: "Error 404",
    title: "This page no longer exists.",
    body: "The property you are looking for may have been sold, let or withdrawn, or the address is incorrect. Our available properties and our valuation service are right here.",
    estimate: "Get your property valued",
    buy: "See properties for sale",
    home: "Back to home",
  },
  es: {
    eyebrow: "Error 404",
    title: "Esta página ya no existe.",
    body: "El inmueble que busca puede haberse vendido, alquilado o retirado, o la dirección es incorrecta. Nuestros inmuebles disponibles y nuestro servicio de valoración sí están aquí.",
    estimate: "Valore su inmueble",
    buy: "Ver inmuebles en venta",
    home: "Volver al inicio",
  },
  ru: {
    eyebrow: "Ошибка 404",
    title: "Этой страницы больше нет.",
    body: "Объект, который вы ищете, возможно, продан, сдан или снят с продажи, либо адрес неверен. Наши доступные объекты и услуга оценки — здесь.",
    estimate: "Оцените вашу недвижимость",
    buy: "Смотреть объекты в продаже",
    home: "На главную",
  },
};

export default async function NotFound() {
  const locale = await getRequestLocale();
  const copy = COPY[locale] ?? COPY.fr;
  return (
    <main className="min-h-screen">
      <section aria-labelledby="not-found-title" className="relative isolate overflow-hidden bg-navy text-sand">
        <Image
          src="/decor-sillage-blue.svg"
          alt=""
          width={320}
          height={310}
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 opacity-[0.10]"
        />
        <div className="relative w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
          <div className="max-w-3xl space-y-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-sand/75 md:text-xs">{copy.eyebrow}</p>
            <h1
              id="not-found-title"
              className="sillage-section-title-font text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl xl:text-[52px]"
            >
              {copy.title}
            </h1>
            <p className="sillage-editorial-text max-w-2xl text-sand/90">{copy.body}</p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={localizePath("/estimation", locale)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-sand px-5 text-sm font-semibold text-navy transition hover:bg-sand/90"
                data-track-cta="not_found_estimate"
                data-track-location="not_found"
              >
                {copy.estimate}
              </Link>
              <Link
                href={localizePath("/vente", locale)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-sand/60 px-5 text-sm font-semibold text-sand transition hover:bg-sand/10"
              >
                {copy.buy}
              </Link>
              <Link href={localizePath("/", locale)} className="text-sm text-sand/80 underline underline-offset-4">
                {copy.home}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
