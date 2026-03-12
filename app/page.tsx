import { BuyerSearchForm } from "./components/buyer-search-form";
import { HomeCommercialAssistant } from "./components/home-commercial-assistant";
import { SillageLogo } from "./components/sillage-logo";
import Link from "next/link";

const methodSteps = [
  {
    title: "Estimation fiable et argumentee",
    description:
      "Analyse locale precise du bien et de son environnement pour fixer une strategie de prix solide.",
  },
  {
    title: "Mise en valeur premium",
    description:
      "Photos HD, visite immersive et presentation de qualite pour maximiser l'attractivite.",
  },
  {
    title: "Diffusion large et ciblee",
    description:
      "Visibilite portails + reseau inter-agences, avec un interlocuteur unique pour vous.",
  },
  {
    title: "Qualification acquereurs",
    description:
      "Tri des contacts et verification des dossiers pour eviter les visites peu qualifiees.",
  },
  {
    title: "Suivi transparent",
    description:
      "Pilotage pas a pas des actions de commercialisation avec retour clair a chaque etape.",
  },
  {
    title: "Accompagnement jusqu'a la signature",
    description:
      "Coordination du dossier et accompagnement administratif pour vendre dans de bonnes conditions.",
  },
];

const neighborhoods = ["Carre d'Or", "Mont Boron", "Cimiez", "Le Port", "Wilson", "Liberation"];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 md:py-16 xl:px-14 2xl:px-20">
          <div className="grid gap-8 lg:grid-cols-[45%_55%] lg:items-center">
            <div className="max-w-[640px]">
              <SillageLogo priority className="h-auto w-full" />
            </div>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#f4ece4]/70">
                Immobilier premium a Nice et sur la Cote d&apos;Azur
              </p>
              <h1 className="sillage-section-title-font text-3xl md:text-5xl font-semibold leading-tight">
                Vendre, acheter, louer: un accompagnement global et sur-mesure
              </h1>
              <p className="text-sm md:text-base text-[#f4ece4]/85 max-w-3xl">
                Sillage Immo vous accompagne sur l&apos;ensemble de votre projet immobilier: estimation,
                commercialisation, acquisition, location et gestion locative avec un niveau de
                service premium.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/estimation"
                  className="inline-block rounded bg-[#f4ece4] px-5 py-2.5 text-sm text-[#141446] hover:opacity-90 transition-opacity"
                >
                  Decouvrir la valeur de mon bien
                </Link>
                <a
                  href="tel:+33423450485"
                  className="inline-block rounded border border-[#f4ece4] px-5 py-2.5 text-sm text-[#f4ece4] hover:bg-[#f4ece4] hover:text-[#141446] transition-colors"
                >
                  Parler a un conseiller
                </a>
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
            <p className="text-sm opacity-70">Vendeurs accompagnes</p>
          </div>
          <div className="py-2">
            <p className="text-4xl font-medium">+10 ans</p>
            <p className="text-sm opacity-70">Experience locale</p>
          </div>
          <div className="py-2">
            <p className="text-4xl font-medium">7j/7</p>
            <p className="text-sm opacity-70">Disponibilite conseiller</p>
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
          <h2 className="sillage-section-title">Vous vendez ? Notre methode en 6 etapes</h2>
          <p className="text-sm md:text-base opacity-75 max-w-3xl">
            Une execution claire, orientee resultat, pour vendre au bon prix et dans les meilleures
            conditions.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {methodSteps.map((step, index) => (
              <article key={step.title} className="space-y-2">
                <p className="text-2xl font-semibold opacity-70">{index + 1}</p>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm opacity-75">{step.description}</p>
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
            <ul className="text-sm opacity-80 space-y-1">
              <li>Estimation souvent approximative</li>
              <li>Diffusion et visibilite limitees</li>
              <li>Visites parfois peu qualifiees</li>
              <li>Charge administrative et juridique plus lourde</li>
            </ul>
          </article>
          <article className="space-y-3">
            <h2 className="sillage-section-title">Avec Sillage Immo</h2>
            <ul className="text-sm opacity-80 space-y-1">
              <li>Strategie de prix et de commercialisation personnalisee</li>
              <li>Diffusion multi-canale + reseau inter-agences</li>
              <li>Qualification des acquereurs et meilleur pilotage</li>
              <li>Accompagnement complet jusqu&apos;a la signature notaire</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="sillage-section-light">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-5">
          <h2 className="sillage-section-title">Nos quartiers, notre territoire</h2>
          <p className="text-sm opacity-75 max-w-3xl">
            De Wilson a Cimiez, du Port au Carre d&apos;Or: nous adaptons la strategie a la micro-zone
            et au profil acquereur cible.
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

      <section id="contact-expert" className="sillage-section-light">
        <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-3">
          <h2 className="sillage-section-title">Parlez a un conseiller Sillage Immo</h2>
          <p className="text-sm md:text-base opacity-80 max-w-3xl">
            Vous souhaitez cadrer votre projet vendeur, acquereur ou locatif ? Notre equipe est a
            votre disposition pour une recommandation claire et personnalisee.
          </p>
          <a
            href="tel:+33423450485"
            className="inline-block rounded border border-[#141446] px-5 py-2.5 text-sm text-[#141446] hover:bg-[#141446] hover:text-[#f4ece4] transition-colors"
          >
            Parler a un expert
          </a>
        </div>
      </section>
    </main>
  );
}