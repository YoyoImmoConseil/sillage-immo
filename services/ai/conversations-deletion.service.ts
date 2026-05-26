import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { sendTransactionalEmail } from "@/lib/email/smtp";
import { escapeHtml, renderEmailLayout } from "@/lib/email/layout";

// GDPR "right to be forgotten" service for AI client conversations.
//
// Flow:
//   1. `requestConversationDeletion({ email })` generates a 6-digit
//      code, stores its SHA-256 hash in `api_idempotency_keys`
//      (scope: gdpr.conversation_deletion) with a 15-minute TTL,
//      then emails the code to the user. We never persist the raw
//      code, only the hash + email_hash.
//
//   2. `executeConversationDeletion({ email, code })` re-derives the
//      hash, locates the matching pending request, soft-deletes
//      every `ai_conversations` row that matches either:
//        - metadata.email (any nested email key) equal to the request
//          email (case-insensitive)
//        - metadata.anonymous_session_id equal to a session_id
//          attached to the request payload (best-effort, never
//          required: the email path is the authoritative match).
//      and emits `gdpr_deletion_executed` so the rest of the
//      pipeline (embeddings, exports) can react.
//
// The verification code never exits this service. Failures are
// reported with neutral messages to avoid email enumeration.

const SCOPE = "gdpr.conversation_deletion";
const CODE_TTL_MINUTES = 15;
const SOFT_DELETE_REASON = "gdpr_request";

const hashEmail = (email: string) =>
  createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");

