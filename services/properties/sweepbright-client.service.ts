import "server-only";
import { serverEnv } from "@/lib/env/server";
import type {
  SweepBrightEstateData,
  SweepBrightTokenResponse,
} from "@/types/api/sweepbright";

type SweepBrightTokenCache = {
  token: string;
  expiresAtMs: number;
} | null;

const TOKEN_SAFETY_WINDOW_MS = 60_000;
let tokenCache: SweepBrightTokenCache = null;

const requireSweepBrightCredentials = () => {
  if (!serverEnv.SWEEPBRIGHT_CLIENT_ID || !serverEnv.SWEEPBRIGHT_CLIENT_SECRET) {
    throw new Error(
      "Missing SweepBright credentials (SWEEPBRIGHT_CLIENT_ID / SWEEPBRIGHT_CLIENT_SECRET)."
    );
  }

  return {
    clientId: serverEnv.SWEEPBRIGHT_CLIENT_ID,
    clientSecret: serverEnv.SWEEPBRIGHT_CLIENT_SECRET,
    baseUrl: serverEnv.SWEEPBRIGHT_API_BASE_URL.replace(/\/$/, ""),
    version: serverEnv.SWEEPBRIGHT_API_VERSION,
  };
};

const safeJson = async (response: Response) => {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

const acceptHeader = (version: string) => {
  return `application/vnd.sweepbright.v${version}+json`;
};

const authenticate = async () => {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + TOKEN_SAFETY_WINDOW_MS) {
    return tokenCache.token;
  }

  const env = requireSweepBrightCredentials();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.clientId,
    client_secret: env.clientSecret,
  });

  const response = await fetch(`${env.baseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: acceptHeader(env.version),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const payload = (await safeJson(response)) as SweepBrightTokenResponse | Record<string, unknown> | null;
  if (!response.ok || !payload || typeof payload !== "object") {
    throw new Error(
      `SweepBright auth failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  if (
    typeof payload.access_token !== "string" ||
    typeof payload.expires_in !== "number"
  ) {
    throw new Error("SweepBright auth response is missing access_token or expires_in.");
  }

  tokenCache = {
    token: payload.access_token,
    expiresAtMs: now + payload.expires_in * 1000,
  };

  return tokenCache.token;
};

const requestWithAuth = async (input: {
  path: string;
  method: "GET" | "PUT" | "POST";
  body?: unknown;
}) => {
  const env = requireSweepBrightCredentials();
  const execute = async (token: string) => {
    const response = await fetch(`${env.baseUrl}${input.path}`, {
      method: input.method,
      headers: {
        Accept: acceptHeader(env.version),
        Authorization: `Bearer ${token}`,
        ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
      cache: "no-store",
    });

    return { response, payload: await safeJson(response) };
  };

  const first = await execute(await authenticate());
  if (first.response.status === 401 || first.response.status === 403) {
    tokenCache = null;
    return execute(await authenticate());
  }

  return first;
};

export const sweepBrightClient = {
  getEstate: async (estateId: string) => {
    const { response, payload } = await requestWithAuth({
      path: `/estates/${encodeURIComponent(estateId)}`,
      method: "GET",
    });

    if (!response.ok || !payload || typeof payload !== "object") {
      throw new Error(
        `SweepBright estate fetch failed (${response.status}): ${JSON.stringify(payload)}`
      );
    }

    return payload as SweepBrightEstateData;
  },

  setEstateUrl: async (estateId: string, url: string) => {
    const { response, payload } = await requestWithAuth({
      path: `/estates/${encodeURIComponent(estateId)}/url`,
      method: "PUT",
      body: { url },
    });

    if (!response.ok) {
      throw new Error(
        `SweepBright set estate url failed (${response.status}): ${JSON.stringify(payload)}`
      );
    }
  },

  sendContactLead: async (payload: Record<string, unknown>) => {
    const result = await requestWithAuth({
      path: "/contacts",
      method: "POST",
      body: payload,
    });

    if (!result.response.ok) {
      throw new Error(
        `SweepBright contact lead failed (${result.response.status}): ${JSON.stringify(result.payload)}`
      );
    }

    return result.payload;
  },

  sendOwnerLead: async (payload: Record<string, unknown>) => {
    const result = await requestWithAuth({
      path: "/contacts/owners",
      method: "POST",
      body: payload,
    });

    if (!result.response.ok) {
      throw new Error(
        `SweepBright owner lead failed (${result.response.status}): ${JSON.stringify(result.payload)}`
      );
    }

    return result.payload;
  },
};
