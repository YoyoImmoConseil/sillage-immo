import Image from "next/image";
import { BuyerSearchForm } from "./components/buyer-search-form";
import { HomeCommercialAssistant } from "./components/home-commercial-assistant";
import { HomeTeamSection } from "./components/home-team-section";
import { SillageLogo } from "./components/sillage-logo";
import Link from "next/link";

const methodSteps = [
  {
    title: "Estimation fiable et argumentée",
    description:
      "Analyse locale précise du bien et de son environnement pour fixer une stratégie de prix solide.",
  },
  {
    title: "Mise en valeur premium",
    description:
      "Photos HD, visite immersive et présentation de qualité pour maximiser l'attractivité.",
  },
  {
    title: "Diffusion large et ciblée",
    description:
      "Visibilité portails + réseau inter-agences, avec un interlocuteur unique pour vous.",
  },
  {
    title: "Qualification acquéreurs",
    description:
      "Tri des contacts et vérification des dossiers pour éviter les visites peu qualifiées.",
  },
  {
    title: "Suivi transparent",
    description:
      "Pilotage pas à pas des actions de commercialisation avec retour clair à chaque étape.",
  },
  {
    title: "Accompagnement jusqu'à la signature",
    description:
      "Coordination du dossier et accompagnement administratif pour vendre dans de bonnes conditions.",
  },
];

const neighborhoods = ["Carré d'Or", "Mont Boron", "Cimiez", "Le Port", "Wilson", "Libération"];

