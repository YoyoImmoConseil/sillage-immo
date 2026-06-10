import type { AppLocale } from "@/lib/i18n/config";

export const getSellerEventCopy = (eventName: string, eventCategory: string, locale: AppLocale) => {
  switch (eventName) {
    case "client_invitation.sent":
      return {
        title:
          locale === "en"
            ? "Your client portal access is ready"
            : locale === "es"
              ? "Su acceso al espacio cliente está listo"
              : locale === "ru"
                ? "Доступ к вашему клиентскому пространству готов"
                : "Votre accès à l'espace client est prêt",
        body:
          locale === "en"
            ? "A secure login link has been sent so you can find your project at any time."
            : locale === "es"
              ? "Se le ha enviado un enlace seguro para que pueda encontrar su proyecto en cualquier momento."
              : locale === "ru"
                ? "Вам отправлена защищенная ссылка для входа, чтобы вы могли в любой момент найти свой проект."
                : "Un lien de connexion sécurisé vous a été envoyé pour retrouver votre projet à tout moment.",
      };
    case "client_invitation.accepted":
      return {
        title:
          locale === "en"
            ? "Your client portal is active"
            : locale === "es"
              ? "Su espacio cliente está activo"
              : locale === "ru"
                ? "Ваше клиентское пространство активно"
                : "Votre espace client est actif",
        body:
          locale === "en"
            ? "You can now follow your seller project and access your information in one place."
            : locale === "es"
              ? "Ahora puede seguir su proyecto vendedor y encontrar toda su información en un solo lugar."
              : locale === "ru"
                ? "Теперь вы можете следить за своим проектом продавца и находить всю информацию в одном месте."
                : "Vous pouvez maintenant suivre votre projet vendeur et retrouver vos informations en un seul endroit.",
      };
    case "project_property.linked_from_estimation":
    case "project_property.linked":
      return {
        title: "Votre bien a été ajouté à votre espace",
        body: "Les informations de votre bien sont désormais rattachées à votre projet pour un suivi plus clair.",
      };
    case "valuation.recorded":
      return {
        title:
          locale === "en"
            ? "Your valuation is available"
            : locale === "es"
              ? "Su valoración está disponible"
              : locale === "ru"
                ? "Ваша оценка доступна"
                : "Votre estimation est disponible",
        body:
          locale === "en"
            ? "Your first value range has been recorded in your client portal."
            : locale === "es"
              ? "Su primera horquilla de valor se ha registrado en su espacio cliente."
              : locale === "ru"
                ? "Первый диапазон оценки сохранен в вашем клиентском пространстве."
                : "Votre première fourchette de valeur a été enregistrée dans votre espace client.",
      };
    case "seller_project.created_from_lead":
      return {
        title: "Votre projet vendeur est ouvert",
        body: "Votre espace Sillage commence à se structurer autour de votre bien et de votre vente.",
      };
    case "advisor.assigned":
      return {
        title: "Un conseiller Sillage vous accompagne",
        body: "Votre projet est maintenant suivi par un interlocuteur dédié.",
      };
    default:
      return {
        title:
          eventCategory === "valuation"
            ? locale === "en"
              ? "Your project is moving forward"
              : locale === "es"
                ? "Su proyecto avanza"
                : locale === "ru"
                  ? "Ваш проект развивается"
                  : "Votre projet évolue"
            : eventCategory === "invitation"
              ? locale === "en"
                ? "Your client access is progressing"
                : locale === "es"
                  ? "Su acceso cliente avanza"
                  : locale === "ru"
                    ? "Ваш клиентский доступ развивается"
                    : "Votre accès client progresse"
              : locale === "en"
                ? "A new step has been completed"
                : locale === "es"
                  ? "Se ha alcanzado una nueva etapa"
                  : locale === "ru"
                    ? "Пройден новый этап"
                    : "Une nouvelle étape a été franchie",
        body:
          locale === "en"
            ? "Your client portal has been updated with new information about your project."
            : locale === "es"
              ? "Su espacio cliente se ha actualizado con nueva información sobre su proyecto."
              : locale === "ru"
                ? "Ваше клиентское пространство обновлено новой информацией о вашем проекте."
                : "Votre espace client a été mis à jour avec une nouvelle information concernant votre projet.",
      };
  }
};
