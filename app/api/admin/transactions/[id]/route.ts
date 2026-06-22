import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  getTransactionById,
  recordHonoraires,
  updateTransaction,
  type UpdateTransactionInput,
} from "@/services/transactions/transaction.service";
import type {
  HonorairesSource,
  TransactionStatus,
} from "@/types/domain/transactions";

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "operations.view")) {
    return NextResponse.json({ ok: false, message: "Accès refusé." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const transaction = await getTransactionById(id);
    if (!transaction) {
      return NextResponse.json({ ok: false, message: "Introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, transaction });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Erreur." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "operations.manage")) {
    return NextResponse.json({ ok: false, message: "Accès refusé." }, { status: 403 });
  }
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  try {
    // Honoraires adjustment (e.g. at compromis after negotiation): append to
    // the versioned history AND update the current value.
    if (body.action === "record_honoraires") {
      const amount = toNumberOrNull(body.amount);
      if (amount === null) {
        return NextResponse.json(
          { ok: false, message: "Montant d'honoraires invalide." },
          { status: 422 }
        );
      }
      await recordHonoraires(id, {
        amount,
        source: (body.source as HonorairesSource) ?? "adjusted",
        reason: typeof body.reason === "string" ? body.reason : null,
        recordedByAdminProfileId: context.profile?.id ?? null,
      });
      return NextResponse.json({ ok: true });
    }

    const patch: UpdateTransactionInput = {};
    if (body.status !== undefined) patch.status = body.status as TransactionStatus;
    if (body.reference !== undefined)
      patch.reference = typeof body.reference === "string" ? body.reference.trim() || null : null;
    if (body.assignedAdminProfileId !== undefined)
      patch.assignedAdminProfileId =
        typeof body.assignedAdminProfileId === "string" ? body.assignedAdminProfileId : null;
    if (body.mandatePriceAmount !== undefined)
      patch.mandatePriceAmount = toNumberOrNull(body.mandatePriceAmount);
    if (body.agreedPriceAmount !== undefined)
      patch.agreedPriceAmount = toNumberOrNull(body.agreedPriceAmount);
    if (body.deedPriceAmount !== undefined)
      patch.deedPriceAmount = toNumberOrNull(body.deedPriceAmount);
    if (body.mandateSignedAt !== undefined)
      patch.mandateSignedAt = (body.mandateSignedAt as string) || null;
    if (body.preliminarySaleSignedAt !== undefined)
      patch.preliminarySaleSignedAt = (body.preliminarySaleSignedAt as string) || null;
    if (body.deedSignedAt !== undefined)
      patch.deedSignedAt = (body.deedSignedAt as string) || null;
    if (body.notes !== undefined)
      patch.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

    await updateTransaction(id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Mise à jour impossible." },
      { status: 500 }
    );
  }
}
