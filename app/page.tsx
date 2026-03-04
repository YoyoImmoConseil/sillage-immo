import { ValuationWidget } from "./components/valuation-widget";

export default function Home() {
  const valuationContainerId = process.env.NEXT_PUBLIC_WLV_CONTAINER_ID ?? "";
  const valuationWidgetKey = process.env.NEXT_PUBLIC_WLV_WIDGET_KEY ?? "";

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-3xl w-full rounded-2xl border p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Sillage Immo</h1>
        <p className="mt-2 text-sm opacity-70">
          Architecture en cours de structuration. Interface premium à venir.
        </p>
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Estimateur vendeur (MVP)</h2>
          <p className="text-sm opacity-70">
            Configure <code>NEXT_PUBLIC_WLV_WIDGET_KEY</code> et{" "}
            <code>NEXT_PUBLIC_WLV_CONTAINER_ID</code> dans{" "}
            <code>.env.local</code>.
          </p>
          <ValuationWidget
            widgetKey={valuationWidgetKey}
            containerId={valuationContainerId}
          />
          <a
            href="/estimation"
            className="inline-block rounded bg-black px-4 py-2 text-sm text-white"
          >
            Ouvrir le tunnel vendeur
          </a>
        </section>
      </div>
    </main>
  );
}