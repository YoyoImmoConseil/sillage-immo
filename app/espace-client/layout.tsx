import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { SellerSignOutButton } from "./_components/seller-sign-out-button";

export default async function SellerPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const context = await getClientSpacePageContext();
  const copy = {
    fr: {
      eyebrow: "Espace client Sillage",
      title: "Hub client multi-projets",
      connectedAs: "Connecté en tant que",
      projects: "Mes projets",
      login: "Connexion client",
      backToSite: "Retour au site",
    },
    en: {
      eyebrow: "Sillage client space",
      title: "Multi-project client hub",
      connectedAs: "Signed in as",
      projects: "My projects",
      login: "Client login",
      backToSite: "Back to site",
    },
    es: {
      eyebrow: "Espacio cliente Sillage",
      title: "Hub cliente multi-proyectos",
      connectedAs: "Conectado como",
      projects: "Mis proyectos",
      login: "Acceso cliente",
      backToSite: "Volver al sitio",
    },
    ru: {
      eyebrow: "Клиентское пространство Sillage",
      title: "Мультипроектный клиентский хаб",
      connectedAs: "Вход выполнен как",
      projects: "Мои проекты",
      login: "Вход для клиента",
      backToSite: "Вернуться на сайт",
    },
  }[locale];

  return (
    <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">{copy.eyebrow}</p>
            <h1 className="text-3xl font-semibold text-[#141446]">{copy.title}</h1>
            {context ? (
              <p className="text-sm text-[#141446]/75">
                {copy.connectedAs} {context.clientProfile.fullName ?? context.clientProfile.email}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {context ? (
              <Link href={localizePath("/espace-client", locale)} className="text-sm underline text-[#141446]">
                {copy.projects}
              </Link>
            ) : (
              <Link href={localizePath("/espace-client/login", locale)} className="text-sm underline text-[#141446]">
                {copy.login}
              </Link>
            )}
            <Link href={localizePath("/", locale)} className="text-sm underline text-[#141446]">
              {copy.backToSite}
            </Link>
            {context ? <SellerSignOutButton /> : null}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
