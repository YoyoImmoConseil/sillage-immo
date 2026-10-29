import "server-only";
import { serverEnv } from "@/lib/env/server";
import type {
  MyNotaryContractSummary,
  MyNotaryOperationListItem,
  MyNotaryOperationSummary,
  MyNotaryOrganizationDto,
  MyNotaryRecordSummary,
  MyNotaryRegisterEntriesPage,
  MyNotaryRegisterType,
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
//     (`x-api-date-version: 2`, `x-api-documents-version: 2`) and the
//     retry policy.
//
// Base URL is resolved at call-time via env so the same code can hit
// preprod (`api-preprod.mynotary.fr/api/v1`) or production
// (`api.mynotary.fr/api/v1`) without a rebuild.

const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;

type FetchOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  /** Corps multipart (POST /files) : envoyé tel quel, sans Content-Type JSON. */
  formData?: FormData;
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

  const baseUrl = serverEnv.MYNOTARY_API_BASE_URL.replace(/\/+$/, "");
  const url = `${baseUrl}${options.path}${buildQueryString(options.query)}`;
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
          ...(options.formData ? {} : { "Content-Type": "application/json" }),
          "x-api-key": apiKey,
          "x-api-date-version": "2",
          // `documents` en identifiants de fichiers (format par défaut à
          // partir du 1er décembre 2026 ; l'en-tête devient alors inerte).
          "x-api-documents-version": "2",
          ...(options.extraHeaders ?? {}),
        },
        body: options.formData
          ? options.formData
          : options.body === undefined
            ? undefined
            : JSON.stringify(options.body),
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
//
// Per the MyNotary spec (cf. ApiClientRequest + OrganizationDto):
//   request body  : { "apiKey": "<organization-token>" }
//   response 200  : { id: integer, name?: string, address?: string }
export const linkOrganization = async (
  organizationToken: string
): Promise<MyNotaryOrganizationDto> => {
  const data = await callMyNotary<{
    id?: number | string;
    name?: string;
    address?: string;
  }>({
    method: "POST",
    path: "/clients",
    body: { apiKey: organizationToken },
  });
  if (data?.id === undefined || data?.id === null) {
    throw new Error(
      "MyNotary POST /clients did not return an organization id; check the token."
    );
  }
  return {
    id: String(data.id),
    name: typeof data.name === "string" ? data.name : undefined,
    address: typeof data.address === "string" ? data.address : undefined,
  };
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

// GET /operations/{id} — raw operation detail. Unlike `getOperation`
// (whose typed shape predates our knowledge of the real payload), this
// returns the verbatim JSON so the enrichment service can read the
// `records` role map ({ VENDEUR: [id], BIEN_VENDU: [id], OFFRANT: [id] })
// and the free-form `questions` map (offre_prix, prix_vente_total…).
export const getOperationRaw = async (
  operationId: string
): Promise<Record<string, unknown>> => {
  return callMyNotary<Record<string, unknown>>({
    method: "GET",
    path: `/operations/${encodeURIComponent(operationId)}`,
  });
};

// GET /records/{id} — raw record detail. Person records
// (RECORD__PERSONNE__PHYSIQUE / __MORALE) expose
// questions.{nom,prenoms,email,telephone,adresse}; property records
// (RECORD__BIEN__*) expose questions.{adresse,mesurage_carrez_superficie}.
export const getRecordRaw = async (
  recordId: string
): Promise<Record<string, unknown>> => {
  return callMyNotary<Record<string, unknown>>({
    method: "GET",
    path: `/records/${encodeURIComponent(recordId)}`,
  });
};

// GET /contracts/{id} — fetch a single contract's metadata.
//
// Why we need it: the `signature_completed` webhook payload ships
// `contractId`, `operationId`, `files[]` and `signatureTime` but NOT
// the contract `model` (its template id). Without the model we cannot
// classify the contract (mandate / offre / compromis / location…), so
// the webhook path enriches the payload with this call before
// ingesting. The response is metadata-only (no records, no PDF URL):
//   { id, model, label, status, creationTime, signatureTime, signatureType }
export const getContract = async (
  contractId: string
): Promise<MyNotaryContractSummary> => {
  return callMyNotary<MyNotaryContractSummary>({
    method: "GET",
    path: `/contracts/${encodeURIComponent(contractId)}`,
  });
};

// GET /operations — list the organization's operations, each with an
// embedded `contracts[]` array (id / model / status / signatureTime).
//
// This is the canonical backfill source (per MyNotary support): the
// `/register-entries` endpoint only tracks the carte-T mandate ledger
// and never exposes offers / preliminary sales. Operations expose
// every contract with a precise `status` so we can ingest exactly the
// SIGNATURE_COMPLETED ones.
//
// Pagination caveat (empirically observed, 29/05/2026): the `page`
// param appears to be ignored on this org (page=0 and page=1 returned
// the identical 65-operation set). The backfill therefore dedupes by
// operation id and stops when a page introduces no new operations.
export type ListOperationsParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
};

