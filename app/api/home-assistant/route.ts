import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SILLAGE_AGENCY_KNOWLEDGE,
  SILLAGE_AGENCY_KNOWLEDGE_VERSION,
  SILLAGE_BRAND_SOCLE,
  SILLAGE_BRAND_SOCLE_VERSION,
} from "@/lib/ai/knowledge/sillage-agency-knowledge";
import { invokeMcpToolInternal } from "@/lib/mcp/invoke-internal";
import { inferZoneFromText } from "@/lib/scoring/zone-catalog";
import { getRuntimeZoneCatalog } from "@/lib/scoring/zone-repository";
import { callOpenAiChat, CLIENT_CHAT_MODEL } from "@/lib/ai/openai";
import { logConversationTurn } from "@/lib/ai/conversation-logger";
import {
  ANONYMOUS_SESSION_COOKIE_NAME,
  OPT_OUT_COOKIE_NAME,
  parseAnonymousSessionCookie,
} from "@/lib/ai/anonymous-session";
import {
  checkPersistentRateLimit,
  extractClientIp,
  rateLimitResponseBody,
} from "@/lib/rate-limit/persistent";

type InputBody = {
  message?: string;
  history?: Array<{ role?: string; text?: string }>;
  locale?: "fr" | "en" | "es" | "ru";
};

type ListingSearchCriteria = {
  businessType?: "sale" | "rental";
  city?: string;
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  surfaceMin?: number;
  hasTerrace?: boolean;
  hasElevator?: boolean;
};

type AssistantListing = {
  title: string | null;
  city: string | null;
  postalCode: string | null;
  propertyType: string | null;
  businessType: string | null;
  rooms: number | null;
  livingArea: number | null;
  priceLabel: string;
  url: string | null;
  coverImageUrl: string | null;
};

type CtaKind = "none" | "resource" | "expert";

type AssistantPayload = {
  reply: string;
  intent: "seller" | "buyer" | "market" | "unclear";
  ctaKind: CtaKind;
  ctaLabel: string;
  ctaHref: string;
  listingSearch: ListingSearchCriteria | null;
  listings?: AssistantListing[];
};

const normalize = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
};

const hasSellerIntent = (value: string) => {
  const normalized = normalize(value);
  return ["vendre", "vente", "vends", "estimation", "estimer"].some((token) =>
    normalized.includes(token)
  );
};

// Detects whether the visitor is explicitly asking to reach a human. Only then
// may the assistant surface an "expert" CTA early; otherwise the contact step
// stays gated behind engagement (see CTA policy below).
const hasExpertRequest = (value: string) => {
  const normalized = normalize(value);
  return [
    "contacter",
    "contact",
    "parler a",
    "parler avec",
    "rendez vous",
    "rdv",
    "rappel",
    "rappeler",
    "joindre",
    "rencontrer",
    "conseiller",
    "appeler",
    "telephone",
    "quelqu un",
    "un agent",
    "un expert",
    "echanger",
  ].some((token) => normalized.includes(token));
};

const hasLocationHint = (value: string, knownCities: string[]) => {
  const normalized = normalize(value);
  const hasAddressToken = [
    "rue ",
    "avenue ",
    "av ",
    "bd ",
    "boulevard ",
    "quartier ",
    "impasse ",
    "chemin ",
    "place ",
    "promenade ",
    "route ",
    "allee ",
  ].some((token) => normalized.includes(token));
  const hasKnownCity = knownCities.some((city) => normalized.includes(city));
  return hasAddressToken || hasKnownCity;
};

const toNonNegativeNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
};

const sanitizeListingSearch = (raw: unknown): ListingSearchCriteria | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: ListingSearchCriteria = {};

  if (r.businessType === "sale" || r.businessType === "rental") {
    out.businessType = r.businessType;
  }
  if (typeof r.city === "string" && r.city.trim().length > 0) {
    out.city = r.city.trim().slice(0, 80);
  }
  if (typeof r.propertyType === "string" && r.propertyType.trim().length > 0) {
    out.propertyType = r.propertyType.trim().slice(0, 40);
  }
  const priceMin = toNonNegativeNumber(r.priceMin);
  if (priceMin !== undefined) out.priceMin = priceMin;
  const priceMax = toNonNegativeNumber(r.priceMax);
  if (priceMax !== undefined) out.priceMax = priceMax;
  const roomsMin = toNonNegativeNumber(r.roomsMin);
  if (roomsMin !== undefined) out.roomsMin = roomsMin;
  const roomsMax = toNonNegativeNumber(r.roomsMax);
  if (roomsMax !== undefined) out.roomsMax = roomsMax;
  const surfaceMin = toNonNegativeNumber(r.surfaceMin);
  if (surfaceMin !== undefined) out.surfaceMin = surfaceMin;
  if (typeof r.hasTerrace === "boolean") out.hasTerrace = r.hasTerrace;
  if (typeof r.hasElevator === "boolean") out.hasElevator = r.hasElevator;

  return Object.keys(out).length > 0 ? out : null;
};

