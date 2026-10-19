import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { callOpenAiChat, UTILITY_CHAT_MODEL } from "@/lib/ai/openai";
import {
  VITRINE_HIGHLIGHT_MAX_LENGTH,
  VITRINE_HIGHLIGHTS_MAX,
  normalizeVitrineHighlights,
  normalizeVitrineQuartier,
  validateVitrineHighlights,
  validateVitrineQuartier,
} from "@/lib/properties/vitrine-editorial";
import type { Database } from "@/types/db/supabase";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

export type VitrineEditorial = {
  highlights: string[];
  quartier: string | null;
  /** remote_media_id SweepBright de la grande photo (null = 1re photo). */
  mainMediaRef: string | null;
  /** remote_media_id SweepBright de la photo de la carte (null = 2e photo). */
  cardMediaRef: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type VitrineMediaOption = {
  remoteMediaId: string;
  ordinal: number;
  url: string | null;
};

const VITRINE_EDITORIAL_COLUMNS =
  "vitrine_highlights, vitrine_quartier, vitrine_main_media_ref, vitrine_card_media_ref, vitrine_updated_at, vitrine_updated_by";

type VitrineEditorialRow = Pick<
  PropertyRow,
  | "vitrine_highlights"
  | "vitrine_quartier"
  | "vitrine_main_media_ref"
  | "vitrine_card_media_ref"
  | "vitrine_updated_at"
  | "vitrine_updated_by"
>;

export class VitrineValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(errors.join(" "));
    this.name = "VitrineValidationError";
    this.errors = errors;
  }
}

const toEditorial = (row: VitrineEditorialRow): VitrineEditorial => ({
  highlights: Array.isArray(row.vitrine_highlights) ? row.vitrine_highlights : [],
  quartier: row.vitrine_quartier ?? null,
  mainMediaRef: row.vitrine_main_media_ref ?? null,
  cardMediaRef: row.vitrine_card_media_ref ?? null,
  updatedAt: row.vitrine_updated_at ?? null,
  updatedBy: row.vitrine_updated_by ?? null,
});

/** Photos du bien proposées au choix (images seulement, ordre du carrousel). */
export const listVitrineMediaOptions = async (propertyId: string): Promise<VitrineMediaOption[]> => {
  const { data, error } = await supabaseAdmin
    .from("property_media")
    .select("remote_media_id, ordinal, cached_url, remote_url")
    .eq("property_id", propertyId)
    .eq("kind", "image")
    .order("ordinal", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ remote_media_id: string; ordinal: number; cached_url: string | null; remote_url: string | null }>).map(
    (row) => ({ remoteMediaId: row.remote_media_id, ordinal: row.ordinal, url: row.cached_url ?? row.remote_url ?? null })
  );
};

const normalizeMediaRef = (input: unknown): string | null => {
  if (typeof input !== "string") return null;
  const value = input.trim();
  return value.length > 0 && value.length <= 128 ? value : null;
};

export const getVitrineEditorial = async (propertyId: string): Promise<VitrineEditorial | null> => {
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select(VITRINE_EDITORIAL_COLUMNS)
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return toEditorial(data as VitrineEditorialRow);
};

/**
 * Enregistre les champs éditoriaux. Seules les colonnes `vitrine_*` sont
 * écrites : ni `updated_at` ni `last_synced_at`, qui appartiennent à la
 * synchronisation SweepBright, ni le cache public (ces champs ne sont pas
 * exposés sur le site).
 */
export const saveVitrineEditorial = async (input: {
  propertyId: string;
  highlights: unknown;
  quartier: unknown;
  mainMediaRef?: unknown;
  cardMediaRef?: unknown;
  updatedBy: string | null;
}): Promise<VitrineEditorial> => {
  const highlights = normalizeVitrineHighlights(input.highlights);
  const quartier = normalizeVitrineQuartier(input.quartier);
  const mainMediaRef = normalizeMediaRef(input.mainMediaRef);
  const cardMediaRef = normalizeMediaRef(input.cardMediaRef);
  const errors = [
    ...validateVitrineHighlights(highlights, { allowEmpty: true }).errors,
    ...validateVitrineQuartier(quartier),
  ];
  if (mainMediaRef || cardMediaRef) {
    const known = new Set((await listVitrineMediaOptions(input.propertyId)).map((option) => option.remoteMediaId));
    if (mainMediaRef && !known.has(mainMediaRef)) errors.push("Grande photo : média inconnu pour ce bien.");
    if (cardMediaRef && !known.has(cardMediaRef)) errors.push("Photo de la carte : média inconnu pour ce bien.");
  }
  if (errors.length > 0) {
    throw new VitrineValidationError(errors);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("properties")
    .update({
      vitrine_highlights: highlights,
      vitrine_quartier: quartier,
      vitrine_main_media_ref: mainMediaRef,
      vitrine_card_media_ref: cardMediaRef,
      vitrine_updated_at: now,
      vitrine_updated_by: input.updatedBy,
    })
    .eq("id", input.propertyId)
    .select(VITRINE_EDITORIAL_COLUMNS)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Bien introuvable.");
  return toEditorial(data as VitrineEditorialRow);
};

// --- Suggestion LLM ---------------------------------------------------------

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const readPath = (root: unknown, path: string[]): unknown => {
  let current: unknown = root;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }
  return current;
};