const hashCode = (email: string, code: string) =>
  createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${code}`)
    .digest("hex");

const generateCode = () => {
  // 6-digit code: 0–999999, padded.
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
};

const expiresAtIso = () =>
  new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

const buildDeletionEmail = (email: string, code: string) => {
  const safeCode = escapeHtml(code);
  const subject = "Code de suppression de vos conversations Sillage";
  const preheader =
    "Votre code de vérification est valable 15 minutes. Si vous n'avez pas demandé cette suppression, ignorez ce message.";
  const bodyHtml = `
    <p style="margin:0 0 14px;">Bonjour,</p>
    <p style="margin:0 0 16px;">
      Vous nous avez demandé la suppression de vos conversations avec
      l'assistant IA de Sillage Immo. Pour confirmer, saisissez ce code
      sur la page de demande&nbsp;:
    </p>
    <p style="margin:24px 0;font-size:30px;font-weight:700;letter-spacing:6px;color:#141446;">
      ${safeCode}
    </p>
    <p style="margin:0 0 12px;color:#5b5b78;font-size:14px;">
      Ce code expire dans ${CODE_TTL_MINUTES} minutes.
    </p>
    <p style="margin:0;color:#5b5b78;font-size:14px;">
      Si vous n'êtes pas à l'origine de cette demande, vous pouvez
      ignorer ce message en toute sécurité ; aucune donnée ne sera
      supprimée.
    </p>
  `;
  const footerHtml = `
    <p style="margin:0 0 4px;">À bientôt,</p>
    <p style="margin:0;">L'équipe Sillage Immo</p>
  `;
  const html = renderEmailLayout({
    preheader,
    eyebrow: "Confidentialité",
    title: "Confirmer la suppression",
    bodyHtml,
    footerHtml,
  });
  const text = [
    "Bonjour,",
    "",
    "Vous nous avez demandé la suppression de vos conversations avec l'assistant IA de Sillage Immo.",
    "Pour confirmer, saisissez ce code sur la page de demande :",
    "",
    `    ${code}`,
    "",
    `Ce code expire dans ${CODE_TTL_MINUTES} minutes.`,
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    "",
    "À bientôt,",
    "L'équipe Sillage Immo",
  ].join("\n");
  return { to: email, subject, html, text };
};

const safeTimingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

export type RequestDeletionInput = {
  email: string;
  anonymousSessionId?: string | null;
};

export type RequestDeletionResult = {
  ok: true;
  expiresInMinutes: number;
  delivered: boolean;
};

export const requestConversationDeletion = async (
  input: RequestDeletionInput
): Promise<RequestDeletionResult> => {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(normalizedEmail)) {
    throw new Error("Email invalide.");
  }

  const code = generateCode();
  const keyHash = hashCode(normalizedEmail, code);

  // Best-effort: invalidate any previous pending request for the same
  // email so a single code is in flight at any given time.
  await supabaseAdmin
    .from("api_idempotency_keys")
    .delete()
    .eq("scope", SCOPE)
    .filter(
      "response_payload->>email_hash",
      "eq",
      hashEmail(normalizedEmail)
    );

  const payload = {
    email_hash: hashEmail(normalizedEmail),
    anonymous_session_id: input.anonymousSessionId ?? null,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from("api_idempotency_keys").insert({
    scope: SCOPE,
    key_hash: keyHash,
    expires_at: expiresAtIso(),
    response_payload: payload,
  });
  if (error) {
    throw new Error(error.message);
  }

  let delivered = false;
  try {
    const result = await sendTransactionalEmail(buildDeletionEmail(
      normalizedEmail,
      code
    ));
    delivered = "sent" in result ? result.sent : false;
  } catch {
    delivered = false;
  }

  try {
    await emitDomainEvent({
      aggregateType: "gdpr_request",
      aggregateId: payload.email_hash,
      eventName: "gdpr_deletion_requested",
      payload: {
        email_hash: payload.email_hash,
        delivered,
        anonymous_session_id: input.anonymousSessionId ?? null,
      },
    });
  } catch {
    // non-blocking
  }

  return { ok: true, expiresInMinutes: CODE_TTL_MINUTES, delivered };
};

export type ExecuteDeletionInput = {
  email: string;
  code: string;
  anonymousSessionId?: string | null;
};

export type ExecuteDeletionResult = {
  ok: true;
  softDeletedConversations: number;
};

const findConversationsMatchingEmail = async (
  normalizedEmail: string,
  anonymousSessionId: string | null
): Promise<string[]> => {
  const ids = new Set<string>();

  // 1. metadata.email exactly equals the address.
  const byEmail = await supabaseAdmin
    .from("ai_conversations")
    .select("id")
    .is("deleted_at", null)
    .filter("metadata->>email", "eq", normalizedEmail)
    .limit(1000);
  if (!byEmail.error && byEmail.data) {
    for (const row of byEmail.data as Array<{ id: string }>) {
      ids.add(row.id);
    }
  }

  // 2. metadata.contact_email (some surfaces use this key).
  const byContactEmail = await supabaseAdmin
    .from("ai_conversations")
    .select("id")
    .is("deleted_at", null)
    .filter("metadata->>contact_email", "eq", normalizedEmail)
    .limit(1000);
  if (!byContactEmail.error && byContactEmail.data) {
    for (const row of byContactEmail.data as Array<{ id: string }>) {
      ids.add(row.id);
    }
  }

  // 3. seller_leads + buyer_leads joined by email.
  const sellerLeads = await supabaseAdmin
    .from("seller_leads")
    .select("id")
    .ilike("email", normalizedEmail)
    .limit(500);
  if (!sellerLeads.error && sellerLeads.data) {
    const leadIds = (sellerLeads.data as Array<{ id: string }>).map(
      (r) => r.id
    );
    if (leadIds.length > 0) {
      const sellerConvos = await supabaseAdmin
        .from("ai_conversations")
        .select("id")
        .is("deleted_at", null)
        .in("seller_lead_id", leadIds)
        .limit(2000);
      if (!sellerConvos.error && sellerConvos.data) {
        for (const row of sellerConvos.data as Array<{ id: string }>) {
          ids.add(row.id);
        }
      }
    }
  }

  const buyerLeads = await supabaseAdmin
    .from("buyer_leads")
    .select("id")
    .ilike("email", normalizedEmail)
    .limit(500);
  if (!buyerLeads.error && buyerLeads.data) {
    const leadIds = (buyerLeads.data as Array<{ id: string }>).map(
      (r) => r.id
    );
    if (leadIds.length > 0) {
      const buyerConvos = await supabaseAdmin
        .from("ai_conversations")
        .select("id")
        .is("deleted_at", null)
        .in("buyer_lead_id", leadIds)
        .limit(2000);
      if (!buyerConvos.error && buyerConvos.data) {
        for (const row of buyerConvos.data as Array<{ id: string }>) {
          ids.add(row.id);
        }
      }
    }
  }

  // 4. anonymous_session_id (best-effort): only when the caller
  // proved possession of the session via their browser request.
  if (anonymousSessionId) {
    const byAnonymous = await supabaseAdmin
      .from("ai_conversations")
      .select("id")
      .is("deleted_at", null)
      .eq("entity_type", "anonymous")
      .filter("metadata->>anonymous_session_id", "eq", anonymousSessionId)
      .limit(1000);
    if (!byAnonymous.error && byAnonymous.data) {
      for (const row of byAnonymous.data as Array<{ id: string }>) {
        ids.add(row.id);
      }
    }
  }

  return Array.from(ids);
};

export const executeConversationDeletion = async (
  input: ExecuteDeletionInput
): Promise<ExecuteDeletionResult> => {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email invalide.");
  }
  if (!/^\d{6}$/.test(input.code)) {
    throw new Error("Code invalide.");
  }

  const keyHash = hashCode(normalizedEmail, input.code);

  const { data: row, error } = await supabaseAdmin
    .from("api_idempotency_keys")
    .select("id, response_payload, expires_at, scope, key_hash")
    .eq("scope", SCOPE)
    .eq("key_hash", keyHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!row) {
    throw new Error("Code invalide ou expiré.");
  }

  // Defense-in-depth: rehash the row's key and compare with the
  // requested one (timing-safe).
  if (
    typeof row.key_hash !== "string" ||
    !safeTimingSafeEqual(row.key_hash, keyHash)
  ) {
    throw new Error("Code invalide ou expiré.");
  }

  const payload = (row.response_payload as Record<string, unknown> | null) ?? {};
  const expectedEmailHash =
    typeof payload.email_hash === "string" ? payload.email_hash : null;
  if (
    expectedEmailHash &&
    !safeTimingSafeEqual(expectedEmailHash, hashEmail(normalizedEmail))
  ) {
    throw new Error("Code invalide ou expiré.");
  }

  const sessionIdFromPayload =
    typeof payload.anonymous_session_id === "string"
      ? payload.anonymous_session_id
      : null;
  const sessionId =
    input.anonymousSessionId && input.anonymousSessionId.length > 0
      ? input.anonymousSessionId
      : sessionIdFromPayload;

  const conversationIds = await findConversationsMatchingEmail(
    normalizedEmail,
    sessionId
  );

  if (conversationIds.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("ai_conversations")
      .update({
        deleted_at: new Date().toISOString(),
        status: "archived",
        ended_at: new Date().toISOString(),
      })
      .in("id", conversationIds)
      .is("deleted_at", null);
    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  // Consume the code (one-shot).
  await supabaseAdmin.from("api_idempotency_keys").delete().eq("id", row.id);

  try {
    await emitDomainEvent({
      aggregateType: "gdpr_request",
      aggregateId: hashEmail(normalizedEmail),
      eventName: "gdpr_deletion_executed",
      payload: {
        email_hash: hashEmail(normalizedEmail),
        soft_deleted_conversations: conversationIds.length,
        reason: SOFT_DELETE_REASON,
        anonymous_session_id: sessionId,
      },
    });
  } catch {
    // non-blocking
  }

  return { ok: true, softDeletedConversations: conversationIds.length };
};
