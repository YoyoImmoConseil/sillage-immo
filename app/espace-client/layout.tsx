import Link from "next/link";

export default function SellerPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">Espace client Sillage</p>
            <h1 className="text-3xl font-semibold text-[#141446]">Portail vendeur</h1>
          </div>
          <Link href="/" className="text-sm underline text-[#141446]">
            Retour au site
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
