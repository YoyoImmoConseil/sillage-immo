"use client";

import { useSearchParams } from "next/navigation";
import { SellerMagicLinkForm } from "../_components/seller-magic-link-form";

const getErrorMessage = (errorCode: string | null) => {
  switch (errorCode) {
    case "missing_token_hash":
      return "Le lien de connexion recu par email est incomplet.";
    case "magic_link_invalid":
      return "Le lien de connexion est invalide ou a expire.";
    case "missing_user":
      return "Le compte de connexion n'a pas pu etre verifie.";
    case "no_portal_access":
      return "Aucun espace client actif n'est rattache a cette adresse email.";
    default:
      return null;
  }
};

export function SellerLoginPageContent() {
  const searchParams = useSearchParams();
  const errorMessage = getErrorMessage(searchParams.get("error"));

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-[#141446]">Connexion a votre espace client</h2>
        <p className="text-sm text-[#141446]/75">
          Saisissez l&apos;adresse email rattachee a votre espace client pour recevoir un lien de connexion.
        </p>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6">
        <SellerMagicLinkForm
          submitLabel="Recevoir un lien de connexion"
          successMessage="Si cette adresse dispose d'un espace client, un email de connexion vient d'etre envoye."
        />
      </div>
    </section>
  );
}
