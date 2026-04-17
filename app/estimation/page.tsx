import { SellerApiFirstFlow } from "./seller-api-first-flow";
import { SillageLogo } from "../components/sillage-logo";
import Image from "next/image";
import { getRequestLocale } from "@/lib/i18n/request";

export default async function EstimationPage() {
  const locale = await getRequestLocale();
  const copy = {
    fr: {
      title: "Vendre avec Sillage Immo",
      body:
        "Obtenez une première estimation et laissez-nous vous accompagner sur tout le processus vendeur (diagnostics, documents syndic, stratégie de mise en vente).",
    },
    en: {
      title: "Sell with Sillage Immo",
      body:
        "Get an initial valuation and let us support you throughout the selling process, from diagnostics and condo documents to pricing and go-to-market strategy.",
    },
    es: {
      title: "Vender con Sillage Immo",
      body:
        "Obtenga una primera valoración y deje que le acompañemos durante todo el proceso de venta: diagnósticos, documentación de copropiedad y estrategia de comercialización.",
    },
    ru: {
      title: "Продайте с Sillage Immo",
      body:
        "Получите первичную оценку и позвольте нам сопровождать вас на всех этапах продажи: диагностика, документы кондоминиума и стратегия вывода объекта на рынок.",
    },
  }[locale];

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
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#f4ece4]/80">{copy.body}</p>
        </div>
      </section>
      <section className="bg-[#f4ece4] text-[#141446]">
        <div className="w-full px-6 py-8 md:px-10 xl:px-14 2xl:px-20">
        <SellerApiFirstFlow locale={locale} />
        </div>
      </section>
    </main>
  );
}
