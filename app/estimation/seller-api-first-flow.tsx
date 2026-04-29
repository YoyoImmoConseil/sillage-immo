"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/data-layer";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { AppLocale } from "@/lib/i18n/config";
import type {
  SellerEstimateAndCreateResponse,
  SellerPropertyMediaSignedUploadResponse,
  SellerPropertyMediaUploadResponse,
  SellerPortalAccessData,
  SellerSendOtpResponse,
  SellerVerifyOtpResponse,
  SellerUploadedPropertyMedia,
} from "@/types/api/seller";
import {
  SellerEmailVerificationSection,
  SellerEstimationResultSection,
  SellerProjectFormSection,
} from "./seller-api-first-flow-sections";
import {
  initialForm,
  toOptionalInteger,
  toOptionalNumber,
  type FlowForm,
  type Step,
  type ValuationResult,
} from "./seller-api-first-flow.shared";

/**
 * Mirror of the server-side per-file caps in
 * `services/properties/estimation-property-media.service.ts`. We duplicate
 * them client-side because that file is `server-only`. Keep them in sync.
 */
const CLIENT_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const CLIENT_MAX_VIDEO_BYTES = 200 * 1024 * 1024;

type MediaErrorCopy = {
  mediaUploadNetworkError: string;
  mediaTooLargeImage: (fileName: string, sizeMb: number) => string;
  mediaTooLargeVideo: (fileName: string, sizeMb: number) => string;
  mediaUnsupportedFormat: (fileName: string) => string;
  mediaUploadExpired: string;
  mediaServerUnavailable: string;
};

const SUPABASE_SIZE_PATTERNS = [
  "exceeded the maximum allowed size",
  "payload too large",
  "request entity too large",
];

const SUPABASE_MIME_PATTERNS = ["mime type", "invalid_mime_type"];

/**
 * Translate a failed Supabase Storage signed-URL PUT into a human,
 * locale-aware error message. Supabase returns verbatim English strings
 * like "The object exceeded the maximum allowed size" with a JSON body;
 * surfacing them to the user is confusing and untraceable. Here we map a
 * few well-known patterns + HTTP statuses to rich i18n copy and return a
 * stable `errorCode` for analytics.
 */
const interpretSupabasePutFailure = async (
  response: Response,
  file: File,
  kind: "image" | "video",
  copy: MediaErrorCopy
): Promise<{ message: string; errorCode: string }> => {
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }
  const lower = bodyText.toLowerCase();
  const status = response.status;
  const sizeMb = file.size / (1024 * 1024);

  if (
    status === 413 ||
    SUPABASE_SIZE_PATTERNS.some((pattern) => lower.includes(pattern))
  ) {
    return {
      message:
        kind === "image"
          ? copy.mediaTooLargeImage(file.name, sizeMb)
          : copy.mediaTooLargeVideo(file.name, sizeMb),
      errorCode: "size_exceeded_supabase",
    };
  }

  if (
    status === 415 ||
    SUPABASE_MIME_PATTERNS.some((pattern) => lower.includes(pattern))
  ) {
    return {
      message: copy.mediaUnsupportedFormat(file.name),
      errorCode: "unsupported_mime",
    };
  }

  if (status === 401 || status === 403) {
    return {
      message: copy.mediaUploadExpired,
      errorCode: "signed_url_expired",
    };
  }

  if (status >= 500 && status < 600) {
    return {
      message: copy.mediaServerUnavailable,
      errorCode: "supabase_server_error",
    };
  }

  return {
    message: copy.mediaUploadNetworkError,
    errorCode: `http_${status}`,
  };
};

