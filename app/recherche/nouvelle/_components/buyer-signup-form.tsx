"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import type { PropertyBusinessType } from "@/types/domain/properties";
import type { ZonePolygon } from "@/app/components/buyer-search-zone-map";

const BuyerSearchZoneMap = dynamic(
  () =>
    import("@/app/components/buyer-search-zone-map").then(
      (mod) => mod.BuyerSearchZoneMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] w-full animate-pulse rounded-xl border border-[rgba(20,20,70,0.18)] bg-[#e9e1d8]" />
    ),
  }
);

type InitialFilters = {
  city: string;
  type: string;
  minPrice: string;
  maxPrice: string;
  minRooms: string;
  maxRooms: string;
  minSurface: string;
  maxSurface: string;
  minFloor: string;
  maxFloor: string;
  terrace: string;
  elevator: string;
};

type BuyerSignupFormProps = {
  locale: AppLocale;
  initialBusinessType: PropertyBusinessType;
  saleTypes: string[];
  rentalTypes: string[];
  initialFilters: InitialFilters;
};

type FormState = {
  businessType: PropertyBusinessType;
  city: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  minRooms: string;
  maxRooms: string;
  minSurface: string;
  maxSurface: string;
  minFloor: string;
  maxFloor: string;
  terrace: "" | "true" | "false";
  elevator: "" | "true" | "false";
  zonePolygon: ZonePolygon | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rgpd: boolean;
};

type UiStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; email: string }
  | { kind: "success_email_failed"; email: string }
  | { kind: "error"; message: string };

const parseNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBool = (value: string): boolean | null => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const normalizeTerrace = (value: string): "" | "true" | "false" =>
  value === "true" || value === "false" ? value : "";

