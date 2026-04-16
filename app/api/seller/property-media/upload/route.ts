import { NextResponse } from "next/server";
import { uploadEstimationPropertyMedia } from "@/services/properties/estimation-property-media.service";
import type { SellerPropertyMediaUploadSuccessResponse } from "@/types/api/seller";

const isMediaKind = (value: unknown): value is "image" | "video" => {
  return value === "image" || value === "video";
};

const isUploadSessionId = (value: unknown): value is string => {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,120}$/.test(value);
};

export async function POST(request: Request) {
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