export function SellerApiFirstFlow({ locale = "fr" }: { locale?: AppLocale }) {
  const copy = {
    fr: {
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
    },
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
  }[locale];
  const idempotencyKeysRef = useRef<Record<string, string>>({});
  const uploadSessionIdRef = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FlowForm>(initialForm);
  const [uploadedMedia, setUploadedMedia] = useState<SellerUploadedPropertyMedia[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [thankYouAccessToken, setThankYouAccessToken] = useState<string | null>(null);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [portalAccess, setPortalAccess] = useState<SellerPortalAccessData | null>(null);
  const [portalAccessStatus, setPortalAccessStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [portalAccessMessage, setPortalAccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateProgress, setEstimateProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEstimating) return;

    setEstimateProgress(8);
    const timer = window.setInterval(() => {
      setEstimateProgress((prev) => {
        const next = prev + 4;
        return next >= 92 ? 92 : next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isEstimating]);

  useEffect(() => {
    track("seller_estimation_started", { locale });
  }, [locale]);

  const update = <K extends keyof FlowForm>(key: K, value: FlowForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getApiErrorMessage = (response: { ok: boolean } & Partial<{ message: string }>) => {
    return response.message ?? null;
  };

  const getStableIdempotencyKey = (scope: string, seed: string) => {
    const normalizedSeed = seed.trim().toLowerCase();
    const cacheKey = `${scope}:${normalizedSeed}`;
    if (!idempotencyKeysRef.current[cacheKey]) {
      const generated =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      idempotencyKeysRef.current[cacheKey] = `${scope}:${generated}`;
    }
    return idempotencyKeysRef.current[cacheKey];
  };

  const uploadMedia = async (kind: "image" | "video", files: File[]) => {
    const currentCount = uploadedMedia.filter((item) => item.kind === kind).length;
    const maxCount = kind === "image" ? 20 : 5;
    if (currentCount + files.length > maxCount) {
      const message = kind === "image" ? copy.tooManyPhotos : copy.tooManyVideos;
      setMediaUploadError(message);
      track("seller_media_upload_failed", {
        kind,
        error_code: "too_many_files",
        error_step: "client_count",
        files_total: currentCount + files.length,
      });
      return;
    }

    const maxBytesPerFile =
      kind === "image" ? CLIENT_MAX_IMAGE_BYTES : CLIENT_MAX_VIDEO_BYTES;
    const oversized = files.find((file) => file.size > maxBytesPerFile);
    if (oversized) {
      const sizeMb = oversized.size / (1024 * 1024);
      const message =
        kind === "image"
          ? copy.mediaTooLargeImage(oversized.name, sizeMb)
          : copy.mediaTooLargeVideo(oversized.name, sizeMb);
      setMediaUploadError(message);
      track("seller_media_upload_failed", {
        kind,
        error_code: "size_exceeded_client",
        error_step: "client_size",
        file_name: oversized.name.slice(0, 120),
        size_mb: Math.round(sizeMb * 10) / 10,
      });
      return;
    }

    setMediaUploadError(null);
    setError(null);
    setIsUploadingMedia(true);
    try {
      // 1) Demander des URLs d'upload signees a notre API.
      const urlResponse = await fetch("/api/seller/property-media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          uploadSessionId: uploadSessionIdRef.current,
          items: files.map((file) => ({
            fileName: file.name,
            sizeBytes: file.size,
            contentType: file.type,
          })),
        }),
      });
      const urlParsed = await parseApiResponse<SellerPropertyMediaSignedUploadResponse>(
        urlResponse
      );
      const urlData = urlParsed.data;
      if (!urlParsed.ok || !urlData || !("ok" in urlData) || urlData.ok !== true) {
        const fallback =
          urlData && "message" in urlData && typeof urlData.message === "string"
            ? urlData.message
            : null;
        setMediaUploadError(urlParsed.message ?? fallback ?? copy.mediaUploadNetworkError);
        track("seller_media_upload_failed", {
          kind,
          error_code: "signed_url_failed",
          error_step: "api_upload_url",
          http_status: urlParsed.status,
          error_message: (urlParsed.message ?? fallback ?? "").slice(0, 200),
        });
        return;
      }
      const descriptors = urlData.data.files;
      if (descriptors.length !== files.length) {
        setMediaUploadError(copy.mediaUploadNetworkError);
        track("seller_media_upload_failed", {
          kind,
          error_code: "descriptor_count_mismatch",
          error_step: "api_upload_url",
          expected: files.length,
          received: descriptors.length,
        });
        return;
      }

      // 2) Upload direct vers Supabase Storage (en parallele) pour bypasser
      // la limite Vercel de 4.5 Mo sur les serverless functions. Critique
      // pour les videos qui depassent systematiquement cette limite.
      const putResults = await Promise.all(
        descriptors.map(async (descriptor, index) => {
          const file = files[index];
          const response = await fetch(descriptor.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          return { response, file };
        })
      );
      const failedPut = putResults.find((entry) => !entry.response.ok);
      if (failedPut) {
        const interpreted = await interpretSupabasePutFailure(
          failedPut.response,
          failedPut.file,
          kind,
          copy
        );
        setMediaUploadError(interpreted.message);
        track("seller_media_upload_failed", {
          kind,
          error_code: interpreted.errorCode,
          error_step: "supabase_put",
          http_status: failedPut.response.status,
          file_name: failedPut.file.name.slice(0, 120),
          size_mb: Math.round((failedPut.file.size / (1024 * 1024)) * 10) / 10,
        });
        return;
      }

      // 3) Confirmer cote API : creation des metadonnees + signed preview.
      const registerResponse = await fetch("/api/seller/property-media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          uploadSessionId: uploadSessionIdRef.current,
          items: descriptors.map((descriptor, index) => ({
            uploadId: descriptor.uploadId,
            fileName: descriptor.fileName,
            contentType: descriptor.contentType,
            sizeBytes: files[index].size,
            storagePath: descriptor.storagePath,
          })),
        }),
      });
      const registerParsed =
        await parseApiResponse<SellerPropertyMediaUploadResponse>(registerResponse);
      const registerData = registerParsed.data;
      if (
        !registerParsed.ok ||
        !registerData ||
        !("ok" in registerData) ||
        registerData.ok !== true
      ) {
        const fallback =
          registerData && "message" in registerData && typeof registerData.message === "string"
            ? registerData.message
            : null;
        const message =
          registerParsed.message ?? fallback ?? copy.mediaUploadNetworkError;
        setMediaUploadError(message);
        track("seller_media_upload_failed", {
          kind,
          error_code: "register_failed",
          error_step: "api_register",
          http_status: registerParsed.status,
          error_message: message.slice(0, 200),
        });
        return;
      }
      setUploadedMedia((prev) => [...prev, ...registerData.data.files]);
      const totalSizeBytes = registerData.data.files.reduce(
        (sum, file) => sum + (typeof file.sizeBytes === "number" ? file.sizeBytes : 0),
        0
      );
      track("seller_media_uploaded", {
        kind,
        count: registerData.data.files.length,
        total_size_mb: Math.round(totalSizeBytes / (1024 * 1024)),
      });
    } catch (caught) {
      setMediaUploadError(copy.mediaUploadNetworkError);
      track("seller_media_upload_failed", {
        kind,
        error_code: "network_exception",
        error_step: "client_catch",
        error_message:
          caught instanceof Error ? caught.message.slice(0, 200) : "unknown",
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const removeUploadedMedia = (uploadId: string) => {
    setUploadedMedia((prev) => prev.filter((item) => item.uploadId !== uploadId));
  };

  const sendOtp = async () => {
    const normalizedEmail = form.email.trim().toLowerCase();
    setError(null);
    setMediaUploadError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/seller/email/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": getStableIdempotencyKey("seller.email.send_otp", normalizedEmail),
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = (await response.json()) as SellerSendOtpResponse;

      if (!response.ok || !data.ok) {
        setError(getApiErrorMessage(data) ?? copy.sendOtpError);
        return;
      }
      setPreviewCode(data.data.previewCode ?? null);
      setStep("verify");
      track("seller_otp_sent", { locale });
    } catch {
      setError(copy.sendOtpNetworkError);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedOtp = otp.trim();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/seller/email/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": getStableIdempotencyKey(
            "seller.email.verify_otp",
            `${normalizedEmail}|${normalizedOtp}`
          ),
        },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedOtp }),
      });
      const data = (await response.json()) as SellerVerifyOtpResponse;
      if (!response.ok || !data.ok || !data.data?.verificationToken) {
        setError(getApiErrorMessage(data) ?? copy.invalidCode);
        return;
      }
      setVerificationToken(data.data.verificationToken);
      track("seller_otp_verified", { locale });
    } catch {
      setError(copy.verifyCodeNetworkError);
    } finally {
      setLoading(false);
    }
  };

  const sendPortalMagicLink = async (access: SellerPortalAccessData) => {
    setPortalAccessStatus("sending");
    setPortalAccessMessage(copy.sendingPortalLink);
    try {
      const response = await fetch("/api/espace-client/send-magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: access.email,
          nextPath: access.nextPath,
          inviteToken: access.inviteToken,
        }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        setPortalAccessStatus("error");
        setPortalAccessMessage(
          data.message ?? copy.portalSendFailed
        );
        return;
      }

      setPortalAccessStatus("sent");
      setPortalAccessMessage(copy.portalSentSuccess(access.email));
      track("seller_portal_link_sent", { mode: access.mode, locale });
    } catch {
      setPortalAccessStatus("error");
      setPortalAccessMessage(copy.portalSendNetworkError);
    }
  };

  const estimateAndCreate = async () => {
    if (!verificationToken) {
      setError(copy.emailNotVerified);
      return;
    }

    setError(null);
    setLoading(true);
    setIsEstimating(true);
    setPortalAccess(null);
    setPortalAccessStatus("idle");
    setPortalAccessMessage(null);
    try {
      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim();
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
      const payload = {
        ...form,
        firstName,
        lastName,
        fullName,
        livingArea: toOptionalNumber(form.livingArea),
        rooms: toOptionalNumber(form.rooms),
        buildingTotalFloors: toOptionalInteger(form.buildingTotalFloors),
        terrace: form.terrace === "yes",
        terraceArea: form.terrace === "yes" ? toOptionalNumber(form.terraceArea) : undefined,
        balcony: form.balcony === "yes",
        balconyArea: form.balcony === "yes" ? toOptionalNumber(form.balconyArea) : undefined,
        livingExposure: form.livingExposure || undefined,
        elevator: form.elevator === "yes",
        apartmentCondition: form.apartmentCondition || undefined,
        buildingAge: form.buildingAge || undefined,
        seaView: form.seaView || undefined,
        diagnosticsReady: form.diagnosticsReady === "yes",
        diagnosticsSupportNeeded:
          form.diagnosticsReady === "no" ? form.diagnosticsSupportNeeded === "yes" : undefined,
        syndicDocsReady: form.syndicDocsReady === "yes",
        syndicSupportNeeded:
          form.syndicDocsReady === "no" ? form.syndicSupportNeeded === "yes" : undefined,
        uploadedMedia: uploadedMedia.map((item) => ({
          uploadId: item.uploadId,
          kind: item.kind,
          fileName: item.fileName,
          contentType: item.contentType,
          sizeBytes: item.sizeBytes,
          storageBucket: item.storageBucket,
          storagePath: item.storagePath,
          previewUrl: item.previewUrl,
        })),
        verificationToken,
      };
      const payloadSeed = JSON.stringify(payload);

      const response = await fetch("/api/seller/estimate-and-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": getStableIdempotencyKey("seller.estimate_and_create", payloadSeed),
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as SellerEstimateAndCreateResponse;

      if (
        !response.ok ||
        !data.ok ||
        !data.data?.thankYouAccessToken ||
        !data.data.valuation
      ) {
        setError(getApiErrorMessage(data) ?? copy.estimateError);
        return;
      }

      setThankYouAccessToken(data.data.thankYouAccessToken);
      setValuation(data.data.valuation as ValuationResult);
      setPortalAccess(data.data.portalAccess ?? null);
      setEstimateProgress(100);
      setStep("result");
      const valuation = data.data.valuation;
      track("seller_estimation_computed", {
        valuation_low: valuation.valuationPriceLow ?? undefined,
        valuation_high: valuation.valuationPriceHigh ?? undefined,
        valuation_mid: valuation.valuationPrice ?? undefined,
        city: valuation.cityName ?? undefined,
        zip: valuation.cityZipCode ?? undefined,
        rooms: valuation.rooms ?? undefined,
        living_area_m2: valuation.livingSpaceArea ?? undefined,
        media_count: uploadedMedia.length,
      });
      track("seller_lead_created", {
        create_status: data.data.createStatus,
        has_portal_access: Boolean(data.data.portalAccess),
        locale,
      });
      if (data.data.portalAccess) {
        void sendPortalMagicLink(data.data.portalAccess);
      }
    } catch {
      setError(copy.estimateNetworkError);
    } finally {
      setLoading(false);
      setIsEstimating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#141446] p-6 text-[#f4ece4] space-y-4">
        <h2 className="text-2xl font-semibold">{copy.title}</h2>
        <p className="text-sm opacity-80">{copy.intro}</p>
      </section>

      <SellerProjectFormSection
        locale={locale}
        form={form}
        loading={loading}
        media={uploadedMedia}
        mediaUploading={isUploadingMedia}
        mediaUploadError={mediaUploadError}
        onUpdate={update}
        onUploadMedia={(kind, files) => void uploadMedia(kind, files)}
        onRemoveMedia={removeUploadedMedia}
        onSendOtp={() => void sendOtp()}
      />

      {step === "verify" ? (
        <SellerEmailVerificationSection
          locale={locale}
          otp={otp}
          loading={loading}
          previewCode={previewCode}
          verificationToken={verificationToken}
          isEstimating={isEstimating}
          estimateProgress={estimateProgress}
          onOtpChange={setOtp}
          onVerifyOtp={() => void verifyOtp()}
          onEstimateAndCreate={() => void estimateAndCreate()}
        />
      ) : null}

      {step === "result" && valuation && thankYouAccessToken ? (
        <SellerEstimationResultSection
          locale={locale}
          valuation={valuation}
          form={form}
          thankYouAccessToken={thankYouAccessToken}
          portalAccessEmail={portalAccess?.email ?? null}
          portalAccessStatus={portalAccessStatus}
          portalAccessMessage={portalAccessMessage}
          onResendPortalAccess={
            portalAccess ? () => void sendPortalMagicLink(portalAccess) : undefined
          }
        />
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