// Canonical, EXISTING destinations only. The model is never trusted to emit a
// raw URL: anything outside this allowlist is replaced by the intent default,
// which kills the dead-anchor links (#acquereur-form / #contact-expert) the
// previous prompt produced.
const RESOURCE_HREFS = new Set(["/estimation", "/recherche/nouvelle", "/location", "/vente"]);
const EXPERT_HREF = "/#equipe";

const resourceDefaultFor = (
  intent: AssistantPayload["intent"]
): { href: string; label: string } => {
  switch (intent) {
    case "seller":
      return { href: "/estimation", label: "Démarrer mon estimation" };
    case "buyer":
      return { href: "/recherche/nouvelle", label: "Affiner ma recherche acquéreur" };
    case "market":
      return { href: "/vente", label: "Découvrir nos biens à la vente" };
    default:
      return { href: "/recherche/nouvelle", label: "Explorer nos biens" };
  }
};

const parseAssistantPayload = (raw: string): AssistantPayload => {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const intent =
    parsed.intent === "seller" ||
    parsed.intent === "buyer" ||
    parsed.intent === "market" ||
    parsed.intent === "unclear"
      ? parsed.intent
      : "unclear";

  const reply =
    typeof parsed.reply === "string" && parsed.reply.trim().length > 0
      ? parsed.reply.trim()
      : "Je peux vous orienter vers l'estimation de votre bien ou vers une recherche acquéreur sur-mesure.";

  const ctaLabel =
    typeof parsed.ctaLabel === "string" ? parsed.ctaLabel.trim() : "";
  const ctaHref = typeof parsed.ctaHref === "string" ? parsed.ctaHref.trim() : "";

  const ctaKind: CtaKind =
    parsed.ctaKind === "none" ||
    parsed.ctaKind === "resource" ||
    parsed.ctaKind === "expert"
      ? parsed.ctaKind
      : ctaHref.length > 0 || ctaLabel.length > 0
        ? "resource"
        : "none";

  return {
    reply,
    intent,
    ctaKind,
    ctaLabel,
    ctaHref,
    listingSearch: sanitizeListingSearch(parsed.listingSearch),
  };
};

// Enforces the progressive-disclosure policy server-side so the model can never
// push a human-contact CTA too early, and can never emit a non-existent link.
const applyCtaPolicy = (
  payload: AssistantPayload,
  opts: { allowedExpert: boolean }
): AssistantPayload => {
  let kind = payload.ctaKind;
  if (kind === "expert" && !opts.allowedExpert) {
    kind = "resource";
  }

  if (kind === "none") {
    return { ...payload, ctaKind: "none", ctaLabel: "", ctaHref: "" };
  }

  if (kind === "expert") {
    return {
      ...payload,
      ctaKind: "expert",
      ctaHref: EXPERT_HREF,
      ctaLabel:
        payload.ctaLabel.length > 0
          ? payload.ctaLabel
          : "Échanger avec un conseiller Sillage Immo",
    };
  }

  const fallback = resourceDefaultFor(payload.intent);
  return {
    ...payload,
    ctaKind: "resource",
    ctaHref: RESOURCE_HREFS.has(payload.ctaHref) ? payload.ctaHref : fallback.href,
    ctaLabel: payload.ctaLabel.length > 0 ? payload.ctaLabel : fallback.label,
  };
};

const searchPublicListings = async (
  criteria: ListingSearchCriteria,
  locale: string
): Promise<AssistantListing[]> => {
  try {
    const result = (await invokeMcpToolInternal("public_listings.search", {
      ...criteria,
      locale,
      limit: 3,
    })) as { items?: AssistantListing[] } | null;
    return Array.isArray(result?.items) ? result.items.slice(0, 3) : [];
  } catch {
    return [];
  }
};

