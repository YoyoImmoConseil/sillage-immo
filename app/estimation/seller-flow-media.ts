import { track } from "@/lib/analytics/data-layer";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type {
  SellerPropertyMediaSignedUploadResponse,
  SellerPropertyMediaUploadResponse,
  SellerUploadedPropertyMedia,
} from "@/types/api/seller";

/**
 * Mirror of the server-side per-file caps in
 * `services/properties/estimation-property-media.service.ts`. We duplicate
 * them client-side because that file is `server-only`. Keep them in sync.
 */
const CLIENT_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const CLIENT_MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export type MediaErrorCopy = {
  mediaUploadNetworkError: string;
  mediaTooLargeImage: (fileName: string, sizeMb: number) => string;
  mediaTooLargeVideo: (fileName: string, sizeMb: number) => string;
  mediaUnsupportedFormat: (fileName: string) => string;
  mediaUploadExpired: string;
  mediaServerUnavailable: string;
};

export type SellerMediaUploadCopy = MediaErrorCopy & {
  tooManyPhotos: string;
  tooManyVideos: string;
};

const SUPABASE_SIZE_PATTERNS = [
  "exceeded the maximum allowed size",
  "payload too large",
  "request entity too large",
];

const SUPABASE_MIME_PATTERNS = ["mime type", "invalid_mime_type"];

/**
 * Translate a failed Supabase Storage signed-URL PUT into a human,
 * locale-aware error message. Supabase returns verbatim English strings
 * like "The object exceeded the maximum allowed size" with a JSON body;
 * surfacing them to the user is confusing and untraceable. Here we map a
 * few well-known patterns + HTTP statuses to rich i18n copy and return a
 * stable `errorCode` for analytics.
 */
export const interpretSupabasePutFailure = async (
  response: Response,
  file: File,
  kind: "image" | "video",
  copy: MediaErrorCopy
): Promise<{ message: string; errorCode: string }> => {
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }
  const lower = bodyText.toLowerCase();
  const status = response.status;
  const sizeMb = file.size / (1024 * 1024);

  if (
    status === 413 ||
    SUPABASE_SIZE_PATTERNS.some((pattern) => lower.includes(pattern))
  ) {
    return {
      message:
        kind === "image"
          ? copy.mediaTooLargeImage(file.name, sizeMb)
          : copy.mediaTooLargeVideo(file.name, sizeMb),
      errorCode: "size_exceeded_supabase",
    };
  }

  if (
    status === 415 ||
    SUPABASE_MIME_PATTERNS.some((pattern) => lower.includes(pattern))
  ) {
    return {
      message: copy.mediaUnsupportedFormat(file.name),
      errorCode: "unsupported_mime",
    };
  }

  if (status === 401 || status === 403) {
    return {
      message: copy.mediaUploadExpired,
      errorCode: "signed_url_expired",
    };
  }

  if (status >= 500 && status < 600) {
    return {
      message: copy.mediaServerUnavailable,
      errorCode: "supabase_server_error",
    };
  }

  return {
    message: copy.mediaUploadNetworkError,
    errorCode: `http_${status}`,
  };
};

export type SellerMediaValidationResult = { ok: true } | { ok: false; message: string };

export const validateSellerMediaSelection = ({
  kind,
  files,
  existingMedia,
  copy,
}: {
  kind: "image" | "video";
  files: File[];
  existingMedia: SellerUploadedPropertyMedia[];
  copy: SellerMediaUploadCopy;
}): SellerMediaValidationResult => {
  const currentCount = existingMedia.filter((item) => item.kind === kind).length;
  const maxCount = kind === "image" ? 20 : 5;
  if (currentCount + files.length > maxCount) {
    const message = kind === "image" ? copy.tooManyPhotos : copy.tooManyVideos;
    track("seller_media_upload_failed", {
      kind,
      error_code: "too_many_files",
      error_step: "client_count",
      files_total: currentCount + files.length,
    });
    return { ok: false, message };
  }

  const maxBytesPerFile =
    kind === "image" ? CLIENT_MAX_IMAGE_BYTES : CLIENT_MAX_VIDEO_BYTES;
  const oversized = files.find((file) => file.size > maxBytesPerFile);
  if (oversized) {
    const sizeMb = oversized.size / (1024 * 1024);
    const message =
      kind === "image"
        ? copy.mediaTooLargeImage(oversized.name, sizeMb)
        : copy.mediaTooLargeVideo(oversized.name, sizeMb);
    track("seller_media_upload_failed", {
      kind,
      error_code: "size_exceeded_client",
      error_step: "client_size",
      file_name: oversized.name.slice(0, 120),
      size_mb: Math.round(sizeMb * 10) / 10,
    });
    return { ok: false, message };
  }

  return { ok: true };
};

