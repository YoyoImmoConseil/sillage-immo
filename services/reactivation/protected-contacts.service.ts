import "server-only";

import { serverEnv } from "@/lib/env/server";
import { getContract, getOperationRaw, getRecordRaw, getSignature, listOperations } from "@/lib/mynotary/client";
import { isContractSigned, type MyNotaryContractStatus } from "@/lib/mynotary/types";
import {
  PROTECTED_ROLES,
  PROTECTION_WINDOW_DAYS,
  contractSignedAt,
  identityFromRecordQuestions,
  isProtectingContractModel,
  normalizeProtectedEmail,
  normalizeProtectedName,
  protectionWindowStart,
  type ProtectionIndex,
} from "@/lib/reactivation/protection";
import { asString } from "@/lib/reactivation/protection";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

/**
 * Contacts protégés : synchronisation quotidienne depuis MyNotary et index de
 * lecture pour le service d'envoi (voir lib/reactivation/protection.ts pour
 * la règle).
 *
 * Trois sources, cumulées, pour chaque contrat protecteur signé :
 * 1. les **signataires** de la cérémonie (`GET /signatures/{id}`) — source
 *    principale : ce sont exactement les personnes qui ont signé, y compris
 *    le représentant d'une société, avec leur vrai e-mail ;
 * 2. les **fiches** vendeur / bailleur / acquéreur du dossier (personnes
 *    physiques : nom, prénoms, e-mail ; personnes morales : dénomination et
 *    représentant) — complément pour les signatures papier sans cérémonie ;
 * 3. les **documents signés reçus par webhook** (`mynotary_signed_documents`,
 *    avec leurs signataires) — indépendants de la liste des dossiers, qui
 *    est plafonnée aux 100 plus récents par l'API.
 *
 * La date retenue est la signature (`signatureTime`), à défaut la validation,
 * à défaut la création. Les lignes encore dans la fenêtre de 12 mois ne sont
 * jamais purgées, même si la liste MyNotary ne les renvoie plus ; seules les
 * lignes sorties de la fenêtre et non revues sont supprimées.
 */

type Insert = Database["public"]["Tables"]["protected_contacts"]["Insert"];

const SOURCE_API = "mynotary";
const SOURCE_WEBHOOK = "mynotary_webhook";
/** Au-delà, l'index est considéré périmé et l'envoi refuse de partir. */
export const PROTECTION_MAX_STALENESS_HOURS = 48;
const AGENCY_EMAIL_FRAGMENTS = ["@sillage-immo.com", "@immoconseilnice.com"];
const PROTECTING_WEBHOOK_KINDS = new Set(["mandate", "preliminary_sale", "rental_mandate", "management_mandate"]);

const asRecordIds = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter((v) => v !== null && v !== undefined && v !== "").map((v) => String(v));

const isAgencyEmail = (email: string | null) => Boolean(email && AGENCY_EMAIL_FRAGMENTS.some((fragment) => email.endsWith(fragment)));

export type ProtectionSyncSummary = {
  operations: number;
  signedContracts: number;
  fromSignatories: number;
  fromRecords: number;
  fromWebhooks: number;
  removed: number;
  syncedAt: string;
};