const buildSystemPrompt = (input: {
  languageInstruction: string;
  isSellerProfile: boolean;
  userTurnIndex: number;
  expertGuidance: string;
}) => {
  const knowledgeNote = input.isSellerProfile
    ? "Une base de connaissance vendeur Sillage Immo t'est fournie (agencyKnowledge) : appuie-toi dessus pour valoriser l'accompagnement vendeur, sans la réciter."
    : "Un socle de marque général t'est fourni (agencyKnowledge) : tiens-t'en au positionnement et à la voix, et atteins l'objectif sans script.";

  return `Tu es l'assistant de Sillage Immo, boutique immobilière haut de gamme à Nice et sur la Côte d'Azur, présent sur la page d'accueil.

Voix : expert, discret et raffiné. Vouvoiement systématique. Chaleureux mais sobre, jamais commercial agressif, jamais de superlatifs creux. Tu vises la justesse plutôt que l'emphase.

Ton objectif : comprendre le projet du visiteur, lui apporter une réponse réellement utile, puis l'orienter au bon moment vers le bon parcours — sans jamais le presser.

${knowledgeNote}

MÉTHODE DE CONVERSATION — respecte la progression, ne brûle aucune étape :
1. QUALIFIER d'abord. Si tu ne sais pas encore si le visiteur veut vendre, acheter, louer ou simplement se renseigner, pose UNE question courte et naturelle pour le découvrir AVANT tout bouton. N'oriente pas tant que l'intention n'est pas claire.
2. APPORTER DE LA VALEUR. Donne une réponse concrète et utile (lecture de marché locale, repères chiffrés prudents, conseil mesuré). C'est ce qui installe la confiance.
3. ORIENTER vers une ressource utile (page d'estimation, recherche acquéreur, biens publiés) — pas encore vers un humain.
4. PROPOSER UN EXPERT en dernier seulement : une fois la valeur apportée ET le visiteur engagé (plusieurs échanges), OU s'il demande explicitement à parler à quelqu'un. Proposer un contact humain trop tôt fait fuir le visiteur : c'est une faute.

Champ "ctaKind" — il encode cette progression :
- "none" : tu qualifies ou tu informes encore, aucun bouton n'est pertinent (laisse ctaLabel et ctaHref vides).
- "resource" : tu orientes vers une page utile (cas par défaut une fois l'intention connue).
- "expert" : tu proposes de contacter un conseiller (réservé à l'étape finale ou à une demande explicite).
C'est le message n°${input.userTurnIndex} du visiteur. ${input.expertGuidance}

Liens autorisés (n'invente JAMAIS une autre URL ni une ancre) :
- Vendeur → /estimation
- Acquéreur → /recherche/nouvelle
- Location → /location
- Voir des biens publiés → /vente (ou déclenche "listingSearch", voir plus bas)
- Contacter un expert → /#equipe

Règles par profil :
- Vendeur : si la localisation du bien n'est pas connue, commence par une question de localisation brève et sobre. Si elle est connue, ne la repose pas. Ressource : /estimation.
- Acquéreur / locataire : dès qu'au moins un critère concret est donné (type de bien, ville/quartier, budget, nombre de pièces), tu peux montrer quelques biens publiés via "listingSearch". Sinon, pose une question de qualification courte. Ressource : /recherche/nouvelle (achat) ou /location (location).
- Marché / renseignement : donne d'abord une lecture locale mesurée et concrète. NE propose PAS d'expert d'emblée — informe, puis oriente vers une ressource (biens à voir, estimation). L'expert vient seulement plus tard ou sur demande.
- Projet mixte (ex : vendre puis acheter) : reconnais les deux besoins et traite le plus utile en premier.

Recherche de biens (listingSearch) :
- Mets "listingSearch" à un objet de critères publics UNIQUEMENT si le visiteur cherche à acheter ou louer et a donné au moins un critère exploitable. Sinon, mets "listingSearch": null.
- Critères autorisés : businessType ("sale" pour vente, "rental" pour location), city, propertyType, priceMin, priceMax, roomsMin, roomsMax, surfaceMin, hasTerrace, hasElevator.
- N'invente JAMAIS un bien, un prix, une adresse ou un lien : les biens réels te seront fournis par le système, tu ne fais que déclencher la recherche.

Longueur : tant que tu qualifies le besoin, reste bref (2-4 phrases). Quand tu entres dans le concret (analyse, présentation de biens, conseil), tu peux aller jusqu'à 3-6 phrases. Ne promets jamais un prix ni un délai certain ; pas de conseil juridique ou fiscal ferme.

${input.languageInstruction} Si la locale n'est pas le français, localise uniquement le libellé du CTA ; le chemin du CTA reste identique.

Retourne STRICTEMENT un JSON avec : reply (string), intent ("seller"|"buyer"|"market"|"unclear"), ctaKind ("none"|"resource"|"expert"), ctaLabel (string, vide si ctaKind vaut "none"), ctaHref (string, vide si ctaKind vaut "none"), listingSearch (objet de critères ou null).`;
};

