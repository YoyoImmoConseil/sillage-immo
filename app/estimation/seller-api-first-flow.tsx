"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  SellerEstimateAndCreateResponse,
  SellerPortalAccessData,
  SellerSendOtpResponse,
  SellerVerifyOtpResponse,
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

export function SellerApiFirstFlow() {
  const idempotencyKeysRef = useRef<Record<string, string>>({});
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FlowForm>(initialForm);
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

  const sendOtp = async () => {
    const normalizedEmail = form.email.trim().toLowerCase();
    setError(null);
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
        setError(getApiErrorMessage(data) ?? "Impossible d'envoyer le code email.");
        return;
      }
      setPreviewCode(data.data.previewCode ?? null);
      setStep("verify");
    } catch {
      setError("Erreur reseau pendant l'envoi du code.");
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
        setError(getApiErrorMessage(data) ?? "Code invalide.");
        return;
      }
      setVerificationToken(data.data.verificationToken);
    } catch {
      setError("Erreur reseau pendant la verification du code.");
    } finally {
      setLoading(false);
    }
  };

  const sendPortalMagicLink = async (access: SellerPortalAccessData) => {
    setPortalAccessStatus("sending");
    setPortalAccessMessage("Nous envoyons votre lien d'acces a l'espace client.");
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectUrl = new URL("/espace-client/auth/confirm", window.location.origin);
      redirectUrl.searchParams.set("next", access.nextPath);
      if (access.inviteToken) {
        redirectUrl.searchParams.set("inviteToken", access.inviteToken);
      }

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: access.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl.toString(),
        },
      });

      if (signInError) {
        setPortalAccessStatus("error");
        setPortalAccessMessage(
          "Votre estimation est prete, mais nous n'avons pas pu envoyer automatiquement le lien d'acces."
        );
        return;
      }

      setPortalAccessStatus("sent");
      setPortalAccessMessage(
        `Un lien d'acces a votre espace client vient d'etre envoye a ${access.email}.`
      );
    } catch {
      setPortalAccessStatus("error");
      setPortalAccessMessage(
        "Votre estimation est prete, mais l'envoi automatique du lien d'acces a echoue."
      );
    }
  };

  const estimateAndCreate = async () => {
    if (!verificationToken) {
      setError("Email non verifie. Merci de valider le code.");
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
        setError(getApiErrorMessage(data) ?? "Impossible de calculer votre estimation.");
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
      setError("Erreur reseau pendant le calcul d'estimation.");
    } finally {
      setLoading(false);
      setIsEstimating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#141446] p-6 text-[#f4ece4] space-y-4">
        <h1 className="text-2xl font-semibold">Estimation vendeur Sillage Immo</h1>
        <p className="text-sm opacity-75">
          Un parcours clair, guide et securise: vous renseignez votre bien une fois, nous
          verifions votre email, puis nous produisons votre estimation pour cadrer la suite.
        </p>
      </section>

      <SellerProjectFormSection
        form={form}
        loading={loading}
        onUpdate={update}
        onSendOtp={() => void sendOtp()}
      />

      {step !== "form" ? (
        <SellerEmailVerificationSection
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
