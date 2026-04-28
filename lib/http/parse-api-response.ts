/**
 * Defensive JSON parser for fetch responses to admin/client API routes.
 *
 * Why: Vercel (and any reverse proxy in front of a serverless function) can
 * intercept the request **before** the route handler runs, e.g. when the body
 * exceeds the platform 4.5 MB limit, returning a plain-text "Request Entity
 * Too Large" 413 instead of JSON. Calling `await res.json()` blindly then
 * throws `Unexpected token 'R', "Request En..." is not valid JSON`, which is
 * useless to display to the user.
 *
 * This helper:
 * - Never throws on bad payloads.
 * - Always returns `{ ok: boolean, data?, message? }` so callers can render a
 *   readable message even when the upstream response is HTML or text.
 * - Maps a few well-known HTTP statuses (413, 401/403, 500, 502/503/504) to
 *   user-friendly French messages.
 */

export type ApiResponse<T = unknown> = {
  ok: boolean;
  status: number;
  data?: T;
  message?: string;
};

const STATUS_FALLBACK_MESSAGES: Record<number, string> = {
  401: "Session expirée, reconnectez-vous.",
  403: "Accès refusé.",
  404: "Ressource introuvable.",
  413: "Le fichier est trop volumineux pour être envoyé via cette voie. Réessayez ou contactez le support.",
  500: "Erreur serveur, réessayez dans un instant.",
  502: "Service momentanément indisponible.",
  503: "Service momentanément indisponible.",
  504: "Le serveur a mis trop de temps à répondre.",
};

const truncate = (value: string, max = 200) => {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
};

const extractTextMessage = (text: string, status: number): string => {
  const trimmed = text.trim();
  if (!trimmed) {
    return STATUS_FALLBACK_MESSAGES[status] ?? `Erreur ${status}.`;
  }
  if (/<!doctype html|<html/i.test(trimmed)) {
    return STATUS_FALLBACK_MESSAGES[status] ?? `Erreur ${status}.`;
  }
  return truncate(trimmed);
};

export async function parseApiResponse<T = unknown>(res: Response): Promise<ApiResponse<T>> {
  const status = res.status;
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const json = (await res.json()) as
        | (T & { ok?: boolean; message?: string })
        | { ok?: boolean; message?: string };
      const ok = res.ok && (json as { ok?: boolean })?.ok !== false;
      return {
        ok,
        status,
        data: json as T,
        message: (json as { message?: string }).message,
      };
    } catch {
      return {
        ok: false,
        status,
        message: STATUS_FALLBACK_MESSAGES[status] ?? "Réponse JSON invalide.",
      };
    }
  }

  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }

  return {
    ok: false,
    status,
    message: extractTextMessage(text, status),
  };
}
