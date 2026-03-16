import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[#141446] text-[#f4ece4]">
      <div className="flex min-h-[90px] w-full items-center justify-between px-6 md:px-10 xl:px-14 2xl:px-20">
        <Link href="/" className="text-base tracking-[0.16em] uppercase text-[#f4ece4]/90 md:text-[1.05rem]">
          Accueil
        </Link>
        <nav className="flex items-center gap-5 text-sm uppercase tracking-[0.14em] text-[#f4ece4]/90 md:text-[0.95rem]">
          <Link href="/vente" className="hover:opacity-80 transition-opacity">
            Vente
          </Link>
          <Link href="/location" className="hover:opacity-80 transition-opacity">
            Location
          </Link>
          <Link href="/estimation" className="hover:opacity-80 transition-opacity">
            Estimation
          </Link>
          <a href="tel:+33423450485" className="hover:opacity-80 transition-opacity">
            Conseiller
          </a>
        </nav>
      </div>
    </header>
  );
}
