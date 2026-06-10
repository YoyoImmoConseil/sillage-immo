import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Single aggregator for the IA-augmented admin dashboard.
//
// We deliberately keep the queries READ-ONLY and additive: every
// count uses `head: true, count: 'exact'` so it returns the count
// without paying for the row payload. Anything that can be derived
// from a single `select` query is colocated to keep the dashboard
// snappy (target: < 800ms SSR).
//
// The whole snapshot is cached for 5 minutes via `unstable_cache`
// behind the tag `admin-dashboard-pilot` — invalidate by calling
// `revalidateTag("admin-dashboard-pilot")` from any service that
// materially changes leads/mandates/visits.

const PERIOD_DAYS = 30;
const HEATMAP_PERIOD_DAYS = 90;
const ADVISOR_PERIOD_DAYS = 90;

const isoDaysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

type CountThenable = {
  then<TResult1 = { count: number | null; error: { message: string } | null }>(
    onfulfilled: (value: {
      count: number | null;
      error: { message: string } | null;
    }) => TResult1 | PromiseLike<TResult1>
  ): PromiseLike<TResult1>;
};

const safeCount = async (thenable: CountThenable): Promise<number> => {
  const { count, error } = await thenable;
  if (error) {
    console.error("[dashboard-aggregator] count failed:", error.message);
    return 0;
  }
  return count ?? 0;
};

export type DashboardKpi = {
  label: string;
  value: number;
  previousValue: number;
  deltaPct: number | null;
  trend: "up" | "down" | "flat";
};

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  ratioToTopPct: number;
};

export type ZoneRow = {
  cityKey: string;
  cityLabel: string;
  sellerLeads: number;
  buyerLeads: number;
  total: number;
};

export type AdvisorRow = {
  adminProfileId: string;
  displayName: string;
  projectsTotal: number;
  mandatesSigned: number;
  mandatesPending: number;
};

export type ConversationsSnapshot = {
  totalLast30d: number;
  anonymousLast30d: number;
  sellerLast30d: number;
  buyerLast30d: number;
  topTopics: Array<{ key: string; count: number }>;
};

export type DashboardSnapshot = {
  generatedAt: string;
  periodDays: number;
  kpis: {
    sellerLeads: DashboardKpi;
    buyerLeads: DashboardKpi;
    visitsScheduled: DashboardKpi;
    mandatesSigned: DashboardKpi;
    offersSigned: DashboardKpi;
    preliminarySalesSigned: DashboardKpi;
    deedsSigned: DashboardKpi;
    conversations: DashboardKpi;
  };
  funnel: FunnelStep[];
  topZones: ZoneRow[];
  advisors: AdvisorRow[];
  conversations: ConversationsSnapshot;
};

const computeKpi = (
  label: string,
  value: number,
  previousValue: number
): DashboardKpi => {
  const deltaPct =
    previousValue === 0
      ? value === 0
        ? 0
        : null
      : Math.round(((value - previousValue) / previousValue) * 100);
  const trend: DashboardKpi["trend"] =
    value > previousValue ? "up" : value < previousValue ? "down" : "flat";
  return { label, value, previousValue, deltaPct, trend };
};

const normalizeCityKey = (raw: string | null | undefined): string => {
  if (!raw) return "unknown";
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
};

const STOPWORDS_FR = new Set<string>([
  "le", "la", "les", "un", "une", "des", "de", "du", "en", "au", "aux",
  "et", "ou", "mais", "que", "qui", "quoi", "dont", "ce", "ces", "cet",
  "cette", "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses",
  "notre", "votre", "leur", "leurs", "je", "tu", "il", "elle", "on",
  "nous", "vous", "ils", "elles", "ne", "pas", "plus", "moins", "pour",
  "par", "avec", "sans", "sur", "sous", "dans", "chez", "tres", "bien",
  "tout", "tous", "toute", "toutes", "est", "sont", "avoir", "etre",
  "faire", "fait", "deja", "ainsi", "tres",
]);

const extractTopicKeywords = (text: string, max = 3): string[] => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOPWORDS_FR.has(token))
    .slice(0, max);
};

