import "server-only";

type LoupeTokenCache = {
  token: string;
  expiresAtMs: number;
  baseUrl: string;
} | null;

const DEFAULT_BASE_URL = "https://api.la-loupe.immo";
const TOKEN_TTL_MS = 45 * 60 * 1000;

let tokenCache: LoupeTokenCache = null;

const getLoupeEnv = () => {
  const configuredBaseUrl = process.env.LOUPE_API_BASE_URL || DEFAULT_BASE_URL;
  const fallbackBaseUrl =
    configuredBaseUrl === "https://api.loupe.immo"
      ? "https://api.la-loupe.immo"
      : DEFAULT_BASE_URL;
  const baseUrls = [configuredBaseUrl, fallbackBaseUrl].filter(
    (value, index, array) => Boolean(value) && array.indexOf(value) === index
  );
  const email = process.env.LOUPE_API_EMAIL;
  const password = process.env.LOUPE_API_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing Loupe API credentials (LOUPE_API_EMAIL / LOUPE_API_PASSWORD).");
  }

  return { baseUrls, email, password };
};

const safeJson = async (response: Response) => {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

const extractToken = (payload: unknown): string | null => {
  const visit = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const candidates = [
      record.token,
      record.access_token,
      record.accessToken,
      record.apiToken,
      record.jwt,
      record.id_token,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    for (const nested of Object.values(record)) {
      const nestedToken = visit(nested);
      if (nestedToken) return nestedToken;
    }
    return null;
  };

  const token = visit(payload);
  if (token) {
    return token;
  }
  return null;
};

const authorizationCandidates = (token: string) => {
  return [`Bearer ${token}`, token];
};

const authenticate = async () => {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now) {
    return tokenCache;
  }

  const env = getLoupeEnv();
  let lastError = "Loupe auth failed.";

  for (const baseUrl of env.baseUrls) {
    try {
      const response = await fetch(`${baseUrl}/v1/auth-main/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: env.email, password: env.password }),
        cache: "no-store",
      });

      const payload = await safeJson(response);
      if (!response.ok) {
        lastError = `Loupe auth failed on ${baseUrl} (${response.status}): ${JSON.stringify(
          payload
        )}`;
        continue;
      }

      const token = extractToken(payload);
      if (!token) {
        lastError = `Loupe auth succeeded on ${baseUrl} but token not found in response.`;
        continue;
      }

      tokenCache = { token, baseUrl, expiresAtMs: now + TOKEN_TTL_MS };
      return tokenCache;
    } catch (error) {
      lastError =
        error instanceof Error
          ? `Loupe auth network error on ${baseUrl}: ${error.message}`
          : `Loupe auth network error on ${baseUrl}.`;
    }
  }
  throw new Error(lastError);
};

const postWithAuth = async (path: string, body: unknown) => {
  const auth = await authenticate();
  const execute = async (baseUrl: string, token: string) => {
    let lastResponse: Response | null = null;
    let lastPayload: unknown = null;
    for (const headerValue of authorizationCandidates(token)) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: headerValue,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const payload = await safeJson(response);
      lastResponse = response;
      lastPayload = payload;
      if (response.status !== 401 && response.status !== 403) {
        return { response, payload };
      }
    }
    return { response: lastResponse as Response, payload: lastPayload };
  };

  const first = await execute(auth.baseUrl, auth.token);
  if (first.response.status === 401 || first.response.status === 403) {
    tokenCache = null;
    const retryAuth = await authenticate();
    return execute(retryAuth.baseUrl, retryAuth.token);
  }

  return first;
};

const getWithAuth = async (path: string) => {
  const auth = await authenticate();
  const execute = async (baseUrl: string, token: string) => {
    let lastResponse: Response | null = null;
    let lastPayload: unknown = null;
    for (const headerValue of authorizationCandidates(token)) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers: { Authorization: headerValue },
        cache: "no-store",
      });
      const payload = await safeJson(response);
      lastResponse = response;
      lastPayload = payload;
      if (response.status !== 401 && response.status !== 403) {
        return { response, payload };
      }
    }
    return { response: lastResponse as Response, payload: lastPayload };
  };

  const first = await execute(auth.baseUrl, auth.token);
  if (first.response.status === 401 || first.response.status === 403) {
    tokenCache = null;
    const retryAuth = await authenticate();
    return execute(retryAuth.baseUrl, retryAuth.token);
  }

  return first;
};

export const loupeClient = {
  createAddressAnalysis: async (payload: unknown) => {
    return postWithAuth("/v1/pro/address-analysis", payload);
  },
  searchAddressAnalyses: async (searchString: string) => {
    return postWithAuth("/v1/pro/address-analysis/paginate", {
      limit: "10",
      orderDir: "desc",
      searchString,
    });
  },
  getAddressAnalysisById: async (id: string) => {
    return getWithAuth(`/v1/pro/address-analysis/${id}`);
  },
  getLeadById: async (id: string) => {
    return getWithAuth(`/v1/pro/lead/${encodeURIComponent(id)}`);
  },
  searchLeads: async (searchString: string) => {
    return postWithAuth("/v1/pro/lead/paginate", {
      limit: "10",
      orderDir: "desc",
      searchString,
    });
  },
};
