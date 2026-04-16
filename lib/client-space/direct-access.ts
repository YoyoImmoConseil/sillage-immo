const FEATURE_CLIENT_SPACE_V1_PREVIEW_MARKER = "feature-client-space-v1-sillage-immo";

const normalizeHostCandidate = (value?: string | null) => {
  if (!value) return "";

  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }
};

export const isClientPortalDirectAccessEnabled = (...candidates: Array<string | null | undefined>) =>
  candidates.some((candidate) =>
    normalizeHostCandidate(candidate).includes(FEATURE_CLIENT_SPACE_V1_PREVIEW_MARKER)
  );
