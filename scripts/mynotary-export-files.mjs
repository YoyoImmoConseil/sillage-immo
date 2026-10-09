#!/usr/bin/env node
/**
 * PROCÉDURE DE SORTIE MyNotary — téléchargement en masse de tous les fichiers.
 *
 * À lancer AVANT toute résiliation de l'abonnement MyNotary (l'accès à l'API
 * et aux fichiers après résiliation n'est pas garanti — question posée à
 * MyNotary, cf. docs/integrations/mynotary.md).
 *
 * Ce que fait le script :
 *   1. lit tous les identifiants de fichiers connus : table `mynotary_files`
 *      (registre, une ligne par fichier) et, en complément, `files[]` des
 *      `mynotary_signed_documents` (anciens enregistrements) ;
 *   2. pour chaque identifiant, demande un lien frais à l'API
 *      (`GET /files/{fileId}`) et télécharge le PDF dans le dossier de sortie,
 *      sous `<contractId>/<kind>_<nom>.pdf` ;
 *   3. écrit un manifeste `manifest.json` (fileId → chemin, taille, SHA-256,
 *      erreurs) pour pouvoir reprendre et vérifier.
 *
 * Idempotent : un fichier déjà présent et de taille non nulle est sauté
 * (`--force` pour retélécharger).
 *
 * Usage :
 *   MYNOTARY_API_KEY=<clé prod> node --env-file=.env.local \
 *     scripts/mynotary-export-files.mjs --out ~/Desktop/mynotary-export [--force] [--limit N]
 *
 * Variables lues : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * MYNOTARY_API_KEY (ne jamais l'écrire dans un fichier : la passer dans
 * l'environnement de la commande), MYNOTARY_API_BASE_URL (optionnelle).
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const outDir = readArg("--out", "./mynotary-export");
const force = args.includes("--force");
const limit = Number.parseInt(readArg("--limit", "0"), 10) || 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.MYNOTARY_API_KEY;
const baseUrl = (process.env.MYNOTARY_API_BASE_URL ?? "https://api.mynotary.fr/api/v1").replace(/\/+$/, "");
if (!supabaseUrl || !serviceKey || !apiKey) {
  console.error("Variables manquantes : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MYNOTARY_API_KEY.");
  process.exit(1);
}
const sb = createClient(supabaseUrl, serviceKey);

const sanitize = (s) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "document";

// 1. Inventaire des identifiants ------------------------------------------
const inventory = new Map(); // fileId → { contractId, kind, name }
{
  const { data, error } = await sb
    .from("mynotary_files")
    .select("file_id, mynotary_contract_id, kind, name");
  if (error) {
    console.error("Lecture mynotary_files impossible :", error.message);
    process.exit(1);
  }
  for (const row of data ?? []) {
    inventory.set(row.file_id, {
      contractId: row.mynotary_contract_id ?? "sans-contrat",
      kind: row.kind ?? "signed",
      name: row.name ?? "",
    });
  }
}
{
  const { data } = await sb
    .from("mynotary_signed_documents")
    .select("mynotary_contract_id, files")
    .is("deleted_at", null);
  for (const row of data ?? []) {
    for (const f of Array.isArray(row.files) ? row.files : []) {
      const id = f?.signedFileId || (typeof f?.url === "string" ? f.url.split("/").filter(Boolean).pop() : null);
      if (id && !inventory.has(id)) {
        inventory.set(id, { contractId: row.mynotary_contract_id, kind: "signed", name: f?.name ?? "" });
      }
    }
  }
}
const ids = [...inventory.keys()].slice(0, limit > 0 ? limit : undefined);
console.log(`${inventory.size} fichier(s) connus, ${ids.length} à traiter → ${outDir}`);
await mkdir(outDir, { recursive: true });

// 2. Téléchargement ---------------------------------------------------------
const manifestPath = join(outDir, "manifest.json");
let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  manifest = {};
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let done = 0;
let failed = 0;
for (const fileId of ids) {
  const meta = inventory.get(fileId);
  const relPath = join(sanitize(meta.contractId), `${meta.kind}_${sanitize(meta.name || fileId)}.pdf`);
  const absPath = join(outDir, relPath);
  if (!force) {
    try {
      const st = await stat(absPath);
      if (st.size > 0) {
        manifest[fileId] = { ...(manifest[fileId] ?? {}), path: relPath, bytes: st.size, skipped: true };
        done += 1;
        continue;
      }
    } catch {
      // absent → on télécharge
    }
  }
  try {
    const linkRes = await fetch(`${baseUrl}/files/${encodeURIComponent(fileId)}`, {
      headers: { "x-api-key": apiKey, "x-api-date-version": "2", "x-api-documents-version": "2" },
    });
    if (!linkRes.ok) throw new Error(`GET /files/${fileId} → ${linkRes.status}`);
    const { downloadUrl } = await linkRes.json();
    if (!downloadUrl) throw new Error("downloadUrl absent");
    const fileRes = await fetch(downloadUrl, { redirect: "follow" });
    if (!fileRes.ok) throw new Error(`téléchargement → ${fileRes.status}`);
    const bytes = Buffer.from(await fileRes.arrayBuffer());
    if (bytes.length === 0) throw new Error("fichier vide");
    await mkdir(join(outDir, sanitize(meta.contractId)), { recursive: true });
    await writeFile(absPath, bytes);
    manifest[fileId] = {
      path: relPath,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      contractId: meta.contractId,
      kind: meta.kind,
      name: meta.name,
      downloadedAt: new Date().toISOString(),
    };
    done += 1;
    console.log(`✓ ${relPath} (${bytes.length} o)`);
  } catch (err) {
    failed += 1;
    manifest[fileId] = { ...(manifest[fileId] ?? {}), error: String(err?.message ?? err), failedAt: new Date().toISOString() };
    console.error(`✗ ${fileId}: ${err?.message ?? err}`);
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await sleep(250); // limite API 300 req/min, large marge
}

console.log(`Terminé : ${done} ok, ${failed} en échec. Manifeste : ${manifestPath}`);
process.exit(failed > 0 ? 2 : 0);
