import "server-only";

import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SellerUploadedPropertyMedia } from "@/types/api/seller";

export const ESTIMATION_PROPERTY_MEDIA_BUCKET = "seller-estimation-property-media";
export const ESTIMATION_PROPERTY_MEDIA_MAX_IMAGES = 20;
export const ESTIMATION_PROPERTY_MEDIA_MAX_VIDEOS = 5;
export const ESTIMATION_PROPERTY_MEDIA_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const ESTIMATION_PROPERTY_MEDIA_VIDEO_MAX_BYTES = 200 * 1024 * 1024;

const IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const VIDEO_CONTENT_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

let ensureBucketPromise: Promise<void> | null = null;

const getAllowedContentTypes = (kind: SellerUploadedPropertyMedia["kind"]) => {
  return kind === "video" ? VIDEO_CONTENT_TYPES : IMAGE_CONTENT_TYPES;
};

const getMaxFileCount = (kind: SellerUploadedPropertyMedia["kind"]) => {
  return kind === "video"
    ? ESTIMATION_PROPERTY_MEDIA_MAX_VIDEOS
    : ESTIMATION_PROPERTY_MEDIA_MAX_IMAGES;
};

const getMaxFileSizeBytes = (kind: SellerUploadedPropertyMedia["kind"]) => {
  return kind === "video"
    ? ESTIMATION_PROPERTY_MEDIA_VIDEO_MAX_BYTES
    : ESTIMATION_PROPERTY_MEDIA_IMAGE_MAX_BYTES;
};

const sanitizePathSegment = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
};

const ensureBucket = async () => {
  if (ensureBucketPromise) return ensureBucketPromise;

  ensureBucketPromise = (async () => {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw new Error(error.message);

    const existing = buckets.find((bucket) => bucket.name === ESTIMATION_PROPERTY_MEDIA_BUCKET);
    if (existing) return;

    const { error: createError } = await supabaseAdmin.storage.createBucket(
      ESTIMATION_PROPERTY_MEDIA_BUCKET,
      {
        public: false,
        fileSizeLimit: "200MB",
        allowedMimeTypes: [...IMAGE_CONTENT_TYPES, ...VIDEO_CONTENT_TYPES],
      }
    );

    if (
      createError &&
      !createError.message.toLowerCase().includes("already exists") &&
      !createError.message.toLowerCase().includes("duplicate")
    ) {
      throw new Error(createError.message);
    }
  })();

  return ensureBucketPromise;
};

export const validateEstimationPropertyMediaFiles = (
  kind: SellerUploadedPropertyMedia["kind"],
  files: File[]
) => {
  if (files.length === 0) {
    throw new Error("Aucun fichier n'a ete fourni.");
  }

  if (files.length > getMaxFileCount(kind)) {
    throw new Error(
      kind === "video"
        ? `Vous pouvez envoyer jusqu'a ${ESTIMATION_PROPERTY_MEDIA_MAX_VIDEOS} videos.`
        : `Vous pouvez envoyer jusqu'a ${ESTIMATION_PROPERTY_MEDIA_MAX_IMAGES} photos.`
    );
  }

  const allowedContentTypes = getAllowedContentTypes(kind);
  const maxSizeBytes = getMaxFileSizeBytes(kind);

  files.forEach((file) => {
    if (!allowedContentTypes.has(file.type)) {
      throw new Error(`Type de fichier non autorise pour ${file.name}.`);
    }
    if (file.size > maxSizeBytes) {
      throw new Error(`Le fichier ${file.name} depasse la taille maximale autorisee.`);
    }
  });
};

export const uploadEstimationPropertyMedia = async (input: {
  kind: SellerUploadedPropertyMedia["kind"];
  uploadSessionId: string;
  files: File[];
}) => {
  await ensureBucket();
  validateEstimationPropertyMediaFiles(input.kind, input.files);

  const uploadedFiles: SellerUploadedPropertyMedia[] = [];

  for (const file of input.files) {
    const uploadId = randomUUID();
    const safeName = sanitizePathSegment(file.name.replace(/\.[^.]+$/, "")) || input.kind;
    const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "" : "";
    const path = [
      input.uploadSessionId,
      input.kind,
      `${uploadId}-${safeName}${extension ? `.${extension}` : ""}`,
    ].join("/");

    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(ESTIMATION_PROPERTY_MEDIA_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(ESTIMATION_PROPERTY_MEDIA_BUCKET)
      .createSignedUrl(path, 24 * 60 * 60);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(signedError?.message ?? "Impossible de generer l'aperçu du fichier.");
    }

    const previewUrl =
      signedData.signedUrl.startsWith("http") || !process.env.NEXT_PUBLIC_SUPABASE_URL
        ? signedData.signedUrl
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}${signedData.signedUrl}`;

    uploadedFiles.push({
      uploadId,
      kind: input.kind,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      storageBucket: ESTIMATION_PROPERTY_MEDIA_BUCKET,
      storagePath: path,
      previewUrl,
    });
  }

  return uploadedFiles;
};

export const attachEstimationPropertyMedia = async (input: {
  propertyId: string;
  sellerLeadId: string;
  media: SellerUploadedPropertyMedia[];
}) => {
  if (input.media.length === 0) return;

  const rows = input.media.map((item, index) => ({
    property_id: input.propertyId,
    remote_media_id: item.uploadId,
    kind: item.kind,
    ordinal: index,
    title: item.fileName,
    description: null,
    content_type: item.contentType,
    remote_url: null,
    cached_url: null,
    expires_at: null,
    metadata: {
      origin: "seller_estimation_upload",
      seller_lead_id: input.sellerLeadId,
      storage_bucket: item.storageBucket,
      storage_path: item.storagePath,
      file_name: item.fileName,
      size_bytes: item.sizeBytes,
    },
  }));

  const { error } = await supabaseAdmin
    .from("property_media")
    .upsert(rows, { onConflict: "property_id,kind,remote_media_id" });

  if (error) {
    throw new Error(error.message);
  }
};
