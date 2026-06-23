"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// Floating Copilot launcher for the admin back-office. Mounted once inside
// AdminShell (gated to manager / administrateur), it gives a compact chat that
// talks to /api/admin/copilot/message — the same RBAC-gated, MCP-backed
// orchestrator as the full /admin/copilot page. The conversation persists for
// the session so it follows the user across admin pages.

type ToolCall = {
  toolName: string;
  durationMs: number;
  ok: boolean;
  errorMessage?: string;
};

type CopilotResponse = {
  conversationId: string;
  finalAnswer: string;
  toolCalls: ToolCall[];
  dailyUsage: {
    costEurTotal: number;
    capEur: number;
    overCap: boolean;
  };
  truncated: boolean;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  truncated?: boolean;
};

const STORAGE_KEY = "admin-copilot-conversation";

const SUGGESTIONS = [
  "Quel est le CA réalisé ce mois-ci ?",
  "Quels conseillers ont besoin de support ?",
  "Combien de mandats en cours ?",
];

export function AdminCopilotLauncher() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        conversationId: string | null;
        messages: ChatMessage[];
      };
      if (parsed.conversationId) setConversationId(parsed.conversationId);
      if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
    } catch {
      // ignore corrupted state
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ conversationId, messages })
      );
    } catch {
      // best-effort persistence
    }
  }, [conversationId, messages]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, loading, open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < 2 || loading) return;
      setError(null);
      setLoading(true);
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

      try {
        const res = await fetch("/api/admin/copilot/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message: trimmed }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: CopilotResponse;
          message?: string;
        };
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.message ?? "Copilot indisponible.");
        }
        const data = json.data;
        setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.finalAnswer,
            toolCalls: data.toolCalls,
            truncated: data.truncated,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur réseau.");
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading]
  );

  const startNew = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le copilot Sillage"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-3 text-sand shadow-xl transition hover:bg-[#1c1c5a]"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <path
            d="M12 3v2m0 14v2m9-9h-2M5 12H3m13.95 6.95-1.41-1.41M7.46 7.46 6.05 6.05m11.9 0-1.41 1.41M7.46 16.54l-1.41 1.41"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="hidden text-sm font-medium sm:inline">Copilot</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 w-[min(94vw,420px)] h-[min(76vh,620px)]">
      <div className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-sand/20 bg-navy p-4 text-sand shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold leading-tight">Copilot Sillage</h2>
            <p className="text-[11px] text-sand/65">
              Données agence via outils MCP ·{" "}
              <Link href="/admin/copilot" className="underline hover:text-sand">
                vue complète
              </Link>
            </p>
          </div>
          <div className="flex flex-none items-center gap-1">
            <button
              type="button"
              onClick={startNew}
              aria-label="Nouvelle conversation"
              title="Nouvelle conversation"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sand/70 transition hover:bg-sand/10 hover:text-sand"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le copilot"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sand/70 transition hover:bg-sand/10 hover:text-sand"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto pr-1">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-dashed border-sand/25 p-3 text-sm text-sand/80">
                Pose une question au copilot. Il interroge les données réelles de
                l&apos;agence (transactions, leads, CA, marché…).
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void sendMessage(s)}
                    className="rounded-full border border-sand/25 px-3 py-1 text-xs text-sand/85 transition hover:bg-sand/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`rounded-xl px-3 py-2 text-sm ${
                  msg.role === "assistant"
                    ? "bg-sand/10 text-sand"
                    : "bg-sand text-navy"
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                {msg.role === "assistant" && msg.toolCalls?.length ? (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-sand/70">
                      {msg.toolCalls.length} appel(s) d&apos;outil
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {msg.toolCalls.map((tc, j) => (
                        <li
                          key={`${tc.toolName}-${j}`}
                          className={tc.ok ? "text-sand/75" : "text-amber-300"}
                        >
                          {tc.toolName} · {tc.durationMs} ms
                          {tc.errorMessage ? ` — ${tc.errorMessage}` : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                {msg.truncated ? (
                  <p className="mt-1 text-[10px] text-amber-300">
                    Réponse tronquée (limite d&apos;appels d&apos;outils).
                  </p>
                ) : null}
              </div>
            ))
          )}
          {loading ? (
            <div className="rounded-xl bg-sand/5 px-3 py-2 text-sm text-sand/70">
              Le copilot réfléchit…
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="flex gap-2 border-t border-sand/15 pt-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose ta question…"
            aria-label="Question au copilot"
            disabled={loading}
            className="flex-1 rounded-lg border border-sand/25 bg-sand/10 px-3 py-2 text-sm text-sand placeholder:text-sand/45 focus:border-sand/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length < 2}
            className="rounded-lg bg-sand px-4 py-2 text-sm font-medium text-navy transition hover:bg-sand/90 disabled:opacity-50"
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
