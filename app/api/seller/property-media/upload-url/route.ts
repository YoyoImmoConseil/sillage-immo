import { NextResponse } from "next/server";
import { createSignedUploadUrlsForEstimationMedia } from "@/services/properties/estimation-property-media.service";
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
  // #region agent log
  const debugRunId = `upload-url-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.error(
    `[debug-cada68][upload-url][entry] runId=${debugRunId}`
  );
  // #endregion
  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch (jsonError) {
    // #region agent log
    console.error(
      `[debug-cada68][upload-url][H2] runId=${debugRunId} JSON parse failed: ${
        jsonError instanceof Error ? jsonError.message : String(jsonError)
      }`
    );
    // #endregion
    return errorResponse(400, "Corps JSON invalide.");
  }

  // #region agent log
  console.error(
    `[debug-cada68][upload-url][H5] runId=${debugRunId} body keys=${
      body ? Object.keys(body).join(",") : "null"
    } kind=${String((body as Body | null)?.kind)} sessionLen=${
      typeof (body as Body | null)?.uploadSessionId === "string"
        ? ((body as Body | null)?.uploadSessionId as string).length
        : "n/a"
    } itemsLen=${
      Array.isArray((body as Body | null)?.items)
        ? ((body as Body | null)?.items as unknown[]).length
        : "n/a"
    }`
  );
  // #endregion

  if (!isMediaKind(body?.kind)) {
    // #region agent log
    console.error(
      `[debug-cada68][upload-url][H3] runId=${debugRunId} invalid kind=${String(body?.kind)}`
    );
    // #endregion
    return errorResponse(422, "Type de media invalide.");
  }
  if (!isUploadSessionId(body?.uploadSessionId)) {
    // #region agent log
    console.error(
      `[debug-cada68][upload-url][H3] runId=${debugRunId} invalid uploadSessionId len=${
        typeof body?.uploadSessionId === "string" ? body.uploadSessionId.length : "n/a"
      }`
    );
    // #endregion
    return errorResponse(422, "Session d'upload invalide.");
  }
  if (!Array.isArray(body?.items) || body.items.length === 0) {
    // #region agent log
    console.error(
      `[debug-cada68][upload-url][H3] runId=${debugRunId} items missing/empty isArray=${Array.isArray(
        body?.items
      )} length=${Array.isArray(body?.items) ? body.items.length : "n/a"}`
    );
    // #endregion
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
      debugRunId,
    });
    return NextResponse.json<SellerPropertyMediaSignedUploadSuccessResponse>({
      ok: true,
      data: { files: descriptors },
    });
  } catch (error) {
    // #region agent log
    console.error(
      `[debug-cada68][upload-url][catch] runId=${debugRunId} message=${
        error instanceof Error ? error.message : String(error)
      } stack=${error instanceof Error ? (error.stack ?? "").slice(0, 400) : "n/a"}`
    );
    // #endregion
    return errorResponse(
      400,
      error instanceof Error ? error.message : "URL d'upload indisponible."
    );
  }
}
