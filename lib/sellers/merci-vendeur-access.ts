import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { serverEnv } from "@/lib/env/server";

const MERCI_VENDEUR_TOKEN_VERSION = 1;
const MERCI_VENDEUR_TOKEN_TTL_SECONDS = 60 * 60 * 24;

type MerciVendeurAccessClaims = {
  v: number;
  leadId: string;
  exp: number;
};

const toBase64Url = (value: Buffer | string) => {
  return Buffer.from(value).toString("base64url");
};

const fromBase64Url = (value: string) => {
  return Buffer.from(value, "base64url").toString("utf8");
};

const getMerciVendeurSecret = () => {
  return process.env.MERCI_VENDEUR_ACCESS_SECRET?.trim() || serverEnv.ADMIN_API_KEY;
};

const signPayload = (payload: string) => {
  return createHmac("sha256", getMerciVendeurSecret()).update(payload).digest();
};

export const createMerciVendeurAccessToken = (leadId: string) => {
  const claims: MerciVendeurAccessClaims = {
    v: MERCI_VENDEUR_TOKEN_VERSION,
    leadId,
    exp: Math.floor(Date.now() / 1000) + MERCI_VENDEUR_TOKEN_TTL_SECONDS,
  };
  const payload = JSON.stringify(claims);
  const encodedPayload = toBase64Url(payload);
  const encodedSignature = toBase64Url(signPayload(payload));
  return `${encodedPayload}.${encodedSignature}`;
};

export const readMerciVendeurAccessToken = (token: string | null | undefined) => {
  if (!token) return null;
  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) return null;

  try {
    const payload = fromBase64Url(encodedPayload);
    const expectedSignature = signPayload(payload);
    const providedSignature = Buffer.from(encodedSignature, "base64url");

    if (
      expectedSignature.length !== providedSignature.length ||
      !timingSafeEqual(expectedSignature, providedSignature)
    ) {
      return null;
    }

    const claims = JSON.parse(payload) as Partial<MerciVendeurAccessClaims>;
    if (
      claims.v !== MERCI_VENDEUR_TOKEN_VERSION ||
      typeof claims.leadId !== "string" ||
      !claims.leadId.trim() ||
      typeof claims.exp !== "number" ||
      claims.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      leadId: claims.leadId,
      expiresAt: claims.exp,
    };
  } catch {
    return null;
  }
};
