import { NextResponse } from "next/server";
import { createSignedUploadUrlsForEstimationMedia } from "@/services/properties/estimation-property-media.service";
import {
  checkPersistentRateLimit,
  extractClientIp,
  rateLimitResponseBody,
} from "@/lib/rate-limit/persistent";
import type {
  SellerPropertyMediaSignedUploadSuccessResponse,
  SellerApiErrorResponse,
} from "@/types/api/seller";

const isMediaKind = (value: unknown): value is "image" | "video" => {
  return value === "image" || value === "video";
};

const isUploadSessionId = (value: unknown): value is string => {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,120}$/.test(value);
};

type RequestedItem = {
  fileName?: string;
  sizeBytes?: number;
  contentType?: string;
};

type Body = {
  kind?: unknown;
  uploadSessionId?: unknown;
  items?: RequestedItem[];
};

const errorResponse = (status: number, message: string) => {
  return NextResponse.json<SellerApiErrorResponse>(
    { ok: false, message },
    { status }
  );
};

export async function POST(request: Request) {
  const clientIp = extractClientIp(request.headers);
  const [hourlyLimit, dailyLimit] = await Promise.all([
    // ~3 sessions completes (20 images + 5 videos) par heure et par IP.
    checkPersistentRateLimit({ key: `seller-media-url:ip:${clientIp}`, limit: 75, windowSeconds: 3600 }),
    checkPersistentRateLimit({ key: `seller-media-url:ip-day:${clientIp}`, limit: 200, windowSeconds: 86400 }),
  ]);
  if (!hourlyLimit.ok || !dailyLimit.ok) {
    return NextResponse.json(rateLimitResponseBody, { status: 429 });
  }

  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return errorResponse(400, "Corps JSON invalide.");
  }

  if (!isMediaKind(body?.kind)) {
    return errorResponse(422, "Type de media invalide.");
  }
  if (!isUploadSessionId(body?.uploadSessionId)) {
    return errorResponse(422, "Session d'upload invalide.");
  }
  if (!Array.isArray(body?.items) || body.items.length === 0) {
    return errorResponse(422, "Aucun fichier valide recu.");
  }

  const items = body.items.map((item) => ({
    fileName: typeof item.fileName === "string" ? item.fileName : "",
    sizeBytes: typeof item.sizeBytes === "number" ? item.sizeBytes : 0,
    contentType: typeof item.contentType === "string" ? item.contentType : "",
  }));

  try {
    const descriptors = await createSignedUploadUrlsForEstimationMedia({
      kind: body.kind,
      uploadSessionId: body.uploadSessionId,
      items,
    });
    return NextResponse.json<SellerPropertyMediaSignedUploadSuccessResponse>({
      ok: true,
      data: { files: descriptors },
    });
  } catch (error) {
    return errorResponse(
      400,
      error instanceof Error ? error.message : "URL d'upload indisponible."
    );
  }
}