export default async function Home() {
  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="relative isolate overflow-hidden">
          <Image
            src="/home-hero-windows-nice.png"
            alt="Façade niçoise ensoleillée"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#141446]/46" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141446]/66 via-[#141446]/38 to-[#141446]/24" />
          <div className="relative w-full px-6 py-10 md:px-10 md:py-16 xl:px-14 2xl:px-20">
            <div className="grid gap-8 lg:grid-cols-[45%_55%] lg:items-center">
              <div className="max-w-[640px]">
                <SillageLogo priority className="h-auto w-full" />
              </div>
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#f4ece4]/70">
                  Immobilier premium à Nice et sur la Côte d&apos;Azur
                </p>
                <h1 className="sillage-section-title-font text-3xl md:text-5xl font-semibold leading-tight">
                  Vendre, acheter, louer : un accompagnement global et sur mesure
                </h1>
                <p className="sillage-editorial-text text-[#f4ece4]/85 max-w-3xl">
                  Sillage Immo vous accompagne sur l&apos;ensemble de votre projet immobilier : estimation,
                  commercialisation, acquisition, location et gestion locative avec un niveau de
                  service premium.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/vente"
                    className="inline-block rounded border border-[#f4ece4] px-5 py-2.5 text-sm text-[#f4ece4] hover:bg-[#f4ece4] hover:text-[#141446] transition-colors"
                  >
                    Voir nos biens en vente
                  </Link>
                  <Link
                    href="/location"
                    className="inline-block rounded border border-[#f4ece4] px-5 py-2.5 text-sm text-[#f4ece4] hover:bg-[#f4ece4] hover:text-[#141446] transition-colors"
                  >
                    Voir nos biens en location
                  </Link>
                  <Link
                    href="/estimation"
                    className="inline-block rounded bg-[#f4ece4] px-5 py-2.5 text-sm text-[#141446] hover:opacity-90 transition-opacity"
                  >
                    Découvrir la valeur de mon bien
                  </Link>
                  <a
                    href="tel:+33423450485"
                    className="inline-block rounded border border-[#f4ece4] px-5 py-2.5 text-sm text-[#f4ece4] hover:bg-[#f4ece4] hover:text-[#141446] transition-colors"
                  >
                    Parler à un conseiller
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sillage-section-light">
        <div className="w-full px-6 py-8 md:px-10 md:py-12 xl:px-14 2xl:px-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="py-2">
            <p className="text-4xl font-medium">4.9/5</p>
            <p className="text-sm opacity-70">Note Google</p>
          </div>
          <div className="py-2">
            <p className="text-4xl font-medium">+350</p>
            <p className="text-sm opacity-70">Vendeurs accompagnés</p>
          </div>
          <div className="py-2">
            <p className="text-4xl font-medium">+10 ans</p>
            <p className="text-sm opacity-70">Expérience locale</p>
          </div>
          <div className="py-2">
            <p className="text-4xl font-medium">7j/7</p>
            <p className="text-sm opacity-70">Disponibilité conseiller</p>
          </div>
        </div>
      </section>

      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-6">
          <HomeCommercialAssistant />
        </div>
      </section>

      <section className="sillage-section-light">
        <div className="w-full px-6 py-10 md:px-10 md:py-16 xl:px-14 2xl:px-20 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.16em] opacity-70">Catalogue vente</p>
              <h2 className="sillage-section-title">Nos biens en vente</h2>
              <p className="sillage-editorial-text opacity-75">
                Appartements, maisons, villas et biens premium diffusés par Sillage Immo.
              </p>
              <Link href="/vente" className="sillage-btn inline-block rounded px-4 py-2 text-sm">
                Explorer la sélection
              </Link>
            </article>
            <article className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.16em] opacity-70">Catalogue location</p>
              <h2 className="sillage-section-title">Nos biens en location</h2>
              <p className="sillage-editorial-text opacity-75">
                Une sélection de biens à louer, avec un accompagnement locatif clair et réactif.
              </p>
              <Link
                href="/location"
                className="sillage-btn inline-block rounded px-4 py-2 text-sm"
              >
                Voir les opportunités
              </Link>
            </article>
          </div>
          <h2 className="sillage-section-title">Vous vendez ? Notre méthode en 6 étapes</h2>
          <p className="sillage-editorial-text opacity-75 max-w-3xl">
            Une exécution claire, orientée résultat, pour vendre au bon prix et dans les meilleures
            conditions.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {methodSteps.map((step, index) => (
              <article key={step.title} className="space-y-2">
                <p className="text-2xl font-semibold opacity-70">{index + 1}</p>
                <h3 className="font-medium">{step.title}</h3>
                <p className="sillage-editorial-text opacity-75">{step.description}</p>
              </article>
            ))}
          </div>
          <div className="flex justify-center">
            <Link href="/estimation" className="sillage-btn inline-block rounded px-4 py-2 text-sm">
              Lancer mon estimation
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 grid gap-8 md:grid-cols-2">
          <article className="space-y-3">
            <h2 className="sillage-section-title">Vendre seul</h2>
            <ul className="sillage-editorial-text opacity-80 space-y-1">
              <li>Estimation souvent approximative</li>
              <li>Diffusion et visibilité limitées</li>
              <li>Visites parfois peu qualifiées</li>
              <li>Charge administrative et juridique plus lourde</li>
            </ul>
          </article>
          <article className="space-y-3">
            <h2 className="sillage-section-title">Avec Sillage Immo</h2>
            <ul className="sillage-editorial-text opacity-80 space-y-1">
              <li>Stratégie de prix et de commercialisation personnalisée</li>
              <li>Diffusion multi-canal + réseau inter-agences</li>
              <li>Qualification des acquéreurs et meilleur pilotage</li>
              <li>Accompagnement complet jusqu&apos;à la signature notaire</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="sillage-section-light">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-5">
          <h2 className="sillage-section-title">Nos quartiers, notre territoire</h2>
          <p className="sillage-editorial-text max-w-3xl opacity-75">
            De Wilson à Cimiez, du Port au Carré d&apos;Or : nous adaptons la stratégie à la micro-zone
            et au profil acquéreur ciblé.
          </p>
          <div className="flex flex-wrap gap-2">
            {neighborhoods.map((area) => (
              <span key={area} className="sillage-chip rounded-full px-3 py-1 text-sm">
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20">
          <BuyerSearchForm />
        </div>
      </section>

      <HomeTeamSection />

      <section id="contact-expert" className="sillage-section-light">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-3">
          <h2 className="sillage-section-title">Parlez à un conseiller Sillage Immo</h2>
          <p className="sillage-editorial-text opacity-80 max-w-3xl">
            Vous souhaitez cadrer votre projet vendeur, acquéreur ou locatif ? Notre équipe est à
            votre disposition pour une recommandation claire et personnalisée.
          </p>
          <a
            href="tel:+33423450485"
            className="inline-block rounded border border-[#141446] px-5 py-2.5 text-sm text-[#141446] hover:bg-[#141446] hover:text-[#f4ece4] transition-colors"
          >
            Parler à un expert
          </a>
        </div>
      </section>
    </main>
  );
}