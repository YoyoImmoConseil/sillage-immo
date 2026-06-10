import type { Metadata } from "next";
import { DeleteConversationsForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Supprimer mes conversations IA - Sillage Immo",
  description:
    "Demandez la suppression de vos conversations avec l'assistant IA de Sillage Immo. Un code de vérification vous est envoyé par e-mail.",
  robots: { index: false, follow: false },
};

export default function ConversationsDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-navy/60">
          Confidentialité
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-navy">
          Supprimer mes conversations IA
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-navy/80">
          Saisissez l&apos;adresse e-mail utilisée lors de vos échanges avec
          l&apos;assistant IA de Sillage Immo. Nous vous enverrons un code de
          vérification à 6 chiffres, valable 15&nbsp;minutes. Une fois validé,
          toutes les conversations associées seront marquées comme supprimées
          puis effacées définitivement après 30&nbsp;jours.
        </p>
      </header>
      <DeleteConversationsForm />
      <section className="mt-10 border-t border-[rgba(20,20,70,0.15)] pt-6 text-xs text-navy/70">
        <p>
          Cette procédure couvre uniquement les conversations avec
          l&apos;assistant IA (page d&apos;accueil, estimation, espace
          vendeur). Pour toute autre demande RGPD, écrivez à{" "}
          <a
            className="underline underline-offset-2"
            href="mailto:contact@sillage-immobilier.com"
          >
            contact@sillage-immobilier.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
