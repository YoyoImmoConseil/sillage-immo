"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { SellerMagicLinkForm } from "../_components/seller-magic-link-form";

const getErrorMessage = (errorCode: string | null, locale: AppLocale) => {
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
      return locale === "en"
        ? "The login link is invalid or has expired."
        : locale === "es"
          ? "El enlace de conexión no es válido o ha caducado."
          : locale === "ru"
            ? "Ссылка для входа недействительна или истекла."
            : "Le lien de connexion est invalide ou a expiré.";
    case "missing_user":
      return locale === "en"
        ? "The login account could not be verified."
        : locale === "es"
          ? "No se pudo verificar la cuenta de conexión."
          : locale === "ru"
            ? "Не удалось проверить учетную запись."
            : "Le compte de connexion n'a pas pu être vérifié.";
    case "no_portal_access":
      return locale === "en"
        ? "No active client portal is linked to this email address."
        : locale === "es"
          ? "No hay ningún espacio cliente activo vinculado a este email."
          : locale === "ru"
            ? "С этим email не связано активное клиентское пространство."
            : "Aucun espace client actif n'est rattaché à cette adresse email.";
    default:
      return null;
  }
};

export function SellerLoginPageContent({ locale = "fr" }: { locale?: AppLocale }) {
  const searchParams = useSearchParams();
  const errorMessage = getErrorMessage(searchParams.get("error"), locale);
  const copy = {
    fr: {
      title: "Connexion à votre espace client",
      intro:
        "Renseignez l'email rattaché à votre espace client : nous vous envoyons un lien sécurisé. Aucun mot de passe à retenir, un seul clic vous connecte.",
      passwordlessHint:
        "Le lien reçu par email est à usage unique. Une fois cliqué, vous restez connecté 30 jours sur cet appareil — sans mot de passe, sans relancer la procédure. Si vous demandez un nouveau lien, ouvrez toujours le mail le plus récent.",
      submit: "M'envoyer un lien de connexion",
      success:
        "Si cette adresse dispose d'un espace client, un email de connexion vient d'être envoyé. Vérifiez aussi vos spams.",
      noAccountTitle: "Pas encore de compte chez Sillage Immo ?",
      noAccountBody:
        "L'espace client est créé après votre première interaction avec nous. Démarrez par une estimation vendeur ou par votre recherche acquéreur :",
      ctaSeller: "Estimer mon bien",
      ctaBuyer: "Lancer ma recherche",
    },
    en: {
      title: "Sign in to your client portal",
      intro:
        "Enter the email linked to your client portal — we'll send a secure link. No password to remember, one click signs you in.",
      passwordlessHint:
        "Each emailed link is single-use. Once clicked, you stay signed in for 30 days on this device — no password, no need to re-request. If you ask for a new link, always open the most recent email.",
      submit: "Email me a sign-in link",
      success:
        "If this address has an active portal, a login email has just been sent. Please also check your spam folder.",
      noAccountTitle: "No account with Sillage Immo yet?",
      noAccountBody:
        "Your portal is created after your first interaction with us. Start with a seller estimate or with your buyer search:",
      ctaSeller: "Estimate my property",
      ctaBuyer: "Start my search",
    },
    es: {
      title: "Conéctese a su espacio cliente",
      intro:
        "Introduzca el email vinculado a su espacio cliente: le enviaremos un enlace seguro. Sin contraseña que recordar, un solo clic le conecta.",
      passwordlessHint:
        "Cada enlace recibido por email es de un solo uso. Una vez clicado, permanece conectado 30 días en este dispositivo — sin contraseña ni nuevas solicitudes. Si pide un nuevo enlace, abra siempre el último email.",
      submit: "Enviarme un enlace de acceso",
      success:
        "Si esta dirección dispone de un espacio cliente, se acaba de enviar un email de acceso. Consulte también el correo no deseado.",
      noAccountTitle: "¿Aún no tiene cuenta en Sillage Immo?",
      noAccountBody:
        "Su espacio se crea tras su primera interacción con nosotros. Comience con una estimación vendedor o con su búsqueda comprador:",
      ctaSeller: "Estimar mi inmueble",
      ctaBuyer: "Iniciar mi búsqueda",
    },
    ru: {
      title: "Вход в клиентское пространство",
      intro:
        "Укажите email, привязанный к вашему пространству — мы отправим безопасную ссылку. Без пароля: один клик и вы внутри.",
      passwordlessHint:
        "Каждая ссылка из письма — одноразовая. После клика вы остаётесь в системе 30 дней на этом устройстве — без пароля и без повторных запросов. Если запросите новую ссылку, всегда открывайте самое последнее письмо.",
      submit: "Отправить мне ссылку",
      success:
        "Если для этого адреса доступно клиентское пространство, письмо для входа уже отправлено. Проверьте также папку «Спам».",
      noAccountTitle: "Ещё нет аккаунта в Sillage Immo?",
      noAccountBody:
        "Кабинет создаётся после первого взаимодействия с нами. Начните с оценки квартиры или с поиска недвижимости:",
      ctaSeller: "Оценить мой объект",
      ctaBuyer: "Начать поиск",
    },
  }[locale];

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-[#141446]">{copy.title}</h2>
        <p className="text-sm text-[#141446]/75">{copy.intro}</p>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        <SellerMagicLinkForm
          locale={locale}
          submitLabel={copy.submit}
          successMessage={copy.success}
        />
        <p className="text-xs text-[#141446]/60">{copy.passwordlessHint}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-[rgba(20,20,70,0.12)] bg-[#141446]/[0.03] p-5">
        <p className="text-sm font-semibold text-[#141446]">{copy.noAccountTitle}</p>
        <p className="mt-1 text-sm text-[#141446]/75">{copy.noAccountBody}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Link
            href={localizePath("/estimation", locale)}
            className="inline-flex items-center justify-center rounded-full bg-[#141446] px-5 py-2.5 text-sm font-semibold text-[#f4ece4] transition hover:opacity-95"
          >
            {copy.ctaSeller}
          </Link>
          <Link
            href={localizePath("/recherche/nouvelle", locale)}
            className="inline-flex items-center justify-center rounded-full border border-[#141446] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#141446] transition hover:bg-[#141446]/5"
          >
            {copy.ctaBuyer}
          </Link>
        </div>
      </div>
    </section>
  );
}
