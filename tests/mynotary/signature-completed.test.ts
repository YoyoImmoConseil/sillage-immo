import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tests at the boundary: supabaseAdmin is a chainable mock that
// captures the operations issued by the service (so we can assert the
// expected rows are upserted / updated), the auto-match service is
// stubbed to control the outcome, and the domain-events emitter is a
// spy.

type StoredCall = {
  table: string;
  ops: Array<{ kind: string; args: unknown[] }>;
};

const setupSupabaseMock = () => {
  const calls: StoredCall[] = [];
  const upsertResponse: { data: unknown; error: unknown } = {
    data: { id: "doc-1", matched_seller_project_id: null },
    error: null,
  };
  const supabaseAdmin = {
    from(table: string) {
      const ops: StoredCall["ops"] = [];
      calls.push({ table, ops });
      const finish = <T>(payload: T) => Promise.resolve(payload);
      const builder: Record<string, unknown> = {};
      const chain = (kind: string) => (...args: unknown[]) => {
        ops.push({ kind, args });
        return builder;
      };
      Object.assign(builder, {
        select: chain("select"),
        single: () => {
          ops.push({ kind: "single", args: [] });
          if (
            ops.some(
              (o) => o.kind === "upsert" && (o.args[0] as Record<string, unknown>).mynotary_contract_id
            )
          ) {
            return finish(upsertResponse);
          }
          return finish({ data: null, error: null });
        },
        upsert: chain("upsert"),
        update: chain("update"),
        eq: (col: string, value: unknown) => {
          ops.push({ kind: "eq", args: [col, value] });
          if (
            ops.some((o) => o.kind === "update") &&
            !ops.some((o) => o.kind === "select")
          ) {
            return finish({ error: null });
          }
          return builder;
        },
        is: chain("is"),
      });
      return builder;
    },
  };
  return { supabaseAdmin, calls };
};

const mockState = setupSupabaseMock();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mockState.supabaseAdmin,
}));

const emitDomainEventMock = vi.fn();
vi.mock("@/lib/events/domain-events", () => ({
  emitDomainEvent: (...args: unknown[]) => emitDomainEventMock(...args),
}));

const matchSignedDocumentMock = vi.fn();
vi.mock("@/services/mynotary/auto-match.service", () => ({
  matchSignedDocument: (...args: unknown[]) => matchSignedDocumentMock(...args),
}));

const archiveSignedDocumentMock = vi.fn();
vi.mock("@/services/mynotary/archive-signed-document.service", () => ({
  archiveSignedDocument: (...args: unknown[]) =>
    archiveSignedDocumentMock(...args),
  createArchiveDownloadUrl: vi.fn(),
}));

