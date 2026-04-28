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

const validateEstimationMediaDescriptor = (
  kind: SellerUploadedPropertyMedia["kind"],
  descriptor: { fileName: string; sizeBytes: number; contentType: string }
) => {
  const allowedContentTypes = getAllowedContentTypes(kind);
  const maxSizeBytes = getMaxFileSizeBytes(kind);
  if (!descriptor.fileName?.trim()) {
    throw new Error("Nom de fichier requis.");
  }
  if (!allowedContentTypes.has(descriptor.contentType)) {
    throw new Error(`Type de fichier non autorise pour ${descriptor.fileName}.`);
  }
  if (!Number.isFinite(descriptor.sizeBytes) || descriptor.sizeBytes <= 0) {
    throw new Error(`Taille invalide pour ${descriptor.fileName}.`);
  }
  if (descriptor.sizeBytes > maxSizeBytes) {
    throw new Error(`Le fichier ${descriptor.fileName} depasse la taille maximale autorisee.`);
  }
};

const buildEstimationMediaPath = (
  uploadSessionId: string,
  kind: SellerUploadedPropertyMedia["kind"],
  fileName: string,
  uploadId: string
) => {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const safe = sanitizePathSegment(baseName) || kind;
  const extension = fileName.includes(".")
    ? (fileName.split(".").pop()?.toLowerCase() ?? "")
    : "";
  return [uploadSessionId, kind, `${uploadId}-${safe}${extension ? `.${extension}` : ""}`].join(
    "/"
  );
};

const confirmStorageObject = async (
  bucket: string,
  storagePath: string
): Promise<{ sizeBytes: number | null; contentType: string | null }> => {
  const lastSlash = storagePath.lastIndexOf("/");
  const folder = lastSlash >= 0 ? storagePath.slice(0, lastSlash) : "";
  const fileName = lastSlash >= 0 ? storagePath.slice(lastSlash + 1) : storagePath;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(folder, { search: fileName, limit: 1 });
  if (error) throw new Error(error.message);
  const entry = data?.find((item) => item.name === fileName);
  if (!entry) {
    throw new Error("Fichier introuvable dans le storage. L'upload n'a pas abouti.");
  }
  const size =
    entry.metadata && typeof (entry.metadata as { size?: number }).size === "number"
      ? (entry.metadata as { size: number }).size
      : null;
  const mime =
    entry.metadata && typeof (entry.metadata as { mimetype?: string }).mimetype === "string"
      ? (entry.metadata as { mimetype: string }).mimetype
      : null;
  return { sizeBytes: size, contentType: mime };
};

export type EstimationMediaSignedUploadDescriptor = {
  uploadId: string;
  fileName: string;
  contentType: string;
  storagePath: string;
  storageBucket: string;
  uploadUrl: string;
};

/**
 * Issue short-lived Supabase signed upload URLs for a batch of estimation
 * medias (photos/videos). Each URL is bound to a server-generated
 * `storagePath` that the browser then PUTs to directly, bypassing the
 * Vercel 4.5 MB serverless function body limit (critical for videos that
 * routinely exceed it).
 */
export const createSignedUploadUrlsForEstimationMedia = async (input: {
  kind: SellerUploadedPropertyMedia["kind"];
  uploadSessionId: string;
  items: Array<{ fileName: string; sizeBytes: number; contentType: string }>;
}): Promise<EstimationMediaSignedUploadDescriptor[]> => {
  await ensureBucket();

  if (input.items.length === 0) {
    throw new Error("Aucun fichier n'a ete fourni.");
  }
  if (input.items.length > getMaxFileCount(input.kind)) {
    throw new Error(
      input.kind === "video"
        ? `Vous pouvez envoyer jusqu'a ${ESTIMATION_PROPERTY_MEDIA_MAX_VIDEOS} videos.`
        : `Vous pouvez envoyer jusqu'a ${ESTIMATION_PROPERTY_MEDIA_MAX_IMAGES} photos.`
    );
  }
  input.items.forEach((descriptor) =>
    validateEstimationMediaDescriptor(input.kind, descriptor)
  );

  const descriptors: EstimationMediaSignedUploadDescriptor[] = [];
  for (const item of input.items) {
    const uploadId = randomUUID();
    const path = buildEstimationMediaPath(
      input.uploadSessionId,
      input.kind,
      item.fileName,
      uploadId
    );
    const { data, error } = await supabaseAdmin.storage
      .from(ESTIMATION_PROPERTY_MEDIA_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Impossible de generer l'URL d'upload.");
    }
    descriptors.push({
      uploadId,
      fileName: item.fileName,
      contentType: item.contentType,
      storageBucket: ESTIMATION_PROPERTY_MEDIA_BUCKET,
      storagePath: data.path ?? path,
      uploadUrl: data.signedUrl,
    });
  }
  return descriptors;
};

/**
 * Confirm a batch of direct uploads: for each item, verify the object
 * exists in the bucket and generate a signed preview URL. Returns the
 * canonical SellerUploadedPropertyMedia[] used by the UI.
 */
export const registerUploadedEstimationMedia = async (input: {
  kind: SellerUploadedPropertyMedia["kind"];
  uploadSessionId: string;
  items: Array<{
    uploadId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    storagePath: string;
  }>;
}): Promise<SellerUploadedPropertyMedia[]> => {
  if (input.items.length === 0) {
    throw new Error("Aucun fichier n'a ete fourni.");
  }
  const expectedPrefix = `${input.uploadSessionId}/${input.kind}/`;
  for (const item of input.items) {
    if (!item.storagePath?.startsWith(expectedPrefix)) {
      throw new Error("Chemin de stockage invalide.");
    }
  }

  const uploaded: SellerUploadedPropertyMedia[] = [];
  for (const item of input.items) {
    const { sizeBytes: actualSize, contentType: actualMime } = await confirmStorageObject(
      ESTIMATION_PROPERTY_MEDIA_BUCKET,
      item.storagePath
    );
    const sizeBytes = typeof actualSize === "number" ? actualSize : item.sizeBytes;
    if (sizeBytes > getMaxFileSizeBytes(input.kind)) {
      await supabaseAdmin.storage
        .from(ESTIMATION_PROPERTY_MEDIA_BUCKET)
        .remove([item.storagePath])
        .catch(() => undefined);
      throw new Error(
        `Le fichier ${item.fileName} depasse la taille maximale autorisee.`
      );
    }
    const contentType = actualMime ?? item.contentType;

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(ESTIMATION_PROPERTY_MEDIA_BUCKET)
      .createSignedUrl(item.storagePath, 24 * 60 * 60);
    if (signedError || !signedData?.signedUrl) {
      throw new Error(signedError?.message ?? "Impossible de generer l'aperçu du fichier.");
    }
    const previewUrl =
      signedData.signedUrl.startsWith("http") || !process.env.NEXT_PUBLIC_SUPABASE_URL
        ? signedData.signedUrl
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}${signedData.signedUrl}`;

    uploaded.push({
      uploadId: item.uploadId,
      kind: input.kind,
      fileName: item.fileName,
      contentType,
      sizeBytes,
      storageBucket: ESTIMATION_PROPERTY_MEDIA_BUCKET,
      storagePath: item.storagePath,
      previewUrl,
    });
  }
  return uploaded;
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
