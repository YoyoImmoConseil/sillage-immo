import "server-only";
import { serverEnv } from "@/lib/env/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type CacheableMedia = {
  id: string;
  propertyId: string;
  kind: "image" | "plan" | "document";
  remoteMediaId: string;
  remoteUrl: string | null;
  contentType: string | null;
  title: string | null;
};

let ensureBucketPromise: Promise<void> | null = null;

const sanitizePathSegment = (value: string) => {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
};

const extensionFromContentType = (value: string | null) => {
  switch (value) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "application/pdf":
      return "pdf";
    default:
      return null;
  }
};

const extensionFromUrl = (value: string) => {
  try {
    const pathname = new URL(value).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
};

const buildStoragePath = (media: CacheableMedia) => {
  const title = media.title ? sanitizePathSegment(media.title) : "asset";
  const extension =
    extensionFromContentType(media.contentType) ??
    (media.remoteUrl ? extensionFromUrl(media.remoteUrl) : null) ??
    "bin";
  return [
    "sweepbright",
    sanitizePathSegment(media.propertyId),
    media.kind,
    `${sanitizePathSegment(media.remoteMediaId)}-${title}.${extension}`,
  ].join("/");
};

const ensureBucket = async () => {
  if (ensureBucketPromise) return ensureBucketPromise;

  ensureBucketPromise = (async () => {
    const bucket = serverEnv.SWEEPBRIGHT_MEDIA_BUCKET;
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      throw new Error(`Unable to list Supabase buckets: ${listError.message}`);
    }

    if (existingBuckets?.some((item) => item.name === bucket)) {
      return;
    }

    const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: "50MB",
    });

    if (
      createError &&
      !createError.message.toLowerCase().includes("already exists") &&
      !createError.message.toLowerCase().includes("duplicate")
    ) {
      throw new Error(`Unable to create Supabase bucket ${bucket}: ${createError.message}`);
    }
  })();

  return ensureBucketPromise;
};

export const cacheSweepBrightMedia = async (media: CacheableMedia) => {
  if (!media.remoteUrl) {
    return null;
  }

  await ensureBucket();

  const response = await fetch(media.remoteUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to download SweepBright media (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? media.contentType ?? "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  const path = buildStoragePath(media);
  const bucket = serverEnv.SWEEPBRIGHT_MEDIA_BUCKET;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadError) {
    throw new Error(`Unable to upload cached SweepBright media: ${uploadError.message}`);
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  const cachedUrl = data.publicUrl;

  const { error: updateError } = await supabaseAdmin
    .from("property_media")
    .update({
      cached_url: cachedUrl,
      updated_at: new Date().toISOString(),
      metadata: {
        cache_path: path,
        cached_at: new Date().toISOString(),
      },
    })
    .eq("id", media.id);

  if (updateError) {
    throw new Error(`Unable to persist cached media URL: ${updateError.message}`);
  }

  return cachedUrl;
};
