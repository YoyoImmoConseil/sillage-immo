// Diagnostic lecture seule pour le brief de refonte (§7).
// Usage : node --env-file=.env.local scripts/diagnostic-refonte.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const count = async (table) => {
  const { count: n, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true });
  return error ? `erreur: ${error.message}` : n;
};

const countWhere = async (table, col, val) => {
  const { count: n, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(col, val);
  return error ? `erreur: ${error.message}` : n;
};

const extreme = async (table, col, ascending) => {
  const { data, error } = await db
    .from(table)
    .select(col)
    .order(col, { ascending })
    .limit(1);
  if (error) return `erreur: ${error.message}`;
  return data?.[0]?.[col] ?? "aucune ligne";
};

console.log("=== E. Inventaire general ===");
for (const t of [
  "transactions",
  "properties",
  "property_listings",
  "property_visits",
  "buyer_search_profiles",
  "buyer_leads",
  "seller_leads",
  "valuations",
  "market_observations",
  "crm_webhook_deliveries",
  "honoraires_history",
  "zone_catalog",
]) {
  console.log(`  ${t.padEnd(24)} ${await count(t)}`);
}

console.log("\n=== B. crm_webhook_deliveries par provider x statut ===");
for (const provider of ["sweepbright", "sweepbright-zapier", "mynotary"]) {
  const total = await countWhere("crm_webhook_deliveries", "provider", provider);
  if (total === 0) {
    console.log(`  ${provider.padEnd(20)} 0`);
    continue;
  }
  const parts = [];
  for (const status of ["received", "processing", "processed", "failed", "ignored"]) {
    const { count: n } = await db
      .from("crm_webhook_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("provider", provider)
      .eq("status", status);
    if (n) parts.push(`${status}=${n}`);
  }
  const { data: bornes } = await db
    .from("crm_webhook_deliveries")
    .select("created_at")
    .eq("provider", provider)
    .order("created_at", { ascending: true })
    .limit(1);
  const { data: bornes2 } = await db
    .from("crm_webhook_deliveries")
    .select("created_at")
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(1);
  console.log(
    `  ${provider.padEnd(20)} total=${total} ${parts.join(" ")} | du ${bornes?.[0]?.created_at ?? "?"} au ${bornes2?.[0]?.created_at ?? "?"}`
  );
}

console.log("\n=== C. Forme du payload sweepbright (CLES uniquement, pas de valeurs) ===");
{
  const { data, error } = await db
    .from("crm_webhook_deliveries")
    .select("event_name, payload, created_at")
    .eq("provider", "sweepbright")
    .order("created_at", { ascending: true })
    .limit(3);
  if (error) console.log(`  erreur: ${error.message}`);
  else if (!data?.length) console.log("  aucune livraison sweepbright");
  else
    data.forEach((r, i) =>
      console.log(
        `  [${i}] ${r.created_at} event=${r.event_name} cles=${JSON.stringify(Object.keys(r.payload ?? {}))}`
      )
    );
}

console.log("\n=== D. properties par availability_status ===");
{
  const { data, error } = await db
    .from("properties")
    .select("availability_status")
    .limit(5000);
  if (error) console.log(`  erreur: ${error.message}`);
  else {
    const tally = {};
    data.forEach((r) => {
      const k = r.availability_status ?? "(null)";
      tally[k] = (tally[k] ?? 0) + 1;
    });
    Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(`  ${String(k).padEnd(24)} ${v}`));
  }
}

console.log("\n=== Complements decisifs pour la sequence des lots ===");
console.log(`  property_listings avec prix : ${await (async () => {
  const { count: n, error } = await db
    .from("property_listings")
    .select("id", { count: "exact", head: true })
    .not("price_amount", "is", null);
  return error ? error.message : n;
})()}`);
console.log(`  properties avec virtual_tour_url : ${await (async () => {
  const { count: n, error } = await db
    .from("properties")
    .select("id", { count: "exact", head: true })
    .not("virtual_tour_url", "is", null);
  return error ? error.message : n;
})()}`);
console.log(`  market_observations avec neighborhood : ${await (async () => {
  const { count: n, error } = await db
    .from("market_observations")
    .select("id", { count: "exact", head: true })
    .not("neighborhood", "is", null);
  return error ? error.message : n;
})()}`);
console.log(`  zone_catalog actifs : ${await countWhere("zone_catalog", "is_active", true)}`);
console.log(`  buyer_search_profiles actifs : ${await countWhere("buyer_search_profiles", "status", "active")}`);
console.log(`  plus ancienne livraison sweepbright : ${await extreme("crm_webhook_deliveries", "created_at", true)}`);
