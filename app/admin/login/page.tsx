import { Suspense } from "react";
import { publicEnv } from "@/lib/env/public";
import { AdminLoginPageContent } from "./login-page-content";

const ADMIN_PREVIEW_ORIGIN = "https://sillage-immo-git-feature-client-space-v1-sillage-immo.vercel.app";

export default function AdminLoginPage() {
  const googleAuthUrl = new URL("/auth/v1/authorize", publicEnv.NEXT_PUBLIC_SUPABASE_URL);
  googleAuthUrl.searchParams.set("provider", "google");
  googleAuthUrl.searchParams.set("redirect_to", `${ADMIN_PREVIEW_ORIGIN}/auth/callback?next=/admin`);

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f4ece4] px-6 py-10 md:px-10 xl:px-14 2xl:px-20">
          <section className="mx-auto max-w-xl rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-8">
            <p className="text-sm text-[#141446]/75">Chargement de la connexion back-office...</p>
          </section>
        </main>
      }
    >
      <AdminLoginPageContent googleAuthHref={googleAuthUrl.toString()} />
    </Suspense>
  );
}
