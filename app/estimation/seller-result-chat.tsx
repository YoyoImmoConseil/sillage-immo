"use client";

import { useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";

type Props = {
  accessToken: string;
  locale?: AppLocale;
};

type UiMessage = {
  role: "user" | "assistant";
  text: string;
};

export function SellerResultChat({ accessToken, locale = "fr" }: Props) {
  const copy = {
    fr: {
      intro:
        "Je peux répondre à vos questions sur la vente, les diagnostics, les délais et l'accompagnement Sillage Immo.",
      unavailable: "Réponse temporairement indisponible.",
      networkError: "Erreur réseau, merci de réessayer.",
      title: "Une question avant de finaliser ?",
      body:
        "Assistant d'information Sillage Immo. Pour les sujets juridiques ou complexes, un conseiller vous rappelle rapidement.",
      ai: "Sillage IA:",
      you: "Vous:",
      placeholder: "Ex : quels diagnostics dois-je préparer ?",
      send: "Envoyer",
      alert: "Sujet sensible détecté : nous vous recommandons un rappel humain prioritaire.",
    },
    en: {
      intro:
        "I can answer your questions about selling, diagnostics, timelines and the Sillage Immo support model.",
      unavailable: "Answer temporarily unavailable.",
      networkError: "Network error, please try again.",
      title: "A question before you finalize?",
      body:
        "Sillage Immo information assistant. For legal or complex topics, one of our advisors will call you back promptly.",
      ai: "Sillage AI:",
      you: "You:",
      placeholder: "Example: which diagnostics should I prepare?",
      send: "Send",
      alert: "A sensitive topic was detected: we recommend a priority callback from a human advisor.",
    },
    es: {
      intro:
        "Puedo responder a sus preguntas sobre la venta, los diagnósticos, los plazos y el acompañamiento de Sillage Immo.",
      unavailable: "Respuesta temporalmente no disponible.",
      networkError: "Error de red, por favor inténtelo de nuevo.",
      title: "¿Una pregunta antes de finalizar?",
      body:
        "Asistente informativo de Sillage Immo. Para asuntos jurídicos o complejos, un asesor le devolverá la llamada rápidamente.",
      ai: "Sillage IA:",
      you: "Usted:",
      placeholder: "Ej.: ¿qué diagnósticos debo preparar?",
      send: "Enviar",
      alert: "Se detectó un tema sensible: le recomendamos una llamada prioritaria con un asesor.",
    },
    ru: {
      intro:
        "Я могу ответить на ваши вопросы о продаже, диагностике, сроках и сопровождении Sillage Immo.",
      unavailable: "Ответ временно недоступен.",
      networkError: "Ошибка сети, попробуйте еще раз.",
      title: "Есть вопрос перед завершением?",
      body:
        "Информационный ассистент Sillage Immo. По юридическим или сложным вопросам консультант быстро вам перезвонит.",
      ai: "Sillage AI:",
      you: "Вы:",
      placeholder: "Например: какие диагностики мне нужно подготовить?",
      send: "Отправить",
      alert: "Обнаружена чувствительная тема: рекомендуем приоритетный звонок от консультанта.",
    },
  }[locale];
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<UiMessage[]>([
    {
      role: "assistant",
      text: copy.intro,
    },
  ]);
  const [needsHuman, setNeedsHuman] = useState(false);

  const ask = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setError(null);
    setLoading(true);
    setChat((prev) => [...prev, { role: "user", text: trimmed }]);
    setMessage("");

    try {
      const response = await fetch("/api/seller/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          message: trimmed,
          locale,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: { answer?: string; escalateToHuman?: boolean };
      };
      if (!response.ok || !data.ok || !data.data?.answer) {
        setError(data.message ?? copy.unavailable);
        return;
      }
      setChat((prev) => [...prev, { role: "assistant", text: data.data?.answer ?? "" }]);
      setNeedsHuman(Boolean(data.data?.escalateToHuman));
    } catch {
      setError(copy.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sillage-card rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium">{copy.title}</p>
      <p className="text-xs opacity-70">{copy.body}</p>

      <div className="max-h-48 overflow-auto space-y-2 rounded border p-3 bg-[rgba(244,236,228,0.9)]">
        {chat.map((item, index) => (
          <p
            key={`${item.role}-${index}`}
            className={`text-sm ${item.role === "assistant" ? "opacity-90" : "font-medium"}`}
          >
            <span className="mr-1">{item.role === "assistant" ? copy.ai : copy.you}</span>
            {item.text}
          </p>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder={copy.placeholder}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void ask();
            }
          }}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void ask()}
          className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
          disabled={loading || message.trim().length === 0}
        >
          {loading ? "..." : copy.send}
        </button>
      </div>

      {needsHuman ? (
        <p className="text-xs text-amber-700">
          {copy.alert}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
