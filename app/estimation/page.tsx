import { SellerApiFirstFlow } from "./seller-api-first-flow";
import { SillageLogo } from "../components/sillage-logo";
import Image from "next/image";

export default function EstimationPage() {

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="sillage-card relative overflow-hidden rounded-2xl p-6">
          <Image
            src="/decor-sillage-blue.svg"
            alt=""
            width={160}
            height={155}
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 opacity-[0.08]"
          />
          <div className="mx-auto mb-4 max-w-[320px]">
            <SillageLogo className="h-auto w-full rounded-xl" />
          </div>
          <h1 className="text-2xl font-semibold">Vendre avec Sillage Immo</h1>
          <p className="mt-2 text-sm opacity-75">
            Obtenez une premiere estimation et laissez-nous vous accompagner sur tout
            le processus vendeur (diagnostics, documents syndic, strategie de mise en
            vente).
          </p>
        </section>
        <SellerApiFirstFlow />
      </div>
    </main>
  );
}