export const syncProtectedContactsFromMyNotary = async (now = new Date()): Promise<ProtectionSyncSummary> => {
  const organizationId = serverEnv.MYNOTARY_ORGANIZATION_ID;
  if (!serverEnv.MYNOTARY_API_KEY || !organizationId) {
    throw new Error("MyNotary non configuré (MYNOTARY_API_KEY / MYNOTARY_ORGANIZATION_ID).");
  }
  const syncedAt = now.toISOString();
  const summary: ProtectionSyncSummary = {
    operations: 0,
    signedContracts: 0,
    fromSignatories: 0,
    fromRecords: 0,
    fromWebhooks: 0,
    removed: 0,
    syncedAt,
  };

  // Liste des dossiers : l'API plafonne à 100 (les plus récents), `offset`
  // découpe à l'intérieur de cette fenêtre. On lit donc une page, et on
  // compte sur la non-purge des lignes en fenêtre + les webhooks pour le reste.
  const seen = new Set<string>();
  const operations: Awaited<ReturnType<typeof listOperations>> = [];
  for (let page = 0; page < 10; page += 1) {
    const batch = await listOperations({ organizationId, page, pageSize: 100 });
    const fresh = batch.filter((op) => !seen.has(String(op.id)));
    fresh.forEach((op) => seen.add(String(op.id)));
    operations.push(...fresh);
    if (batch.length < 100 || fresh.length === 0) break;
  }
  summary.operations = operations.length;

  const rows = new Map<string, Insert>();
  const push = (row: Insert) => {
    rows.set(`${row.source}|${row.contract_id}|${row.record_id}`, row);
  };
  const recordCache = new Map<string, Record<string, unknown>>();

  for (const op of operations) {
    const contracts = (op.contracts ?? []).filter(
      (c) => isProtectingContractModel(c.model) && isContractSigned(c.status as MyNotaryContractStatus)
    );
    if (contracts.length === 0) continue;
    summary.signedContracts += contracts.length;

    const detail = await getOperationRaw(String(op.id));
    const records = (detail.records && typeof detail.records === "object" ? detail.records : {}) as Record<string, unknown>;

    // 2. Fiches vendeur / bailleur / acquéreur du dossier.
    const recordIdentities: Array<{ recordId: string; role: string; lastName: string | null; firstName: string | null; email: string | null; name: string | null }> = [];
    for (const [role, ids] of Object.entries(records)) {
      if (!PROTECTED_ROLES.has(role.toUpperCase())) continue;
      for (const recordId of asRecordIds(ids)) {
        let record = recordCache.get(recordId);
        if (!record) {
          record = await getRecordRaw(recordId);
          recordCache.set(recordId, record);
        }
        const questions = (record.questions && typeof record.questions === "object" ? record.questions : {}) as Record<string, unknown>;
        const identity = identityFromRecordQuestions(questions);
        if (!identity.email && !identity.name) continue;
        recordIdentities.push({ recordId, role: role.toUpperCase(), ...identity });
      }
    }

    for (const contract of contracts) {
      // Le résumé de la liste n'a pas toujours signatureTime / currentSignatureId : on relit le contrat.
      const full = (await getContract(String(contract.id)).catch(() => contract)) as typeof contract & {
        validatedTime?: string;
        currentSignatureId?: number | string;
      };
      const signedAt = contractSignedAt(full);
      if (!signedAt) continue;
      const base = {
        contract_model: full.model ?? contract.model ?? null,
        operation_id: String(op.id),
        operation_label: op.label ?? null,
        operation_archived: Boolean(op.archived),
        signed_at: signedAt,
        synced_at: syncedAt,
      };

      // 1. Signataires de la cérémonie (source principale).
      if (full.currentSignatureId !== undefined && full.currentSignatureId !== null) {
        const signature = await getSignature(String(full.currentSignatureId));
        for (const signatory of signature?.signatories ?? []) {
          const email = normalizeProtectedEmail(signatory.email ?? null);
          if (isAgencyEmail(email)) continue;
          const name = normalizeProtectedName(signatory.lastname ?? null, signatory.firstname ?? null);
          if (!email && !name) continue;
          push({
            ...base,
            source: SOURCE_API,
            contract_id: String(contract.id),
            record_id: `signatory:${signatory.id ?? email ?? name}`,
            role: "SIGNATAIRE",
            first_name: signatory.firstname ?? null,
            last_name: signatory.lastname ?? null,
            normalized_email: email,
            normalized_name: name,
          });
          summary.fromSignatories += 1;
        }
      }
      // 2. Fiches du dossier.
      for (const identity of recordIdentities) {
        push({
          ...base,
          source: SOURCE_API,
          contract_id: String(contract.id),
          record_id: identity.recordId,
          role: identity.role,
          first_name: identity.firstName,
          last_name: identity.lastName,
          normalized_email: identity.email,
          normalized_name: identity.name,
        });
        summary.fromRecords += 1;
      }
    }
  }

  // 3. Documents signés reçus par webhook (indépendants du plafond de la liste).
  const since = protectionWindowStart(now).toISOString();
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabaseAdmin
      .from("mynotary_signed_documents")
      .select("mynotary_operation_id, mynotary_contract_id, contract_kind, contract_type_raw, signed_at, signers")
      .is("deleted_at", null)
      .gte("signed_at", since)
      .order("signed_at", { ascending: true })
      .range(from, from + 499);
    if (error) throw new Error(error.message);
    for (const doc of data ?? []) {
      if (!PROTECTING_WEBHOOK_KINDS.has(doc.contract_kind) && !isProtectingContractModel(doc.contract_type_raw)) continue;
      const signers = Array.isArray(doc.signers) ? (doc.signers as Array<Record<string, unknown>>) : [];
      for (const [index, signer] of signers.entries()) {
        const email = normalizeProtectedEmail(asString(signer.email));
        if (isAgencyEmail(email)) continue;
        const lastName = asString(signer.lastName) ?? asString(signer.lastname);
        const firstName = asString(signer.firstName) ?? asString(signer.firstname);
        const name = normalizeProtectedName(lastName, firstName);
        if (!email && !name) continue;
        push({
          source: SOURCE_WEBHOOK,
          contract_id: String(doc.mynotary_contract_id),
          contract_model: doc.contract_type_raw ?? doc.contract_kind,
          operation_id: String(doc.mynotary_operation_id),
          operation_label: null,
          operation_archived: false,
          record_id: `signer:${asString(signer.recordId) ?? email ?? name ?? index}`,
          role: asString(signer.role)?.toUpperCase() ?? "SIGNATAIRE",
          first_name: firstName,
          last_name: lastName,
          normalized_email: email,
          normalized_name: name,
          signed_at: new Date(doc.signed_at).toISOString(),
          synced_at: syncedAt,
        });
        summary.fromWebhooks += 1;
      }
    }
    if (!data || data.length < 500) break;
  }

  const inserts = [...rows.values()];
  for (let index = 0; index < inserts.length; index += 200) {
    const { error } = await supabaseAdmin
      .from("protected_contacts")
      .upsert(inserts.slice(index, index + 200), { onConflict: "source,contract_id,record_id" });
    if (error) throw new Error(error.message);
  }

  // Purge : seulement les lignes non revues ET sorties de la fenêtre de 12 mois.
  // Une ligne encore en fenêtre reste protectrice même si la liste MyNotary
  // (plafonnée à 100 dossiers) ne la renvoie plus.
  const { data: removedRows, error: removeError } = await supabaseAdmin
    .from("protected_contacts")
    .delete()
    .lt("synced_at", syncedAt)
    .lt("signed_at", since)
    .select("id");
  if (removeError) throw new Error(removeError.message);
  summary.removed = removedRows?.length ?? 0;
  return summary;
};

