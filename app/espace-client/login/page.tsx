import { Suspense } from "react";
import { SellerLoginPageContent } from "./login-page-content";

export default function SellerLoginPage() {
  return (
    <Suspense
      fallback={
        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
          <p className="text-sm text-[#141446]/75">Chargement de votre espace client...</p>
        </section>
      }
    >
      <SellerLoginPageContent />
    </Suspense>
  );
}
