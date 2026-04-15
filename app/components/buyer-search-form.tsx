"use client";

import { useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";

const COPY = {
  fr: {
    title: "Confier ma recherche acquéreur",
    intro:
      "Décrivez votre recherche détaillée. Les meilleurs biens peuvent déjà être en base ou arriver demain : nous vous accompagnons de A à Z pour capter les bonnes opportunités.",
    fullName: "Nom complet *",
    email: "E-mail *",
    phone: "Téléphone",
    details: "Recherche détaillée (secteur, budget, type de bien, critères) *",
    submit: "Confier ma recherche",
    sending: "Envoi...",
    success: "Merci. Votre recherche est enregistrée, un conseiller vous contacte rapidement.",
    networkError: "Erreur réseau, merci de réessayer.",
    saveError: "Impossible d'enregistrer votre recherche.",
  },
  en: {
    title: "Share my buying criteria",
    intro:
      "Describe your search in detail. The best properties may already be in our pipeline or arrive tomorrow: we help you capture the right opportunities from start to finish.",
    fullName: "Full name *",
    email: "Email *",
    phone: "Phone",
    details: "Detailed search (area, budget, property type, criteria) *",
    submit: "Submit my search",
    sending: "Sending...",
    success: "Thank you. Your search has been recorded and an advisor will contact you shortly.",
    networkError: "Network error, please try again.",
    saveError: "Unable to save your search.",
  },
  es: {
    title: "Confiar mi búsqueda de compra",
    intro:
      "Describa su búsqueda con detalle. Las mejores propiedades pueden estar ya en cartera o llegar mañana: le acompañamos de principio a fin para captar las mejores oportunidades.",
    fullName: "Nombre completo *",
    email: "Correo electrónico *",
    phone: "Teléfono",
    details: "Búsqueda detallada (zona, presupuesto, tipo de inmueble, criterios) *",
    submit: "Enviar mi búsqueda",
    sending: "Envío...",
    success: "Gracias. Su búsqueda ha sido registrada y un asesor se pondrá en contacto con usted rápidamente.",
    networkError: "Error de red, por favor inténtelo de nuevo.",
    saveError: "No se pudo registrar su búsqueda.",
  },
  ru: {
    title: "Передать мой запрос на покупку",
    intro:
      "Опишите ваш запрос подробно. Лучшие объекты могут уже быть в нашей базе или появиться завтра: мы сопровождаем вас на всех этапах, чтобы найти подходящие возможности.",
    fullName: "Полное имя *",
    email: "Email *",
    phone: "Телефон",
    details: "Подробный запрос (район, бюджет, тип объекта, критерии) *",
    submit: "Отправить мой запрос",
    sending: "Отправка...",
    success: "Спасибо. Ваш запрос зарегистрирован, и консультант свяжется с вами в ближайшее время.",
    networkError: "Ошибка сети, попробуйте еще раз.",
    saveError: "Не удалось сохранить ваш запрос.",
  },
} satisfies Record<AppLocale, Record<string, string>>;

export function BuyerSearchForm({ locale = "fr" }: { locale?: AppLocale }) {
  const copy = COPY[locale];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [searchDetails, setSearchDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const response = await fetch("/api/buyer-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          searchDetails,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.message ?? copy.saveError);
        return;
      }
      setSuccess(copy.success);
      setFullName("");
      setEmail("");
      setPhone("");
      setSearchDetails("");
    } catch {
      setError(copy.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="acquereur-form" className="sillage-card p-0 space-y-4">
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="text-sm opacity-75">{copy.intro}</p>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <label>
          {copy.fullName}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
        <label>
          {copy.email}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          {copy.phone}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="sm:col-span-2">
          {copy.details}
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            rows={4}
            value={searchDetails}
            onChange={(event) => setSearchDetails(event.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
        disabled={loading || !fullName.trim() || !email.trim() || !searchDetails.trim()}
        onClick={() => void submit()}
      >
        {loading ? copy.sending : copy.submit}
      </button>
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