const truthyAmenities = (raw: Record<string, unknown>) => {
  const amenities = raw.amenities;
  if (Array.isArray(amenities)) {
    return amenities.filter((item): item is string => typeof item === "string");
  }
  const record = asRecord(amenities);
  if (!record) return [];
  return Object.entries(record)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
};

const describePropertyForLlm = (property: PropertyRow) => {
  const raw = asRecord(property.raw_payload) ?? {};
  const legal = asRecord(property.legal) ?? {};
  const facts: string[] = [];
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === "" || value === false) return;
    facts.push(`${label} : ${typeof value === "boolean" ? "oui" : String(value)}`);
  };

  push("Type", property.property_type);
  push("Ville", property.city);
  push("Surface habitable (m²)", property.living_area);
  push("Surface Carrez (m²)", readPath(raw, ["sizes", "loi_carrez_area", "size"]));
  push("Pièces", property.rooms);
  push("Chambres", property.bedrooms);
  push("Salles de bain", property.bathrooms);
  push("Étage", property.floor);
  push("Terrasse", property.has_terrace);
  push("Ascenseur", property.has_elevator);
  push("État général", property.general_condition);
  push("Équipements", truthyAmenities(raw).join(", "));
  push("Climatisation", readPath(raw, ["features", "heating_cooling", "air_conditioning"]));
  push("Orientation", readPath(raw, ["orientation"]));
  push("Année de construction", readPath(raw, ["building", "construction", "year"]));
  push("DPE", readPath(legal, ["energy", "dpe"]) ?? readPath(legal, ["energy", "epc_value"]));
  push("Vue", readPath(raw, ["view"]));

  return facts;
};

export type VitrineSuggestion = {
  highlights: string[];
  model: string;
};

/**
 * Propose jusqu'à 5 points forts (≤ 28 caractères) à partir de la description
 * et des caractéristiques du bien. Les lignes trop longues renvoyées par le
 * modèle sont écartées plutôt que tronquées ; le collaborateur reste
 * l'auteur final.
 */
export const suggestVitrineHighlights = async (propertyId: string): Promise<VitrineSuggestion> => {
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Bien introuvable.");
  const property = data as PropertyRow;

  const facts = describePropertyForLlm(property);
  const description = (property.description ?? "").replace(/\s+/g, " ").trim().slice(0, 4000);

  const result = await callOpenAiChat({
    model: UTILITY_CHAT_MODEL,
    temperature: 0.4,
    maxTokens: 400,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Tu rédiges les « points forts » d'une affiche vitrine d'agence immobilière haut de gamme à Nice. " +
          `Propose 7 formulations candidates, chacune de ${VITRINE_HIGHLIGHT_MAX_LENGTH} caractères MAXIMUM (espaces compris), ` +
          "en français, sans point final, sans emoji, sans majuscules inutiles, style télégraphique élégant " +
          "(ex. « Vue mer panoramique », « Terrasse plein sud 25 m² », « Dernier étage avec ascenseur », « Cave et parking »). " +
          "Chaque point doit être factuel et tiré uniquement des informations fournies : n'invente rien, " +
          "ne mentionne pas le prix ni les honoraires. Classe-les du plus vendeur au moins vendeur. " +
          'Réponds strictement en JSON valide : {"highlights": string[]}.',
      },
      {
        role: "user",
        content:
          `Titre : ${property.title ?? "—"}\n` +
          `Caractéristiques :\n- ${facts.join("\n- ") || "aucune"}\n\n` +
          `Description :\n${description || "aucune"}`,
      },
    ],
    toolName: "properties.vitrine_highlights_suggest",
    toolVersion: "1.0.0",
  });

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    throw new Error("Réponse du modèle illisible.");
  }
  const candidates = normalizeVitrineHighlights(asRecord(parsed)?.highlights)
    .map((line) => line.replace(/[.\s]+$/, ""))
    .filter((line) => Array.from(line).length <= VITRINE_HIGHLIGHT_MAX_LENGTH);

  const unique = Array.from(new Set(candidates)).slice(0, VITRINE_HIGHLIGHTS_MAX);
  return { highlights: unique, model: result.model };
};
