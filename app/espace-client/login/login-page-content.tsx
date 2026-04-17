"use client";

import { useSearchParams } from "next/navigation";
import type { AppLocale } from "@/lib/i18n/config";
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
      intro: "Saisissez l'adresse email rattachée à votre espace client pour recevoir un lien de connexion.",
      submit: "Recevoir un lien de connexion",
      success: "Si cette adresse dispose d'un espace client, un email de connexion vient d'être envoyé.",
    },
    en: {
      title: "Sign in to your client portal",
      intro: "Enter the email address linked to your client portal to receive a login link.",
      submit: "Receive a login link",
      success: "If this address has an active portal, a login email has just been sent.",
    },
    es: {
      title: "Conéctese a su espacio cliente",
      intro: "Introduzca la dirección de email vinculada a su espacio cliente para recibir un enlace de conexión.",
      submit: "Recibir un enlace de conexión",
      success: "Si esta dirección dispone de un espacio cliente, se acaba de enviar un email de conexión.",
    },
    ru: {
      title: "Вход в клиентское пространство",
      intro: "Введите email, связанный с вашим клиентским пространством, чтобы получить ссылку для входа.",
      submit: "Получить ссылку для входа",
      success: "Если для этого адреса доступно клиентское пространство, письмо для входа уже отправлено.",
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

      <div className="mt-6">
        <SellerMagicLinkForm
          locale={locale}
          submitLabel={copy.submit}
          successMessage={copy.success}
        />
      </div>
    </section>
  );
}