// Count the union of:
//   1. MyNotary docs in window for `kind`, deleted_at IS NULL
//   2. seller_projects.<milestoneColumn> in window
// De-duplicating by `seller_projects.id` — a single contract that
// lands in both tables (because the webhook auto-matched the doc to a
// project) is counted ONCE. The `deed` milestone has no MyNotary
// equivalent yet, so `kind` is nullable; the function then just
// returns the seller_projects count for that window.
//
// When `fromIso === null`, the function counts the LIFETIME union
// (no lower bound) — used by the milestone KPI cards which display
// the cumulative total so a manual back-fill of historical
// signatures shows up immediately, regardless of when the user
// actually filled the date.
const countSignedUnion = async (
  milestoneColumn:
    | "mandate_signed_at"
    | "offer_received_at"
    | "preliminary_sale_signed_at"
    | "deed_signed_at",
  kind: "mandate" | "purchase_offer" | "preliminary_sale" | null,
  fromIso: string | null,
  untilIso: string | undefined
): Promise<number> => {
  // Window end defaults to "now + 1 day" so .lt() with the cursor
  // works without special-casing the trailing-edge call site.
  const untilCursor =
    untilIso ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  // Lifetime mode: a sentinel `fromIso` of `0001-01-01` is older than
  // anything in the DB and lets us reuse the same query path.
  const fromCursor = fromIso ?? "0001-01-01T00:00:00Z";

  // 1. MyNotary docs in window: collect their matched_seller_project_id
  //    (so we can de-dupe with the manual seller_project counts).
  let unmatchedMyNotaryCount = 0;
  const matchedProjectIds = new Set<string>();
  if (kind !== null) {
    const { data: docs, error } = await supabaseAdmin
      .from("mynotary_signed_documents")
      .select("matched_seller_project_id")
      .eq("contract_kind", kind)
      .is("deleted_at", null)
      .gte("signed_at", fromCursor)
      .lt("signed_at", untilCursor);
    if (!error && docs) {
      for (const doc of docs) {
        if (doc.matched_seller_project_id) {
          matchedProjectIds.add(doc.matched_seller_project_id);
        } else {
          unmatchedMyNotaryCount += 1;
        }
      }
    }
  }

  // 2. seller_projects with the milestone set in window. The PostgREST
  //    `.not("col", "is", null)` filter gives us a stable way to ask
  //    "this milestone has been set".
  const { data: projects } = await supabaseAdmin
    .from("seller_projects")
    .select("id")
    .not(milestoneColumn, "is", null)
    .gte(milestoneColumn, fromCursor)
    .lt(milestoneColumn, untilCursor);
  const manualProjectIds = new Set<string>((projects ?? []).map((p) => p.id));

  // 3. Union without double counting: every unmatched MyNotary doc
  //    counts on its own; every seller_project with the milestone set
  //    counts once. Projects already represented by a MyNotary doc
  //    fall into the matched set and are absorbed there.
  let result = unmatchedMyNotaryCount;
  for (const pid of manualProjectIds) {
    result += 1;
    matchedProjectIds.delete(pid);
  }
  // Any MyNotary-matched project that does NOT have the milestone set
  // (rare race condition: backfill skipped writing the column for some
  // reason) is still counted because the doc exists.
  result += matchedProjectIds.size;
  return result;
};