export const POST = async (request: Request) => {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: false, message: "OPENAI_API_KEY manquante." }, { status: 500 });
  }

  let body: InputBody | null = null;
  try {
    body = (await request.json()) as InputBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const message = body?.message?.trim() ?? "";
  if (message.length < 2) {
    return NextResponse.json({ ok: false, message: "Message trop court." }, { status: 422 });
  }

  const clientIp = extractClientIp(request.headers);
  const [burstLimit, hourlyLimit] = await Promise.all([
    checkPersistentRateLimit({ key: `home-assistant:ip-burst:${clientIp}`, limit: 8, windowSeconds: 60 }),
    checkPersistentRateLimit({ key: `home-assistant:ip:${clientIp}`, limit: 60, windowSeconds: 3600 }),
  ]);
  if (!burstLimit.ok || !hourlyLimit.ok) {
    return NextResponse.json(rateLimitResponseBody, { status: 429 });
  }
  const history = Array.isArray(body?.history)
    ? body.history
        .filter(
          (item): item is { role: "user" | "assistant"; text: string } =>
            (item?.role === "user" || item?.role === "assistant") &&
            typeof item.text === "string" &&
            item.text.trim().length > 0
        )
        .slice(-10)
        .map((item) => ({ role: item.role, text: item.text.trim() }))
    : [];
  const allUserMessages = [
    ...history.filter((item) => item.role === "user").map((item) => item.text),
    message,
  ];
  const conversationUserText = allUserMessages.join(" ");
  const locale = body?.locale ?? "fr";
  const languageInstruction =
    locale === "en"
      ? "Respond in English."
      : locale === "es"
        ? "Responde en español."
        : locale === "ru"
          ? "Отвечай по-русски."
          : "Réponds en français.";

  let mcpContext: unknown = null;
  try {
    mcpContext = await invokeMcpToolInternal("home_assistant.get_context", {});
  } catch {
    mcpContext = null;
  }
  const runtimeCatalog = await getRuntimeZoneCatalog();
  const knownCities = Array.from(new Set(runtimeCatalog.catalog.map((item) => normalize(item.city))));
  const inferredZone = inferZoneFromText(conversationUserText, runtimeCatalog.catalog);
  const locationProvided = Boolean(inferredZone) || hasLocationHint(conversationUserText, knownCities);

  // Conditional brand knowledge: the seller "book" is only injected when the
  // conversation carries a seller signal (keyword over the whole exchange,
  // incl. previous turns). Other profiles get the general brand socle. No
  // extra LLM call — we reuse the existing keyword signal (cost-aware).
  const isSellerProfile = hasSellerIntent(conversationUserText);
  const agencyKnowledge = isSellerProfile
    ? SILLAGE_AGENCY_KNOWLEDGE
    : SILLAGE_BRAND_SOCLE;
  const knowledgeVersion = isSellerProfile
    ? SILLAGE_AGENCY_KNOWLEDGE_VERSION
    : SILLAGE_BRAND_SOCLE_VERSION;

  // Progressive-disclosure gating: the "contact an expert" CTA is unlocked only
  // once the visitor is engaged (>= 3 messages) OR explicitly asks for a human.
  const userTurnIndex = allUserMessages.length;
  const explicitExpertRequest = hasExpertRequest(message);
  const allowedExpert = explicitExpertRequest || userTurnIndex >= 3;
  const expertGuidance = explicitExpertRequest
    ? 'Le visiteur semble demander un contact humain : tu peux utiliser ctaKind "expert".'
    : userTurnIndex < 3
      ? 'Il est probablement trop tôt pour proposer un expert : privilégie "none" ou "resource".'
      : 'Le visiteur est engagé : tu peux proposer un expert si c\'est l\'étape la plus utile.';

  const systemPrompt = buildSystemPrompt({
    languageInstruction,
    isSellerProfile,
    userTurnIndex,
    expertGuidance,
  });

  const basePayload = {
    knowledgeVersion,
    agencyKnowledge,
    mcpContext,
    conversationSignals: {
      sellerIntent: isSellerProfile,
      locationProvided,
      inferredZone: inferredZone
        ? {
            city: inferredZone.city,
            slug: inferredZone.slug,
            score: inferredZone.score,
          }
        : null,
    },
    history,
    userMessage: message,
  };

  let chatResult;
  try {
    chatResult = await callOpenAiChat({
      model: CLIENT_CHAT_MODEL,
      temperature: 0.3,
      responseFormat: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(basePayload) },
      ],
      toolName: "home_assistant.ask",
      toolVersion: "2.0.0",
    });
  } catch (error) {
    console.error(
      "[home-assistant] OpenAI call failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { ok: false, message: "L'assistant est momentanément indisponible." },
      { status: 502 }
    );
  }

  const content = chatResult.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ ok: false, message: "Contenu IA invalide." }, { status: 502 });
  }

  const data = applyCtaPolicy(parseAssistantPayload(content), { allowedExpert });
  let totalCostMicros = chatResult.costMicros;
  let lastModel = chatResult.model;

  // Mini tool-calling loop, capped at exactly ONE tool call per turn: if the
  // model requested a listing search, we run the (read-only, published-only)
  // tool server-side and let the model phrase the result with the REAL
  // listings injected. The model never emits listing facts itself.
  if (data.listingSearch) {
    const listings = await searchPublicListings(data.listingSearch, locale);

    try {
      const followUp = await callOpenAiChat({
        model: CLIENT_CHAT_MODEL,
        temperature: 0.3,
        responseFormat: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(basePayload) },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "Voici les biens PUBLIÉS trouvés pour la recherche demandée (source de vérité). Rédige une réponse qui les présente avec justesse et sobriété. Ne mentionne aucun prix, aucune adresse et aucun lien autres que ceux fournis. S'il n'y a aucun bien, ne prétends pas le contraire : propose de préciser la recherche ou de laisser une recherche acquéreur. Ne relance PAS de recherche : listingSearch doit être null.",
              listingResults: listings,
              previousIntent: data.intent,
            }),
          },
        ],
        toolName: "home_assistant.ask",
        toolVersion: "2.0.0",
      });
      totalCostMicros += followUp.costMicros;
      lastModel = followUp.model;
      if (typeof followUp.content === "string" && followUp.content.trim().length > 0) {
        const second = applyCtaPolicy(parseAssistantPayload(followUp.content), {
          allowedExpert,
        });
        data.reply = second.reply;
        data.ctaKind = second.ctaKind;
        data.ctaLabel = second.ctaLabel;
        data.ctaHref = second.ctaHref;
      }
    } catch (error) {
      console.error(
        "[home-assistant] follow-up call failed:",
        error instanceof Error ? error.message : error
      );
    }

    data.listings = listings;
    data.listingSearch = null;
  }

  // Persist this turn into ai_conversations / ai_messages keyed by the
  // anonymous session cookie (set by proxy.ts). Best-effort: a logger
  // failure must not break the home-assistant reply.
  try {
    const cookieStore = await cookies();
    const optedOut = cookieStore.get(OPT_OUT_COOKIE_NAME)?.value === "1";
    if (!optedOut) {
      const sessionCookie = cookieStore.get(ANONYMOUS_SESSION_COOKIE_NAME)?.value;
      const session = await parseAnonymousSessionCookie(sessionCookie);
      if (session) {
        await logConversationTurn({
          entityType: "anonymous",
          channel: "home_assistant",
          anonymousSessionId: session.id,
          locale,
          model: lastModel,
          userMessage: message,
          assistantMessage: data.reply,
          usage: {
            tokensIn: chatResult.usage.promptTokens,
            tokensOut: chatResult.usage.completionTokens,
            costMicros: totalCostMicros,
          },
          finishReason: chatResult.finishReason,
          toolName: "home_assistant.ask",
          toolVersion: "2.0.0",
          metadata: {
            knowledge_version: knowledgeVersion,
            intent: data.intent,
            cta_kind: data.ctaKind,
            user_turn_index: userTurnIndex,
            inferred_zone: inferredZone
              ? { slug: inferredZone.slug, city: inferredZone.city }
              : null,
            seller_intent: isSellerProfile,
            location_provided: locationProvided,
            listings_returned: data.listings?.length ?? 0,
          },
        });
      }
    }
  } catch {
    // non-blocking
  }

  return NextResponse.json({ ok: true, data });
};
