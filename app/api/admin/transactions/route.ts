import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  createTransaction,
  listTransactions,
  type CreateTransactionInput,
} from "@/services/transactions/transaction.service";
import type {
  TransactionBusinessType,
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

export async function GET(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "operations.view")) {
    return NextResponse.json({ ok: false, message: "Accès refusé." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as TransactionStatus | null;
  const businessType = searchParams.get("businessType") as TransactionBusinessType | null;
  const advisor = searchParams.get("advisor") ?? undefined;

  try {
    const { items, count } = await listTransactions({
      status: status ?? undefined,
      businessType: businessType ?? undefined,
      assignedAdminProfileId: advisor,
      limit: parseInt(searchParams.get("limit") ?? "50", 10),
      offset: parseInt(searchParams.get("offset") ?? "0", 10),
    });
    return NextResponse.json({ ok: true, transactions: items, count });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Liste impossible." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "operations.manage")) {
    return NextResponse.json({ ok: false, message: "Accès refusé." }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const input: CreateTransactionInput = {
    businessType: (body.businessType as TransactionBusinessType) ?? "sale",
    status: (body.status as TransactionStatus) ?? "mandate",
    reference: typeof body.reference === "string" ? body.reference.trim() || null : null,
    propertyId: typeof body.propertyId === "string" ? body.propertyId : null,
    sellerProjectId: typeof body.sellerProjectId === "string" ? body.sellerProjectId : null,
    buyerProjectId: typeof body.buyerProjectId === "string" ? body.buyerProjectId : null,
    assignedAdminProfileId:
      typeof body.assignedAdminProfileId === "string" ? body.assignedAdminProfileId : null,
    mandatePriceAmount: toNumberOrNull(body.mandatePriceAmount),
    agreedPriceAmount: toNumberOrNull(body.agreedPriceAmount),
    deedPriceAmount: toNumberOrNull(body.deedPriceAmount),
    honorairesAmount: toNumberOrNull(body.honorairesAmount),
    honorairesSource: toNumberOrNull(body.honorairesAmount) !== null ? "manual" : null,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    source: "manual",
    recordedByAdminProfileId: context.profile?.id ?? null,
  };

  try {
    const result = await createTransaction(input);
    return NextResponse.json({ ok: true, transactionId: result.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Création impossible." },
      { status: 500 }
    );
  }
}
