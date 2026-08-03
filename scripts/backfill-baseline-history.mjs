// Amorçage unique des journaux d'historique.
//
// Le cron SweepBright ne traite que les livraisons EN ATTENTE ; les 102
// livraisons existantes étant déjà `processed`, les journaux ne se rempliraient
// qu'au gré des prochaines modifications, bien par bien. Ce script pose le
// point de départ pour que le premier écart de prix soit calculable.
//
// Trois écritures par bien, toutes honnêtes sur leur provenance :
//   - un événement de prix `baseline` (source `backfill`) : le premier prix
//     JAMAIS OBSERVÉ, pas le prix de mandat. Ne jamais l'utiliser comme
//     référence d'un écart publié.
//   - un événement de statut (source `backfill`).
//   - le mandat, s'il figure dans raw_payload : numéro, exclusivité, dates,
//     taux d'honoraires. `mandate_price_amount` est laissé VIDE : ce prix est
//     inconnu pour le passé et le fabriquer flatterait tous les ratios.
//
// Idempotent : la contrainte unique sur dedupe_key rend un second passage sans
// effet.
//
// Usage : node --env-file=.env.local scripts/backfill-baseline-history.mjs [--dry-run]
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const PUBLIC_STATUSES = new Set(["available", "agreement", "option"]);

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const hash = (value) => createHash("sha256").update(value).digest("hex");

const priceKey = ({ propertyId, context, amount, occurredAt, source }) =>
  hash(
    ["price-event", source, context, propertyId, "no-project", String(amount), occurredAt].join(":")
  );

const statusKey = ({ propertyId, status, occurredAt, source }) =>
  hash(["status-event", source, propertyId, status, occurredAt].join(":"));

const isoDate = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
};

const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const { data: properties, error } = await db
  .from("properties")
  .select("id, source_ref, availability_status, last_synced_at, updated_at, raw_payload")
  .eq("source", "sweepbright")
  .order("created_at", { ascending: true });

if (error) {
  console.error("lecture properties:", error.message);
  process.exit(1);
}

const { data: listings, error: listingError } = await db
  .from("property_listings")
  .select("property_id, business_type, price_amount, price_currency");

if (listingError) {
  console.error("lecture property_listings:", listingError.message);
  process.exit(1);
}

const listingByProperty = new Map();
for (const listing of listings ?? []) {
  if (!listingByProperty.has(listing.property_id)) {
    listingByProperty.set(listing.property_id, listing);
  }
}

const stats = { prix: 0, statuts: 0, mandats: 0, sansPrix: 0, sansMandat: 0 };

for (const property of properties ?? []) {
  // Date métier la plus honnête disponible : le moment où l'application a
  // constaté cet état auprès de SweepBright.
  const observedAt = property.last_synced_at ?? property.updated_at;
  const listing = listingByProperty.get(property.id) ?? null;
  const status = (property.availability_status ?? "").trim();
  const mandate = property.raw_payload?.mandate ?? null;
  const mandateNumber =
    typeof mandate?.number === "number"
      ? String(mandate.number)
      : typeof mandate?.number === "string" && mandate.number.trim()
        ? mandate.number.trim()
        : null;

  // 1. Mandat
  if (mandateNumber) {
    const row = {
      property_id: property.id,
      mandate_number: mandateNumber,
      is_exclusive: typeof mandate.exclusive === "boolean" ? mandate.exclusive : null,
      start_date: isoDate(mandate.start_date),
      end_date: isoDate(mandate.end_date),
      vendor_percentage: num(property.raw_payload?.vendor_percentage),
      vendor_fixed_fee: num(property.raw_payload?.vendor_fixed_fee),
      buyer_percentage: num(property.raw_payload?.buyer_percentage),
      buyer_fixed_fee: num(property.raw_payload?.buyer_fixed_fee),
      source: "backfill",
      metadata: { source_ref: property.source_ref, note: "reconstitue depuis raw_payload" },
    };
    if (!DRY_RUN) {
      const { error: e } = await db
        .from("property_mandates")
        .upsert(row, { onConflict: "property_id,mandate_number" });
      if (e) console.error(`mandat ${property.source_ref}:`, e.message);
      else stats.mandats += 1;
    } else stats.mandats += 1;
  } else {
    stats.sansMandat += 1;
  }

  // 2. Statut
  if (status) {
    const row = {
      property_id: property.id,
      mandate_number: mandateNumber,
      status,
      previous_status: null,
      is_public: PUBLIC_STATUSES.has(status.toLowerCase()),
      occurred_at: observedAt,
      source: "backfill",
      source_ref: property.source_ref,
      dedupe_key: statusKey({
        propertyId: property.id,
        status,
        occurredAt: observedAt,
        source: "backfill",
      }),
      metadata: { note: "etat constate a l'amorcage, transition non observee" },
    };
    if (!DRY_RUN) {
      const { error: e } = await db.from("property_status_events").insert(row);
      if (e && e.code !== "23505") console.error(`statut ${property.source_ref}:`, e.message);
      else if (!e) stats.statuts += 1;
    } else stats.statuts += 1;
  }

  // 3. Prix
  const amount = num(listing?.price_amount);
  if (amount === null) {
    stats.sansPrix += 1;
    continue;
  }
  const row = {
    property_id: property.id,
    mandate_number: mandateNumber,
    context: "baseline",
    amount: Math.round(amount),
    previous_amount: null,
    currency: listing?.price_currency || "EUR",
    occurred_at: observedAt,
    source: "backfill",
    source_ref: property.source_ref,
    dedupe_key: priceKey({
      propertyId: property.id,
      context: "baseline",
      amount: Math.round(amount),
      occurredAt: observedAt,
      source: "backfill",
    }),
    metadata: {
      status,
      business_type: listing?.business_type ?? null,
      note: "premier prix observe, PAS le prix de mandat",
    },
  };
  if (!DRY_RUN) {
    const { error: e } = await db.from("property_price_events").insert(row);
    if (e && e.code !== "23505") console.error(`prix ${property.source_ref}:`, e.message);
    else if (!e) stats.prix += 1;
  } else stats.prix += 1;
}

console.log(DRY_RUN ? "=== SIMULATION (aucune ecriture) ===" : "=== AMORCAGE APPLIQUE ===");
console.log(`  biens traites            : ${properties?.length ?? 0}`);
console.log(`  evenements de prix       : ${stats.prix}`);
console.log(`  evenements de statut     : ${stats.statuts}`);
console.log(`  mandats enregistres      : ${stats.mandats}`);
console.log(`  biens sans prix d'annonce: ${stats.sansPrix}`);
console.log(`  biens sans mandat        : ${stats.sansMandat}`);
