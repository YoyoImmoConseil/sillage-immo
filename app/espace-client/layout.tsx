import Link from "next/link";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { SellerSignOutButton } from "./_components/seller-sign-out-button";

export default async function SellerPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getClientSpacePageContext();

  return (
    <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">Espace client Sillage</p>
            <h1 className="text-3xl font-semibold text-[#141446]">Hub client multi-projets</h1>
            {context ? (
              <p className="text-sm text-[#141446]/75">
                Connecte en tant que {context.clientProfile.fullName ?? context.clientProfile.email}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {context ? (
              <Link href="/espace-client" className="text-sm underline text-[#141446]">
                Mes projets
              </Link>
            ) : (
              <Link href="/espace-client/login" className="text-sm underline text-[#141446]">
                Connexion client
              </Link>
            )}
            <Link href="/" className="text-sm underline text-[#141446]">
              Retour au site
            </Link>
            {context ? <SellerSignOutButton /> : null}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
