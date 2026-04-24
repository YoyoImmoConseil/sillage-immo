"use client";

import { useEffect, useRef, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import type {
  SellerEstimateAndCreateResponse,
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
      setMediaUploadError(kind === "image" ? copy.tooManyPhotos : copy.tooManyVideos);
      return;
    }

    setMediaUploadError(null);
    setError(null);
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("uploadSessionId", uploadSessionIdRef.current);
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/seller/property-media/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as SellerPropertyMediaUploadResponse;
      if (!response.ok || !data.ok) {
        setMediaUploadError(getApiErrorMessage(data) ?? copy.mediaUploadNetworkError);
        return;
      }

      setUploadedMedia((prev) => [...prev, ...data.data.files]);
    } catch {
      setMediaUploadError(copy.mediaUploadNetworkError);
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
