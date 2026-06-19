"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/app/components/modal";
import { PersonAutocomplete, type PersonSuggestion } from "@/app/components/person-autocomplete";
import type { AppLocale } from "@/lib/i18n/config";
import type { PropertyBusinessType } from "@/types/domain/properties";
import { buyerSignupCopy } from "@/app/recherche/nouvelle/_components/buyer-signup-copy";
import { BuyerSignupCriteriaStep } from "@/app/recherche/nouvelle/_components/buyer-signup-criteria-step";
import { BuyerSignupContactStep } from "@/app/recherche/nouvelle/_components/buyer-signup-contact-step";
import {
  parseBool,
  parseNumber,
  type FormState,
  type UiStatus,
} from "@/app/recherche/nouvelle/_components/buyer-signup-helpers";

type CreateBuyerLeadProps = {
  locale: AppLocale;
  initialBusinessType: PropertyBusinessType;
  saleTypes: string[];
  rentalTypes: string[];
};

const emptyForm = (businessType: PropertyBusinessType): FormState => ({
  businessType,
  city: "",
  propertyType: "",
  minPrice: "",
  maxPrice: "",
  minRooms: "",
  maxRooms: "",
  minSurface: "",
  maxSurface: "",
  minFloor: "",
  maxFloor: "",
  terrace: "",
  elevator: "",
  zonePolygon: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  rgpd: false,
});

type SuccessState = { email: string; emailSent: boolean; coBuyersAttached: number };

type CoBuyer = { email: string; firstName: string; lastName: string; phone: string };

const emptyCoBuyer = (): CoBuyer => ({ email: "", firstName: "", lastName: "", phone: "" });

