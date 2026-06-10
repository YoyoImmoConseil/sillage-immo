"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/data-layer";
import type { AppLocale } from "@/lib/i18n/config";
import type {
  SellerEstimateAndCreateResponse,
  SellerPortalAccessData,
  SellerSendOtpResponse,
  SellerVerifyOtpResponse,
  SellerUploadedPropertyMedia,
} from "@/types/api/seller";
import { SELLER_FLOW_COPY } from "./_copy/flow-copy";
import { SellerEmailVerificationSection } from "./seller-email-verification-section";
import { SellerEstimationResultSection } from "./seller-estimation-result-section";
import { SellerProjectFormSection } from "./seller-project-form-section";
import {
  performSellerMediaUpload,
  validateSellerMediaSelection,
} from "./seller-flow-media";
import {
  initialForm,
  toOptionalInteger,
  toOptionalNumber,
  type FlowForm,
  type Step,
  type ValuationResult,
} from "./seller-api-first-flow.shared";

export function SellerApiFirstFlow({ locale = "fr" }: { locale?: AppLocale }) {
  const copy = SELLER_FLOW_COPY[locale];
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
    const validation = validateSellerMediaSelection({
      kind,
      files,
      existingMedia: uploadedMedia,
      copy,
    });
    if (!validation.ok) {
      setMediaUploadError(validation.message);
      return;
    }

    setMediaUploadError(null);
    setError(null);
    setIsUploadingMedia(true);
    try {
      const result = await performSellerMediaUpload({
        kind,
        files,
        uploadSessionId: uploadSessionIdRef.current,
        copy,
      });
      if (!result.ok) {
        setMediaUploadError(result.message);
        return;
      }
      setUploadedMedia((prev) => [...prev, ...result.files]);
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
