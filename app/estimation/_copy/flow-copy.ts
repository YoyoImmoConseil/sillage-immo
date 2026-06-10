import type { AppLocale } from "@/lib/i18n/config";

const flowFr = {
  sendOtpError: "Impossible d'envoyer le code email.",
  sendOtpNetworkError: "Erreur réseau pendant l'envoi du code.",
  invalidCode: "Code invalide.",
  verifyCodeNetworkError: "Erreur réseau pendant la vérification du code.",
  sendingPortalLink: "Nous envoyons votre lien d'accès à l'espace client.",
  portalSendFailed:
    "Votre estimation est prête, mais nous n'avons pas pu envoyer automatiquement le lien d'accès.",
  portalSentSuccess: (email: string) => `Un lien d'accès à votre espace client vient d'être envoyé à ${email}.`,
  portalSendNetworkError:
    "Votre estimation est prête, mais l'envoi automatique du lien d'accès a échoué.",
  emailNotVerified: "Email non vérifié. Merci de valider le code.",
  estimateError: "Impossible de calculer votre estimation.",
  estimateNetworkError: "Erreur réseau pendant le calcul d'estimation.",
  mediaUploadNetworkError: "Erreur reseau pendant l'envoi des medias.",
  mediaTooLargeImage: (fileName: string, sizeMb: number) =>
    `La photo "${fileName}" fait ${sizeMb.toFixed(1)} Mo et depasse la limite autorisee de 15 Mo. Reduisez la resolution ou compressez-la.`,
  mediaTooLargeVideo: (fileName: string, sizeMb: number) =>
    `La video "${fileName}" fait ${sizeMb.toFixed(0)} Mo et depasse la limite autorisee de 200 Mo.`,
  mediaUnsupportedFormat: (fileName: string) =>
    `Le fichier "${fileName}" n'est pas dans un format accepte. Formats acceptes : JPG, PNG, WEBP, HEIC, MP4, MOV, WEBM.`,
  mediaUploadExpired:
    "Le lien d'envoi a expire. Rechargez la page et reessayez.",
  mediaServerUnavailable:
    "Service de stockage momentanement indisponible. Reessayez dans un instant.",
  tooManyPhotos: "Vous pouvez ajouter jusqu'a 20 photos.",
  tooManyVideos: "Vous pouvez ajouter jusqu'a 5 videos.",
  title: "Démarrer votre demande d'estimation",
  intro:
    "Un parcours guidé en trois étapes : vous décrivez votre bien, nous sécurisons votre email, puis vous recevez une estimation structurée avec un conseiller Sillage à vos côtés pour préparer la suite.",
};

export type SellerFlowCopy = typeof flowFr;

