"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Sillage Copilot UI — client-side React app rendered inside the admin
// shell. The corresponding server endpoint is
// /api/admin/copilot/message (POST) and is RBAC-gated to manager +
// administrateur.

type ToolCall = {
  iteration: number;
  toolName: string;
  toolVersion: string | null;
  inputPreview: Record<string, unknown>;
  outputPreview: unknown;
  durationMs: number;
  ok: boolean;
  errorMessage?: string;
};

type CopilotResponse = {
  conversationId: string;
  finalAnswer: string;
  toolCalls: ToolCall[];
  usage: {
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    costMicros: number;
    costEurApprox: number;
  };
  dailyUsage: {
    costMicrosTotal: number;
    costEurTotal: number;
    capEur: number;
    overCap: boolean;
  };
  iterations: number;
  truncated: boolean;
};

type ConversationListItem = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  updatedAt: string;
  title: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  toolCalls?: ToolCall[];
  truncated?: boolean;
};

type SuggestedPrompt = {
  id: string;
  label: string;
  prompt: string;
};

type Props = {
  suggestedPrompts: SuggestedPrompt[];
  initialConversations: ConversationListItem[];
  initialDailyUsage: {
    costEurTotal: number;
    capEur: number;
    overCap: boolean;
  };
};

const ENTITY_URL_RULES: Array<{ regex: RegExp; build: (id: string) => string }> =
  [
    {
      regex: /^([a-f0-9-]{36})$/i,
      build: (id) => `/admin/leads?q=${id}`,
    },
  ];

const TOOL_LINK_BUILDERS: Record<string, (output: unknown) => string | null> = {
  "seller_leads.get_context": (output) => {
    const o = output as { sellerLeadId?: string } | null;
    return o?.sellerLeadId ? `/admin/seller-leads/${o.sellerLeadId}` : null;
  },
  "buyer_leads.get_context": (output) => {
    const o = output as { buyerLeadId?: string } | null;
    return o?.buyerLeadId ? `/admin/buyer-leads/${o.buyerLeadId}` : null;
  },
  "properties.get": (output) => {
    const o = output as { id?: string; slug?: string } | null;
    if (o?.id) return `/admin/properties/${o.id}`;
    if (o?.slug) return `/biens/${o.slug}`;
    return null;
  },
  "client_projects.get": (output) => {
    const o = output as { clientProjectId?: string } | null;
    return o?.clientProjectId
      ? `/admin/clients?projectId=${o.clientProjectId}`
      : null;
  },
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const formatEur = (value: number) => {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 4,
  });
};

const groupByDay = (
  conversations: ConversationListItem[]
): Array<{ day: string; items: ConversationListItem[] }> => {
  const map = new Map<string, ConversationListItem[]>();
  for (const c of conversations) {
    const day = (c.startedAt ?? "").slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(c);
    map.set(day, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, items]) => ({ day, items }));
};

