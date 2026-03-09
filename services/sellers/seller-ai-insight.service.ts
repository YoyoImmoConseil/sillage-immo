import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";

type AiInsight = {
  summary: string;
  competitorRiskLevel: "low" | "medium" | "high";
  recommendedPitch: string;
  nextAction: string;
  generatedAt: string;
  model: string;
};

const OPENAI_BASE_URL = "https://api.openai.com/v1/chat/completions";

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const normalizeRisk = (value: unknown): AiInsight["competitorRiskLevel"] => {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
};

const parseAssistantJson = (raw: string): Omit<AiInsight, "generatedAt" | "model"> => {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : "Resume indisponible.";
  const recommendedPitch =
    typeof parsed.recommendedPitch === "string" && parsed.recommendedPitch.trim().length > 0
      ? parsed.recommendedPitch.trim()
      : "Argumentaire a completer.";
  const nextAction =
    typeof parsed.nextAction === "string" && parsed.nextAction.trim().length > 0
      ? parsed.nextAction.trim()
      : "Prevoir un appel de qualification rapide.";

  return {
    summary,
    competitorRiskLevel: normalizeRisk(parsed.competitorRiskLevel),
    recommendedPitch,
    nextAction,
  };
};

export const generateSellerAiInsight = async (sellerLeadId: string): Promise<AiInsight> => {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    throw new Error("OPENAI_API_KEY manquante. Ajoutez-la dans .env.local.");
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("seller_leads")
    .select("*")
    .eq("id", sellerLeadId)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead vendeur introuvable.");
  }

  const metadata = asRecord(lead.metadata) ?? {};
  const propertyDetails = asRecord(metadata.property_details) ?? {};
  const scoring = asRecord(metadata.scoring) ?? {};

  const prompt = {
    context: {
      fullName: lead.full_name,
      city: lead.city,
      postalCode: lead.postal_code,
      propertyType: lead.property_type,
      timeline: lead.timeline,
      message: lead.message,
      score: scoring.score ?? null,
      segment: scoring.segment ?? null,
      nextBestAction: scoring.next_best_action ?? null,
      propertyDetails,
    },
    instructions: [
      "Tu es un assistant commercial immobilier premium a Nice.",
      "Analyse le lead et detecte le risque de concurrence (reseau national, autre agence).",
      "Donne une synthese actionnable pour un commercial Sillage Immo.",
      "Retourne uniquement du JSON valide avec les cles: summary, competitorRiskLevel, recommendedPitch, nextAction.",
      "competitorRiskLevel doit etre low, medium ou high.",
      "summary et recommendedPitch doivent etre en francais, concis et operationnels.",
    ],
  };

  const response = await fetch(OPENAI_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu analyses des leads vendeurs immobiliers. Reponds strictement en JSON valide.",
        },
        {
          role: "user",
          content: JSON.stringify(prompt),
        },
      ],
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`OpenAI error (${response.status}): ${JSON.stringify(payload)}`);
  }

  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("OpenAI: reponse vide.");
  }
  const firstChoice = asRecord(choices[0]);
  const message = asRecord(firstChoice?.message);
  const content = message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenAI: contenu IA invalide.");
  }

  const parsed = parseAssistantJson(content);
  const model =
    typeof payload.model === "string" && payload.model.trim().length > 0
      ? payload.model
      : "gpt-4o-mini";

  const aiInsight: AiInsight = {
    ...parsed,
    generatedAt: new Date().toISOString(),
    model,
  };

  const nextMetadata: Record<string, unknown> = {
    ...metadata,
    scoring: {
      ...scoring,
      ai_insight: aiInsight,
    },
  };

  const { error: updateError } = await supabaseAdmin
    .from("seller_leads")
    .update({ metadata: nextMetadata })
    .eq("id", sellerLeadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  try {
    await emitDomainEvent({
      aggregateType: "seller_lead",
      aggregateId: sellerLeadId,
      eventName: "seller_lead.ai_insight_generated",
      payload: {
        competitorRiskLevel: aiInsight.competitorRiskLevel,
        model: aiInsight.model,
      },
    });
  } catch {
    // non-blocking: AI insight should be persisted even if outbox insert fails
  }

  return aiInsight;
};
