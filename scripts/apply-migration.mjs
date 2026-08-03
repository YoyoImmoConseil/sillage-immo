// Applique du SQL sur la base Supabase via l'API de gestion.
//
// Les migrations de db/migrations/ sont appliquées à la main (pas de Supabase
// CLI lié, pas de dossier supabase/). Ce script fait le pont.
//
// Usage :
//   node --env-file=.env.local scripts/apply-migration.mjs db/migrations/XXX.sql
//   node --env-file=.env.local scripts/apply-migration.mjs --sql "select 1 as ok"
import { readFile } from "node:fs/promises";

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN manquant dans .env.local");
  process.exit(1);
}

const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(
  /https:\/\/([a-z0-9]+)\.supabase\.co/
)?.[1];
if (!projectRef) {
  console.error("Impossible de déduire la référence projet de NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const args = process.argv.slice(2);
const inlineIndex = args.indexOf("--sql");
const query =
  inlineIndex >= 0
    ? args[inlineIndex + 1]
    : await readFile(args[0], "utf8");

if (!query?.trim()) {
  console.error("Aucun SQL à exécuter.");
  process.exit(1);
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  }
);

const text = await response.text();
console.log(`projet   : ${projectRef}`);
console.log(`http     : ${response.status} ${response.statusText}`);

let parsed = null;
try {
  parsed = JSON.parse(text);
} catch {
  console.log(`reponse  : ${text.slice(0, 2000)}`);
}

if (parsed) {
  console.log(`reponse  : ${JSON.stringify(parsed, null, 2).slice(0, 4000)}`);
}

process.exit(response.ok ? 0 : 1);
