import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import type {
  HonorairesSource,
  TransactionBusinessType,
  TransactionBuyerInput,
  TransactionSellerInput,
  TransactionSource,
  TransactionStatus,
} from "@/types/domain/transactions";

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionSellerRow =
  Database["public"]["Tables"]["transaction_sellers"]["Row"];
type TransactionBuyerRow =
  Database["public"]["Tables"]["transaction_buyers"]["Row"];
type HonorairesHistoryRow =
  Database["public"]["Tables"]["honoraires_history"]["Row"];

export type TransactionDetail = TransactionRow & {
  sellers: TransactionSellerRow[];
  buyers: TransactionBuyerRow[];
  honorairesHistory: HonorairesHistoryRow[];
};

export type CreateTransactionInput = {
  businessType?: TransactionBusinessType;
  status?: TransactionStatus;
  reference?: string | null;
  propertyId?: string | null;
  sellerProjectId?: string | null;
  buyerProjectId?: string | null;
  clientProjectId?: string | null;
  assignedAdminProfileId?: string | null;
  currency?: string;
  mandatePriceAmount?: number | null;
  agreedPriceAmount?: number | null;
  deedPriceAmount?: number | null;
  honorairesAmount?: number | null;
  honorairesSource?: HonorairesSource | null;
  mandateSignedAt?: string | null;
  offerReceivedAt?: string | null;
  preliminarySaleSignedAt?: string | null;
  deedSignedAt?: string | null;
  source?: TransactionSource;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  sellers?: TransactionSellerInput[];
  buyers?: TransactionBuyerInput[];
  recordedByAdminProfileId?: string | null;
};

export type UpdateTransactionInput = Partial<
  Omit<CreateTransactionInput, "sellers" | "buyers" | "recordedByAdminProfileId">
>;

const roundOrNull = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;

const insertSellers = async (
  transactionId: string,
  sellers: TransactionSellerInput[]
) => {
  if (sellers.length === 0) return;
  const rows = sellers.map((seller) => ({
    transaction_id: transactionId,
    contact_identity_id: seller.contactIdentityId ?? null,
    seller_lead_id: seller.sellerLeadId ?? null,
    client_profile_id: seller.clientProfileId ?? null,
    external_name: seller.externalName ?? null,
    external_email: seller.externalEmail ?? null,
    share_percent: seller.sharePercent ?? null,
  }));
  const { error } = await supabaseAdmin.from("transaction_sellers").insert(rows);
  if (error) throw new Error(error.message);
};

const insertBuyers = async (
  transactionId: string,
  buyers: TransactionBuyerInput[]
) => {
  if (buyers.length === 0) return;
  const rows = buyers.map((buyer) => ({
    transaction_id: transactionId,
    contact_identity_id: buyer.contactIdentityId ?? null,
    buyer_lead_id: buyer.buyerLeadId ?? null,
    client_profile_id: buyer.clientProfileId ?? null,
    external_name: buyer.externalName ?? null,
    external_email: buyer.externalEmail ?? null,
    is_external: buyer.isExternal ?? Boolean(buyer.externalName && !buyer.buyerLeadId),
    share_percent: buyer.sharePercent ?? null,
  }));
  const { error } = await supabaseAdmin.from("transaction_buyers").insert(rows);
  if (error) throw new Error(error.message);
};

export const createTransaction = async (
  input: CreateTransactionInput
): Promise<{ id: string }> => {
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      business_type: input.businessType ?? "sale",
      status: input.status ?? "mandate",
      reference: input.reference ?? null,
      property_id: input.propertyId ?? null,
      seller_project_id: input.sellerProjectId ?? null,
      buyer_project_id: input.buyerProjectId ?? null,
      client_project_id: input.clientProjectId ?? null,
      assigned_admin_profile_id: input.assignedAdminProfileId ?? null,
      currency: input.currency ?? "EUR",
      mandate_price_amount: roundOrNull(input.mandatePriceAmount),
      agreed_price_amount: roundOrNull(input.agreedPriceAmount),
      deed_price_amount: roundOrNull(input.deedPriceAmount),
      honoraires_amount: roundOrNull(input.honorairesAmount),
      honoraires_source: input.honorairesSource ?? null,
      mandate_signed_at: input.mandateSignedAt ?? null,
      offer_received_at: input.offerReceivedAt ?? null,
      preliminary_sale_signed_at: input.preliminarySaleSignedAt ?? null,
      deed_signed_at: input.deedSignedAt ?? null,
      source: input.source ?? "manual",
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Impossible de créer la transaction.");
  }

  await insertSellers(data.id, input.sellers ?? []);
  await insertBuyers(data.id, input.buyers ?? []);

  // Seed the honoraires history when an initial amount is provided.
  if (typeof input.honorairesAmount === "number") {
    await supabaseAdmin.from("honoraires_history").insert({
      transaction_id: data.id,
      amount: Math.round(input.honorairesAmount),
      currency: input.currency ?? "EUR",
      source: input.honorairesSource ?? "manual",
      reason: "initial",
      recorded_by_admin_profile_id: input.recordedByAdminProfileId ?? null,
    });
  }

  return { id: data.id };
};

