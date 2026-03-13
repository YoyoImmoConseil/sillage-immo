import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUserCount } from "@/services/admin/admin-user.service";
import { AdminBootstrapForm } from "./bootstrap-form";

export const dynamic = "force-dynamic";

export default async function AdminBootstrapPage() {
  const adminUserCount = await getAdminUserCount();
  if (adminUserCount > 0) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
      <section className="mx-auto max-w-xl space-y-6 rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">Initialisation</p>
          <h1 className="text-3xl font-semibold text-[#141446]">Premier administrateur</h1>
          <p className="text-sm text-[#141446]/75">
            Cette etape autorise la premiere adresse email admin, puis lance la connexion Google.
          </p>
        </div>
        <AdminBootstrapForm />
        <Link href="/admin/login" className="inline-block text-sm underline text-[#141446]">
          Retour connexion
        </Link>
      </section>
    </main>
  );
}
