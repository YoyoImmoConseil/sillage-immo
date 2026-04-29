import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { SellerLoginPageContent } from "./login-page-content";

export default async function SellerLoginPage() {
  const locale = await getRequestLocale();

  // If the visitor is already signed in AND has a client profile, the
  // login form is dead-end UX (cf. Laurent's feedback: header showed
  // "Connecté en tant que Laurent PERIGNON" while the body asked him to
  // sign in again). Redirect them straight to the hub.
  const context = await getClientSpacePageContext();
  if (context) {
    redirect(localizePath("/espace-client", locale));
  }

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