const fetchKpis = async (
  periodCursor: string,
  previousCursor: string,
  scheduledUpcomingCursor: string,
  untilCursor: string
) => {
  // `untilCursor` is the exclusive upper bound shared by every
  // "current period" count. The "previous period" upper bound is
  // `periodCursor` (i.e. when the current window starts).
  const rawCounts = await Promise.all([
    safeCount(
      supabaseAdmin
        .from("seller_leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", periodCursor)
        .lt("created_at", untilCursor)
    ),
    safeCount(
      supabaseAdmin
        .from("seller_leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", previousCursor)
        .lt("created_at", periodCursor)
    ),
    safeCount(
      supabaseAdmin
        .from("buyer_leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", periodCursor)
        .lt("created_at", untilCursor)
    ),
    safeCount(
      supabaseAdmin
        .from("buyer_leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", previousCursor)
        .lt("created_at", periodCursor)
    ),
    safeCount(
      supabaseAdmin
        .from("property_visits")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled")
        .gte("scheduled_at", scheduledUpcomingCursor)
    ),
    // "Previous" for visits compares the same window historically.
    safeCount(
      supabaseAdmin
        .from("property_visits")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("scheduled_at", periodCursor)
        .lt("scheduled_at", untilCursor)
    ),
    countSignedUnion("mandate_signed_at", "mandate", periodCursor, untilCursor),
    countSignedUnion("mandate_signed_at", "mandate", previousCursor, periodCursor),
    countSignedUnion("offer_received_at", "purchase_offer", periodCursor, untilCursor),
    countSignedUnion("offer_received_at", "purchase_offer", previousCursor, periodCursor),
    countSignedUnion(
      "preliminary_sale_signed_at",
      "preliminary_sale",
      periodCursor,
      untilCursor
    ),
    countSignedUnion(
      "preliminary_sale_signed_at",
      "preliminary_sale",
      previousCursor,
      periodCursor
    ),
    countSignedUnion("deed_signed_at", null, periodCursor, untilCursor),
    countSignedUnion("deed_signed_at", null, previousCursor, periodCursor),
    safeCount(
      supabaseAdmin
        .from("ai_conversations")
        .select("id", { count: "exact", head: true })
        .gte("started_at", periodCursor)
        .lt("started_at", untilCursor)
    ),
    safeCount(
      supabaseAdmin
        .from("ai_conversations")
        .select("id", { count: "exact", head: true })
        .gte("started_at", previousCursor)
        .lt("started_at", periodCursor)
    ),
  ]);

  // Tuple destructuring keeps the call-site readable: each Promise.all
  // returns its result in the order it was issued above.
  const [
    sellerCurrentValue,
    sellerPreviousValue,
    buyerCurrentValue,
    buyerPreviousValue,
    visitsScheduledCurrentValue,
    visitsScheduledPreviousValue,
    mandatesSignedCurrentValue,
    mandatesSignedPreviousValue,
    offersSignedCurrentValue,
    offersSignedPreviousValue,
    preliminaryCurrentValue,
    preliminaryPreviousValue,
    deedCurrentValue,
    deedPreviousValue,
    conversationsCurrentValue,
    conversationsPreviousValue,
  ] = rawCounts;

  return {
    sellerLeads: computeKpi(
      "Leads vendeurs",
      sellerCurrentValue,
      sellerPreviousValue
    ),
    buyerLeads: computeKpi(
      "Leads acquéreurs",
      buyerCurrentValue,
      buyerPreviousValue
    ),
    visitsScheduled: computeKpi(
      "Visites planifiées",
      visitsScheduledCurrentValue,
      visitsScheduledPreviousValue
    ),
    mandatesSigned: computeKpi(
      "Mandats signés",
      mandatesSignedCurrentValue,
      mandatesSignedPreviousValue
    ),
    offersSigned: computeKpi(
      "Offres signées",
      offersSignedCurrentValue,
      offersSignedPreviousValue
    ),
    preliminarySalesSigned: computeKpi(
      "Compromis signés",
      preliminaryCurrentValue,
      preliminaryPreviousValue
    ),
    deedsSigned: computeKpi(
      "Actes signés",
      deedCurrentValue,
      deedPreviousValue
    ),
    conversations: computeKpi(
      "Conversations IA",
      conversationsCurrentValue,
      conversationsPreviousValue
    ),
  } satisfies DashboardSnapshot["kpis"];
};

const fetchFunnel = async (periodCursor: string): Promise<FunnelStep[]> => {
  // Step 1: distinct anonymous browsers that engaged with the IA on
  // the homepage (entity_type='anonymous', channel='home_assistant').
  const { data: anonRows } = await supabaseAdmin
    .from("ai_conversations")
    .select("metadata, id")
    .eq("entity_type", "anonymous")
    .eq("channel", "home_assistant")
    .gte("started_at", periodCursor)
    .limit(5000);

  const anonymousSessions = new Set<string>();
  for (const row of (anonRows ?? []) as Array<{
    metadata: Record<string, unknown> | null;
    id: string;
  }>) {
    const meta = row.metadata ?? {};
    const sessionId =
      typeof meta.anonymous_session_id === "string"
        ? meta.anonymous_session_id
        : row.id;
    anonymousSessions.add(sessionId);
  }

  const [sellerLeads, buyerLeads, leadsWithAdvisor, mandatesSigned] =
    await Promise.all([
      safeCount(
        supabaseAdmin
          .from("seller_leads")
          .select("id", { count: "exact", head: true })
          .gte("created_at", periodCursor)
      ),
      safeCount(
        supabaseAdmin
          .from("buyer_leads")
          .select("id", { count: "exact", head: true })
          .gte("created_at", periodCursor)
      ),
      safeCount(
        supabaseAdmin
          .from("seller_projects")
          .select("id", { count: "exact", head: true })
          .not("assigned_admin_profile_id", "is", null)
          .gte("updated_at", periodCursor)
      ),
      countSignedUnion("mandate_signed_at", "mandate", periodCursor, undefined),
    ]);

  const totalLeads = sellerLeads + buyerLeads;
  const top = Math.max(anonymousSessions.size, totalLeads, 1);

  const buildStep = (
    key: string,
    label: string,
    count: number
  ): FunnelStep => ({
    key,
    label,
    count,
    ratioToTopPct: Math.round((count / top) * 100),
  });

  return [
    buildStep("visitors", "Visiteurs IA (anonyme)", anonymousSessions.size),
    buildStep("leads", "Leads créés", totalLeads),
    buildStep("advisor", "En contact conseiller", leadsWithAdvisor),
    buildStep("mandates", "Mandats signés", mandatesSigned),
  ];
};