export const updateTransaction = async (
  id: string,
  patch: UpdateTransactionInput
): Promise<void> => {
  const update: Database["public"]["Tables"]["transactions"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (patch.businessType !== undefined) update.business_type = patch.businessType;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.reference !== undefined) update.reference = patch.reference;
  if (patch.propertyId !== undefined) update.property_id = patch.propertyId;
  if (patch.sellerProjectId !== undefined)
    update.seller_project_id = patch.sellerProjectId;
  if (patch.buyerProjectId !== undefined)
    update.buyer_project_id = patch.buyerProjectId;
  if (patch.clientProjectId !== undefined)
    update.client_project_id = patch.clientProjectId;
  if (patch.assignedAdminProfileId !== undefined)
    update.assigned_admin_profile_id = patch.assignedAdminProfileId;
  if (patch.currency !== undefined) update.currency = patch.currency;
  if (patch.mandatePriceAmount !== undefined)
    update.mandate_price_amount = roundOrNull(patch.mandatePriceAmount);
  if (patch.agreedPriceAmount !== undefined)
    update.agreed_price_amount = roundOrNull(patch.agreedPriceAmount);
  if (patch.deedPriceAmount !== undefined)
    update.deed_price_amount = roundOrNull(patch.deedPriceAmount);
  if (patch.mandateSignedAt !== undefined)
    update.mandate_signed_at = patch.mandateSignedAt;
  if (patch.offerReceivedAt !== undefined)
    update.offer_received_at = patch.offerReceivedAt;
  if (patch.preliminarySaleSignedAt !== undefined)
    update.preliminary_sale_signed_at = patch.preliminarySaleSignedAt;
  if (patch.deedSignedAt !== undefined) update.deed_signed_at = patch.deedSignedAt;
  if (patch.notes !== undefined) update.notes = patch.notes;

  const { error } = await supabaseAdmin
    .from("transactions")
    .update(update)
    .eq("id", id);
  if (error) throw new Error(error.message);
};

export const assignTransactionAdvisor = async (
  id: string,
  adminProfileId: string | null
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("transactions")
    .update({
      assigned_admin_profile_id: adminProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
};

export type RecordHonorairesInput = {
  amount: number;
  source: HonorairesSource;
  reason?: string | null;
  currency?: string;
  recordedByAdminProfileId?: string | null;
};

// Records a new honoraires value: appends to the versioned history AND updates
// the transaction's current honoraires_amount/source in one logical step.
export const recordHonoraires = async (
  transactionId: string,
  input: RecordHonorairesInput
): Promise<void> => {
  const amount = Math.round(input.amount);
  const currency = input.currency ?? "EUR";

  const { error: historyError } = await supabaseAdmin
    .from("honoraires_history")
    .insert({
      transaction_id: transactionId,
      amount,
      currency,
      source: input.source,
      reason: input.reason ?? null,
      recorded_by_admin_profile_id: input.recordedByAdminProfileId ?? null,
    });
  if (historyError) throw new Error(historyError.message);

  const { error: updateError } = await supabaseAdmin
    .from("transactions")
    .update({
      honoraires_amount: amount,
      honoraires_source: input.source,
      currency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);
  if (updateError) throw new Error(updateError.message);
};

export const addTransactionSeller = async (
  transactionId: string,
  seller: TransactionSellerInput
): Promise<void> => {
  await insertSellers(transactionId, [seller]);
};

export const addTransactionBuyer = async (
  transactionId: string,
  buyer: TransactionBuyerInput
): Promise<void> => {
  await insertBuyers(transactionId, [buyer]);
};

export const getTransactionById = async (
  id: string
): Promise<TransactionDetail | null> => {
  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!transaction) return null;

  const [sellers, buyers, history] = await Promise.all([
    supabaseAdmin
      .from("transaction_sellers")
      .select("*")
      .eq("transaction_id", id),
    supabaseAdmin
      .from("transaction_buyers")
      .select("*")
      .eq("transaction_id", id),
    supabaseAdmin
      .from("honoraires_history")
      .select("*")
      .eq("transaction_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (sellers.error) throw new Error(sellers.error.message);
  if (buyers.error) throw new Error(buyers.error.message);
  if (history.error) throw new Error(history.error.message);

  return {
    ...(transaction as TransactionRow),
    sellers: (sellers.data ?? []) as TransactionSellerRow[],
    buyers: (buyers.data ?? []) as TransactionBuyerRow[],
    honorairesHistory: (history.data ?? []) as HonorairesHistoryRow[],
  };
};

export type ListTransactionsFilters = {
  status?: TransactionStatus;
  businessType?: TransactionBusinessType;
  assignedAdminProfileId?: string;
  limit?: number;
  offset?: number;
};

export const listTransactions = async (
  filters: ListTransactionsFilters = {}
): Promise<{ items: TransactionRow[]; count: number }> => {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);

  let query = supabaseAdmin
    .from("transactions")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.businessType) query = query.eq("business_type", filters.businessType);
  if (filters.assignedAdminProfileId) {
    query = query.eq("assigned_admin_profile_id", filters.assignedAdminProfileId);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { items: (data ?? []) as TransactionRow[], count: count ?? 0 };
};
