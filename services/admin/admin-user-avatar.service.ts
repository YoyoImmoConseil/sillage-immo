import "server-only";

import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ADMIN_AVATAR_BUCKET = "admin-profile-avatars";
export const ADMIN_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const ADMIN_AVATAR_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AdminAvatarMime = (typeof ADMIN_AVATAR_ALLOWED_MIME)[number];

let ensureBucketPromise: Promise<void> | null = null;

const ensureBucket = async () => {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (listError) {
        throw new Error(listError.message);
      }

      const exists = (buckets ?? []).some((bucket) => bucket.name === ADMIN_AVATAR_BUCKET);
      if (exists) return;

      const { error: createError } = await supabaseAdmin.storage.createBucket(ADMIN_AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });

      if (createError && !createError.message.toLowerCase().includes("already exists")) {
        throw new Error(createError.message);
      }
    })();
  }

  return ensureBucketPromise;
};

const extensionFor = (mimeType: string) => {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
};

export const uploadAdminUserAvatar = async (input: {
  profileId: string;
  file: File;
  previousAvatarUrl?: string | null;
}) => {
  await ensureBucket();

  const arrayBuffer = await input.file.arrayBuffer();
  const filePath = `${input.profileId}/${randomUUID()}.${extensionFor(input.file.type)}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(ADMIN_AVATAR_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabaseAdmin.storage.from(ADMIN_AVATAR_BUCKET).getPublicUrl(filePath);

  if (input.previousAvatarUrl) {
    const previousPath = extractStoragePath(input.previousAvatarUrl);
    if (previousPath) {
      await supabaseAdmin.storage.from(ADMIN_AVATAR_BUCKET).remove([previousPath]);
    }
  }

  return data.publicUrl;
};

export const extractStoragePath = (publicUrl: string) => {
  const marker = `/${ADMIN_AVATAR_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length);
};

export type AdminAvatarSignedUploadResponse = {
  uploadUrl: string;
  storagePath: string;
  storageBucket: string;
  maxBytes: number;
  allowedMimeTypes: readonly string[];
};

const isAllowedMime = (value: unknown): value is AdminAvatarMime => {
  return (ADMIN_AVATAR_ALLOWED_MIME as readonly string[]).includes(value as string);
};

/**
 * Issue a short-lived signed upload URL for an admin avatar so the
 * browser can PUT the image directly to Supabase Storage and bypass the
 * Vercel 4.5 MB serverless function body limit. The bucket is public,
 * so the resulting public URL is used as `avatarUrl`.
 */
export const createSignedUploadUrlForAdminAvatar = async (input: {
  profileId: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
}): Promise<AdminAvatarSignedUploadResponse> => {
  if (!isAllowedMime(input.mimeType)) {
    throw new Error("Format image non supporte.");
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error("Taille de fichier invalide.");
  }
  if (input.sizeBytes > ADMIN_AVATAR_MAX_BYTES) {
    throw new Error("Image trop lourde (5 Mo max).");
  }

  await ensureBucket();

  const filePath = `${input.profileId}/${randomUUID()}.${extensionFor(input.mimeType)}`;
  const { data, error } = await supabaseAdmin.storage
    .from(ADMIN_AVATAR_BUCKET)
    .createSignedUploadUrl(filePath);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Impossible de generer l'URL d'upload.");
  }
  return {
    uploadUrl: data.signedUrl,
    storagePath: data.path ?? filePath,
    storageBucket: ADMIN_AVATAR_BUCKET,
    maxBytes: ADMIN_AVATAR_MAX_BYTES,
    allowedMimeTypes: ADMIN_AVATAR_ALLOWED_MIME,
  };
};

const confirmAvatarObject = async (storagePath: string) => {
  const lastSlash = storagePath.lastIndexOf("/");
  const folder = lastSlash >= 0 ? storagePath.slice(0, lastSlash) : "";
  const fileName = lastSlash >= 0 ? storagePath.slice(lastSlash + 1) : storagePath;

  const { data, error } = await supabaseAdmin.storage
    .from(ADMIN_AVATAR_BUCKET)
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
  return { sizeBytes: size };
};

/**
 * Confirm a direct upload of an admin avatar: verify the file exists,
 * optionally remove the previous one, and return the public URL.
 */
export const registerUploadedAdminAvatar = async (input: {
  profileId: string;
  storagePath: string;
  previousAvatarUrl?: string | null;
}): Promise<string> => {
  if (!input.storagePath?.startsWith(`${input.profileId}/`)) {
    throw new Error("Chemin de stockage invalide.");
  }
  const { sizeBytes } = await confirmAvatarObject(input.storagePath);
  if (typeof sizeBytes === "number" && sizeBytes > ADMIN_AVATAR_MAX_BYTES) {
    await supabaseAdmin.storage
      .from(ADMIN_AVATAR_BUCKET)
      .remove([input.storagePath])
      .catch(() => undefined);
    throw new Error("Image trop lourde (5 Mo max).");
  }

  if (input.previousAvatarUrl) {
    const previousPath = extractStoragePath(input.previousAvatarUrl);
    if (previousPath && previousPath !== input.storagePath) {
      await supabaseAdmin.storage
        .from(ADMIN_AVATAR_BUCKET)
        .remove([previousPath])
        .catch(() => undefined);
    }
  }

  const { data } = supabaseAdmin.storage
    .from(ADMIN_AVATAR_BUCKET)
    .getPublicUrl(input.storagePath);
  return data.publicUrl;
};