export function BuyerSignupForm(props: BuyerSignupFormProps) {
  const copy = {
    fr: {
      steps: ["Critères", "Contact"],
      sections: {
        criteria: "Vos critères de recherche",
        zone: "Votre zone de recherche",
        zoneHint:
          "Dessinez précisément le périmètre qui vous intéresse. Cette zone sera transmise à notre logiciel immobilier pour cibler les biens pertinents.",
        contact: "Vos coordonnées",
      },
      fields: {
        businessType: "Type de transaction",
        sale: "Achat",
        rental: "Location",
        city: "Ville ou secteur",
        cityPlaceholder: "Nice, Cannes, Antibes…",
        propertyType: "Type de bien",
        allTypes: "Tous les types",
        minBudget: "Budget min (€)",
        maxBudget: "Budget max (€)",
        minRooms: "Pièces min",
        maxRooms: "Pièces max",
        minSurface: "Surface min (m²)",
        maxSurface: "Surface max (m²)",
        minFloor: "Étage min",
        maxFloor: "Étage max",
        terrace: "Terrasse",
        elevator: "Ascenseur",
        indifferent: "Indifférent",
        yes: "Oui",
        no: "Non",
        firstName: "Prénom",
        lastName: "Nom",
        email: "Email",
        phone: "Téléphone",
        phoneHint: "Facultatif mais recommandé pour être rappelé.",
        rgpd:
          "J'accepte que Sillage Immo conserve ces informations pour traiter ma recherche et m'envoyer des alertes. Je peux me désabonner à tout moment.",
      },
      buttons: {
        next: "Continuer",
        back: "Retour",
        submit: "Sauvegarder ma recherche",
      },
      validation: {
        emailInvalid: "Merci de renseigner un email valide.",
        nameMissing: "Nom et prénom sont obligatoires.",
        rgpdMissing: "Merci de valider la case RGPD pour continuer.",
      },
      success: {
        title: "Votre recherche est enregistrée !",
        body: (email: string) =>
          `Nous venons d'envoyer un lien de confirmation à ${email}. Cliquez dessus pour activer votre espace Sillage et lancer les alertes.`,
        goHome: "Retour à l'accueil",
        goLogin: "J'ai déjà un compte",
      },
      emailFail: {
        title: "Recherche enregistrée, email à renvoyer",
        body:
          "Votre recherche est bien enregistrée, mais l'envoi du lien de confirmation a échoué. Allez sur la page de connexion et cliquez sur « Recevoir un nouveau lien » avec votre adresse email.",
        goLogin: "Recevoir un nouveau lien",
      },
      generic: "Une erreur est survenue. Merci de réessayer dans un instant.",
    },
    en: {
      steps: ["Criteria", "Contact"],
      sections: {
        criteria: "Your search criteria",
        zone: "Your search area",
        zoneHint:
          "Draw the exact area you're interested in. This zone will be pushed to our CRM to target relevant listings.",
        contact: "Your contact details",
      },
      fields: {
        businessType: "Transaction type",
        sale: "Buy",
        rental: "Rent",
        city: "City or area",
        cityPlaceholder: "Nice, Cannes, Antibes…",
        propertyType: "Property type",
        allTypes: "All types",
        minBudget: "Min budget (€)",
        maxBudget: "Max budget (€)",
        minRooms: "Min rooms",
        maxRooms: "Max rooms",
        minSurface: "Min surface (sqm)",
        maxSurface: "Max surface (sqm)",
        minFloor: "Min floor",
        maxFloor: "Max floor",
        terrace: "Terrace",
        elevator: "Elevator",
        indifferent: "Any",
        yes: "Yes",
        no: "No",
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        phone: "Phone",
        phoneHint: "Optional but recommended if you'd like a callback.",
        rgpd:
          "I agree that Sillage Immo can keep this information to process my search and send me alerts. I can unsubscribe at any time.",
      },
      buttons: {
        next: "Continue",
        back: "Back",
        submit: "Save my search",
      },
      validation: {
        emailInvalid: "Please provide a valid email.",
        nameMissing: "First and last name are required.",
        rgpdMissing: "Please accept the GDPR notice to continue.",
      },
      success: {
        title: "Your search is saved!",
        body: (email: string) =>
          `We just sent a confirmation link to ${email}. Click it to activate your Sillage account and start receiving alerts.`,
        goHome: "Back to homepage",
        goLogin: "I already have an account",
      },
      emailFail: {
        title: "Search saved, email needs resending",
        body:
          "Your search is saved but the confirmation email could not be delivered. Open the login page and request a new link with your email.",
        goLogin: "Send a new link",
      },
      generic: "Something went wrong. Please try again shortly.",
    },
    es: {
      steps: ["Criterios", "Contacto"],
      sections: {
        criteria: "Sus criterios de búsqueda",
        zone: "Su zona de búsqueda",
        zoneHint:
          "Dibuje el perímetro exacto que le interesa. Esta zona se transmitirá a nuestro CRM para dirigir las propiedades relevantes.",
        contact: "Sus datos de contacto",
      },
      fields: {
        businessType: "Tipo de operación",
        sale: "Compra",
        rental: "Alquiler",
        city: "Ciudad o zona",
        cityPlaceholder: "Niza, Cannes, Antibes…",
        propertyType: "Tipo de inmueble",
        allTypes: "Todos los tipos",
        minBudget: "Presupuesto mín. (€)",
        maxBudget: "Presupuesto máx. (€)",
        minRooms: "Mín. habitaciones",
        maxRooms: "Máx. habitaciones",
        minSurface: "Superficie mín. (m²)",
        maxSurface: "Superficie máx. (m²)",
        minFloor: "Planta mín.",
        maxFloor: "Planta máx.",
        terrace: "Terraza",
        elevator: "Ascensor",
        indifferent: "Indiferente",
        yes: "Sí",
        no: "No",
        firstName: "Nombre",
        lastName: "Apellido",
        email: "Email",
        phone: "Teléfono",
        phoneHint: "Opcional pero recomendado para ser contactado.",
        rgpd:
          "Acepto que Sillage Immo conserve estos datos para procesar mi búsqueda y enviarme alertas. Puedo darme de baja en cualquier momento.",
      },
      buttons: {
        next: "Continuar",
        back: "Atrás",
        submit: "Guardar mi búsqueda",
      },
      validation: {
        emailInvalid: "Por favor indique un email válido.",
        nameMissing: "Nombre y apellido son obligatorios.",
        rgpdMissing: "Por favor acepte el aviso RGPD para continuar.",
      },
      success: {
        title: "¡Su búsqueda está guardada!",
        body: (email: string) =>
          `Acabamos de enviar un enlace de confirmación a ${email}. Haga clic para activar su espacio Sillage e iniciar las alertas.`,
        goHome: "Volver a inicio",
        goLogin: "Ya tengo cuenta",
      },
      emailFail: {
        title: "Búsqueda guardada, email por reenviar",
        body:
          "Su búsqueda está guardada pero no se pudo enviar el email de confirmación. Abra la página de acceso y solicite un nuevo enlace con su email.",
        goLogin: "Enviar nuevo enlace",
      },
      generic: "Algo salió mal. Por favor inténtelo de nuevo en un momento.",
    },
    ru: {
      steps: ["Критерии", "Контакты"],
      sections: {
        criteria: "Критерии поиска",
        zone: "Ваша зона поиска",
        zoneHint:
          "Нарисуйте точный периметр, который вас интересует. Зона будет передана в CRM для подбора релевантных объектов.",
        contact: "Контактные данные",
      },
      fields: {
        businessType: "Тип сделки",
        sale: "Покупка",
        rental: "Аренда",
        city: "Город или район",
        cityPlaceholder: "Ницца, Канны, Антиб…",
        propertyType: "Тип объекта",
        allTypes: "Любой тип",
        minBudget: "Бюджет от (€)",
        maxBudget: "Бюджет до (€)",
        minRooms: "Мин. комнат",
        maxRooms: "Макс. комнат",
        minSurface: "Площадь от (м²)",
        maxSurface: "Площадь до (м²)",
        minFloor: "Этаж от",
        maxFloor: "Этаж до",
        terrace: "Терраса",
        elevator: "Лифт",
        indifferent: "Неважно",
        yes: "Да",
        no: "Нет",
        firstName: "Имя",
        lastName: "Фамилия",
        email: "Email",
        phone: "Телефон",
        phoneHint: "Необязательно, но поможет связаться с вами.",
        rgpd:
          "Я согласен, чтобы Sillage Immo хранила эти данные для обработки моего запроса и отправки уведомлений. Я могу отписаться в любой момент.",
      },
      buttons: {
        next: "Далее",
        back: "Назад",
        submit: "Сохранить запрос",
      },
      validation: {
        emailInvalid: "Укажите корректный email.",
        nameMissing: "Имя и фамилия обязательны.",
        rgpdMissing: "Примите уведомление RGPD, чтобы продолжить.",
      },
      success: {
        title: "Ваш запрос сохранён!",
        body: (email: string) =>
          `Мы отправили ссылку для подтверждения на ${email}. Перейдите по ней, чтобы активировать кабинет Sillage и включить уведомления.`,
        goHome: "На главную",
        goLogin: "У меня уже есть аккаунт",
      },
      emailFail: {
        title: "Запрос сохранён, письмо нужно отправить снова",
        body:
          "Запрос сохранён, но письмо с подтверждением не удалось отправить. Перейдите на страницу входа и запросите новую ссылку.",
        goLogin: "Получить новую ссылку",
      },
      generic: "Что-то пошло не так. Попробуйте ещё раз через минуту.",
    },
  }[props.locale];

  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<UiStatus>({ kind: "idle" });
  const [form, setForm] = useState<FormState>({
    businessType: props.initialBusinessType,
    city: props.initialFilters.city,
    propertyType: props.initialFilters.type,
    minPrice: props.initialFilters.minPrice,
    maxPrice: props.initialFilters.maxPrice,
    minRooms: props.initialFilters.minRooms,
    maxRooms: props.initialFilters.maxRooms,
    minSurface: props.initialFilters.minSurface,
    maxSurface: props.initialFilters.maxSurface,
    minFloor: props.initialFilters.minFloor,
    maxFloor: props.initialFilters.maxFloor,
    terrace: normalizeTerrace(props.initialFilters.terrace),
    elevator: normalizeTerrace(props.initialFilters.elevator),
    zonePolygon: null,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    rgpd: false,
  });

  const propertyTypes = useMemo(
    () => (form.businessType === "rental" ? props.rentalTypes : props.saleTypes),
    [form.businessType, props.rentalTypes, props.saleTypes]
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
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
      rgpdAccepted: true,
      sourceUrl: typeof window !== "undefined" ? window.location.href : null,
      initialFilters: {
        businessType: form.businessType,
        city: form.city,
        propertyType: form.propertyType,
        minPrice: form.minPrice,
        maxPrice: form.maxPrice,
        minRooms: form.minRooms,
        maxRooms: form.maxRooms,
        minSurface: form.minSurface,
        maxSurface: form.maxSurface,
        minFloor: form.minFloor,
        maxFloor: form.maxFloor,
        terrace: form.terrace,
        elevator: form.elevator,
      },
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
    };

    try {
      const response = await fetch("/api/buyer-searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        ok: boolean;
        code?: string;
        message?: string;
      };

      if (!response.ok || !json.ok) {
        setStatus({ kind: "error", message: json.message ?? copy.generic });
        return;
      }

      if (json.code === "signup_created_email_failed") {
        setStatus({ kind: "success_email_failed", email });
        return;
      }

      setStatus({ kind: "success", email });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : copy.generic,
      });
    }
  };

  const loginHref = localizePath("/espace-client/login", props.locale);
  const homeHref = localizePath("/", props.locale);

  if (status.kind === "success") {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/60 p-8 shadow-sm">
        <h2 className="sillage-section-title">{copy.success.title}</h2>
        <p className="sillage-editorial-text mt-3">{copy.success.body(status.email)}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={loginHref} className="sillage-btn-secondary rounded px-4 py-2 text-sm">
            {copy.success.goLogin}
          </Link>
          <Link href={homeHref} className="sillage-btn rounded px-4 py-2 text-sm">
            {copy.success.goHome}
          </Link>
        </div>
      </div>
    );
  }

  if (status.kind === "success_email_failed") {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/60 p-8 shadow-sm">
        <h2 className="sillage-section-title">{copy.emailFail.title}</h2>
        <p className="sillage-editorial-text mt-3">{copy.emailFail.body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={loginHref} className="sillage-btn rounded px-4 py-2 text-sm">
            {copy.emailFail.goLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ol className="mb-6 flex gap-2 text-xs uppercase tracking-[0.14em]">
        {copy.steps.map((label, index) => {
          const stepNumber = (index + 1) as 1 | 2;
          const isActive = step === stepNumber;
          return (
            <li
              key={label}
              className={`flex flex-1 items-center gap-2 rounded-full border px-3 py-1.5 ${
                isActive
                  ? "border-[#141446] bg-[#141446] text-[#f4ece4]"
                  : "border-[rgba(20,20,70,0.18)] bg-white/60 text-[#141446]"
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
        <form className="space-y-6" onSubmit={handleNext}>
          <h2 className="text-xl font-semibold">{copy.sections.criteria}</h2>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{copy.fields.businessType}</legend>
            <div className="flex gap-2">
              {(["sale", "rental"] as const).map((bt) => (
                <button
                  key={bt}
                  type="button"
                  className={`rounded-full border px-4 py-2 text-sm ${
                    form.businessType === bt
                      ? "border-[#141446] bg-[#141446] text-[#f4ece4]"
                      : "border-[rgba(20,20,70,0.18)] bg-white/70 text-[#141446]"
                  }`}
                  onClick={() => updateField("businessType", bt)}
                >
                  {bt === "sale" ? copy.fields.sale : copy.fields.rental}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              {copy.fields.city}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                placeholder={copy.fields.cityPlaceholder}
              />
            </label>
            <label className="text-sm">
              {copy.fields.propertyType}
              <select
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                value={form.propertyType}
                onChange={(event) => updateField("propertyType", event.target.value)}
              >
                <option value="">{copy.fields.allTypes}</option>
                {propertyTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatPropertyTypeLabel(type, props.locale) ?? type}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {copy.fields.minBudget}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                inputMode="numeric"
                value={form.minPrice}
                onChange={(event) => updateField("minPrice", event.target.value)}
              />
            </label>
            <label className="text-sm">
              {copy.fields.maxBudget}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                inputMode="numeric"
                value={form.maxPrice}
                onChange={(event) => updateField("maxPrice", event.target.value)}
              />
            </label>
            <label className="text-sm">
              {copy.fields.minRooms}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                inputMode="numeric"
                value={form.minRooms}
                onChange={(event) => updateField("minRooms", event.target.value)}
              />
            </label>
            <label className="text-sm">
              {copy.fields.maxRooms}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                inputMode="numeric"
                value={form.maxRooms}
                onChange={(event) => updateField("maxRooms", event.target.value)}
              />
            </label>
            <label className="text-sm">
              {copy.fields.minSurface}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                inputMode="numeric"
                value={form.minSurface}
                onChange={(event) => updateField("minSurface", event.target.value)}
              />
            </label>
            <label className="text-sm">
              {copy.fields.maxSurface}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                inputMode="numeric"
                value={form.maxSurface}
                onChange={(event) => updateField("maxSurface", event.target.value)}
              />
            </label>
            <label className="text-sm">
              {copy.fields.minFloor}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                inputMode="numeric"
                value={form.minFloor}
                onChange={(event) => updateField("minFloor", event.target.value)}
              />
            </label>
            <label className="text-sm">
              {copy.fields.maxFloor}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                inputMode="numeric"
                value={form.maxFloor}
                onChange={(event) => updateField("maxFloor", event.target.value)}
              />
            </label>
            <label className="text-sm">
              {copy.fields.terrace}
              <select
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                value={form.terrace}
                onChange={(event) =>
                  updateField("terrace", normalizeTerrace(event.target.value))
                }
              >
                <option value="">{copy.fields.indifferent}</option>
                <option value="true">{copy.fields.yes}</option>
                <option value="false">{copy.fields.no}</option>
              </select>
            </label>
            <label className="text-sm">
              {copy.fields.elevator}
              <select
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                value={form.elevator}
                onChange={(event) =>
                  updateField("elevator", normalizeTerrace(event.target.value))
                }
              >
                <option value="">{copy.fields.indifferent}</option>
                <option value="true">{copy.fields.yes}</option>
                <option value="false">{copy.fields.no}</option>
              </select>
            </label>
          </div>

          <div className="mt-8 space-y-3 rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/60 p-5">
            <div>
              <h3 className="text-lg font-semibold">{copy.sections.zone}</h3>
              <p className="mt-1 text-xs opacity-75">{copy.sections.zoneHint}</p>
            </div>
            <BuyerSearchZoneMap
              locale={props.locale}
              value={form.zonePolygon}
              onChange={(polygon) => updateField("zonePolygon", polygon)}
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="sillage-btn rounded px-5 py-2 text-sm">
              {copy.buttons.next}
            </button>
          </div>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <h2 className="text-xl font-semibold">{copy.sections.contact}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              {copy.fields.firstName}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                autoComplete="given-name"
                required
              />
            </label>
            <label className="text-sm">
              {copy.fields.lastName}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
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
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="text-sm md:col-span-2">
              {copy.fields.phone}
              <input
                type="tel"
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                autoComplete="tel"
              />
              <span className="mt-1 block text-xs opacity-70">{copy.fields.phoneHint}</span>
            </label>
          </div>

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

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              className="sillage-btn-secondary rounded px-5 py-2 text-sm"
              onClick={handleBack}
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
      )}
    </div>
  );
}
