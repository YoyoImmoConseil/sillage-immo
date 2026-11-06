"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = { kind: "idle" } | { kind: "busy"; message: string } | { kind: "done"; message: string } | { kind: "error"; message: string };

const CHUNK = 500;

/**
 * Outils de la page « Réactivation » : import d'un export JSON SweepBright
 * (lots de 500), envoi d'un lot de test à une adresse, envoi d'un lot réel.
 */
export function ReactivationTools({
  campaign,
  defaultLimit,
  contactEmail,
  protection,
}: {
  campaign: string;
  defaultLimit: number;
  contactEmail: string;
  protection: { size: number; syncedAt: string | null };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [testTo, setTestTo] = useState(contactEmail);
  const [testCount, setTestCount] = useState(3);
  const [testSender, setTestSender] = useState<"" | "yoann" | "jordan" | "laura">("");
  const [batchLimit, setBatchLimit] = useState(defaultLimit);
  const [order, setOrder] = useState<"auto" | "oldest" | "newest">("auto");

  const importFile = async () => {
    if (!file) return;
    setStatus({ kind: "busy", message: "Lecture du fichier…" });
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const contacts = Array.isArray(parsed) ? parsed : (parsed as { contacts?: unknown[] })?.contacts;
      if (!Array.isArray(contacts)) throw new Error("Le fichier doit contenir un tableau de contacts.");
      let upserted = 0;
      let excluded = 0;
      for (let index = 0; index < contacts.length; index += CHUNK) {
        setStatus({ kind: "busy", message: `Import ${Math.min(index + CHUNK, contacts.length)} / ${contacts.length}…` });
        const response = await fetch("/api/admin/reactivation/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ campaign, contacts: contacts.slice(index, index + CHUNK) }),
        });
        const json = (await response.json()) as { ok: boolean; message?: string; data?: { upserted: number; excluded: number } };
        if (!json.ok || !json.data) throw new Error(json.message ?? "Import refusé.");
        upserted += json.data.upserted;
        excluded += json.data.excluded;
      }
      setStatus({ kind: "done", message: `${upserted} contacts importés ou rafraîchis, dont ${excluded} exclus.` });
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Import impossible." });
    }
  };

  const send = async (dryRunTo: string | null, limit: number) => {
    setStatus({ kind: "busy", message: dryRunTo ? "Envoi du test…" : "Envoi du lot…" });
    try {
      const response = await fetch("/api/admin/reactivation/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit, dryRunTo, dryRunSender: dryRunTo && testSender ? testSender : null, order: order === "auto" ? undefined : order }),
      });
      const json = (await response.json()) as {
        ok: boolean;
        message?: string;
        data?: { sent: number; failed: number; dormant: number; protected: number; excluded: number; sentByVariant: Record<string, number>; errors: string[] };
      };
      if (!json.ok || !json.data) throw new Error(json.message ?? "Envoi refusé.");
      const variants = Object.entries(json.data.sentByVariant)
        .map(([variant, count]) => `${variant} ${count}`)
        .join(" · ");
      setStatus({
        kind: json.data.failed > 0 ? "error" : "done",
        message: `${json.data.sent} envoyé(s)${dryRunTo ? ` à ${dryRunTo}` : ""}, ${json.data.failed} en échec, ${json.data.dormant} passé(s) en dormant, ${json.data.protected} protégé(s) MyNotary sauté(s), ${json.data.excluded} exclu(s) à l'envoi${variants ? ` — objets : ${variants}` : ""}${json.data.errors.length ? ` — ${json.data.errors.slice(0, 3).join(" ; ")}` : ""}.`,
      });
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Envoi impossible." });
    }
  };

  const syncProtection = async () => {
    setStatus({ kind: "busy", message: "Synchronisation MyNotary…" });
    try {
      const response = await fetch("/api/admin/reactivation/protect-sync", { method: "POST" });
      const json = (await response.json()) as { ok: boolean; message?: string; data?: { operations: number; signedContracts: number; fromSignatories: number; fromRecords: number; fromWebhooks: number } };
      if (!json.ok || !json.data) throw new Error(json.message ?? "Synchronisation refusée.");
      setStatus({
        kind: "done",
        message: `MyNotary : ${json.data.operations} dossiers lus, ${json.data.signedContracts} mandats / compromis signés — ${json.data.fromSignatories} signataires, ${json.data.fromRecords} fiches, ${json.data.fromWebhooks} signataires reçus par webhook.`,
      });
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Synchronisation impossible." });
    }
  };

  const busy = status.kind === "busy";
  const inputClass = "rounded-xl border border-[rgba(20,20,70,0.18)] bg-white px-3 py-2 text-sm";
  const buttonClass =
    "inline-flex min-h-10 items-center justify-center rounded-full bg-navy px-4 text-sm font-semibold text-sand transition hover:bg-navy/90 disabled:opacity-50";
  const outlineClass =
    "inline-flex min-h-10 items-center justify-center rounded-full border border-navy/40 px-4 text-sm font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-50";

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="space-y-3 rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-5 lg:col-span-3">
        <h3 className="font-semibold">Protection MyNotary — mandat ou compromis signé depuis moins de 12 mois : jamais relancé</h3>
        <p className="text-sm opacity-70">
          {protection.size} personne(s) protégée(s) dans la fenêtre glissante ·{" "}
          {protection.syncedAt ? `synchronisé le ${protection.syncedAt}` : "jamais synchronisé — aucun envoi ne partira tant que ce n'est pas fait"}. Resynchronisé
          chaque nuit ; un contact protégé est sauté sans changer de statut et redevient contactable de lui-même après 12 mois.
        </p>
        <button type="button" className={outlineClass} disabled={busy} onClick={syncProtection}>
          Synchroniser MyNotary maintenant
        </button>
      </article>
      <article className="space-y-3 rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-5">
        <h3 className="font-semibold">1. Importer les contacts SweepBright</h3>
        <p className="text-sm opacity-70">
          Fichier JSON (tableau de contacts : sweepbright_contact_id, type, created_at, labels, negotiator, first_name, last_name, email, phone,
          negotiations). Un contact déjà importé garde son statut.
        </p>
        <input type="file" accept="application/json,.json" className="block text-sm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button type="button" className={buttonClass} disabled={busy || !file} onClick={importFile}>
          Importer
        </button>
      </article>
      <article className="space-y-3 rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-5">
        <h3 className="font-semibold">2. Test en conditions réelles</h3>
        <p className="text-sm opacity-70">
          Les prochains mails du lot partent vers cette adresse ; rien n&apos;est écrit sur les contacts, et les boutons des mails de test ouvrent le
          parcours en aperçu (rien n&apos;est enregistré).
        </p>
        <div className="flex flex-wrap gap-2">
          <input type="email" className={inputClass} value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="adresse de test" />
          <input type="number" min={1} max={20} className={`${inputClass} w-20`} value={testCount} onChange={(event) => setTestCount(Number(event.target.value) || 1)} />
          <select className={inputClass} value={testSender} onChange={(event) => setTestSender(event.target.value as "" | "yoann" | "jordan" | "laura")}>
            <option value="">Signature : celle de la fiche</option>
            <option value="yoann">Signature : Yoann</option>
            <option value="jordan">Signature : Jordan S.</option>
            <option value="laura">Signature : Laura</option>
          </select>
        </div>
        <button type="button" className={outlineClass} disabled={busy || !testTo.includes("@")} onClick={() => send(testTo, testCount)}>
          Envoyer le test
        </button>
      </article>
      <article className="space-y-3 rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/70 p-5">
        <h3 className="font-semibold">3. Envoyer un lot maintenant</h3>
        <p className="text-sm opacity-70">
          Le cron envoie {defaultLimit} mails par jour ouvré à 9 h. Ce bouton envoie un lot tout de suite, aux vrais contacts.
        </p>
        <div className="flex flex-wrap gap-2">
          <input type="number" min={1} max={500} className={`${inputClass} w-24`} value={batchLimit} onChange={(event) => setBatchLimit(Number(event.target.value) || 1)} />
          <select
            className={inputClass}
            value={order}
            onChange={(event) => setOrder(event.target.value === "newest" ? "newest" : event.target.value === "oldest" ? "oldest" : "auto")}
          >
            <option value="auto">Ordre automatique (récents d&apos;abord jusqu&apos;à 500 envois, puis anciens)</option>
            <option value="newest">Fiches les plus récentes d&apos;abord</option>
            <option value="oldest">Fiches les plus anciennes d&apos;abord</option>
          </select>
        </div>
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Envoyer jusqu'à ${batchLimit} mails aux contacts de la campagne ${campaign} (${order === "newest" ? "fiches les plus récentes d'abord" : order === "oldest" ? "fiches les plus anciennes d'abord" : "ordre automatique"}) ?`))
              void send(null, batchLimit);
          }}
        >
          Envoyer aux contacts
        </button>
      </article>
      {status.kind !== "idle" ? (
        <p
          className={`lg:col-span-3 rounded-xl px-4 py-3 text-sm ${
            status.kind === "error" ? "bg-red-50 text-red-800" : status.kind === "done" ? "bg-emerald-50 text-emerald-900" : "bg-sand text-navy"
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
