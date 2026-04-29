import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { SellerMagicLinkForm } from "../_components/seller-magic-link-form";
import { getInvitationByToken } from "@/services/clients/client-project-invitation.service";

const getErrorMessage = (errorCode: string | undefined, locale: "fr" | "en" | "es" | "ru") => {
  switch (errorCode) {
    case "missing_token_hash":
      return locale === "en"
        ? "The login link received by email is incomplete."
        : locale === "es"
          ? "El enlace de conexión recibido por email está incompleto."
          : locale === "ru"
            ? "Ссылка для входа из письма неполная."
            : "Le lien de connexion reçu par email est incomplet.";
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
  const locale = await getRequestLocale();
  const { token, error } = await searchParams;
  const invitation = token ? await getInvitationByToken(token) : null;
  const errorMessage = getErrorMessage(error, locale);
  // When the invitation has already been accepted, suppress benign errors that
  // simply mean "the link was used once" (magic_link_invalid / missing_token_hash
  // / missing_user). They are expected and would only confuse the user. We
  // still surface real errors (revoked, expired, email_mismatch, profile_link_failed).
  const benignAcceptedErrors = new Set([
    "magic_link_invalid",
    "missing_token_hash",
    "missing_user",
  ]);
  const shouldShowErrorMessage =
    !!errorMessage &&
    !(invitation?.status === "accepted" && benignAcceptedErrors.has(error ?? ""));
  const copy = {
    fr: {
      title: "Invitation à votre espace client",
      intro: "Finalisez votre accès avec le même email que celui utilisé pour recevoir l'invitation.",
      noInvitation: "Aucune invitation valide n'a été trouvée.",
      goToLogin: "Aller vers la connexion client",
      revoked: "Cette invitation a été révoquée. Contactez Sillage Immo pour recevoir un nouveau lien.",
      expired: "Cette invitation a expiré. Contactez Sillage Immo pour qu'une nouvelle invitation vous soit envoyée.",
      alreadyActivated: "Cette invitation a déjà été activée pour l'adresse",
      sentTo: "Invitation envoyée à",
      submit: "Recevoir mon lien de connexion",
      submitAccepted: "Recevoir un lien de connexion",
      success: "Un email de connexion vient d'être envoyé. Ouvrez-le pour activer votre espace client.",
      successAccepted: "Un lien de connexion vient d'être envoyé à votre adresse email.",
      acceptedReassureTitle: "Votre espace est déjà activé",
      acceptedReassureBody:
        "Pas d'inquiétude : un lien magique se consomme en un seul clic, mais une fois cliqué vous restez connecté 30 jours sur cet appareil. Si vous avez perdu votre session, demandez un nouveau lien ci-dessous — un seul clic vous connectera directement à votre espace.",
      acceptedGoToHub: "Ouvrir mon espace client",
    },
    en: {
      title: "Invitation to your client portal",
      intro: "Finalize your access using the same email address that received the invitation.",
      noInvitation: "No valid invitation was found.",
      goToLogin: "Go to client login",
      revoked: "This invitation has been revoked. Contact Sillage Immo to receive a new link.",
      expired: "This invitation has expired. Contact Sillage Immo so a new invitation can be sent.",
      alreadyActivated: "This invitation has already been activated for",
      sentTo: "Invitation sent to",
      submit: "Receive my login link",
      submitAccepted: "Receive a login link",
      success: "A login email has just been sent. Open it to activate your client portal.",
      successAccepted: "A login link has just been sent to your email address.",
      acceptedReassureTitle: "Your portal is already activated",
      acceptedReassureBody:
        "No worries: each magic link is single-use, but once clicked you stay signed in for 30 days on this device. If you lost your session, request a fresh link below — one click will sign you straight into your portal.",
      acceptedGoToHub: "Open my client portal",
    },
    es: {
      title: "Invitación a su espacio cliente",
      intro: "Finalice su acceso con el mismo email utilizado para recibir la invitación.",
      noInvitation: "No se encontró ninguna invitación válida.",
      goToLogin: "Ir al acceso cliente",
      revoked: "Esta invitación ha sido revocada. Contacte con Sillage Immo para recibir un nuevo enlace.",
      expired: "Esta invitación ha caducado. Contacte con Sillage Immo para que se le envíe una nueva invitación.",
      alreadyActivated: "Esta invitación ya ha sido activada para",
      sentTo: "Invitación enviada a",
      submit: "Recibir mi enlace de acceso",
      submitAccepted: "Recibir un enlace de acceso",
      success: "Se acaba de enviar un email de acceso. Ábralo para activar su espacio cliente.",
      successAccepted: "Se acaba de enviar un enlace de acceso a su email.",
      acceptedReassureTitle: "Su espacio ya está activado",
      acceptedReassureBody:
        "No se preocupe: cada enlace mágico es de un solo uso, pero una vez clicado permanece conectado 30 días en este dispositivo. Si ha perdido su sesión, solicite un nuevo enlace a continuación — un solo clic le conectará directamente a su espacio.",
      acceptedGoToHub: "Abrir mi espacio cliente",
    },
    ru: {
      title: "Приглашение в клиентское пространство",
      intro: "Завершите доступ, используя тот же email, на который было отправлено приглашение.",
      noInvitation: "Действительное приглашение не найдено.",
      goToLogin: "Перейти ко входу",
      revoked: "Это приглашение было отозвано. Свяжитесь с Sillage Immo, чтобы получить новую ссылку.",
      expired: "Срок действия приглашения истек. Свяжитесь с Sillage Immo, чтобы отправить новое приглашение.",
      alreadyActivated: "Это приглашение уже было активировано для адреса",
      sentTo: "Приглашение отправлено на",
      submit: "Получить ссылку для входа",
      submitAccepted: "Получить ссылку для входа",
      success: "Письмо для входа только что отправлено. Откройте его, чтобы активировать клиентское пространство.",
      successAccepted: "Ссылка для входа только что отправлена на ваш email.",
      acceptedReassureTitle: "Ваше пространство уже активировано",
      acceptedReassureBody:
        "Не беспокойтесь: каждая магическая ссылка одноразовая, но после клика вы остаётесь в системе 30 дней на этом устройстве. Если сессия потеряна, запросите новую ссылку ниже — один клик, и вы войдёте в кабинет.",
      acceptedGoToHub: "Открыть мой кабинет",
    },
  }[locale];

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-[#141446]">{copy.title}</h2>
        <p className="text-sm text-[#141446]/75">{copy.intro}</p>
      </div>

      {shouldShowErrorMessage ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {!token || !invitation ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-[#141446]/75">{copy.noInvitation}</p>
          <Link href={localizePath("/espace-client/login", locale)} className="text-sm underline text-[#141446]">
            {copy.goToLogin}
          </Link>
        </div>
      ) : invitation.status === "revoked" ? (
        <p className="mt-6 text-sm text-[#141446]/75">
          {copy.revoked}
        </p>
      ) : invitation.status === "expired" ? (
        <p className="mt-6 text-sm text-[#141446]/75">
          {copy.expired}
        </p>
      ) : invitation.status === "accepted" ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4 text-sm text-emerald-900">
            <p className="font-semibold">{copy.acceptedReassureTitle}</p>
            <p className="mt-1 text-emerald-900/85">
              {copy.alreadyActivated} <strong>{invitation.email}</strong>.
            </p>
            <p className="mt-2 text-emerald-900/85">{copy.acceptedReassureBody}</p>
          </div>
          <Link
            href={localizePath("/espace-client", locale)}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#141446] px-5 py-2.5 text-sm font-semibold text-[#f4ece4] transition hover:opacity-95 sm:w-auto"
          >
            {copy.acceptedGoToHub}
          </Link>
          <SellerMagicLinkForm
            locale={locale}
            defaultEmail={invitation.email}
            lockedEmail
            nextPath={localizePath("/espace-client", locale)}
            submitLabel={copy.submitAccepted}
            successMessage={copy.successAccepted}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-[#141446]/[0.03] p-4 text-sm text-[#141446]/78">
            {copy.sentTo} <strong>{invitation.email}</strong>.
          </div>
          <SellerMagicLinkForm
            locale={locale}
            defaultEmail={invitation.email}
            lockedEmail
            inviteToken={token}
            nextPath={localizePath("/espace-client", locale)}
            submitLabel={copy.submit}
            successMessage={copy.success}
          />
        </div>
      )}
    </section>
  );
}
