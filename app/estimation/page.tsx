import { SellerApiFirstFlow } from "./seller-api-first-flow";
import { SillageLogo } from "../components/sillage-logo";
import Image from "next/image";

export default function EstimationPage() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
          <Image
            src="/decor-sillage-blue.svg"
            alt=""
            width={160}
            height={155}
            aria-hidden
            className="pointer-events-none absolute right-6 top-4 opacity-[0.12]"
          />
          <div className="mb-4 max-w-[320px]">
            <SillageLogo className="h-auto w-full rounded-xl" />
          </div>
          <h1 className="text-2xl font-semibold">Vendre avec Sillage Immo</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#f4ece4]/80">
            Obtenez une premiere estimation et laissez-nous vous accompagner sur tout
            le processus vendeur (diagnostics, documents syndic, strategie de mise en
            vente).
          </p>
        </div>
      </section>
      <section className="bg-[#f4ece4] text-[#141446]">
        <div className="w-full px-6 py-8 md:px-10 xl:px-14 2xl:px-20">
        <SellerApiFirstFlow />
        </div>
      </section>
    </main>
  );
}
