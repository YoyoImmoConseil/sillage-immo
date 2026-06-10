import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SILLAGE_AGENCY_KNOWLEDGE,
  SILLAGE_AGENCY_KNOWLEDGE_VERSION,
} from "@/lib/ai/knowledge/sillage-agency-knowledge";
import { invokeMcpToolInternal } from "@/lib/mcp/invoke-internal";
import { inferZoneFromText } from "@/lib/scoring/zone-catalog";
import { getRuntimeZoneCatalog } from "@/lib/scoring/zone-repository";
import { callOpenAiChat } from "@/lib/ai/openai";
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

type AssistantPayload = {
  reply: string;
  intent: "seller" | "buyer" | "market" | "unclear";
  ctaLabel: string;
  ctaHref: string;
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

const PREMIUM_STREET_HINTS = [
  "victor hugo",
  "rivoli",
  "promenade des anglais",
  "rue paradis",
  "cap de nice",
  "mont boron",
  "franck pilatte",
  "carre d or",
  "carre dor",
  "cimiez",
  "musiciens",
];

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
      : "Je peux vous orienter vers l'estimation vendeur ou vers un accompagnement acquereur sur-mesure.";

  const ctaLabel =
    typeof parsed.ctaLabel === "string" && parsed.ctaLabel.trim().length > 0
      ? parsed.ctaLabel.trim()
      : intent === "seller"
        ? "Demarrer mon estimation"
        : intent === "market"
          ? "Rencontrez un de nos experts"
        : "Deposer ma recherche acquereur";

  const ctaHref =
    typeof parsed.ctaHref === "string" && parsed.ctaHref.trim().length > 0
      ? parsed.ctaHref.trim()
      : intent === "seller"
        ? "/estimation"
        : intent === "market"
          ? "/#contact-expert"
        : "/#acquereur-form";

  return { reply, intent, ctaLabel, ctaHref };
};

const enforceZoneOpeningTone = (
  reply: string,
  input: { sellerIntent: boolean; locationProvided: boolean; zoneSignal: string }
) => {
  if (!input.sellerIntent || !input.locationProvided) return reply;

  const trimmed = reply.trim();
  const withoutLeadingSalute = trimmed.replace(
    /^(merci pour cette pr[ée]cision\s*!\s*|tr[eè]s bel endroit\s*!\s*)/i,
    ""
  );

  if (input.zoneSignal === "premium") {
    return `Tres bel endroit ! ${withoutLeadingSalute}`.trim();
  }

  if (input.zoneSignal === "neutral" || input.zoneSignal === "unknown") {
    return `Merci pour cette precision ! ${withoutLeadingSalute}`.trim();
  }

  return reply;
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
  const hasPremiumHint = PREMIUM_STREET_HINTS.some((hint) =>
    normalize(conversationUserText).includes(hint)
  );
  const locationProvided = Boolean(inferredZone) || hasLocationHint(conversationUserText, knownCities);
  const zoneSignal =
    hasPremiumHint || (inferredZone && inferredZone.score >= 10)
      ? "premium"
      : inferredZone
        ? "neutral"
        : locationProvided
          ? "unknown"
          : "missing";
  const sellerIntentSignal = hasSellerIntent(conversationUserText);

  const systemPrompt = `Tu es un assistant commercial Sillage Immo sur la page d'accueil. Ton role est d'etre professionnel ET chaleureux: tu parles a une personne en face de toi, pas a un robot. Tu dois qualifier l'intention utilisateur (seller, buyer, market, unclear) puis orienter vers le bon parcours, sans etre monocentre sur un seul sujet. Sillage Immo accompagne les clients sur l'ensemble des demarches immobilieres: transaction vente, acquisition, location et gestion locative. seller: orienter vers /estimation en expliquant la valeur d'une estimation, sans pression commerciale. buyer: orienter vers /#acquereur-form en expliquant l'interet de laisser une recherche detaillee. market: fournir une reponse utile sur le marche local et proposer un echange expert via /#contact-expert. Qualification vendeur prioritaire: quand un utilisateur indique vouloir vendre, verifier si la localisation du bien est deja connue (dans son message courant ou l'historique). Si elle n'est pas connue, commencer par une reaction chaleureuse puis poser explicitement une question de localisation (ex: "Tres beau projet ! Puis-je vous demander ou se trouve votre bien ?"). Si la localisation est deja fournie, ne pas reposer la question et poursuivre normalement. Adaptation au niveau de zone: si le contexte indique une zone premium pour un projet vendeur, tu peux ouvrir avec une formule valorisante de type "Tres bel endroit !" puis rester sobre. Si la zone n'est pas premium ou inconnue, utiliser un ton neutre de type "Merci pour cette precision !". Intentions mixtes: si l'utilisateur combine plusieurs besoins (ex: vendre puis acheter), reconnaitre explicitement les deux besoins, expliquer qu'un accompagnement global est possible, puis proposer l'etape la plus utile immediatement. Gestion des objections: si l'utilisateur hesite a passer par une agence, adopter un ton ouvert, empathique et non insistant, dire que ce questionnement est normal, rappeler que l'estimation en ligne n'oblige a rien, et preciser que les conseillers Sillage Immo restent disponibles quelle que soit sa decision. Style: conversation naturelle, humaine, concrete, chaleureuse et rassurante. Reste concis (3-6 phrases), evite les formulations trop administratives ou trop generiques, et ne fais pas de promesse irrealiste. ${languageInstruction} If locale is not French, localize the CTA label and CTA href still pointing to the same path but translated label only. Retourne strictement un JSON avec: reply, intent, ctaLabel, ctaHref.`;

  const userPayload = JSON.stringify({
    knowledgeVersion: SILLAGE_AGENCY_KNOWLEDGE_VERSION,
    agencyKnowledge: SILLAGE_AGENCY_KNOWLEDGE,
    mcpContext,
    conversationSignals: {
      sellerIntent: sellerIntentSignal,
      locationProvided,
      zoneSignal,
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
  });

  let chatResult;
  try {
    chatResult = await callOpenAiChat({
      model: "gpt-4o-mini",
      temperature: 0.2,
      responseFormat: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
      toolName: "home_assistant.ask",
      toolVersion: "1.0.0",
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "OpenAI error";
    return NextResponse.json(
      { ok: false, message: messageText },
      { status: 502 }
    );
  }

  const content = chatResult.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ ok: false, message: "Contenu IA invalide." }, { status: 502 });
  }

  const data = parseAssistantPayload(content);
  data.reply = enforceZoneOpeningTone(data.reply, {
    sellerIntent: sellerIntentSignal,
    locationProvided,
    zoneSignal,
  });

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
          model: chatResult.model,
          userMessage: message,
          assistantMessage: data.reply,
          usage: {
            tokensIn: chatResult.usage.promptTokens,
            tokensOut: chatResult.usage.completionTokens,
            costMicros: chatResult.costMicros,
          },
          finishReason: chatResult.finishReason,
          toolName: "home_assistant.ask",
          toolVersion: "1.0.0",
          metadata: {
            knowledge_version: SILLAGE_AGENCY_KNOWLEDGE_VERSION,
            intent: data.intent,
            zone_signal: zoneSignal,
            inferred_zone: inferredZone
              ? { slug: inferredZone.slug, city: inferredZone.city }
              : null,
            seller_intent: sellerIntentSignal,
            location_provided: locationProvided,
          },
        });
      }
    }
  } catch {
    // non-blocking
  }

  return NextResponse.json({ ok: true, data });
};