export function CopilotClient(props: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    props.initialConversations
  );
  const [dailyUsage, setDailyUsage] = useState(props.initialDailyUsage);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/copilot/conversations", {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { conversations?: ConversationListItem[] };
      };
      if (json.ok && json.data?.conversations) {
        setConversations(json.data.conversations);
      }
    } catch {
      // non-blocking
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/copilot/conversations/${id}`);
      const json = (await res.json()) as {
        ok?: boolean;
        data?: {
          conversation: { id: string };
          messages: Array<{
            role: string;
            content: string;
            createdAt: string;
          }>;
        };
      };
      if (json.ok && json.data) {
        setConversationId(json.data.conversation.id);
        setMessages(
          json.data.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              createdAt: m.createdAt,
            }))
        );
      }
    } catch {
      setError("Impossible de charger cette conversation.");
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < 2) return;
      setError(null);
      setLoading(true);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
      ]);
      setInput("");

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
        setDailyUsage({
          costEurTotal: data.dailyUsage.costEurTotal,
          capEur: data.dailyUsage.capEur,
          overCap: data.dailyUsage.overCap,
        });
        void refreshConversations();
      } catch (err) {
        const messageText =
          err instanceof Error ? err.message : "Erreur réseau.";
        setError(messageText);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, refreshConversations]
  );

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  const conversationGroups = useMemo(
    () => groupByDay(conversations),
    [conversations]
  );

  return (
    <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
      <aside className="hidden flex-col rounded-2xl border border-[rgba(20,20,70,0.15)] bg-white/70 p-3 lg:flex">
        <button
          type="button"
          onClick={startNewConversation}
          className="rounded-lg bg-[#141446] px-3 py-2 text-sm font-medium text-[#f4ece4] hover:bg-[#1c1c5a]"
        >
          + Nouvelle conversation
        </button>
        <div className="mt-4 flex-1 overflow-auto pr-1 text-sm">
          {conversationGroups.length === 0 ? (
            <p className="text-xs text-[#141446]/55">
              Pas encore de conversation. Pose ta première question.
            </p>
          ) : (
            conversationGroups.map((group) => (
              <div key={group.day} className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#141446]/55">
                  {group.day}
                </p>
                <ul className="mt-1 space-y-1">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => loadConversation(item.id)}
                        className={`w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-[rgba(20,20,70,0.05)] ${
                          item.id === conversationId
                            ? "bg-[rgba(20,20,70,0.1)] font-semibold"
                            : ""
                        }`}
                        title={item.id}
                      >
                        {item.title ??
                          `Conv. ${formatDate(item.startedAt)}`}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="mt-3 rounded-lg border border-[rgba(20,20,70,0.15)] bg-white/80 px-3 py-2 text-xs">
          <p className="text-[#141446]/70">Usage du jour</p>
          <p
            className={`mt-1 font-semibold ${dailyUsage.overCap ? "text-amber-700" : "text-[#141446]"}`}
          >
            {formatEur(dailyUsage.costEurTotal)} / {formatEur(dailyUsage.capEur)}
          </p>
          {dailyUsage.overCap ? (
            <p className="mt-1 text-[10px] text-amber-700">
              Plafond journalier dépassé. Le copilot continue de répondre mais
              les coûts s&apos;accumulent — informer le manager.
            </p>
          ) : null}
        </div>
      </aside>

      <section className="flex flex-col rounded-2xl border border-[rgba(20,20,70,0.15)] bg-white/70 p-3">
        <div className="flex flex-wrap gap-2 border-b border-[rgba(20,20,70,0.1)] pb-3">
          {props.suggestedPrompts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => void sendMessage(p.prompt)}
              disabled={loading}
              className="rounded-full border border-[rgba(20,20,70,0.2)] px-3 py-1 text-xs hover:bg-[rgba(20,20,70,0.05)] disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="mt-3 flex-1 space-y-3 overflow-auto pr-1"
        >
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[rgba(20,20,70,0.2)] p-4 text-sm text-[#141446]/70">
              Pose une question au copilot Sillage. Il appellera les outils
              MCP (leads, biens, conversations IA, …) pour te donner une
              réponse appuyée sur les données réelles de l&apos;agence.
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`rounded-xl px-4 py-3 text-sm ${
                  msg.role === "assistant"
                    ? "bg-[rgba(20,20,70,0.05)] text-[#141446]"
                    : "bg-[#141446] text-[#f4ece4]"
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                {msg.role === "assistant" && msg.toolCalls?.length ? (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-[#141446]/70">
                      {msg.toolCalls.length} appel(s) d&apos;outil
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {msg.toolCalls.map((tc, j) => {
                        const linkBuilder = TOOL_LINK_BUILDERS[tc.toolName];
                        const link = linkBuilder
                          ? linkBuilder(tc.outputPreview)
                          : null;
                        return (
                          <li
                            key={`${tc.toolName}-${j}`}
                            className={`rounded border border-[rgba(20,20,70,0.15)] bg-white/60 px-2 py-1 ${tc.ok ? "" : "border-amber-400"}`}
                          >
                            <p className="font-semibold">
                              {link ? (
                                <a
                                  href={link}
                                  className="underline underline-offset-2 hover:opacity-80"
                                >
                                  {tc.toolName}
                                </a>
                              ) : (
                                tc.toolName
                              )}
                              <span className="ml-2 text-[#141446]/50">
                                {tc.durationMs} ms{tc.toolVersion ? ` · v${tc.toolVersion}` : ""}
                              </span>
                            </p>
                            {tc.errorMessage ? (
                              <p className="text-amber-700">
                                {tc.errorMessage}
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ) : null}
                {msg.truncated ? (
                  <p className="mt-1 text-[10px] text-amber-700">
                    Réponse tronquée (limite de 5 appels d&apos;outils par tour).
                  </p>
                ) : null}
              </div>
            ))
          )}
          {loading ? (
            <div className="rounded-xl bg-[rgba(20,20,70,0.04)] px-4 py-3 text-sm text-[#141446]/70">
              Le copilot réfléchit…
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="mt-3 flex gap-2 border-t border-[rgba(20,20,70,0.1)] pt-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose ta question (ex: Quels conseillers ont besoin de support ?)"
            disabled={loading}
            className="flex-1 rounded-lg border border-[rgba(20,20,70,0.2)] bg-white/80 px-3 py-2 text-sm focus:border-[#141446] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length < 2}
            className="rounded-lg bg-[#141446] px-4 py-2 text-sm font-medium text-[#f4ece4] hover:bg-[#1c1c5a] disabled:opacity-50"
          >
            Envoyer
          </button>
        </form>
      </section>
    </div>
  );
}
