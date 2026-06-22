"use client";

import { useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";

type ChatMessage = { role: "user" | "assistant"; text: string };

const COPY: Record<
  AppLocale,
  {
    title: string;
    intro: string;
    placeholder: string;
    send: string;
    sending: string;
    error: string;
    escalation: string;
  }
> = {
  fr: {
    title: "Votre assistant Sillage",
    intro:
      "Posez vos questions sur l'avancement de votre vente : l'assistant vous répond, et un conseiller prend le relais si nécessaire.",
    placeholder: "Votre question…",
    send: "Envoyer",
    sending: "Envoi…",
    error: "Une erreur est survenue. Réessayez dans un instant.",
    escalation: "Un conseiller va vous recontacter en priorité.",
  },
  en: {
    title: "Your Sillage assistant",
    intro:
      "Ask anything about your sale's progress: the assistant answers, and an advisor steps in when needed.",
    placeholder: "Your question…",
    send: "Send",
    sending: "Sending…",
    error: "Something went wrong. Please try again shortly.",
    escalation: "An advisor will get back to you as a priority.",
  },
  es: {
    title: "Su asistente Sillage",
    intro:
      "Pregunte lo que quiera sobre el avance de su venta: el asistente responde y un asesor interviene si es necesario.",
    placeholder: "Su pregunta…",
    send: "Enviar",
    sending: "Enviando…",
    error: "Se produjo un error. Inténtelo de nuevo en un momento.",
    escalation: "Un asesor le contactará de forma prioritaria.",
  },
  ru: {
    title: "Ваш помощник Sillage",
    intro:
      "Задавайте вопросы о ходе вашей продажи: помощник ответит, а консультант подключится при необходимости.",
    placeholder: "Ваш вопрос…",
    send: "Отправить",
    sending: "Отправка…",
    error: "Произошла ошибка. Повторите попытку позже.",
    escalation: "Консультант свяжется с вами в приоритетном порядке.",
  },
};

export function SellerProjectChat({
  projectId,
  locale,
}: {
  projectId: string;
  locale: AppLocale;
}) {
  const copy = COPY[locale] ?? COPY.fr;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setError(null);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");

    try {
      const response = await fetch(
        `/api/espace-client/projets/${projectId}/seller-chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, locale }),
        }
      );
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { answer: string; escalateToHuman: boolean };
        message?: string;
      };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.message ?? copy.error);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: payload.data!.answer },
      ]);
      if (payload.data.escalateToHuman) setEscalated(true);
    } catch {
      setError(copy.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
      <h3 className="text-xl font-semibold text-navy">{copy.title}</h3>
      <p className="mt-2 text-sm text-navy/75">{copy.intro}</p>

      {messages.length > 0 ? (
        <div className="mt-5 space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl bg-navy px-4 py-3 text-sm text-sand"
                  : "mr-auto max-w-[85%] rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white px-4 py-3 text-sm text-navy"
              }
            >
              {message.text}
            </div>
          ))}
        </div>
      ) : null}

      {escalated ? (
        <p className="mt-4 rounded-2xl bg-[#f4ece4] px-4 py-3 text-sm text-navy">
          {copy.escalation}
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <form onSubmit={submit} className="mt-5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={copy.placeholder}
          maxLength={700}
          className="flex-1 rounded-full border border-[rgba(20,20,70,0.2)] bg-white px-4 py-2 text-sm text-navy outline-none focus:border-navy"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length === 0}
          className="rounded-full bg-navy px-5 py-2 text-sm text-sand disabled:opacity-50"
        >
          {loading ? copy.sending : copy.send}
        </button>
      </form>
    </section>
  );
}
