import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin/auth";
import { zoneCatalog } from "@/lib/scoring/zone-catalog";
import { clearZoneCatalogCache } from "@/lib/scoring/zone-repository";

type ZoneCatalogWriteInput = {
  slug: string;
  city: string;
  score: number;
  aliases?: string[];
  isActive?: boolean;
  metadata?: Record<string, unknown>;
};

type SeedInput = {
  seedFromCode: boolean;
};

const jsonError = (status: number, message: string) => {
  return NextResponse.json({ ok: false, message }, { status });
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

const normalizeSlug = (value: string) => value.trim().toLowerCase();

export const GET = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  const { data, error } = await supabaseAdmin
    .from("zone_catalog")
    .select("*")
    .order("city", { ascending: true })
    .order("slug", { ascending: true });

  if (error) {
    return jsonError(500, error.message);
  }

  return NextResponse.json({ ok: true, data });
};

export const POST = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  let body: SeedInput | ZoneCatalogWriteInput | null = null;
  try {
    body = (await request.json()) as SeedInput | ZoneCatalogWriteInput;
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  if (!body) {
    return jsonError(400, "Invalid JSON body.");
  }

  if ("seedFromCode" in body && body.seedFromCode === true) {
    const uniqueBySlug = new Map<
      string,
      {
        slug: string;
        city: string;
        score: number;
        aliases: string[];
        is_active: boolean;
        metadata: Record<string, unknown>;
      }
    >();
    const duplicatedSlugs = new Set<string>();

    zoneCatalog.forEach((entry) => {
      const slug = normalizeSlug(entry.slug);
      if (uniqueBySlug.has(slug)) {
        duplicatedSlugs.add(slug);
        return;
      }
      uniqueBySlug.set(slug, {
        slug,
        city: entry.city,
        score: entry.score,
        aliases: entry.aliases,
        is_active: true,
        metadata: {},
      });
    });

    const payload = Array.from(uniqueBySlug.values());

    const { data, error } = await supabaseAdmin
      .from("zone_catalog")
      .upsert(payload, { onConflict: "slug" })
      .select("slug, city, score");

    if (error) {
      return jsonError(500, error.message);
    }

    clearZoneCatalogCache();

    return NextResponse.json(
      {
        ok: true,
        data,
        seeded: payload.length,
        duplicatedSlugsSkipped: Array.from(duplicatedSlugs.values()),
      },
      { status: 201 }
    );
  }

  const entry = body as ZoneCatalogWriteInput;
  if (!isNonEmptyString(entry.slug) || !isNonEmptyString(entry.city)) {
    return jsonError(422, "slug and city are required.");
  }
  if (typeof entry.score !== "number" || entry.score < 0 || entry.score > 15) {
    return jsonError(422, "score must be between 0 and 15.");
  }
  if (entry.aliases !== undefined && !isStringArray(entry.aliases)) {
    return jsonError(422, "aliases must be a string array.");
  }

  const { data, error } = await supabaseAdmin
    .from("zone_catalog")
    .upsert(
      {
        slug: normalizeSlug(entry.slug),
        city: entry.city.trim().toLowerCase(),
        score: Math.round(entry.score),
        aliases: entry.aliases ?? [],
        is_active: entry.isActive ?? true,
        metadata: entry.metadata ?? {},
      },
      { onConflict: "slug" }
    )
    .select("*")
    .single();

  if (error) {
    return jsonError(500, error.message);
  }

  clearZoneCatalogCache();
  return NextResponse.json({ ok: true, data }, { status: 201 });
};

export const PUT = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  let body: ZoneCatalogWriteInput | null = null;
  try {
    body = (await request.json()) as ZoneCatalogWriteInput;
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  if (!body || !isNonEmptyString(body.slug)) {
    return jsonError(422, "slug is required.");
  }

  const updatePayload: {
    city?: string;
    score?: number;
    aliases?: string[];
    is_active?: boolean;
    metadata?: Record<string, unknown>;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (isNonEmptyString(body.city)) updatePayload.city = body.city.trim().toLowerCase();
  if (typeof body.score === "number" && body.score >= 0 && body.score <= 15) {
    updatePayload.score = Math.round(body.score);
  }
  if (body.aliases !== undefined) {
    if (!isStringArray(body.aliases)) {
      return jsonError(422, "aliases must be a string array.");
    }
    updatePayload.aliases = body.aliases;
  }
  if (typeof body.isActive === "boolean") updatePayload.is_active = body.isActive;
  if (body.metadata && typeof body.metadata === "object") updatePayload.metadata = body.metadata;

  const { data, error } = await supabaseAdmin
    .from("zone_catalog")
    .update(updatePayload)
    .eq("slug", normalizeSlug(body.slug))
    .select("*")
    .maybeSingle();

  if (error) {
    return jsonError(500, error.message);
  }
  if (!data) {
    return jsonError(404, "Zone not found.");
  }

  clearZoneCatalogCache();
  return NextResponse.json({ ok: true, data });
};

export const DELETE = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  let body: { slug?: string } | null = null;
  try {
    body = (await request.json()) as { slug?: string };
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  if (!body || !isNonEmptyString(body.slug)) {
    return jsonError(422, "slug is required.");
  }

  const { data, error } = await supabaseAdmin
    .from("zone_catalog")
    .delete()
    .eq("slug", normalizeSlug(body.slug))
    .select("*")
    .maybeSingle();

  if (error) {
    return jsonError(500, error.message);
  }
  if (!data) {
    return jsonError(404, "Zone not found.");
  }

  clearZoneCatalogCache();
  return NextResponse.json({ ok: true, data });
};
