"use client";

import { useState } from "react";

type Props = {
  accessToken: string;
};

type UiMessage = {
  role: "user" | "assistant";
  text: string;
};

export function SellerResultChat({ accessToken }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<UiMessage[]>([
    {
      role: "assistant",
      text: "Je peux répondre à vos questions sur la vente, les diagnostics, les délais et l'accompagnement Sillage Immo.",
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
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: { answer?: string; escalateToHuman?: boolean };
      };
      if (!response.ok || !data.ok || !data.data?.answer) {
        setError(data.message ?? "Réponse temporairement indisponible.");
        return;
      }
      setChat((prev) => [...prev, { role: "assistant", text: data.data?.answer ?? "" }]);
      setNeedsHuman(Boolean(data.data?.escalateToHuman));
    } catch {
      setError("Erreur réseau, merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sillage-card rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium">Une question avant de finaliser ?</p>
      <p className="text-xs opacity-70">
        Assistant d&apos;information Sillage Immo. Pour les sujets juridiques ou complexes, un
        conseiller vous rappelle rapidement.
      </p>

      <div className="max-h-48 overflow-auto space-y-2 rounded border p-3 bg-[rgba(244,236,228,0.9)]">
        {chat.map((item, index) => (
          <p
            key={`${item.role}-${index}`}
            className={`text-sm ${item.role === "assistant" ? "opacity-90" : "font-medium"}`}
          >
            <span className="mr-1">{item.role === "assistant" ? "Sillage IA:" : "Vous:"}</span>
            {item.text}
          </p>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="Ex : quels diagnostics dois-je préparer ?"
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
          {loading ? "..." : "Envoyer"}
        </button>
      </div>

      {needsHuman ? (
        <p className="text-xs text-amber-700">
          Sujet sensible détecté : nous vous recommandons un rappel humain prioritaire.
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