export function CreateBuyerLead(props: CreateBuyerLeadProps) {
  const router = useRouter();
  const copy = buyerSignupCopy[props.locale];

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<UiStatus>({ kind: "idle" });
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(props.initialBusinessType)
  );
  const [coBuyers, setCoBuyers] = useState<CoBuyer[]>([]);

  const updateCoBuyer = (index: number, patch: Partial<CoBuyer>) => {
    setCoBuyers((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };
  const addCoBuyer = () => setCoBuyers((current) => [...current, emptyCoBuyer()]);
  const removeCoBuyer = (index: number) =>
    setCoBuyers((current) => current.filter((_, i) => i !== index));

  const propertyTypes = useMemo(
    () => (form.businessType === "rental" ? props.rentalTypes : props.saleTypes),
    [form.businessType, props.rentalTypes, props.saleTypes]
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openModal = () => {
    setForm(emptyForm(props.initialBusinessType));
    setCoBuyers([]);
    setStep(1);
    setStatus({ kind: "idle" });
    setSuccess(null);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
  };

  const handleNext = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ kind: "idle" });
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setStatus({ kind: "idle" });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setStatus({ kind: "error", message: copy.validation.nameMissing });
      return;
    }
    const email = form.email.trim();
    if (!email.includes("@")) {
      setStatus({ kind: "error", message: copy.validation.emailInvalid });
      return;
    }
    if (!form.rgpd) {
      setStatus({ kind: "error", message: copy.validation.rgpdMissing });
      return;
    }

    setStatus({ kind: "submitting" });

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email,
      phone: form.phone.trim() || null,
      rgpdConsentCollected: true as const,
      criteria: {
        businessType: form.businessType,
        cities: form.city.trim() ? [form.city.trim()] : [],
        propertyTypes: form.propertyType.trim() ? [form.propertyType.trim()] : [],
        locationText: form.city.trim() || null,
        budgetMin: parseNumber(form.minPrice),
        budgetMax: parseNumber(form.maxPrice),
        roomsMin: parseNumber(form.minRooms),
        roomsMax: parseNumber(form.maxRooms),
        bedroomsMin: null,
        livingAreaMin: parseNumber(form.minSurface),
        livingAreaMax: parseNumber(form.maxSurface),
        floorMin: parseNumber(form.minFloor),
        floorMax: parseNumber(form.maxFloor),
        requiresTerrace: parseBool(form.terrace),
        requiresElevator: parseBool(form.elevator),
        zonePolygon:
          form.zonePolygon && form.zonePolygon.length >= 3 ? form.zonePolygon : null,
      },
      coBuyers: coBuyers
        .filter((co) => co.email.trim().includes("@"))
        .map((co) => ({
          email: co.email.trim(),
          firstName: co.firstName.trim() || null,
          lastName: co.lastName.trim() || null,
          phone: co.phone.trim() || null,
        })),
    };

    try {
      const response = await fetch("/api/admin/buyer-leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        ok: boolean;
        code?: string;
        message?: string;
        data?: { emailSent?: boolean; coBuyersAttached?: number };
      };

      if (!response.ok || !json.ok) {
        setStatus({ kind: "error", message: json.message ?? copy.generic });
        return;
      }

      setStatus({ kind: "idle" });
      setSuccess({
        email,
        emailSent: json.data?.emailSent !== false,
        coBuyersAttached: json.data?.coBuyersAttached ?? 0,
      });
      router.refresh();
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : copy.generic,
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="sillage-btn rounded px-4 py-2 text-sm"
      >
        Créer un acquéreur
      </button>

      {open ? (
        <Modal
          onClose={closeModal}
          size="lg"
          closeOnOverlayClick={false}
          title="Créer un acquéreur"
          description="Définissez la recherche et envoyez l'invitation à l'espace Sillage."
        >
          {success ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
                <p className="font-semibold">Acquéreur créé.</p>
                <p className="mt-1">
                  {success.emailSent
                    ? `Une invitation à activer l'espace Sillage a été envoyée à ${success.email}.`
                    : `L'acquéreur et son espace Sillage ont été créés, mais l'envoi de l'invitation à ${success.email} a échoué. Vous pourrez renvoyer un lien depuis la fiche.`}
                </p>
                {success.coBuyersAttached > 0 && (
                  <p className="mt-1">
                    {success.coBuyersAttached} co-acquéreur(s) rattaché(s) au projet et invité(s).
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="sillage-btn rounded px-5 py-2 text-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <>
              <ol className="mb-6 flex gap-2 text-xs uppercase tracking-[0.14em]">
                {copy.steps.map((label, index) => {
                  const stepNumber = (index + 1) as 1 | 2;
                  const isActive = step === stepNumber;
                  return (
                    <li
                      key={label}
                      className={`flex flex-1 items-center gap-2 rounded-full border px-3 py-1.5 ${
                        isActive
                          ? "border-navy bg-navy text-sand"
                          : "border-[rgba(20,20,70,0.18)] bg-white/60 text-navy"
                      }`}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
                        {stepNumber}
                      </span>
                      <span className="truncate">{label}</span>
                    </li>
                  );
                })}
              </ol>

              {step === 1 ? (
                <BuyerSignupCriteriaStep
                  copy={copy}
                  locale={props.locale}
                  form={form}
                  propertyTypes={propertyTypes}
                  updateField={updateField}
                  onSubmit={handleNext}
                />
              ) : (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-[rgba(20,20,70,0.16)] bg-white/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-navy">
                          Co-acquéreurs (optionnel)
                        </h3>
                        <p className="text-xs text-navy/60">
                          Rattachés au même projet et invités sur leur propre espace Sillage.
                        </p>
                      </div>
                      {coBuyers.length < 5 && (
                        <button
                          type="button"
                          onClick={addCoBuyer}
                          className="rounded border border-navy/20 px-3 py-1.5 text-xs text-navy"
                        >
                          + Ajouter
                        </button>
                      )}
                    </div>

                    {coBuyers.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {coBuyers.map((co, index) => (
                          <div
                            key={index}
                            className="grid gap-2 rounded-xl border border-[rgba(20,20,70,0.12)] p-3 md:grid-cols-2"
                          >
                            <div className="md:col-span-2">
                              <label
                                className="text-xs uppercase text-navy/60"
                                htmlFor={`cobuyer-email-${index}`}
                              >
                                Email
                              </label>
                              <PersonAutocomplete
                                id={`cobuyer-email-${index}`}
                                email={co.email}
                                onEmailChange={(value) => updateCoBuyer(index, { email: value })}
                                onSelect={(person: PersonSuggestion) =>
                                  updateCoBuyer(index, {
                                    email: person.email,
                                    firstName: person.firstName ?? "",
                                    lastName: person.lastName ?? "",
                                    phone: person.phone ?? "",
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label
                                className="text-xs uppercase text-navy/60"
                                htmlFor={`cobuyer-first-${index}`}
                              >
                                Prénom
                              </label>
                              <input
                                id={`cobuyer-first-${index}`}
                                value={co.firstName}
                                onChange={(e) => updateCoBuyer(index, { firstName: e.target.value })}
                                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label
                                className="text-xs uppercase text-navy/60"
                                htmlFor={`cobuyer-last-${index}`}
                              >
                                Nom
                              </label>
                              <input
                                id={`cobuyer-last-${index}`}
                                value={co.lastName}
                                onChange={(e) => updateCoBuyer(index, { lastName: e.target.value })}
                                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="md:col-span-2 flex items-end justify-between gap-2">
                              <div className="flex-1">
                                <label
                                  className="text-xs uppercase text-navy/60"
                                  htmlFor={`cobuyer-phone-${index}`}
                                >
                                  Téléphone
                                </label>
                                <input
                                  id={`cobuyer-phone-${index}`}
                                  value={co.phone}
                                  onChange={(e) => updateCoBuyer(index, { phone: e.target.value })}
                                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeCoBuyer(index)}
                                className="pb-2 text-sm text-red-600 underline"
                              >
                                Retirer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <BuyerSignupContactStep
                    copy={copy}
                    form={form}
                    status={status}
                    updateField={updateField}
                    onSubmit={handleSubmit}
                    onBack={handleBack}
                  />
                </div>
              )}
            </>
          )}
        </Modal>
      ) : null}
    </>
  );
}