export const SELLER_FLOW_COPY: Record<AppLocale, SellerFlowCopy> = {
  fr: flowFr,
  en: {
    sendOtpError: "Unable to send the email code.",
    sendOtpNetworkError: "Network error while sending the code.",
    invalidCode: "Invalid code.",
    verifyCodeNetworkError: "Network error while verifying the code.",
    sendingPortalLink: "We are sending your access link to the client portal.",
    portalSendFailed:
      "Your valuation is ready, but we could not send the access link automatically.",
    portalSentSuccess: (email: string) => `An access link to your client portal has been sent to ${email}.`,
    portalSendNetworkError:
      "Your valuation is ready, but the automatic access-link delivery failed.",
    emailNotVerified: "Email not verified. Please validate the code first.",
    estimateError: "Unable to compute your valuation.",
    estimateNetworkError: "Network error while computing the valuation.",
    mediaUploadNetworkError: "Network error while uploading media.",
    mediaTooLargeImage: (fileName: string, sizeMb: number) =>
      `The photo "${fileName}" is ${sizeMb.toFixed(1)} MB and exceeds the 15 MB limit. Reduce its resolution or compress it.`,
    mediaTooLargeVideo: (fileName: string, sizeMb: number) =>
      `The video "${fileName}" is ${sizeMb.toFixed(0)} MB and exceeds the 200 MB limit.`,
    mediaUnsupportedFormat: (fileName: string) =>
      `The file "${fileName}" is not in an accepted format. Accepted: JPG, PNG, WEBP, HEIC, MP4, MOV, WEBM.`,
    mediaUploadExpired:
      "The upload link has expired. Reload the page and try again.",
    mediaServerUnavailable:
      "Storage service temporarily unavailable. Please try again shortly.",
    tooManyPhotos: "You can upload up to 20 photos.",
    tooManyVideos: "You can upload up to 5 videos.",
    title: "Start your valuation request",
    intro:
      "A guided three-step journey: you describe your property, we secure your email, then you receive a structured valuation with a Sillage advisor by your side to prepare the next steps.",
  },
  es: {
    sendOtpError: "No se pudo enviar el código por email.",
    sendOtpNetworkError: "Error de red durante el envío del código.",
    invalidCode: "Código no válido.",
    verifyCodeNetworkError: "Error de red durante la verificación del código.",
    sendingPortalLink: "Estamos enviando su enlace de acceso al espacio cliente.",
    portalSendFailed:
      "Su valoración está lista, pero no pudimos enviar automáticamente el enlace de acceso.",
    portalSentSuccess: (email: string) => `Se ha enviado un enlace de acceso a su espacio cliente a ${email}.`,
    portalSendNetworkError:
      "Su valoración está lista, pero el envío automático del enlace de acceso ha fallado.",
    emailNotVerified: "Email no verificado. Por favor, valide el código primero.",
    estimateError: "No se pudo calcular su valoración.",
    estimateNetworkError: "Error de red durante el cálculo de la valoración.",
    mediaUploadNetworkError: "Error de red durante la carga de los medios.",
    mediaTooLargeImage: (fileName: string, sizeMb: number) =>
      `La foto "${fileName}" pesa ${sizeMb.toFixed(1)} MB y supera el limite de 15 MB. Reduzca la resolucion o comprimala.`,
    mediaTooLargeVideo: (fileName: string, sizeMb: number) =>
      `El video "${fileName}" pesa ${sizeMb.toFixed(0)} MB y supera el limite de 200 MB.`,
    mediaUnsupportedFormat: (fileName: string) =>
      `El archivo "${fileName}" no esta en un formato aceptado. Aceptados: JPG, PNG, WEBP, HEIC, MP4, MOV, WEBM.`,
    mediaUploadExpired:
      "El enlace de carga ha expirado. Recargue la pagina y vuelva a intentarlo.",
    mediaServerUnavailable:
      "Servicio de almacenamiento momentaneamente no disponible. Vuelva a intentarlo en breve.",
    tooManyPhotos: "Puede cargar hasta 20 fotos.",
    tooManyVideos: "Puede cargar hasta 5 videos.",
    title: "Iniciar su solicitud de valoración",
    intro:
      "Un recorrido guiado en tres etapas: usted describe su inmueble, aseguramos su email, y luego recibe una valoración estructurada con un asesor Sillage a su lado para preparar la continuación.",
  },
  ru: {
    sendOtpError: "Не удалось отправить код по email.",
    sendOtpNetworkError: "Ошибка сети при отправке кода.",
    invalidCode: "Неверный код.",
    verifyCodeNetworkError: "Ошибка сети при проверке кода.",
    sendingPortalLink: "Мы отправляем ссылку доступа в клиентское пространство.",
    portalSendFailed:
      "Оценка готова, но нам не удалось автоматически отправить ссылку доступа.",
    portalSentSuccess: (email: string) => `Ссылка доступа в клиентское пространство отправлена на ${email}.`,
    portalSendNetworkError:
      "Оценка готова, но автоматическая отправка ссылки доступа не удалась.",
    emailNotVerified: "Email не подтвержден. Пожалуйста, сначала подтвердите код.",
    estimateError: "Не удалось рассчитать оценку.",
    estimateNetworkError: "Ошибка сети при расчете оценки.",
    mediaUploadNetworkError: "Ошибка сети при загрузке медиафайлов.",
    mediaTooLargeImage: (fileName: string, sizeMb: number) =>
      `Фото "${fileName}" весит ${sizeMb.toFixed(1)} МБ и превышает лимит 15 МБ. Уменьшите разрешение или сожмите файл.`,
    mediaTooLargeVideo: (fileName: string, sizeMb: number) =>
      `Видео "${fileName}" весит ${sizeMb.toFixed(0)} МБ и превышает лимит 200 МБ.`,
    mediaUnsupportedFormat: (fileName: string) =>
      `Файл "${fileName}" не в принятом формате. Допустимые форматы: JPG, PNG, WEBP, HEIC, MP4, MOV, WEBM.`,
    mediaUploadExpired:
      "Ссылка для загрузки истекла. Обновите страницу и попробуйте снова.",
    mediaServerUnavailable:
      "Хранилище временно недоступно. Повторите попытку через мгновение.",
    tooManyPhotos: "Можно загрузить до 20 фотографий.",
    tooManyVideos: "Можно загрузить до 5 видео.",
    title: "Начать заявку на оценку",
    intro:
      "Пошаговый путь из трёх этапов: вы описываете объект, мы подтверждаем ваш email, а затем вы получаете структурированную оценку с консультантом Sillage рядом, чтобы подготовить следующие шаги.",
  },
};

const verificationFr = {
  title: "Étape 2 — Sécuriser l'envoi de votre estimation",
  intro:
    "Nous vérifions votre email pour protéger votre demande, éviter les fausses estimations et vous transmettre un résultat exploitable.",
  code: "Code reçu par email",
  verify: "Recevoir mon lien sécurisé",
  verifying: "Vérification...",
  dev: "Mode dev : code OTP =",
  nonEngagement:
    "Votre demande d'estimation ne vous engage pas. Elle nous permet de préparer une première analyse sérieuse et, si vous le souhaitez, un échange avec un conseiller Sillage.",
  estimate: "Obtenir mon estimation et préparer la suite avec un conseiller",
  estimating: "Calcul en cours...",
  progress: "Analyse en cours...",
};

