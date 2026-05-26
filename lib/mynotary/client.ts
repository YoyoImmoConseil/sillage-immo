import "server-only";
import type {
  MyNotaryOperationSummary,
  MyNotaryRecordSummary,
  MyNotaryRegisterEntriesPage,
} from "./types";

// Minimal HTTP client for the MyNotary Public API
// (https://dev.mynotary.fr/external). We only ship what the inbound
// integration needs in phase 1: read endpoints used by the
// signature-completed service (operation + records lookup), the
// register-entries endpoint used by the backfill cron, and a
// `linkOrganization` helper used by the one-shot setup script.
//
// Why a hand-rolled client and not an SDK?
//   - MyNotary does not publish an official TS SDK at the time of
//     writing.
//   - The OpenAPI surface we use is tiny (≤ 5 endpoints) and we
//     want fine-grained control over the headers
//     (`x-api-date-version: 2`) and the retry policy.

const BASE_URL = "https://api.mynotary.fr/api/v1";

const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;

type FetchOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  // Some calls (POST /clients) use a one-time organization token in
  // place of (or in addition to) the application token. We expose
  // it as an override here rather than baking it into the env.
  extraHeaders?: Record<string, string>;
};

const buildQueryString = (
  query: Record<string, string | number | boolean | undefined | null> | undefined
): string => {
  if (!query) return "";
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    usp.append(k, String(v));
  }
  const s = usp.toString();
  return s.length === 0 ? "" : `?${s}`;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export type MyNotaryRequestError = Error & {
  status: number;
  responseBody?: unknown;
};

const buildError = (
  status: number,
  message: string,
  responseBody?: unknown
): MyNotaryRequestError => {
  const err = new Error(message) as MyNotaryRequestError;
  err.status = status;
  err.responseBody = responseBody;
  return err;
};

const isRetryableStatus = (status: number): boolean =>
  status === 429 || (status >= 500 && status < 600);

const computeBackoffMs = (attempt: number, retryAfter?: string | null) => {
  if (retryAfter) {
    const parsed = Number(retryAfter);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed * 1000, 30_000);
    }
  }
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, 30_000);
};

const callMyNotary = async <TResponse>(
  options: FetchOptions
): Promise<TResponse> => {
  const apiKey = process.env.MYNOTARY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MYNOTARY_API_KEY missing; obtain it from dev@mynotary.fr and add it in Vercel env."
    );
  }

  const url = `${BASE_URL}${options.path}${buildQueryString(options.query)}`;
  let lastError: MyNotaryRequestError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method,
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "x-api-date-version": "2",
          ...(options.extraHeaders ?? {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        cache: "no-store",
      });
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === "AbortError";
      lastError = buildError(
        isAbort ? 504 : 502,
        isAbort
          ? `MyNotary request aborted after ${TIMEOUT_MS}ms (${options.method} ${options.path}).`
          : `MyNotary network error (${options.method} ${options.path}): ${
              err instanceof Error ? err.message : String(err)
            }`
      );
      if (attempt < MAX_RETRIES) {
        await sleep(computeBackoffMs(attempt));
        continue;
      }
      throw lastError;
    }
    clearTimeout(timer);

    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      bodyText = "";
    }
    let parsed: unknown = null;
    if (bodyText.length > 0) {
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = bodyText;
      }
    }

    if (response.ok) {
      return parsed as TResponse;
    }

    if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get("Retry-After");
      await sleep(computeBackoffMs(attempt, retryAfter));
      continue;
    }

    throw buildError(
      response.status,
      `MyNotary ${options.method} ${options.path} → ${response.status}`,
      parsed
    );
  }

  throw (
    lastError ??
    buildError(500, `MyNotary call failed after ${MAX_RETRIES + 1} attempts.`)
  );
};

// ---------------------------------------------------------------------
// Endpoints we actually use
// ---------------------------------------------------------------------

// POST /clients — exchange a one-time organization token for an
// organizationId. Called once via scripts/mynotary-link-organization.ts
// when wiring up a new agency.
export const linkOrganization = async (
  organizationToken: string
): Promise<{ organizationId: string }> => {
  const data = await callMyNotary<{ organizationId?: number | string }>({
    method: "POST",
    path: "/clients",
    extraHeaders: { "x-organization-token": organizationToken },
    body: {},
  });
  if (data?.organizationId === undefined || data?.organizationId === null) {
    throw new Error(
      "MyNotary POST /clients did not return an organizationId; check the token."
    );
  }
  return { organizationId: String(data.organizationId) };
};

// GET /operations/{id} — used by the auto-match service to fetch the
// records (property + contacts) attached to a signed contract.
export const getOperation = async (
  operationId: string
): Promise<MyNotaryOperationSummary> => {
  return callMyNotary<MyNotaryOperationSummary>({
    method: "GET",
    path: `/operations/${encodeURIComponent(operationId)}`,
  });
};

// GET /records/{id} — used by the auto-match service when an
// operation only ships record IDs (no inline fields).
export const getRecord = async (
  recordId: string
): Promise<MyNotaryRecordSummary> => {
  return callMyNotary<MyNotaryRecordSummary>({
    method: "GET",
    path: `/records/${encodeURIComponent(recordId)}`,
  });
};

// GET /register-entries — used by the backfill cron + script to walk
// the agency's mandate register and ingest signed contracts we may
// have missed (e.g. delivered before the webhook was configured).
export type GetRegisterEntriesParams = {
  organizationId: string;
  signedSince?: string;
  cursor?: string | null;
  limit?: number;
};

export const getRegisterEntries = async (
  params: GetRegisterEntriesParams
): Promise<MyNotaryRegisterEntriesPage> => {
  const data = await callMyNotary<{
    entries?: MyNotaryRegisterEntriesPage["entries"];
    nextCursor?: string | null;
  }>({
    method: "GET",
    path: "/register-entries",
    query: {
      organizationId: params.organizationId,
      signedSince: params.signedSince,
      cursor: params.cursor ?? undefined,
      limit: params.limit ?? 100,
    },
  });
  return {
    entries: Array.isArray(data?.entries) ? data.entries : [],
    nextCursor: data?.nextCursor ?? null,
  };
};
