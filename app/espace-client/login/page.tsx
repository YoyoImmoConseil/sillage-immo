import { Suspense } from "react";
import { getRequestLocale } from "@/lib/i18n/request";
import { SellerLoginPageContent } from "./login-page-content";

export default async function SellerLoginPage() {
  const locale = await getRequestLocale();
  const fallback = {
    fr: "Chargement de votre espace client...",
    en: "Loading your client portal...",
    es: "Cargando su espacio cliente...",
    ru: "Загрузка клиентского пространства...",
  }[locale];
  return (
    <Suspense
      fallback={
        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
          <p className="text-sm text-[#141446]/75">{fallback}</p>
        </section>
      }
    >
      <SellerLoginPageContent locale={locale} />
    </Suspense>
  );
}