beforeEach(() => {
  mockState.calls.length = 0;
  emitDomainEventMock.mockReset();
  matchSignedDocumentMock.mockReset();
  archiveSignedDocumentMock.mockReset();
  archiveSignedDocumentMock.mockResolvedValue({
    signedDocumentPath: "42/signed_mandat.pdf",
    signatureProofPath: null,
    archived: 1,
    skipped: 0,
    errors: [],
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

const baseMandatePayload = {
  signatureId: 1,
  contractId: 42,
  contractType: "Mandat de vente exclusif",
  operationId: 17,
  signedAt: "2026-05-20T10:00:00.000Z",
  signers: [{ email: "alice@example.com", role: "seller" }],
  files: [{ name: "mandat.pdf", url: "https://docs.mynotary.fr/42.pdf" }],
};

describe("processSignatureCompleted", () => {
  it("stores non-sale contracts (e.g. a lease) but emits no sale domain event", async () => {
    matchSignedDocumentMock.mockResolvedValue({
      sellerProjectId: null,
      propertyId: null,
      confidence: 0,
      method: "none",
    });

    const { processSignatureCompleted } = await import(
      "@/services/mynotary/signature-completed.service"
    );
    const result = await processSignatureCompleted({
      payload: {
        ...baseMandatePayload,
        contractType: "IMMOBILIER_LOCATION_BAIL",
      },
      source: "webhook",
    });
    // Stored (not skipped) so the MCP / AI layer can see it...
    expect(result.skipped).toBe(false);
    expect(result.contractKind).toBe("lease");
    // ...but it must NOT trigger a sale-funnel domain event.
    expect(emitDomainEventMock).not.toHaveBeenCalled();
  });

  it("classifies a signed rental mandate as rental_mandate (out of sale KPIs)", async () => {
    matchSignedDocumentMock.mockResolvedValue({
      sellerProjectId: null,
      propertyId: null,
      confidence: 0,
      method: "none",
    });
    const { processSignatureCompleted } = await import(
      "@/services/mynotary/signature-completed.service"
    );
    const result = await processSignatureCompleted({
      payload: {
        ...baseMandatePayload,
        contractType: "IMMOBILIER_LOCATION_MANDAT_LOCATION",
      },
      source: "backfill",
    });
    expect(result.contractKind).toBe("rental_mandate");
    expect(emitDomainEventMock).not.toHaveBeenCalled();
  });

  it("upserts the document and emits mynotary.mandate_signed when match confidence is high", async () => {
    matchSignedDocumentMock.mockResolvedValue({
      sellerProjectId: "sp-1",
      propertyId: null,
      confidence: 1,
      method: "email_exact",
    });

    const { processSignatureCompleted } = await import(
      "@/services/mynotary/signature-completed.service"
    );
    const result = await processSignatureCompleted({
      payload: baseMandatePayload,
      source: "webhook",
    });

    expect(result.skipped).toBe(false);
    expect(result.contractKind).toBe("mandate");
    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(1);
    expect(result.sellerProjectUpdated).toBe(true);

    const upsertCall = mockState.calls.find(
      (c) => c.table === "mynotary_signed_documents" &&
        c.ops.some((o) => o.kind === "upsert")
    );
    expect(upsertCall).toBeDefined();
    const upsertArgs = upsertCall!.ops.find((o) => o.kind === "upsert")!
      .args[0] as Record<string, unknown>;
    expect(upsertArgs.mynotary_contract_id).toBe("42");
    expect(upsertArgs.contract_kind).toBe("mandate");

    const projectUpdate = mockState.calls.find(
      (c) => c.table === "seller_projects"
    );
    expect(projectUpdate).toBeDefined();
    const updateArgs = projectUpdate!.ops.find((o) => o.kind === "update")!
      .args[0] as Record<string, unknown>;
    expect(updateArgs.mandate_status).toBe("signed");
    expect(updateArgs.mandate_signed_at).toBe(baseMandatePayload.signedAt);

    expect(emitDomainEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: "mynotary_document",
        eventName: "mynotary.mandate_signed",
      })
    );
  });

  it("does NOT update seller_projects when confidence is below 0.7", async () => {
    matchSignedDocumentMock.mockResolvedValue({
      sellerProjectId: "sp-2",
      propertyId: null,
      confidence: 0.4,
      method: "address_fuzzy",
    });

    const { processSignatureCompleted } = await import(
      "@/services/mynotary/signature-completed.service"
    );
    const result = await processSignatureCompleted({
      payload: baseMandatePayload,
      source: "webhook",
    });

    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(0.4);
    expect(result.sellerProjectUpdated).toBe(false);
    expect(
      mockState.calls.find((c) => c.table === "seller_projects")
    ).toBeUndefined();
  });

  it("forwards register_type to the upsert payload when backfill carries it", async () => {
    matchSignedDocumentMock.mockResolvedValue({
      sellerProjectId: null,
      propertyId: null,
      confidence: 0,
      method: "none",
    });
    const { processSignatureCompleted } = await import(
      "@/services/mynotary/signature-completed.service"
    );
    await processSignatureCompleted({
      payload: baseMandatePayload,
      source: "backfill",
      registerType: "MANAGEMENT",
    });
    const upsertCall = mockState.calls.find(
      (c) =>
        c.table === "mynotary_signed_documents" &&
        c.ops.some((o) => o.kind === "upsert")
    );
    const upsertArgs = upsertCall!.ops.find((o) => o.kind === "upsert")!
      .args[0] as Record<string, unknown>;
    expect(upsertArgs.mynotary_register_type).toBe("MANAGEMENT");
  });

  it("invokes the archive service with the webhook files when present", async () => {
    matchSignedDocumentMock.mockResolvedValue({
      sellerProjectId: null,
      propertyId: null,
      confidence: 0,
      method: "none",
    });
    const { processSignatureCompleted } = await import(
      "@/services/mynotary/signature-completed.service"
    );
    await processSignatureCompleted({
      payload: baseMandatePayload,
      source: "webhook",
    });
    expect(archiveSignedDocumentMock).toHaveBeenCalledTimes(1);
    expect(archiveSignedDocumentMock.mock.calls[0][0]).toMatchObject({
      mynotaryContractId: "42",
      files: baseMandatePayload.files,
    });
  });

  it("emits mynotary.offer_signed for a purchase offer", async () => {
    matchSignedDocumentMock.mockResolvedValue({
      sellerProjectId: null,
      propertyId: "prop-1",
      confidence: 0.7,
      method: "address_exact",
    });

    const { processSignatureCompleted } = await import(
      "@/services/mynotary/signature-completed.service"
    );
    const result = await processSignatureCompleted({
      payload: { ...baseMandatePayload, contractType: "Offre d'achat" },
      source: "webhook",
    });

    expect(result.contractKind).toBe("purchase_offer");
    expect(emitDomainEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "mynotary.offer_signed",
      })
    );
  });
});
