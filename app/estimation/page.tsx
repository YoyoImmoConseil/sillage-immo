import { ValuationWidget } from "@/app/components/valuation-widget";
import { SellerEstimationForm } from "./seller-estimation-form";

export default function EstimationPage() {
  const valuationContainerId = process.env.NEXT_PUBLIC_WLV_CONTAINER_ID ?? "";
  const valuationWidgetKey = process.env.NEXT_PUBLIC_WLV_WIDGET_KEY ?? "";

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

        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-lg font-medium">Estimateur en ligne</h2>
          <ValuationWidget
            widgetKey={valuationWidgetKey}
            containerId={valuationContainerId}
          />
        </section>

        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-lg font-medium">Finaliser votre demande vendeur</h2>
          <p className="text-sm opacity-75">
            Ce formulaire nous permet de prioriser votre dossier et d&apos;agir vite.
          </p>
          <SellerEstimationForm />
        </section>
      </div>
    </main>
  );
}