export type SellerMediaUploadResult =
  | { ok: true; files: SellerUploadedPropertyMedia[] }
  | { ok: false; message: string };

export const performSellerMediaUpload = async ({
  kind,
  files,
  uploadSessionId,
  copy,
}: {
  kind: "image" | "video";
  files: File[];
  uploadSessionId: string;
  copy: SellerMediaUploadCopy;
}): Promise<SellerMediaUploadResult> => {
  try {
    // 1) Demander des URLs d'upload signees a notre API.
    const urlResponse = await fetch("/api/seller/property-media/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        uploadSessionId,
        items: files.map((file) => ({
          fileName: file.name,
          sizeBytes: file.size,
          contentType: file.type,
        })),
      }),
    });
    const urlParsed = await parseApiResponse<SellerPropertyMediaSignedUploadResponse>(
      urlResponse
    );
    const urlData = urlParsed.data;
    if (!urlParsed.ok || !urlData || !("ok" in urlData) || urlData.ok !== true) {
      const fallback =
        urlData && "message" in urlData && typeof urlData.message === "string"
          ? urlData.message
          : null;
      track("seller_media_upload_failed", {
        kind,
        error_code: "signed_url_failed",
        error_step: "api_upload_url",
        http_status: urlParsed.status,
        error_message: (urlParsed.message ?? fallback ?? "").slice(0, 200),
      });
      return {
        ok: false,
        message: urlParsed.message ?? fallback ?? copy.mediaUploadNetworkError,
      };
    }
    const descriptors = urlData.data.files;
    if (descriptors.length !== files.length) {
      track("seller_media_upload_failed", {
        kind,
        error_code: "descriptor_count_mismatch",
        error_step: "api_upload_url",
        expected: files.length,
        received: descriptors.length,
      });
      return { ok: false, message: copy.mediaUploadNetworkError };
    }

    // 2) Upload direct vers Supabase Storage (en parallele) pour bypasser
    // la limite Vercel de 4.5 Mo sur les serverless functions. Critique
    // pour les videos qui depassent systematiquement cette limite.
    const putResults = await Promise.all(
      descriptors.map(async (descriptor, index) => {
        const file = files[index];
        const response = await fetch(descriptor.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        return { response, file };
      })
    );
    const failedPut = putResults.find((entry) => !entry.response.ok);
    if (failedPut) {
      const interpreted = await interpretSupabasePutFailure(
        failedPut.response,
        failedPut.file,
        kind,
        copy
      );
      track("seller_media_upload_failed", {
        kind,
        error_code: interpreted.errorCode,
        error_step: "supabase_put",
        http_status: failedPut.response.status,
        file_name: failedPut.file.name.slice(0, 120),
        size_mb: Math.round((failedPut.file.size / (1024 * 1024)) * 10) / 10,
      });
      return { ok: false, message: interpreted.message };
    }

    // 3) Confirmer cote API : creation des metadonnees + signed preview.
    const registerResponse = await fetch("/api/seller/property-media/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        uploadSessionId,
        items: descriptors.map((descriptor, index) => ({
          uploadId: descriptor.uploadId,
          fileName: descriptor.fileName,
          contentType: descriptor.contentType,
          sizeBytes: files[index].size,
          storagePath: descriptor.storagePath,
        })),
      }),
    });
    const registerParsed =
      await parseApiResponse<SellerPropertyMediaUploadResponse>(registerResponse);
    const registerData = registerParsed.data;
    if (
      !registerParsed.ok ||
      !registerData ||
      !("ok" in registerData) ||
      registerData.ok !== true
    ) {
      const fallback =
        registerData && "message" in registerData && typeof registerData.message === "string"
          ? registerData.message
          : null;
      const message =
        registerParsed.message ?? fallback ?? copy.mediaUploadNetworkError;
      track("seller_media_upload_failed", {
        kind,
        error_code: "register_failed",
        error_step: "api_register",
        http_status: registerParsed.status,
        error_message: message.slice(0, 200),
      });
      return { ok: false, message };
    }
    const totalSizeBytes = registerData.data.files.reduce(
      (sum, file) => sum + (typeof file.sizeBytes === "number" ? file.sizeBytes : 0),
      0
    );
    track("seller_media_uploaded", {
      kind,
      count: registerData.data.files.length,
      total_size_mb: Math.round(totalSizeBytes / (1024 * 1024)),
    });
    return { ok: true, files: registerData.data.files };
  } catch (caught) {
    track("seller_media_upload_failed", {
      kind,
      error_code: "network_exception",
      error_step: "client_catch",
      error_message:
        caught instanceof Error ? caught.message.slice(0, 200) : "unknown",
    });
    return { ok: false, message: copy.mediaUploadNetworkError };
  }
};
