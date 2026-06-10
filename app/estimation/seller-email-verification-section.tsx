"use client";

import type { AppLocale } from "@/lib/i18n/config";
import { SELLER_EMAIL_VERIFICATION_COPY } from "./_copy/flow-copy";

type SellerEmailVerificationSectionProps = {
  locale?: AppLocale;
  otp: string;
  loading: boolean;
  previewCode: string | null;
  verificationToken: string | null;
  isEstimating: boolean;
  estimateProgress: number;
  onOtpChange: (value: string) => void;
  onVerifyOtp: () => void;
  onEstimateAndCreate: () => void;
};

export function SellerEmailVerificationSection({
  locale = "fr",
  otp,
  loading,
  previewCode,
  verificationToken,
  isEstimating,
  estimateProgress,
  onOtpChange,
  onVerifyOtp,
  onEstimateAndCreate,
}: SellerEmailVerificationSectionProps) {
  const copy = SELLER_EMAIL_VERIFICATION_COPY[locale];
  return (
    <section className="rounded-2xl bg-[#141446] p-6 text-[#f4ece4] space-y-4">
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="text-sm text-[#f4ece4]/80">{copy.intro}</p>
      <div className="flex gap-3 items-end flex-wrap">
        <label className="text-sm">
          {copy.code}
          <input
            className="mt-1 rounded border px-3 py-2"
            value={otp}
            onChange={(event) => onOtpChange(event.target.value)}
          />
        </label>
        <button
          className="rounded bg-[#f4ece4] px-4 py-2 text-sm text-[#141446] disabled:opacity-60"
          type="button"
          disabled={loading || otp.trim().length < 4}
          onClick={onVerifyOtp}
        >
          {loading ? copy.verifying : copy.verify}
        </button>
      </div>
      {previewCode ? (
        <p className="text-xs text-amber-700">
          {copy.dev} <code>{previewCode}</code>
        </p>
      ) : null}
      {verificationToken ? (
        <div className="space-y-3">
          <p className="rounded-[16px] border-l-4 border-[#f4ece4] bg-[#f4ece4]/10 px-4 py-3 text-sm italic text-[#f4ece4]/90 leading-relaxed">
            {copy.nonEngagement}
          </p>
          <button
            className="rounded bg-[#f4ece4] px-4 py-2 text-sm text-[#141446] disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={onEstimateAndCreate}
          >
            {loading ? copy.estimating : copy.estimate}
          </button>
          {isEstimating ? (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded bg-[rgba(244,236,228,0.4)]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${estimateProgress}%`,
                    backgroundColor: "var(--sillage-blue)",
                  }}
                />
              </div>
              <p className="text-xs opacity-70">{copy.progress} {estimateProgress}%</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
