"use client";

import type { BuyerSignupCopy } from "./buyer-signup-copy";
import type { FormState, UiStatus } from "./buyer-signup-helpers";

// CRO : hauteur tactile >= 48px et corps >= 16px sur mobile ; desktop inchangé.
const FIELD_CLASS =
  "mt-1 w-full rounded border bg-white/80 px-3 py-2 text-base md:text-sm max-md:min-h-[48px]";

type BuyerSignupContactStepProps = {
  copy: BuyerSignupCopy;
  form: FormState;
  status: UiStatus;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

export function BuyerSignupContactStep({
  copy,
  form,
  status,
  updateField,
  onSubmit,
  onBack,
}: BuyerSignupContactStepProps) {
  return (
    <form id="buyer-contact-form" className="space-y-6" onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold">{copy.sections.contact}</h2>
      <p className="text-sm leading-relaxed text-navy/80">
        {copy.sections.contactIntro}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          {copy.fields.firstName}
          <input
            className={FIELD_CLASS}
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            autoComplete="given-name"
            required
          />
        </label>
        <label className="text-sm">
          {copy.fields.lastName}
          <input
            className={FIELD_CLASS}
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            autoComplete="family-name"
            required
          />
        </label>
        <label className="text-sm md:col-span-2">
          {copy.fields.email}
          <input
            type="email"
            inputMode="email"
            className={FIELD_CLASS}
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            autoComplete="email"
            required
          />
          {/* Réassurance CRO : rappelle le lien magique sans mot de passe. */}
          <span className="mt-1 block text-xs italic text-navy/70">
            {copy.fields.magicLinkReassurance}
          </span>
        </label>
        <label className="text-sm md:col-span-2">
          {copy.fields.phone}
          <input
            type="tel"
            inputMode="tel"
            className={FIELD_CLASS}
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            autoComplete="tel"
          />
          <span className="mt-1 block text-xs opacity-70">{copy.fields.phoneHint}</span>
        </label>
      </div>

      <p className="rounded-[16px] border-l-4 border-navy bg-white/70 px-4 py-3 text-sm italic text-navy/85 leading-relaxed">
        {copy.sections.contactControl}
      </p>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.rgpd}
          onChange={(event) => updateField("rgpd", event.target.checked)}
        />
        <span>{copy.fields.rgpd}</span>
      </label>

      {status.kind === "error" ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {status.message}
        </p>
      ) : null}

      {/* Boutons desktop inchangés ; sur mobile, action déportée dans la barre collante. */}
      <div className="flex flex-wrap justify-between gap-3 max-md:hidden">
        <button
          type="button"
          className="sillage-btn-secondary rounded px-5 py-2 text-sm"
          onClick={onBack}
          disabled={status.kind === "submitting"}
        >
          {copy.buttons.back}
        </button>
        <button
          type="submit"
          className="sillage-btn rounded px-5 py-2 text-sm"
          disabled={status.kind === "submitting"}
        >
          {status.kind === "submitting" ? "…" : copy.buttons.submit}
        </button>
      </div>
    </form>
  );
}