/** Index des personnes protégées dans la fenêtre glissante, pour le service d'envoi. */
export const loadProtectionIndex = async (now = new Date(), windowDays = PROTECTION_WINDOW_DAYS): Promise<ProtectionIndex> => {
  const since = protectionWindowStart(now, windowDays).toISOString();
  const emails = new Set<string>();
  const names = new Set<string>();
  let syncedAt: Date | null = null;
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("protected_contacts")
      .select("normalized_email, normalized_name, synced_at, signed_at")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const synced = new Date(row.synced_at);
      if (!syncedAt || synced > syncedAt) syncedAt = synced;
      if (row.signed_at < since) continue;
      if (row.normalized_email) emails.add(row.normalized_email);
      if (row.normalized_name) names.add(row.normalized_name);
    }
    if (!data || data.length < PAGE) break;
  }
  return { emails, names, syncedAt, size: Math.max(emails.size, names.size) };
};

/**
 * Garde-fou : l'envoi refuse de partir si la protection n'a jamais été
 * synchronisée ou si la dernière synchronisation est trop ancienne. Mieux
 * vaut un lot qui ne part pas qu'un mail à un client sous mandat.
 */
export const assertProtectionFresh = (index: ProtectionIndex, now = new Date()) => {
  if (!index.syncedAt) {
    throw new Error("Protection MyNotary jamais synchronisée : lancez la synchronisation avant d'envoyer.");
  }
  const ageHours = (now.getTime() - index.syncedAt.getTime()) / 3_600_000;
  if (ageHours > PROTECTION_MAX_STALENESS_HOURS) {
    throw new Error(
      `Protection MyNotary périmée (dernière synchronisation il y a ${Math.round(ageHours)} h) : relancez la synchronisation avant d'envoyer.`
    );
  }
};