export const listOperations = async (
  params: ListOperationsParams
): Promise<MyNotaryOperationListItem[]> => {
  const pageSize = Math.min(Math.max(params.pageSize ?? 100, 1), 100);
  const data = await callMyNotary<MyNotaryOperationListItem[] | {
    items?: MyNotaryOperationListItem[];
  }>({
    method: "GET",
    path: "/operations",
    // Spec (external-filtered.yaml) : pagination par `offset` / `limit`
    // (max 300). `page` / `pageSize` étaient ignorés côté serveur : la même
    // première page revenait à chaque appel (vérifié le 29/10/2026).
    query: {
      organizationId: params.organizationId,
      offset: (params.page ?? 0) * pageSize,
      limit: pageSize,
    },
  });
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

// GET /register-entries — used by the backfill cron + script to walk
// the agency's mandate / transaction registers and ingest signed
// contracts we may have missed (e.g. delivered before the webhook was
// configured).
//
// Per the spec, the endpoint is REQUIRED-paginated and a `type` filter
// must be provided per call (MANAGEMENT for mandats, TRANSACTION for
// promesses / compromis / actes). The caller is expected to iterate
// `page` until the API returns fewer than `pageSize` entries.
//
// IMPORTANT — pagination is **0-indexed** (empirically confirmed
// against api.mynotary.fr/api/v1, Q2 2026): page=0 returns the first
// batch, page=1 the next, etc. Asking for page=1 on a register that
// has fewer than pageSize entries returns `{ items: [], total: N }`
// instead of repeating the same page or erroring out — which is the
// bug we hit on the very first prod backfill.
//
// We expose a `total` field on the response so the caller can also
// stop early when `(page + 1) * pageSize >= total`.
export type GetRegisterEntriesParams = {
  organizationId: string;
  type: MyNotaryRegisterType;
  page: number;
  pageSize?: number;
  status?: "CLOSED" | "RESERVED" | "VALIDATED";
};

export const getRegisterEntries = async (
  params: GetRegisterEntriesParams
): Promise<MyNotaryRegisterEntriesPage> => {
  const pageSize = Math.min(Math.max(params.pageSize ?? 100, 1), 100);
  const data = await callMyNotary<{
    items?: MyNotaryRegisterEntriesPage["entries"];
    entries?: MyNotaryRegisterEntriesPage["entries"];
    total?: number;
    totalCount?: number;
  }>({
    method: "GET",
    path: "/register-entries",
    query: {
      organizationId: params.organizationId,
      type: params.type,
      page: params.page,
      pageSize,
      status: params.status,
    },
  });
  const entries = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.entries)
      ? data.entries
      : [];
  const total =
    typeof data?.total === "number"
      ? data.total
      : typeof data?.totalCount === "number"
        ? data.totalCount
        : undefined;
  // Two complementary signals for the caller:
  // - `hasMore=false` if we fetched fewer than `pageSize` items, OR
  //   if we know `total` and the next page is past the end.
  const consumed = (params.page + 1) * pageSize;
  const hasMore =
    entries.length === pageSize && (total === undefined || consumed < total);
  return {
    entries,
    page: params.page,
    pageSize,
    hasMore,
    total,
  };
};

