import { Suspense } from "react";
import { AdminLoginPageContent } from "./login-page-content";

export default function AdminLoginPage() {
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
      <AdminLoginPageContent />
    </Suspense>
  );
}
