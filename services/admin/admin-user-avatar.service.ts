import "server-only";

import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ADMIN_AVATAR_BUCKET = "admin-profile-avatars";

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
