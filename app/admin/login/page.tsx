import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPageContext } from "@/lib/admin/auth";
import { getAdminUserCount } from "@/services/admin/admin-user.service";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const [context, adminUserCount] = await Promise.all([getAdminPageContext(), getAdminUserCount()]);

  if (context) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
      <section className="mx-auto max-w-xl space-y-6 rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">Sillage Immo</p>
          <h1 className="text-3xl font-semibold text-[#141446]">Connexion back-office</h1>
          <p className="text-sm text-[#141446]/75">
            Acces reserve aux collaborateurs, managers et administrateurs via Google SSO.
          </p>
        </div>
        <AdminLoginForm canBootstrap={adminUserCount === 0} />
        <Link href="/" className="inline-block text-sm underline text-[#141446]">
          Retour au site
        </Link>
      </section>
    </main>
  );
}