// ---------------------------------------------------------------------
// Fichiers (identifiants permanents — jamais d'URL signée en base)
// ---------------------------------------------------------------------

export type MyNotaryFileDownload = { downloadUrl: string };

export type MyNotarySignatureDetails = {
  id?: number | string;
  status?: string;
  files?: Array<{ signedFileId?: string; name?: string }>;
  signatories?: Array<{
    id?: number | string;
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    type?: string;
  }>;
};

// GET /signatures/{signatureId} — cérémonie de signature d'un contrat :
// signataires et identifiants permanents des fichiers signés. Null quand la
// cérémonie n'existe pas (signature papier ou importée) : 404 côté API.
export const getSignature = async (
  signatureId: string
): Promise<MyNotarySignatureDetails | null> => {
  try {
    return await callMyNotary<MyNotarySignatureDetails>({
      method: "GET",
      path: `/signatures/${encodeURIComponent(signatureId)}`,
    });
  } catch (error) {
    if ((error as MyNotaryRequestError | null)?.status === 404) return null;
    throw error;
  }
};

// GET /files/{fileId} — lien de téléchargement frais (valable 7 jours)
// pour un identifiant de fichier (signedFileId d'un webhook, fileId d'un
// drive-file, dernier segment des anciennes URLs `documents`). C'est la
// seule façon de lire un fichier une fois `files[].url` retiré
// (1er décembre 2026).
export const getFileDownloadUrl = async (fileId: string): Promise<string> => {
  const response = await callMyNotary<MyNotaryFileDownload>({
    method: "GET",
    path: `/files/${encodeURIComponent(fileId)}`,
  });
  if (!response?.downloadUrl) {
    throw new Error(`MyNotary GET /files/${fileId}: no downloadUrl in response`);
  }
  return response.downloadUrl;
};

export type MyNotaryUploadedFile = { id: string; status?: "SUCCESS" | "UPLOADING" };

// POST /files en multipart/form-data (le flux `fileName` + PUT sur
// `uploadUrl` est retiré le 1er décembre 2026). PDF uniquement, 200 Mo
// max ; `name` doit précéder la part `file`.
export const uploadFile = async (input: {
  name: string;
  bytes: Uint8Array | ArrayBuffer | Buffer;
  contentType?: string;
}): Promise<MyNotaryUploadedFile> => {
  const form = new FormData();
  const fileName = input.name.toLowerCase().endsWith(".pdf") ? input.name : `${input.name}.pdf`;
  form.append("name", fileName);
  form.append(
    "file",
    new Blob([input.bytes as BlobPart], { type: input.contentType ?? "application/pdf" }),
    fileName
  );
  const response = await callMyNotary<MyNotaryUploadedFile>({
    method: "POST",
    path: "/files",
    formData: form,
  });
  if (!response?.id) {
    throw new Error("MyNotary POST /files: no id in response");
  }
  return response;
};

// ---------------------------------------------------------------------
// Configuration (lecture)
// ---------------------------------------------------------------------

export type MyNotaryWebhookConfig = {
  id: number;
  url: string;
  authType: "NONE" | "BASIC" | "BEARER" | "APIKEY";
};

// GET /webhooks — webhooks déclarés pour l'application (les secrets ne
// sont jamais renvoyés). Sert au contrôle « l'endpoint n'est pas public ».
export const listWebhooks = async (): Promise<MyNotaryWebhookConfig[]> => {
  return callMyNotary<MyNotaryWebhookConfig[]>({ method: "GET", path: "/webhooks" });
};

export type MyNotaryOperationTypeConfig = {
  id: string;
  label: string;
  contracts: Array<{ modelId: string; label: string }>;
};

// GET /organizations/operations — types de dossiers configurés pour
// l'organisation et contrats disponibles pour chacun. Remplace la route
// « liste des types d'opérations » retirée le 1er novembre 2026.
export const listOrganizationOperationTypes = async (
  organizationId: string
): Promise<MyNotaryOperationTypeConfig[]> => {
  return callMyNotary<MyNotaryOperationTypeConfig[]>({
    method: "GET",
    path: "/organizations/operations",
    query: { organizationId },
  });
};
