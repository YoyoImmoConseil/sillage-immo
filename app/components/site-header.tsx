import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="bg-[#141446] text-[#f4ece4]">
      <div className="flex min-h-[45px] w-full items-center justify-between px-6 md:px-10 xl:px-14 2xl:px-20">
        <Link href="/" className="text-sm tracking-[0.16em] uppercase text-[#f4ece4]/90">
          Accueil
        </Link>
        <nav className="flex items-center gap-5 text-xs uppercase tracking-[0.14em] text-[#f4ece4]/90">
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