const fetchTopZones = async (
  periodCursor: string,
  topN = 5
): Promise<ZoneRow[]> => {
  const [sellerRows, buyerRows] = await Promise.all([
    supabaseAdmin
      .from("seller_leads")
      .select("city")
      .gte("created_at", periodCursor)
      .not("city", "is", null)
      .limit(5000),
    supabaseAdmin
      .from("buyer_search_profiles")
      .select("cities, location_text, updated_at")
      .gte("updated_at", periodCursor)
      .limit(5000),
  ]);

  const counts = new Map<
    string,
    { cityLabel: string; sellerLeads: number; buyerLeads: number }
  >();

  const bump = (
    rawCity: string | null | undefined,
    bucket: "seller" | "buyer"
  ) => {
    const cityLabel = (rawCity ?? "").trim();
    if (!cityLabel) return;
    const cityKey = normalizeCityKey(cityLabel);
    const current = counts.get(cityKey) ?? {
      cityLabel,
      sellerLeads: 0,
      buyerLeads: 0,
    };
    if (bucket === "seller") current.sellerLeads += 1;
    else current.buyerLeads += 1;
    counts.set(cityKey, current);
  };

  for (const row of (sellerRows.data ?? []) as Array<{ city: string | null }>) {
    bump(row.city, "seller");
  }

  for (const row of (buyerRows.data ?? []) as Array<{
    cities: string[] | null;
    location_text: string | null;
  }>) {
    if (Array.isArray(row.cities) && row.cities.length > 0) {
      for (const c of row.cities) bump(c, "buyer");
    } else if (row.location_text) {
      bump(row.location_text, "buyer");
    }
  }

  return Array.from(counts.entries())
    .map(([cityKey, value]) => ({
      cityKey,
      cityLabel: value.cityLabel,
      sellerLeads: value.sellerLeads,
      buyerLeads: value.buyerLeads,
      total: value.sellerLeads + value.buyerLeads,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
};

const fetchAdvisorPerformance = async (
  periodCursor: string,
  topN = 10
): Promise<AdvisorRow[]> => {
  // List every ACTIVE admin profile first, so a conseiller with 0
  // assigned projects in the period still appears with zeros. This
  // matches the manager's mental model ("show me my whole team's
  // numbers, not only the ones who already moved a project").
  const { data: profileRows } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, first_name, last_name, email, is_active")
    .eq("is_active", true)
    .limit(500);

  type AdvisorAgg = {
    projectsTotal: number;
    mandatesSigned: number;
    mandatesPending: number;
  };
  const agg = new Map<string, AdvisorAgg>();

  // Seed the aggregator with every active advisor at zero so they
  // appear even with no project activity in the period.
  const profileById = new Map<string, { displayName: string }>();
  for (const row of (profileRows ?? []) as Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }>) {
    const displayName =
      `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() ||
      row.email ||
      "Conseiller";
    profileById.set(row.id, { displayName });
    agg.set(row.id, {
      projectsTotal: 0,
      mandatesSigned: 0,
      mandatesPending: 0,
    });
  }

  // Overlay seller_project activity for the chosen window.
  const { data: projectRows } = await supabaseAdmin
    .from("seller_projects")
    .select("assigned_admin_profile_id, mandate_status, updated_at")
    .gte("updated_at", periodCursor)
    .not("assigned_admin_profile_id", "is", null)
    .limit(5000);

  for (const row of (projectRows ?? []) as Array<{
    assigned_admin_profile_id: string | null;
    mandate_status: string;
  }>) {
    if (!row.assigned_admin_profile_id) continue;
    const id = row.assigned_admin_profile_id;
    // Edge case: a project assigned to an inactive / removed profile.
    // We still want it counted somewhere, so we insert a placeholder.
    const current =
      agg.get(id) ?? {
        projectsTotal: 0,
        mandatesSigned: 0,
        mandatesPending: 0,
      };
    current.projectsTotal += 1;
    if (row.mandate_status === "signed") current.mandatesSigned += 1;
    else if (row.mandate_status && row.mandate_status !== "none") {
      current.mandatesPending += 1;
    }
    agg.set(id, current);
    if (!profileById.has(id)) {
      profileById.set(id, { displayName: "Conseiller (inactif)" });
    }
  }

  return Array.from(agg.entries())
    .map(([id, a]) => {
      const profile = profileById.get(id);
      return {
        adminProfileId: id,
        displayName: profile?.displayName ?? "Conseiller",
        projectsTotal: a.projectsTotal,
        mandatesSigned: a.mandatesSigned,
        mandatesPending: a.mandatesPending,
      };
    })
    // Active advisors with most activity first; ties broken by
    // alphabetic display name so the order is stable and the user
    // can scan the team list predictably.
    .sort(
      (a, b) =>
        b.mandatesSigned - a.mandatesSigned ||
        b.projectsTotal - a.projectsTotal ||
        a.displayName.localeCompare(b.displayName, "fr")
    )
    .slice(0, topN);
};

const fetchConversationsSnapshot = async (
  periodCursor: string,
  topicTopN = 8
): Promise<ConversationsSnapshot> => {
  const { data: convRows, count: total } = await supabaseAdmin
    .from("ai_conversations")
    .select("id, entity_type", { count: "exact" })
    .gte("started_at", periodCursor)
    .limit(5000);

  const conversations = (convRows ?? []) as Array<{
    id: string;
    entity_type: string;
  }>;
  let anonymous = 0;
  let seller = 0;
  let buyer = 0;
  for (const c of conversations) {
    if (c.entity_type === "anonymous") anonymous += 1;
    else if (c.entity_type === "seller_lead") seller += 1;
    else if (c.entity_type === "buyer_lead") buyer += 1;
  }

  const ids = conversations.map((c) => c.id);
  let topTopics: ConversationsSnapshot["topTopics"] = [];
  if (ids.length > 0) {
    const { data: msgRows } = await supabaseAdmin
      .from("ai_messages")
      .select("conversation_id, content, role, created_at")
      .in("conversation_id", ids)
      .eq("role", "user")
      .order("created_at", { ascending: true })
      .limit(5000);

    const firstUserMessageByConv = new Map<string, string>();
    for (const row of (msgRows ?? []) as Array<{
      conversation_id: string;
      content: string;
    }>) {
      if (!firstUserMessageByConv.has(row.conversation_id)) {
        firstUserMessageByConv.set(row.conversation_id, row.content);
      }
    }

    const topicCounts = new Map<string, number>();
    for (const text of firstUserMessageByConv.values()) {
      const keywords = extractTopicKeywords(text, 3);
      for (const kw of keywords) {
        topicCounts.set(kw, (topicCounts.get(kw) ?? 0) + 1);
      }
    }

    topTopics = Array.from(topicCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topicTopN);
  }

  return {
    totalLast30d: total ?? conversations.length,
    anonymousLast30d: anonymous,
    sellerLast30d: seller,
    buyerLast30d: buyer,
    topTopics,
  };
};

// =====================================================================
// Period selection
// =====================================================================
//
// The dashboard accepts an optional `{ since, until }` window. When
// omitted, both default to the legacy behaviour (last 30 days). A
// preset of `"all"` means "no lower bound", i.e. every signed
// document since the agency's first day. The aggregator computes the
// "previous period" by mirroring the chosen window immediately
// before `since`, so KPI trends stay meaningful regardless of the
// chosen range.
//
// `since` and `until` are inclusive lower / exclusive upper bounds.
// The KPIs that use `signed_at` / `created_at` / `started_at` all
// apply `.gte(since)` and `.lt(until)` consistently.

export type DashboardPeriodPreset = "7d" | "30d" | "90d" | "1y" | "all" | "custom";

export type DashboardPeriodInput = {
  since?: string | null;
  until?: string | null;
  preset?: DashboardPeriodPreset;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const resolvePeriod = (
  input: DashboardPeriodInput | undefined
): {
  since: string | null;
  until: string;
  previousSince: string | null;
  previousUntil: string;
  preset: DashboardPeriodPreset;
  // periodDays is only meaningful when `since` is bounded; used for
  // labels + the legacy `periodDays` field on the snapshot. For the
  // "all" preset, we expose 0 to make UI code obvious.
  periodDays: number;
} => {
  const nowMs = Date.now();
  const untilIso = input?.until ?? new Date(nowMs).toISOString();

  if (input?.preset === "all" || input?.since === null) {
    return {
      since: null,
      until: untilIso,
      previousSince: null,
      previousUntil: untilIso,
      preset: "all",
      periodDays: 0,
    };
  }

  let sinceIso = input?.since;
  if (!sinceIso) {
    const days =
      input?.preset === "7d"
        ? 7
        : input?.preset === "90d"
          ? 90
          : input?.preset === "1y"
            ? 365
            : 30;
    sinceIso = new Date(nowMs - days * DAY_MS).toISOString();
  }

  const sinceMs = Date.parse(sinceIso);
  const untilMs = Date.parse(untilIso);
  const windowMs = Math.max(untilMs - sinceMs, DAY_MS);
  const previousSinceIso = new Date(sinceMs - windowMs).toISOString();

  return {
    since: sinceIso,
    until: untilIso,
    previousSince: previousSinceIso,
    previousUntil: sinceIso,
    preset: input?.preset ?? "custom",
    periodDays: Math.round(windowMs / DAY_MS),
  };
};

const computeDashboardSnapshot = async (
  input?: DashboardPeriodInput
): Promise<DashboardSnapshot> => {
  const period = resolvePeriod(input);
  const now = new Date();
  // Down-stream services still take a single "cursor" string for now;
  // we feed them `since` (or `0001-01-01` when lifetime). The trend
  // KPIs below explicitly use both `since` and `previousSince`.
  const periodCursor =
    period.since ?? "0001-01-01T00:00:00Z";
  const previousCursor =
    period.previousSince ?? "0001-01-01T00:00:00Z";
  const scheduledUpcomingCursor = now.toISOString();

  void ADVISOR_PERIOD_DAYS;
  const advisorCursor =
    period.since ?? isoDaysAgo(ADVISOR_PERIOD_DAYS);
  const heatmapCursor =
    period.since ?? isoDaysAgo(HEATMAP_PERIOD_DAYS);

  const [kpis, funnel, topZones, advisors, conversations] = await Promise.all([
    fetchKpis(periodCursor, previousCursor, scheduledUpcomingCursor, period.until),
    fetchFunnel(periodCursor),
    fetchTopZones(heatmapCursor, 5),
    fetchAdvisorPerformance(advisorCursor, 10),
    fetchConversationsSnapshot(periodCursor, 8),
  ]);

  return {
    generatedAt: now.toISOString(),
    periodDays: period.periodDays || PERIOD_DAYS,
    kpis,
    funnel,
    topZones,
    advisors,
    conversations,
  };
};

export const DASHBOARD_PILOT_CACHE_TAG = "admin-dashboard-pilot";

// Build a deterministic cache key per period so the dashboard does
// not serve cross-range snapshots. The tag stays shared so
// `revalidateTag(DASHBOARD_PILOT_CACHE_TAG)` invalidates every period
// at once when underlying data changes.
const periodCacheKey = (input?: DashboardPeriodInput): string => {
  const preset = input?.preset ?? "default";
  const since = input?.since ?? "auto";
  const until = input?.until ?? "now";
  return `admin-dashboard-pilot-v2-${preset}-${since}-${until}`;
};

export const getDashboardSnapshot = async (
  input?: DashboardPeriodInput
): Promise<DashboardSnapshot> => {
  const cached = unstable_cache(
    () => computeDashboardSnapshot(input),
    [periodCacheKey(input)],
    {
      revalidate: 300,
      tags: [DASHBOARD_PILOT_CACHE_TAG],
    }
  );
  return cached();
};
