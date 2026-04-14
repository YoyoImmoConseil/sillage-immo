import Link from "next/link";
import { SellerMagicLinkForm } from "../_components/seller-magic-link-form";
import { getInvitationByToken } from "@/services/clients/client-project-invitation.service";

const getErrorMessage = (errorCode: string | undefined) => {
  switch (errorCode) {
    case "missing_token_hash":
      return "Le lien de connexion reçu par email est incomplet.";
    case "magic_link_invalid":
      return "Le lien de connexion est invalide ou a expiré.";
    case "missing_user":
      return "Le compte de connexion n'a pas pu être vérifié.";
    case "invalid":
      return "Cette invitation est introuvable.";
    case "revoked":
      return "Cette invitation a été révoquée.";
    case "expired":
      return "Cette invitation a expiré.";
    case "email_mismatch":
      return "Vous devez utiliser l'adresse email qui a reçu l'invitation.";
    case "profile_link_failed":
      return "Le compte n'a pas pu être rattaché à votre espace client.";
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
        <h2 className="text-2xl font-semibold text-[#141446]">Invitation à votre espace client</h2>
        <p className="text-sm text-[#141446]/75">
          Finalisez votre accès avec le même email que celui utilisé pour recevoir l&apos;invitation.
        </p>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {!token || !invitation ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-[#141446]/75">Aucune invitation valide n&apos;a été trouvée.</p>
          <Link href="/espace-client/login" className="text-sm underline text-[#141446]">
            Aller vers la connexion client
          </Link>
        </div>
      ) : invitation.status === "revoked" ? (
        <p className="mt-6 text-sm text-[#141446]/75">
          Cette invitation a été révoquée. Contactez Sillage Immo pour recevoir un nouveau lien.
        </p>
      ) : invitation.status === "expired" ? (
        <p className="mt-6 text-sm text-[#141446]/75">
          Cette invitation a expiré. Contactez Sillage Immo pour qu&apos;une nouvelle invitation vous soit
          envoyée.
        </p>
      ) : invitation.status === "accepted" ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-[#141446]/75">
            Cette invitation a déjà été activée pour l&apos;adresse <strong>{invitation.email}</strong>.
          </p>
          <SellerMagicLinkForm
            defaultEmail={invitation.email}
            lockedEmail
            nextPath="/espace-client"
            submitLabel="Recevoir un lien de connexion"
            successMessage="Un lien de connexion vient d'être envoyé à votre adresse email."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-[#141446]/[0.03] p-4 text-sm text-[#141446]/78">
            Invitation envoyée à <strong>{invitation.email}</strong>.
          </div>
          <SellerMagicLinkForm
            defaultEmail={invitation.email}
            lockedEmail
            inviteToken={token}
            nextPath="/espace-client"
            submitLabel="Recevoir mon lien de connexion"
            successMessage="Un email de connexion vient d'être envoyé. Ouvrez-le pour activer votre espace client."
          />
        </div>
      )}
    </section>
  );
}
