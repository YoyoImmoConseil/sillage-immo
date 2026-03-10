"use client";

import Link from "next/link";
import { useState } from "react";

type AiData = {
  reply: string;
  intent: "seller" | "buyer" | "market" | "unclear";
  ctaLabel: string;
  ctaHref: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function HomeCommercialAssistant() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Bonjour et bienvenue chez Sillage Immo. Decrivez votre projet, je vous oriente vers le bon parcours.",
    },
  ]);

  const ask = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const historyForApi = chat
      .slice(-10)
      .map((item) => ({ role: item.role, text: item.text }));
    setChat((prev) => [...prev, { role: "user", text: trimmed }]);
    setMessage("");
    try {
      const response = await fetch("/api/home-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: AiData;
      };
      if (!response.ok || !data.ok || !data.data) {
        setError(data.message ?? "Assistant temporairement indisponible.");
        return;
      }
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.data?.reply ?? "",
          ctaLabel: data.data?.ctaLabel,
          ctaHref: data.data?.ctaHref,
        },
      ]);
    } catch {
      setError("Erreur reseau, merci de reessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="sillage-card rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-medium">Assistant commercial Sillage Immo</h2>
      <p className="text-sm opacity-75">
        Dites-nous votre projet. Nous vous orientons vers le parcours le plus pertinent, avec un
        accompagnement sur-mesure.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/estimation"
          className="sillage-chip rounded-full px-3 py-1 text-sm"
        >
          Je veux vendre mon bien
        </Link>
        <Link
          href="/#acquereur-form"
          className="sillage-chip rounded-full px-3 py-1 text-sm"
        >
          Je veux acheter un bien
        </Link>
        <button
          type="button"
          className="sillage-chip rounded-full px-3 py-1 text-sm"
          onClick={() => {
            setChat((prev) => [
              ...prev,
              { role: "user", text: "Je veux juste me renseigner sur le marche" },
              {
                role: "assistant",
                text: "Le marche nicois reste dynamique mais selectif. Une bonne strategie de prix, de presentation et de timing fait la difference. Nos experts vous donnent une lecture locale claire, actionnable et adaptee a votre projet.",
                ctaLabel: "Rencontrer un expert Sillage Immo",
                ctaHref: "/#contact-expert",
              },
            ]);
          }}
        >
          Je veux me renseigner sur le marche
        </button>
      </div>

      <div className="max-h-64 overflow-auto rounded-xl border bg-white p-3 space-y-2">
        {chat.map((item, index) => (
          <div
            key={`${item.role}-${index}`}
            className={`rounded-lg px-3 py-2 text-sm ${
              item.role === "assistant"
                ? "bg-[rgba(20,20,70,0.06)]"
                : "bg-[rgba(20,20,70,0.14)] font-medium"
            }`}
          >
            <p>
              <span className="mr-1">{item.role === "assistant" ? "Sillage IA:" : "Vous:"}</span>
              {item.text}
            </p>
            {item.role === "assistant" && item.ctaLabel && item.ctaHref ? (
              <div className="mt-2">
                <Link href={item.ctaHref} className="sillage-btn inline-block rounded px-3 py-1 text-xs">
                  {item.ctaLabel}
                </Link>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="Ex: Je veux vendre rapidement mon appartement a Nice"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void ask();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void ask()}
          className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
          disabled={loading || message.trim().length < 2}
        >
          {loading ? "..." : "Me guider"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
