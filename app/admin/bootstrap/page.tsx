import Link from "next/link";
import { AdminBootstrapForm } from "./bootstrap-form";

export default function AdminBootstrapPage() {
  return (
    <main className="min-h-screen bg-sand px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
      <section className="mx-auto max-w-xl space-y-6 rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-navy/60">Initialisation</p>
          <h1 className="text-3xl font-semibold text-navy">Premier administrateur</h1>
          <p className="text-sm text-navy/75">
            Cette etape autorise la premiere adresse email admin, puis lance la connexion Google.
          </p>
        </div>
        <AdminBootstrapForm />
        <Link href="/admin/login" className="inline-block text-sm underline text-navy">
          Retour connexion
        </Link>
      </section>
    </main>
  );
}