export type SellerEmailVerificationCopy = typeof verificationFr;

export const SELLER_EMAIL_VERIFICATION_COPY: Record<AppLocale, SellerEmailVerificationCopy> = {
  fr: verificationFr,
  en: {
    title: "Step 2 — Securing your valuation delivery",
    intro:
      "We verify your email to protect your request, prevent fake valuations and make sure you receive a usable result.",
    code: "Code received by email",
    verify: "Receive my secure link",
    verifying: "Verifying...",
    dev: "Dev mode: OTP code =",
    nonEngagement:
      "Requesting a valuation does not commit you to anything. It lets us prepare a first serious analysis and, if you wish, a conversation with a Sillage advisor.",
    estimate: "Get my valuation and prepare the next steps with an advisor",
    estimating: "Calculating...",
    progress: "Analysis in progress...",
  },
  es: {
    title: "Paso 2 — Asegurar el envío de su valoración",
    intro:
      "Verificamos su email para proteger su solicitud, evitar valoraciones falsas y enviarle un resultado aprovechable.",
    code: "Código recibido por email",
    verify: "Recibir mi enlace seguro",
    verifying: "Verificando...",
    dev: "Modo dev: código OTP =",
    nonEngagement:
      "Su solicitud de valoración no le compromete. Nos permite preparar un primer análisis serio y, si lo desea, una conversación con un asesor Sillage.",
    estimate: "Obtener mi valoración y preparar la continuación con un asesor",
    estimating: "Calculando...",
    progress: "Análisis en curso...",
  },
  ru: {
    title: "Шаг 2 — Защитить отправку вашей оценки",
    intro:
      "Мы подтверждаем ваш email, чтобы защитить заявку, избежать недостоверных оценок и отправить вам пригодный для работы результат.",
    code: "Код, полученный по email",
    verify: "Получить мою защищённую ссылку",
    verifying: "Проверка...",
    dev: "Режим dev: OTP-код =",
    nonEngagement:
      "Заявка на оценку ни к чему вас не обязывает. Она позволяет подготовить первый серьёзный анализ и, при желании, разговор с консультантом Sillage.",
    estimate: "Получить оценку и подготовить следующий шаг с консультантом",
    estimating: "Расчет...",
    progress: "Идет анализ...",
  },
};

const resultFr = {
  title: "Votre estimation est prête",
  range: "Fourchette estimée",
  value: "Valeur estimée (indicative)",
  pending:
    "Estimation en cours de finalisation. Un conseiller vous partage la fourchette précise très rapidement.",
  why: "Pourquoi confier la vente à Sillage Immo ?",
  next: "Votre prochain pas (recommandé)",
  portal: "Accès à votre espace client",
  portalHint: "Ouvrez le lien reçu par email pour activer ou retrouver votre espace client vendeur.",
  portalSending: "Envoi du lien en cours...",
  resend: "Renvoyer mon lien d'accès",
  finalize: "Finaliser et être rappelé par un conseiller",
};

export type SellerEstimationResultCopy = typeof resultFr;

export const SELLER_ESTIMATION_RESULT_COPY: Record<AppLocale, SellerEstimationResultCopy> = {
  fr: resultFr,
  en: {
    title: "Your valuation is ready",
    range: "Estimated range",
    value: "Estimated value (indicative)",
    pending: "Your valuation is being finalized. One of our advisors will share the detailed range very soon.",
    why: "Why entrust your sale to Sillage Immo?",
    next: "Your next step (recommended)",
    portal: "Access to your client portal",
    portalHint: "Open the email link to activate or recover your seller portal.",
    portalSending: "Sending the link...",
    resend: "Resend my access link",
    finalize: "Finalize and receive a callback from an advisor",
  },
  es: {
    title: "Su valoración está lista",
    range: "Rango estimado",
    value: "Valor estimado (orientativo)",
    pending: "Su valoración se está finalizando. Un asesor le compartirá muy pronto la horquilla detallada.",
    why: "¿Por qué confiar la venta a Sillage Immo?",
    next: "Su siguiente paso (recomendado)",
    portal: "Acceso a su espacio cliente",
    portalHint: "Abra el enlace recibido por email para activar o recuperar su espacio cliente vendedor.",
    portalSending: "Enviando el enlace...",
    resend: "Reenviar mi enlace de acceso",
    finalize: "Finalizar y ser llamado por un asesor",
  },
  ru: {
    title: "Ваша оценка готова",
    range: "Оценочный диапазон",
    value: "Оценочная стоимость (ориентировочно)",
    pending: "Оценка находится на финальной стадии. Наш консультант очень скоро сообщит вам точный диапазон.",
    why: "Почему стоит доверить продажу Sillage Immo?",
    next: "Ваш следующий шаг (рекомендуется)",
    portal: "Доступ к клиентскому пространству",
    portalHint: "Откройте ссылку из письма, чтобы активировать или восстановить ваше пространство продавца.",
    portalSending: "Отправляем ссылку...",
    resend: "Отправить ссылку повторно",
    finalize: "Завершить и получить обратный звонок от консультанта",
  },
};
