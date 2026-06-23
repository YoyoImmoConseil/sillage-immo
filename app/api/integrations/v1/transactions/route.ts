import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateIntegrationRequest } from "@/lib/integrations/auth";
import { isoDateString, moneyAmount } from "@/lib/integrations/parse";
import {
  createTransaction,
  getTransactionIdByExternalId,
  recordHonoraires,
  updateTransaction,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/services/transactions/transaction.service";
import { TRANSACTION_STATUSES } from "@/types/domain/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  // Stable id of the source record (e.g. SweepBright deal id). When present,
  // the transaction is upserted on it so Zap retries never create duplicates.
  externalId: z.string().trim().min(1).max(255).optional(),
  reference: z.string().trim().max(255).optional().nullable(),
  businessType: z.enum(["sale", "rental"]).optional(),
  status: z.enum(TRANSACTION_STATUSES as [string, ...string[]]).optional(),
  currency: z.string().trim().length(3).optional(),
  propertyId: z.string().uuid().optional().nullable(),
  assignedAdminProfileId: z.string().uuid().optional().nullable(),
  mandatePriceAmount: moneyAmount.optional().nullable(),
  agreedPriceAmount: moneyAmount.optional().nullable(),
  deedPriceAmount: moneyAmount.optional().nullable(),
  honorairesAmount: moneyAmount.optional().nullable(),
  mandateSignedAt: isoDateString.optional().nullable(),
  offerReceivedAt: isoDateString.optional().nullable(),
  preliminarySaleSignedAt: isoDateString.optional().nullable(),
  deedSignedAt: isoDateString.optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export const POST = async (request: Request) => {
  const auth = await authenticateIntegrationRequest(request, {
    requiredScope: "integrations:transactions",
  });
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_payload",
        message: "Données de transaction invalides.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 }
    );
  }

  const b = parsed.data;

  try {
    const existingId = b.externalId
      ? await getTransactionIdByExternalId(b.externalId)
      : null;

    if (existingId) {
      const patch: UpdateTransactionInput = {
        reference: b.reference,
        businessType: b.businessType,
        status: b.status as UpdateTransactionInput["status"],
        currency: b.currency,
        propertyId: b.propertyId,
        assignedAdminProfileId: b.assignedAdminProfileId,
        mandatePriceAmount: b.mandatePriceAmount,
        agreedPriceAmount: b.agreedPriceAmount,
        deedPriceAmount: b.deedPriceAmount,
        mandateSignedAt: b.mandateSignedAt,
        offerReceivedAt: b.offerReceivedAt,
        preliminarySaleSignedAt: b.preliminarySaleSignedAt,
        deedSignedAt: b.deedSignedAt,
        notes: b.notes,
      };
      await updateTransaction(existingId, patch);

      // Honoraires live in a versioned trail, not via updateTransaction.
      if (typeof b.honorairesAmount === "number") {
        await recordHonoraires(existingId, {
          amount: b.honorairesAmount,
          source: "zapier",
          reason: "zapier_sync",
          currency: b.currency ?? "EUR",
        });
      }

      return NextResponse.json({
        ok: true,
        transactionId: existingId,
        created: false,
      });
    }

    const input: CreateTransactionInput = {
      externalId: b.externalId ?? null,
      reference: b.reference ?? null,
      businessType: b.businessType,
      status: b.status as CreateTransactionInput["status"],
      currency: b.currency,
      propertyId: b.propertyId ?? null,
      assignedAdminProfileId: b.assignedAdminProfileId ?? null,
      mandatePriceAmount: b.mandatePriceAmount ?? null,
      agreedPriceAmount: b.agreedPriceAmount ?? null,
      deedPriceAmount: b.deedPriceAmount ?? null,
      honorairesAmount: b.honorairesAmount ?? null,
      honorairesSource:
        typeof b.honorairesAmount === "number" ? "zapier" : null,
      mandateSignedAt: b.mandateSignedAt ?? null,
      offerReceivedAt: b.offerReceivedAt ?? null,
      preliminarySaleSignedAt: b.preliminarySaleSignedAt ?? null,
      deedSignedAt: b.deedSignedAt ?? null,
      notes: b.notes ?? null,
      source: "zapier",
    };
    const { id } = await createTransaction(input);

    return NextResponse.json(
      { ok: true, transactionId: id, created: true },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec de l'ingestion.";
    console.error("[integrations/transactions]", message);
    return NextResponse.json(
      { ok: false, code: "ingest_failed", message },
      { status: 500 }
    );
  }
};
