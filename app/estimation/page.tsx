import { SellerApiFirstFlow } from "./seller-api-first-flow";

export default function EstimationPage() {

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-2xl border p-6">
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
