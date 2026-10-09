#!/usr/bin/env node
/**
 * RATTRAPAGE MyNotary — rejoue toutes les signatures dans la boîte de réception.
 *
 * Parcourt tous les dossiers de l'organisation (GET /operations, paginé par
 * offset), et pour chaque contrat en statut SIGNATURE_COMPLETED fabrique un
 * événement `signature_completed` identique à celui qu'enverrait le webhook :
 * signataires et identifiants des fichiers signés lus via
 * GET /signatures/{currentSignatureId} quand une cérémonie existe (signature
 * papier ou importée : pas de cérémonie, donc pas de fichier).
 *
 * L'événement est inséré dans `mynotary_events` (event_id =
 * `backfill:contract:<contractId>`, event_created_at = date de signature,
 * status pending). Le traitement différé habituel (after() / cron
 * mynotary-events) fait ensuite la projection : rien n'est écrit ici dans
 * `mynotary_signed_documents` ni dans le bucket.
 *
 * Idempotent : un contrat déjà rejoué (même event_id) est ignoré. Côté
 * MyNotary : lectures uniquement.
 *
 * Usage :
 *   MYNOTARY_API_KEY=<clé prod> node --env-file=.env.local \
 *     scripts/mynotary-replay-signatures.mjs [--dry-run] [--since 2024-01-01] [--operation <id>]
 */
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dryRun = args.includes("--dry-run");
const since = readArg("--since", null);
const onlyOperation = readArg("--operation", null);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.MYNOTARY_API_KEY;
const organizationId = process.env.MYNOTARY_ORGANIZATION_ID ?? "8971";
const baseUrl = (process.env.MYNOTARY_API_BASE_URL ?? "https://api.mynotary.fr/api/v1").replace(/\/+$/, "");
if (!supabaseUrl || !serviceKey || !apiKey) {
  console.error("Variables manquantes : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MYNOTARY_API_KEY.");
  process.exit(1);
}
const sb = createClient(supabaseUrl, serviceKey);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const api = async (path) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { "x-api-key": apiKey, "x-api-date-version": "2", "x-api-documents-version": "2" },
    });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  }
  throw new Error(`${path} → échec après 4 tentatives`);
};

const readFileName = async (fileId) => {
  try {
    const link = await api(`/files/${encodeURIComponent(fileId)}`);
    if (!link?.downloadUrl) return null;
    const res = await fetch(link.downloadUrl, { headers: { Range: "bytes=0-0" }, redirect: "follow" });
    const disposition = res.headers.get("content-disposition") ?? "";
    res.body?.cancel?.();
    const star = disposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
    const plain = disposition.match(/filename="?([^";]+)"?/i);
    const raw = star ? decodeURIComponent(star[1]) : plain ? plain[1] : null;
    return raw ? raw.trim().replace(/\.pdf$/i, "") : null;
  } catch {
    return null;
  }
};

// 1. Tous les dossiers -----------------------------------------------------
const operations = [];
if (onlyOperation) {
  const op = await api(`/operations/${encodeURIComponent(onlyOperation)}`);
  if (op) operations.push(op);
} else {
  const limit = 100;
  let offset = 0;
  const seen = new Set();
  for (;;) {
    const page = await api(`/operations?organizationId=${organizationId}&limit=${limit}&offset=${offset}`);
    const rows = Array.isArray(page) ? page : page?.data ?? [];
    let added = 0;
    for (const op of rows) {
      if (op?.id !== undefined && !seen.has(op.id)) {
        seen.add(op.id);
        operations.push(op);
        added += 1;
      }
    }
    const total = Array.isArray(page) ? null : page?.totalItems ?? null;
    offset += limit;
    if (rows.length === 0 || added === 0 || (total !== null && offset >= total)) break;
    await sleep(200);
  }
}
console.log(`${operations.length} dossier(s) lus.`);

// 2. Contrats signés → événements -------------------------------------------
const sinceTs = since ? Date.parse(since) : null;
const stats = { contracts: 0, signed: 0, skippedSince: 0, withFiles: 0, inserted: 0, duplicates: 0, errors: 0 };

for (const op of operations) {
  const contracts = Array.isArray(op.contracts) ? op.contracts : [];
  for (const contract of contracts) {
    stats.contracts += 1;
    if (contract.status !== "SIGNATURE_COMPLETED") continue;
    const signatureTime = contract.signatureTime ?? contract.creationTime ?? null;
    if (sinceTs && signatureTime && Date.parse(signatureTime) < sinceTs) {
      stats.skippedSince += 1;
      continue;
    }
    stats.signed += 1;

    let files = [];
    let signers = [];
    const signatureId = contract.currentSignatureId ?? contract.signatureId ?? null;
    if (signatureId) {
      try {
        const sig = await api(`/signatures/${signatureId}`);
        if (sig) {
          files = [];
          for (const [i, f] of (sig.files ?? []).entries()) {
            if (!f?.signedFileId) continue;
            // Le nom réel du fichier n'est pas dans la réponse : on le lit
            // dans le Content-Disposition du lien de téléchargement.
            let name = await readFileName(f.signedFileId);
            if (!name) name = (sig.files ?? []).length > 1 ? `${contract.label ?? "document"} (${i + 1})` : contract.label ?? "document";
            files.push({ signedFileId: f.signedFileId, name });
          }
          signers = (sig.signatories ?? []).map((s) => ({
            recordId: s.id,
            firstName: s.firstname ?? undefined,
            lastName: s.lastname ?? undefined,
            email: s.email ?? undefined,
            phone: s.phone ?? undefined,
            role: s.type ?? undefined,
          }));
        }
        await sleep(150);
      } catch (err) {
        console.warn(`  ! signature ${signatureId} (contrat ${contract.id}) : ${err.message}`);
      }
    }
    if (files.length > 0) stats.withFiles += 1;

    const payload = {
      eventId: "signature_completed",
      organizationId: Number(organizationId),
      operationId: op.id,
      contractId: contract.id,
      signatureId: signatureId ?? contract.id,
      signatureTime,
      contractType: contract.model,
      operationType: op.label ?? op.type ?? undefined,
      files,
      signers,
      _replay: { source: "mynotary-replay-signatures", at: new Date().toISOString(), operationLabel: op.label ?? null },
    };
    const eventId = `backfill:contract:${contract.id}`;
    console.log(`${dryRun ? "[dry-run] " : ""}${op.label ?? op.id} · ${contract.label ?? contract.model} · ${signatureTime ?? "?"} · ${files.length} fichier(s)${files.length ? " [" + files.map((f) => f.name).join(", ") + "]" : ""}`);
    if (dryRun) continue;

    const { error } = await sb.from("mynotary_events").insert({
      event_id: eventId,
      event_type: "signature_completed",
      event_created_at: signatureTime,
      raw_payload: payload,
      status: "pending",
    });
    if (!error) stats.inserted += 1;
    else if (error.code === "23505") stats.duplicates += 1;
    else {
      stats.errors += 1;
      console.error(`  ! insertion ${eventId} : ${error.message}`);
    }
  }
}

console.log(JSON.stringify(stats));
console.log(
  dryRun
    ? "Dry-run terminé : rien n'a été écrit."
    : "Événements déposés dans la boîte de réception ; le cron mynotary-events (toutes les 5 min, 20 par passage) fait la projection."
);
