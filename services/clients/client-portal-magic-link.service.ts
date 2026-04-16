import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendClientPortalAccessEmail } from "@/lib/email/smtp";
import { serverEnv } from "@/lib/env/server";
import { getInvitationByToken } from "./client-project-invitation.service";
import { prepareClientPortalLogin } from "./client-portal-login.service";

type SendClientPortalMagicLinkInput = {
  email: string;
  nextPath?: string;
  inviteToken?: string | null;
  origin: string;
};

type ClientPortalLinkResult =
  | {
      ok: true;
      data: {
        email: string;
        context: "invite" | "login";
        link: string;
      };
    }
  | {
      ok: false;
      code:
        | "invalid"
        | "revoked"
        | "expired"
        | "email_mismatch"
        | "no_portal_access";
      message: string;
    };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getSafeNextPath = (value?: string | null) => {
  if (!value || !value.startsWith("/")) {
    return "/espace-client";
  }

  return value;
};

const getBaseUrl = (origin: string) => {
  const configured = serverEnv.PUBLIC_SITE_URL.trim();
  return configured || origin;
};

const generatePortalLink = async (input: {
  email: string;
  nextPath: string;
  inviteToken: string | null;
  baseUrl: string;
  type: "signup" | "magiclink";
}) => {
  const confirmUrl = new URL("/espace-client/auth/confirm", input.baseUrl);
  confirmUrl.searchParams.set("next", input.nextPath);
  if (input.inviteToken) {
    confirmUrl.searchParams.set("inviteToken", input.inviteToken);
  }

  const generateParams =
    input.type === "signup"
      ? {
          type: "signup" as const,
          email: input.email,
          password: crypto.randomUUID(),
          options: {
            redirectTo: confirmUrl.toString(),
          },
        }
      : {
          type: "magiclink" as const,
          email: input.email,
          options: {
            redirectTo: confirmUrl.toString(),
          },
        };

  const { data, error } = await supabaseAdmin.auth.admin.generateLink(generateParams);

  if (error || !data?.properties?.hashed_token) {
    throw new Error(error?.message ?? "Impossible de generer le lien de connexion.");
  }

  confirmUrl.searchParams.set("token_hash", data.properties.hashed_token);
  confirmUrl.searchParams.set("type", data.properties.verification_type);

  // #region agent log
  fetch("http://127.0.0.1:7760/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
    body: JSON.stringify({
      sessionId: "cada68",
      runId: "pre-fix",
      hypothesisId: "H2",
      location: "services/clients/client-portal-magic-link.service.ts:71",
      message: "portal link generated",
      data: {
        requestedType: input.type,
        verificationType: data.properties.verification_type,
        hasInviteToken: Boolean(input.inviteToken),
        hasTokenHash: confirmUrl.searchParams.has("token_hash"),
        hasNext: confirmUrl.searchParams.has("next"),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return confirmUrl.toString();
};

const resolveClientPortalAccessLink = async (
  input: SendClientPortalMagicLinkInput
): Promise<ClientPortalLinkResult> => {
  const email = normalizeEmail(input.email);
  const nextPath = getSafeNextPath(input.nextPath);
  const baseUrl = getBaseUrl(input.origin);

  let effectiveEmail = email;
  let inviteToken: string | null = null;
  let context: "invite" | "login" = "login";
  let link: string;

  if (input.inviteToken) {
    const invitation = await getInvitationByToken(input.inviteToken);

    // #region agent log
    fetch("http://127.0.0.1:7760/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
      body: JSON.stringify({
        sessionId: "cada68",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "services/clients/client-portal-magic-link.service.ts:95",
        message: "invitation token lookup",
        data: {
          invitationStatus: invitation?.status ?? "invalid",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!invitation || invitation.status === "invalid") {
      return { ok: false as const, code: "invalid", message: "Cette invitation est introuvable." };
    }
    if (invitation.status === "revoked") {
      return { ok: false as const, code: "revoked", message: "Cette invitation a ete revoquee." };
    }
    if (invitation.status === "expired") {
      return { ok: false as const, code: "expired", message: "Cette invitation a expire." };
    }
    if (normalizeEmail(invitation.email) !== email) {
      return {
        ok: false as const,
        code: "email_mismatch",
        message: "Vous devez utiliser l'adresse email qui a recu l'invitation.",
      };
    }

    effectiveEmail = normalizeEmail(invitation.email);
    inviteToken = input.inviteToken;
    context = "invite";

    try {
      link = await generatePortalLink({
        email: effectiveEmail,
        nextPath,
        inviteToken,
        baseUrl,
        type: "signup",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!message.includes("already") && !message.includes("registered")) {
        throw error;
      }
      link = await generatePortalLink({
        email: effectiveEmail,
        nextPath,
        inviteToken,
        baseUrl,
        type: "magiclink",
      });
    }
  } else {
    const prepared = await prepareClientPortalLogin({ email, nextPath });
    if (!prepared.ok) {
      return { ok: false as const, code: prepared.code, message: prepared.message };
    }

    effectiveEmail = normalizeEmail(prepared.data.email);
    inviteToken = prepared.data.inviteToken;
    context = prepared.data.mode;
    if (prepared.data.mode === "invite") {
      try {
        link = await generatePortalLink({
          email: effectiveEmail,
          nextPath: prepared.data.nextPath,
          inviteToken,
          baseUrl,
          type: "signup",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("already") && !message.includes("registered")) {
          throw error;
        }
        link = await generatePortalLink({
          email: effectiveEmail,
          nextPath: prepared.data.nextPath,
          inviteToken,
          baseUrl,
          type: "magiclink",
        });
      }
    } else {
      link = await generatePortalLink({
        email: effectiveEmail,
        nextPath: prepared.data.nextPath,
        inviteToken,
        baseUrl,
        type: "magiclink",
      });
    }
  }

  return {
    ok: true as const,
    data: {
      email: effectiveEmail,
      context,
      link,
    },
  };
};

export const createClientPortalAccessLink = async (input: SendClientPortalMagicLinkInput) => {
  return resolveClientPortalAccessLink(input);
};

export const sendClientPortalMagicLink = async (input: SendClientPortalMagicLinkInput) => {
  const resolved = await resolveClientPortalAccessLink(input);
  if (!resolved.ok) {
    return resolved;
  }

  const sent = await sendClientPortalAccessEmail({
    email: resolved.data.email,
    accessLink: resolved.data.link,
    context: resolved.data.context,
  });

  // #region agent log
  fetch("http://127.0.0.1:7760/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
    body: JSON.stringify({
      sessionId: "cada68",
      runId: "pre-fix",
      hypothesisId: "H4",
      location: "services/clients/client-portal-magic-link.service.ts:209",
      message: "portal access email send result",
      data: {
        context: resolved.data.context,
        sent: sent.sent,
        provider: "provider" in sent ? sent.provider : null,
        reason: "reason" in sent ? sent.reason : null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!sent.sent) {
    return {
      ok: false as const,
      code: "email_send_failed",
      message: "Le lien a ete prepare, mais son envoi par email a echoue.",
    };
  }

  return {
    ok: true as const,
    data: {
      email: resolved.data.email,
      context: resolved.data.context,
    },
  };
};
