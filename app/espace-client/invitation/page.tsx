import Link from "next/link";
import { SellerMagicLinkForm } from "../_components/seller-magic-link-form";
import { getInvitationByToken } from "@/services/clients/client-project-invitation.service";

const getErrorMessage = (errorCode: string | undefined) => {
  switch (errorCode) {
    case "missing_token_hash":
      return "Le lien de connexion recu par email est incomplet.";
    case "magic_link_invalid":
      return "Le lien de connexion est invalide ou a expire.";
    case "missing_user":
      return "Le compte de connexion n'a pas pu etre verifie.";
    case "invalid":
      return "Cette invitation est introuvable.";
    case "revoked":
      return "Cette invitation a ete revoquee.";
    case "expired":
      return "Cette invitation a expire.";
    case "email_mismatch":
      return "Vous devez utiliser l'adresse email qui a recu l'invitation.";
    case "profile_link_failed":
      return "Le compte n'a pas pu etre rattache a votre espace client.";
    default:
      return null;
  }
};

type InvitationPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

export default async function SellerInvitationPage({
  searchParams,
}: InvitationPageProps) {
  const { token, error } = await searchParams;
  const invitation = token ? await getInvitationByToken(token) : null;
  const errorMessage = getErrorMessage(error);

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-[#141446]">Invitation a votre espace vendeur</h2>
        <p className="text-sm text-[#141446]/75">
          Finalisez votre acces avec le meme email que celui utilise pour recevoir l'invitation.
        </p>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {!token || !invitation ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-[#141446]/75">Aucune invitation valide n'a ete trouvee.</p>
          <Link href="/espace-client/login" className="text-sm underline text-[#141446]">
            Aller vers la connexion vendeur
          </Link>
        </div>
      ) : invitation.status === "revoked" ? (
        <p className="mt-6 text-sm text-[#141446]/75">
          Cette invitation a ete revoquee. Contactez Sillage Immo pour recevoir un nouveau lien.
        </p>
      ) : invitation.status === "expired" ? (
        <p className="mt-6 text-sm text-[#141446]/75">
          Cette invitation a expire. Contactez Sillage Immo pour qu'une nouvelle invitation vous soit
          envoyee.
        </p>
      ) : invitation.status === "accepted" ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-[#141446]/75">
            Cette invitation a deja ete activee pour l'adresse <strong>{invitation.email}</strong>.
          </p>
          <SellerMagicLinkForm
            defaultEmail={invitation.email}
            lockedEmail
            nextPath="/espace-client"
            submitLabel="Recevoir un lien de connexion"
            successMessage="Un lien de connexion vient d'etre envoye a votre adresse email."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-[#141446]/[0.03] p-4 text-sm text-[#141446]/78">
            Invitation envoyee a <strong>{invitation.email}</strong>.
          </div>
          <SellerMagicLinkForm
            defaultEmail={invitation.email}
            lockedEmail
            inviteToken={token}
            nextPath="/espace-client"
            submitLabel="Recevoir mon lien de connexion"
            successMessage="Un email de connexion vient d'etre envoye. Ouvrez-le pour activer votre espace client."
          />
        </div>
      )}
    </section>
  );
}
