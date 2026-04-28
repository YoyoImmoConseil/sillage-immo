import { NextResponse } from "next/server";
import {
  registerUploadedEstimationMedia,
  uploadEstimationPropertyMedia,
} from "@/services/properties/estimation-property-media.service";
import type { SellerPropertyMediaUploadSuccessResponse } from "@/types/api/seller";

const isMediaKind = (value: unknown): value is "image" | "video" => {
  return value === "image" || value === "video";
};

const isUploadSessionId = (value: unknown): value is string => {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,120}$/.test(value);
};

type RegisterRequestItem = {
  uploadId?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  storagePath?: string;
};

type RegisterRequestBody = {
  kind?: unknown;
  uploadSessionId?: unknown;
  items?: RegisterRequestItem[];
};

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let body: RegisterRequestBody | null = null;
    try {
      body = (await request.json()) as RegisterRequestBody;
    } catch {
      return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
    }

    if (!isMediaKind(body?.kind)) {
      return NextResponse.json({ ok: false, message: "Type de media invalide." }, { status: 422 });
    }
    if (!isUploadSessionId(body?.uploadSessionId)) {
      return NextResponse.json(
        { ok: false, message: "Session d'upload invalide." },
        { status: 422 }
      );
    }
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Aucun fichier valide recu." },
        { status: 422 }
      );
    }

    const items = body.items.map((item) => ({
      uploadId: typeof item.uploadId === "string" ? item.uploadId : "",
      fileName: typeof item.fileName === "string" ? item.fileName : "",
      contentType: typeof item.contentType === "string" ? item.contentType : "",
      sizeBytes: typeof item.sizeBytes === "number" ? item.sizeBytes : 0,
      storagePath: typeof item.storagePath === "string" ? item.storagePath : "",
    }));
    const invalidItem = items.find(
      (item) => !item.uploadId || !item.fileName || !item.storagePath
    );
    if (invalidItem) {
      return NextResponse.json(
        { ok: false, message: "Descripteur d'upload invalide." },
        { status: 422 }
      );
    }

    try {
      const uploadedFiles = await registerUploadedEstimationMedia({
        kind: body.kind,
        uploadSessionId: body.uploadSessionId,
        items,
      });
      const payload: SellerPropertyMediaUploadSuccessResponse = {
        ok: true,
        data: { files: uploadedFiles },
      };
      return NextResponse.json(payload);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          message:
            error instanceof Error ? error.message : "Impossible d'enregistrer les medias.",
        },
        { status: 400 }
      );
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Corps multipart invalide." }, { status: 400 });
  }

  const kind = formData.get("kind");
  const uploadSessionId = formData.get("uploadSessionId");
  const rawFiles = formData.getAll("files");
  const files = rawFiles.filter((entry): entry is File => entry instanceof File);

  if (!isMediaKind(kind)) {
    return NextResponse.json({ ok: false, message: "Type de media invalide." }, { status: 422 });
  }

  if (!isUploadSessionId(uploadSessionId)) {
    return NextResponse.json(
      { ok: false, message: "Session d'upload invalide." },
      { status: 422 }
    );
  }

  if (files.length === 0 || files.length !== rawFiles.length) {
    return NextResponse.json({ ok: false, message: "Aucun fichier valide recu." }, { status: 422 });
  }

  try {
    const uploadedFiles = await uploadEstimationPropertyMedia({
      kind,
      uploadSessionId,
      files,
    });

    const payload: SellerPropertyMediaUploadSuccessResponse = {
      ok: true,
      data: {
        files: uploadedFiles,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Impossible d'envoyer les medias du bien.",
      },
      { status: 400 }
    );
  }
}
