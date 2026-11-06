import "server-only";

import { serverEnv } from "@/lib/env/server";
import { getOperationRaw, getRecordRaw, listOperations } from "@/lib/mynotary/client";
import { isContractSigned, type MyNotaryContractStatus } from "@/lib/mynotary/types";
import {
  PROTECTED_ROLES,
  PROTECTION_WINDOW_DAYS,
  isProtectingContractModel,
  normalizeProtectedEmail,
  normalizeProtectedName,
  protectionWindowStart,
  type ProtectionIndex,
} from "@/lib/reactivation/protection";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

/**
 * Contacts protégés : synchronisation quotidienne depuis MyNotary et index de
 * lecture pour le service d'envoi (voir lib/reactivation/protection.ts pour
 * la règle). La table est recalculée en entier à chaque synchronisation
 * (quelques dizaines de dossiers), puis purgée des lignes qui n'ont pas été
 * revues : un contrat disparu de MyNotary cesse de protéger.
 */

type Insert = Database["public"]["Tables"]["protected_contacts"]["Insert"];

const SOURCE = "mynotary";
/** Au-delà, l'index est considéré périmé et l'envoi refuse de partir. */
export const PROTECTION_MAX_STALENESS_HOURS = 48;

const asString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

const asRecordIds = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter((v) => v !== null && v !== undefined && v !== "").map((v) => String(v));

export type ProtectionSyncSummary = {
  operations: number;
  signedContracts: number;
  people: number;
  removed: number;
  syncedAt: string;
};

export const syncProtectedContactsFromMyNotary = async (): Promise<ProtectionSyncSummary> => {
  const organizationId = serverEnv.MYNOTARY_ORGANIZATION_ID;
  if (!serverEnv.MYNOTARY_API_KEY || !organizationId) {
    throw new Error("MyNotary non configuré (MYNOTARY_API_KEY / MYNOTARY_ORGANIZATION_ID).");
  }
  const syncedAt = new Date().toISOString();

  // Tous les dossiers, archivés compris (décision du 06/11).
  const seen = new Set<string>();
  const operations: Awaited<ReturnType<typeof listOperations>> = [];
  for (let page = 0; page < 50; page += 1) {
    const batch = await listOperations({ organizationId, page, pageSize: 100 });
    const fresh = batch.filter((op) => !seen.has(String(op.id)));
    fresh.forEach((op) => seen.add(String(op.id)));
    operations.push(...fresh);
    if (batch.length < 100 || fresh.length === 0) break;
  }

  const rows: Insert[] = [];
  let signedContracts = 0;
  const recordCache = new Map<string, Record<string, unknown>>();

  for (const op of operations) {
    const contracts = (op.contracts ?? []).filter(
      (c) => isProtectingContractModel(c.model) && isContractSigned(c.status as MyNotaryContractStatus) && c.creationTime
    );
    if (contracts.length === 0) continue;
    signedContracts += contracts.length;

    const detail = await getOperationRaw(String(op.id));
    const records = (detail.records && typeof detail.records === "object" ? detail.records : {}) as Record<string, unknown>;
    for (const [role, ids] of Object.entries(records)) {
      if (!PROTECTED_ROLES.has(role.toUpperCase())) continue;
      for (const recordId of asRecordIds(ids)) {
        let record = recordCache.get(recordId);
        if (!record) {
          record = await getRecordRaw(recordId);
          recordCache.set(recordId, record);
        }
        const questions = (record.questions && typeof record.questions === "object" ? record.questions : {}) as Record<string, unknown>;
        const lastName = asString(questions.nom) ?? asString(questions.nom_usage) ?? asString(questions.denomination);
        const firstName = asString(questions.prenoms) ?? asString(questions.prenom);
        const email = normalizeProtectedEmail(asString(questions.email));
        const name = normalizeProtectedName(lastName, firstName);
        if (!email && !name) continue;
        for (const contract of contracts) {
          rows.push({
            source: SOURCE,
            contract_id: String(contract.id),
            contract_model: contract.model ?? null,
            operation_id: String(op.id),
            operation_label: op.label ?? null,
            operation_archived: Boolean(op.archived),
            record_id: recordId,
            role: role.toUpperCase(),
            first_name: firstName,
            last_name: lastName,
            normalized_email: email,
            normalized_name: name,
            signed_at: new Date(contract.creationTime as string).toISOString(),
            synced_at: syncedAt,
          });
        }
      }
    }
  }

  for (let index = 0; index < rows.length; index += 200) {
    const { error } = await supabaseAdmin
      .from("protected_contacts")
      .upsert(rows.slice(index, index + 200), { onConflict: "source,contract_id,record_id" });
    if (error) throw new Error(error.message);
  }
  // Les lignes non revues par cette synchronisation ne protègent plus.
  const { data: removedRows, error: removeError } = await supabaseAdmin
    .from("protected_contacts")
    .delete()
    .eq("source", SOURCE)
    .lt("synced_at", syncedAt)
    .select("id");
  if (removeError) throw new Error(removeError.message);

  return { operations: operations.length, signedContracts, people: rows.length, removed: removedRows?.length ?? 0, syncedAt };
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
      .eq("source", SOURCE)
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
