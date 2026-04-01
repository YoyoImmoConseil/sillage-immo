import Link from "next/link";
import { AdminPageMountLogger } from "../admin-page-mount-logger";

export default function AdminForbiddenPage() {
  return (
    <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
      <AdminPageMountLogger page="admin-forbidden" />
      <section className="mx-auto max-w-xl space-y-4 rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
        <h1 className="text-3xl font-semibold text-[#141446]">Acces refuse</h1>
        <p className="text-sm text-[#141446]/75">
          Votre compte ne dispose pas des permissions necessaires pour cette zone.
        </p>
        <div className="flex gap-3">
          <Link href="/admin" className="sillage-btn rounded px-4 py-2 text-sm">
            Retour dashboard
          </Link>
          <Link href="/" className="rounded border px-4 py-2 text-sm">
            Retour site
          </Link>
        </div>
      </section>
    </main>
  );
}
