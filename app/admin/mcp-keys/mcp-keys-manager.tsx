"use client";

import { useState } from "react";

type KeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  toolAllowlist: string[];
  canWrite: boolean;
  canReadPii: boolean;
  ipAllowlist: string[] | null;
  rateLimitPerMinute: number | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type ToolInfo = { name: string; mutates: boolean; readsPii: boolean };

// Capabilities for the partner integrations REST surface
// (/api/integrations/v1/*, consumed by the Zapier app). These are not MCP
// tools; they are scope strings stored in the same key allowlist and enforced
// by lib/integrations/auth.ts.
const INTEGRATION_SCOPES: { scope: string; label: string }[] = [
  { scope: "integrations:transactions", label: "Transactions (créer / mettre à jour)" },
  { scope: "integrations:market", label: "Observations de marché (créer)" },
  { scope: "integrations:buyer_leads", label: "Leads acquéreurs (créer)" },
];

export function McpKeysManager({
  initialKeys,
  tools,
}: {
  initialKeys: KeySummary[];
  tools: ToolInfo[];
}) {
  const [keys, setKeys] = useState<KeySummary[]>(initialKeys);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [canWrite, setCanWrite] = useState(false);
  const [canReadPii, setCanReadPii] = useState(false);
  const [ipAllowlist, setIpAllowlist] = useState("");
  const [rateLimit, setRateLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);

  const toggleTool = (toolName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) next.delete(toolName);
      else next.add(toolName);
      return next;
    });
  };

  // One-click setup for a Zapier ingestion key: all integration write scopes
  // + the write flag, no PII. Admin can then trim scopes if needed.
  const applyZapierPreset = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      INTEGRATION_SCOPES.forEach(({ scope }) => next.add(scope));
      return next;
    });
    setCanWrite(true);
    setCanReadPii(false);
    if (!name.trim()) setName("Zapier — ingestion");
  };

  const create = async () => {
    setError(null);
    setPlaintextKey(null);
    if (!name.trim()) {
      setError("Nom requis.");
      return;
    }
    if (selected.size === 0) {
      setError("Sélectionnez au moins un outil.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/mcp-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          toolAllowlist: Array.from(selected),
          canWrite,
          canReadPii,
          ipAllowlist: ipAllowlist
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          rateLimitPerMinute: rateLimit ? Number(rateLimit) : null,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        key?: KeySummary;
        plaintextKey?: string;
        message?: string;
      };
      if (!response.ok || !payload.ok || !payload.key) {
        throw new Error(payload.message ?? "Création impossible.");
      }
      setKeys((prev) => [payload.key!, ...prev]);
      setPlaintextKey(payload.plaintextKey ?? null);
      setName("");
      setSelected(new Set());
      setCanWrite(false);
      setCanReadPii(false);
      setIpAllowlist("");
      setRateLimit("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/mcp-keys/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Révocation impossible.");
      setKeys((prev) =>
        prev.map((key) =>
          key.id === id ? { ...key, revokedAt: new Date().toISOString() } : key
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
        <h3 className="text-lg font-semibold text-navy">Nouvelle clé</h3>

        {plaintextKey ? (
          <div className="mt-4 rounded-2xl bg-[#f4ece4] p-4">
            <p className="text-sm font-medium text-navy">
              Copiez cette clé maintenant — elle ne sera plus affichée :
            </p>
            <code className="mt-2 block break-all rounded bg-white p-2 text-sm">
              {plaintextKey}
            </code>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="text-navy/70">Nom du consommateur</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Claude Desktop — lecture seule"
              className="mt-1 w-full rounded-lg border border-[rgba(20,20,70,0.2)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-navy/70">Rate limit / minute (optionnel)</span>
            <input
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              inputMode="numeric"
              placeholder="60"
              className="mt-1 w-full rounded-lg border border-[rgba(20,20,70,0.2)] px-3 py-2"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="text-navy/70">IP allowlist (séparées par des virgules, optionnel)</span>
            <input
              value={ipAllowlist}
              onChange={(e) => setIpAllowlist(e.target.value)}
              placeholder="203.0.113.4, 198.51.100.7"
              className="mt-1 w-full rounded-lg border border-[rgba(20,20,70,0.2)] px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={canWrite} onChange={(e) => setCanWrite(e.target.checked)} />
            Autoriser l&apos;écriture (outils mutateurs)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={canReadPii} onChange={(e) => setCanReadPii(e.target.checked)} />
            Autoriser les données personnelles (PII)
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-[rgba(20,20,70,0.12)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-navy">
              Capacités d&apos;intégration (Zapier)
            </p>
            <button
              type="button"
              onClick={applyZapierPreset}
              className="rounded-full border border-[rgba(20,20,70,0.2)] px-3 py-1 text-xs hover:bg-[rgba(20,20,70,0.05)]"
            >
              Préréglage Zapier
            </button>
          </div>
          <div className="mt-2 grid gap-1 md:grid-cols-2">
            {INTEGRATION_SCOPES.map(({ scope, label }) => (
              <label key={scope} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(scope)}
                  onChange={() => toggleTool(scope)}
                />
                <span>{label}</span>
                <span className="rounded bg-red-100 px-1 text-xs text-red-700">write</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-navy/55">
            Nécessite « Autoriser l&apos;écriture ». Endpoints REST&nbsp;:
            <code className="ml-1">/api/integrations/v1/*</code>.
          </p>
        </div>

        <div className="mt-4">
          <p className="text-sm text-navy/70">Allowlist d&apos;outils MCP</p>
          <div className="mt-2 grid max-h-64 gap-1 overflow-y-auto rounded-2xl border border-[rgba(20,20,70,0.12)] p-3 md:grid-cols-2">
            {tools.map((tool) => (
              <label key={tool.name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(tool.name)}
                  onChange={() => toggleTool(tool.name)}
                />
                <span>{tool.name}</span>
                {tool.mutates ? (
                  <span className="rounded bg-red-100 px-1 text-xs text-red-700">write</span>
                ) : null}
                {tool.readsPii ? (
                  <span className="rounded bg-amber-100 px-1 text-xs text-amber-700">PII</span>
                ) : null}
              </label>
            ))}
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="sillage-btn mt-5 rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "Création…" : "Créer la clé"}
        </button>
      </section>

      <section className="overflow-x-auto rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[rgba(20,20,70,0.12)] text-xs uppercase tracking-wide text-navy/60">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Préfixe</th>
              <th className="px-4 py-3">Outils</th>
              <th className="px-4 py-3">Write</th>
              <th className="px-4 py-3">PII</th>
              <th className="px-4 py-3">Dernière utilisation</th>
              <th className="px-4 py-3">État</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-navy/60">
                  Aucune clé MCP.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="border-b border-[rgba(20,20,70,0.06)]">
                  <td className="px-4 py-3">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{key.keyPrefix}…</td>
                  <td className="px-4 py-3">{key.toolAllowlist.length}</td>
                  <td className="px-4 py-3">{key.canWrite ? "oui" : "non"}</td>
                  <td className="px-4 py-3">{key.canReadPii ? "oui" : "non"}</td>
                  <td className="px-4 py-3">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {key.revokedAt ? (
                      <span className="text-red-600">révoquée</span>
                    ) : (
                      <span className="text-green-700">active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revokedAt ? (
                      <button
                        type="button"
                        onClick={() => revoke(key.id)}
                        className="text-sm text-red-600 underline"
                      >
                        Révoquer
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
