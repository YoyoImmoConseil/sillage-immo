import { BuyerSearchForm } from "./components/buyer-search-form";
import { HomeCommercialAssistant } from "./components/home-commercial-assistant";
import { SillageLogo } from "./components/sillage-logo";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <section className="sillage-card relative overflow-hidden rounded-2xl p-6 space-y-3">
          <Image
            src="/decor-sillage-blue.svg"
            alt=""
            width={180}
            height={174}
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 opacity-[0.08]"
          />
          <div className="mx-auto max-w-[360px]">
            <SillageLogo priority className="h-auto w-full rounded-xl" />
          </div>
          <h1 className="text-2xl font-semibold">Sillage Immo</h1>
          <p className="text-sm opacity-75">
            Boutique immobiliere premium a Nice: accompagnement sur-mesure pour vendre et acheter
            dans les meilleures conditions.
          </p>
        </section>

        <HomeCommercialAssistant />

        <section className="sillage-card relative overflow-hidden rounded-2xl p-6 space-y-2">
          <Image
            src="/decor-sillage-blue.svg"
            alt=""
            width={120}
            height={116}
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-8 opacity-[0.07]"
          />
          <h2 className="text-lg font-medium">Estimer mon bien avec precision</h2>
          <p className="text-sm opacity-70">
            Notre parcours vendeur structure votre demande de A a Z: verification email,
            estimation guidee et creation immediate de votre dossier commercial.
          </p>
          <a
            href="/estimation"
            className="sillage-btn inline-block rounded px-4 py-2 text-sm"
          >
            Lancer mon estimation
          </a>
        </section>

        <BuyerSearchForm />

        <section id="contact-expert" className="sillage-card rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-medium">Rencontrez un de nos experts</h2>
          <p className="text-sm opacity-75">
            Vous souhaitez une lecture claire du marche a Nice et sur la Cote d&apos;Azur ?
            Echangez avec un conseiller Sillage Immo pour cadrer votre strategie en toute
            confiance.
          </p>
          <a
            href="tel:+33423450485"
            className="sillage-btn inline-block rounded px-4 py-2 text-sm"
          >
            Parler a un expert
          </a>
        </section>
      </div>
    </main>
  );
}