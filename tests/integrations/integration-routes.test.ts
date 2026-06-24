import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Wiring tests for the integrations endpoints: auth is stubbed OK, services
// are mocked, and we assert zod validation + the field mapping (externalId,
// mandateType/sweepbright ref → metadata, kind → metadata, source "zapier").

vi.mock("server-only", () => ({}));

vi.mock("@/lib/integrations/auth", () => ({
  authenticateIntegrationRequest: vi.fn().mockResolvedValue({
    ok: true,
    key: { id: "k1", name: "Zapier", toolAllowlist: [], canWrite: true },
  }),
}));

const upsertSellerLeadFromIntegration = vi.fn();
vi.mock("@/services/sellers/seller-lead.service", () => ({
  upsertSellerLeadFromIntegration: (input: unknown) =>
    upsertSellerLeadFromIntegration(input),
}));

const upsertBuyerLeadFromIntegration = vi.fn();
vi.mock("@/services/buyers/buyer-signup.service", () => ({
  upsertBuyerLeadFromIntegration: (input: unknown) =>
    upsertBuyerLeadFromIntegration(input),
}));

const createTransaction = vi.fn();
const getTransactionIdByExternalId = vi.fn();
const updateTransaction = vi.fn();
const recordHonoraires = vi.fn();
vi.mock("@/services/transactions/transaction.service", () => ({
  createTransaction: (i: unknown) => createTransaction(i),
  getTransactionIdByExternalId: (i: string) => getTransactionIdByExternalId(i),
  updateTransaction: (id: string, p: unknown) => updateTransaction(id, p),
  recordHonoraires: (id: string, p: unknown) => recordHonoraires(id, p),
}));

const recordMarketObservation = vi.fn();
vi.mock("@/services/market/market-observation.service", () => ({
  recordMarketObservation: (i: unknown) => recordMarketObservation(i),
}));

const findPropertyBySweepBrightId = vi.fn();
vi.mock("@/services/properties/property-visit.service", () => ({
  findPropertyBySweepBrightId: (id: string) => findPropertyBySweepBrightId(id),
}));

const resolveAssignee = vi.fn();
vi.mock("@/lib/integrations/assignee", () => ({
  resolveAssignee: (h: unknown) => resolveAssignee(h),
  assigneeMetadata: (hints: Record<string, unknown>) =>
    Object.keys(hints).some((k) => hints[k]) ? { ...hints } : undefined,
}));

const sendClientPortalMagicLink = vi.fn();
vi.mock("@/services/clients/client-portal-magic-link.service", () => ({
  sendClientPortalMagicLink: (i: unknown) => sendClientPortalMagicLink(i),
}));

const ensureSellerPortalAccessFromLead = vi.fn();
vi.mock("@/services/clients/seller-project.service", () => ({
  ensureSellerPortalAccessFromLead: (id: unknown) =>
    ensureSellerPortalAccessFromLead(id),
}));

const post = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer sk_mcp_x" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  resolveAssignee.mockResolvedValue({ adminProfileId: null, matchedBy: null });
  sendClientPortalMagicLink.mockResolvedValue({
    ok: true,
    data: { email: "x@example.com", context: "invite" },
  });
  ensureSellerPortalAccessFromLead.mockResolvedValue({
    sellerProjectId: "sp-1",
    clientProjectId: "cp-1",
    clientProfileId: "cpr-1",
    portalAccess: {
      mode: "invite",
      email: "x@example.com",
      nextPath: "/espace-client",
      inviteToken: "tok-1",
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/integrations/v1/seller-leads", () => {
  it("rejects a payload without email (422)", async () => {
    const { POST } = await import("@/app/api/integrations/v1/seller-leads/route");
    const res = await POST(post("/api/integrations/v1/seller-leads", { fullName: "X" }));
    expect(res.status).toBe(422);
    expect(upsertSellerLeadFromIntegration).not.toHaveBeenCalled();
  });

  it("upserts and returns 201 when created", async () => {
    upsertSellerLeadFromIntegration.mockResolvedValue({
      sellerLeadId: "sl-1",
      created: true,
      merged: false,
    });
    const { POST } = await import("@/app/api/integrations/v1/seller-leads/route");
    const res = await POST(
      post("/api/integrations/v1/seller-leads", {
        externalId: "owner-1",
        email: "v@example.com",
        city: "Nice",
      })
    );
    expect(res.status).toBe(201);
    const arg = upsertSellerLeadFromIntegration.mock.calls[0][0];
    expect(arg.externalId).toBe("owner-1");
    expect(arg.source).toBe("zapier");
    expect(ensureSellerPortalAccessFromLead).toHaveBeenCalledWith("sl-1");
    expect(sendClientPortalMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({ inviteToken: "tok-1" })
    );
    const body = await res.json();
    expect(body.portalEmailSent).toBe(true);
  });

  it("does not provision the portal when the lead is merged (200)", async () => {
    upsertSellerLeadFromIntegration.mockResolvedValue({
      sellerLeadId: "sl-2",
      created: false,
      merged: true,
    });
    const { POST } = await import("@/app/api/integrations/v1/seller-leads/route");
    const res = await POST(
      post("/api/integrations/v1/seller-leads", {
        externalId: "owner-2",
        email: "v2@example.com",
      })
    );
    expect(res.status).toBe(200);
    expect(ensureSellerPortalAccessFromLead).not.toHaveBeenCalled();
    expect(sendClientPortalMagicLink).not.toHaveBeenCalled();
  });
});

describe("POST /api/integrations/v1/buyer-leads", () => {
  it("rejects when rgpdAccepted is not true (422)", async () => {
    const { POST } = await import("@/app/api/integrations/v1/buyer-leads/route");
    const res = await POST(
      post("/api/integrations/v1/buyer-leads", { email: "b@example.com" })
    );
    expect(res.status).toBe(422);
  });

  it("passes externalId + note through to the upsert and sends the magic link (201)", async () => {
    upsertBuyerLeadFromIntegration.mockResolvedValue({
      buyerLeadId: "bl-1",
      created: true,
      clientProjectId: "cp-1",
      buyerSearchProfileId: "bsp-1",
      invitationToken: "tok-1",
    });
    const { POST } = await import("@/app/api/integrations/v1/buyer-leads/route");
    const res = await POST(
      post("/api/integrations/v1/buyer-leads", {
        externalId: "lead-1",
        email: "b@example.com",
        rgpdAccepted: true,
        notes: "Demande via SweepBright",
        criteria: { businessType: "sale", cities: ["Nice"], propertyTypes: [] },
      })
    );
    expect(res.status).toBe(201);
    const arg = upsertBuyerLeadFromIntegration.mock.calls[0][0];
    expect(arg.externalId).toBe("lead-1");
    expect(arg.initialFilters.note).toBe("Demande via SweepBright");
    expect(sendClientPortalMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({ inviteToken: "tok-1" })
    );
    const body = await res.json();
    expect(body.portalEmailSent).toBe(true);
  });

  it("does NOT send a magic link when sendPortalInvite is false", async () => {
    upsertBuyerLeadFromIntegration.mockResolvedValue({
      buyerLeadId: "bl-1",
      created: true,
      clientProjectId: "cp-1",
      buyerSearchProfileId: "bsp-1",
      invitationToken: "tok-1",
    });
    const { POST } = await import("@/app/api/integrations/v1/buyer-leads/route");
    const res = await POST(
      post("/api/integrations/v1/buyer-leads", {
        email: "b@example.com",
        rgpdAccepted: true,
        sendPortalInvite: false,
        criteria: { businessType: "sale", cities: ["Nice"], propertyTypes: [] },
      })
    );
    expect(res.status).toBe(201);
    expect(sendClientPortalMagicLink).not.toHaveBeenCalled();
  });

  it("returns 200 and skips the magic link when the lead is updated", async () => {
    upsertBuyerLeadFromIntegration.mockResolvedValue({
      buyerLeadId: "bl-1",
      created: false,
      clientProjectId: "cp-1",
      buyerSearchProfileId: "bsp-1",
      invitationToken: null,
    });
    const { POST } = await import("@/app/api/integrations/v1/buyer-leads/route");
    const res = await POST(
      post("/api/integrations/v1/buyer-leads", {
        externalId: "lead-1",
        email: "b@example.com",
        rgpdAccepted: true,
        criteria: { businessType: "sale", cities: ["Nice"], propertyTypes: [] },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(false);
    expect(sendClientPortalMagicLink).not.toHaveBeenCalled();
  });

  it("rounds decimal areas/budgets instead of rejecting them (201)", async () => {
    upsertBuyerLeadFromIntegration.mockResolvedValue({
      buyerLeadId: "bl-2",
      created: true,
      clientProjectId: "cp-2",
      buyerSearchProfileId: "bsp-2",
      invitationToken: "tok-2",
    });
    const { POST } = await import("@/app/api/integrations/v1/buyer-leads/route");
    const res = await POST(
      post("/api/integrations/v1/buyer-leads", {
        email: "b2@example.com",
        rgpdAccepted: true,
        criteria: {
          businessType: "sale",
          cities: ["Nice"],
          propertyTypes: ["apartment"],
          livingAreaMin: 73.87,
          budgetMax: 241500.5,
        },
      })
    );
    expect(res.status).toBe(201);
    const arg = upsertBuyerLeadFromIntegration.mock.calls[0][0];
    expect(arg.criteria.livingAreaMin).toBe(74);
    expect(arg.criteria.budgetMax).toBe(241501);
  });

  it("assigns the resolved collaborator from the SweepBright assignee (201)", async () => {
    resolveAssignee.mockResolvedValue({
      adminProfileId: "admin-42",
      matchedBy: "email",
    });
    upsertBuyerLeadFromIntegration.mockResolvedValue({
      buyerLeadId: "bl-3",
      created: true,
      clientProjectId: "cp-3",
      buyerSearchProfileId: "bsp-3",
      invitationToken: "tok-3",
    });
    const { POST } = await import("@/app/api/integrations/v1/buyer-leads/route");
    const res = await POST(
      post("/api/integrations/v1/buyer-leads", {
        email: "b3@example.com",
        rgpdAccepted: true,
        assigneeEmail: "agent@sillage-immo.com",
        criteria: { businessType: "sale", cities: ["Nice"], propertyTypes: [] },
      })
    );
    expect(res.status).toBe(201);
    expect(resolveAssignee).toHaveBeenCalledWith(
      expect.objectContaining({ email: "agent@sillage-immo.com" })
    );
    const arg = upsertBuyerLeadFromIntegration.mock.calls[0][0];
    expect(arg.assignedAdminProfileId).toBe("admin-42");
    const body = await res.json();
    expect(body.assignedAdminProfileId).toBe("admin-42");
    expect(body.assigneeMatchedBy).toBe("email");
  });
});

describe("POST /api/integrations/v1/transactions", () => {
  it("rejects an invalid status (422)", async () => {
    const { POST } = await import("@/app/api/integrations/v1/transactions/route");
    const res = await POST(
      post("/api/integrations/v1/transactions", { status: "nope" })
    );
    expect(res.status).toBe(422);
  });

  it("folds mandateType + sweepbright ref into metadata on create (201)", async () => {
    getTransactionIdByExternalId.mockResolvedValue(null);
    findPropertyBySweepBrightId.mockResolvedValue({ id: "prop-1" });
    createTransaction.mockResolvedValue({ id: "tx-1" });
    const { POST } = await import("@/app/api/integrations/v1/transactions/route");
    const res = await POST(
      post("/api/integrations/v1/transactions", {
        externalId: "deal-1",
        status: "mandate",
        mandateType: "exclusive",
        sweepbrightPropertyId: "estate-9",
      })
    );
    expect(res.status).toBe(201);
    const arg = createTransaction.mock.calls[0][0];
    expect(arg.source).toBe("zapier");
    expect(arg.propertyId).toBe("prop-1");
    expect(arg.metadata.mandateType).toBe("exclusive");
    expect(arg.metadata.sweepbrightPropertyId).toBe("estate-9");
  });
});

describe("POST /api/integrations/v1/market-observations", () => {
  it("rejects when no price is provided (422)", async () => {
    const { POST } = await import(
      "@/app/api/integrations/v1/market-observations/route"
    );
    const res = await POST(
      post("/api/integrations/v1/market-observations", { city: "Nice" })
    );
    expect(res.status).toBe(422);
  });

  it("passes kind into metadata (201)", async () => {
    recordMarketObservation.mockResolvedValue({ id: "mo-1" });
    const { POST } = await import(
      "@/app/api/integrations/v1/market-observations/route"
    );
    const res = await POST(
      post("/api/integrations/v1/market-observations", {
        city: "Nice",
        pricePerM2: 5200,
        kind: "asking",
      })
    );
    expect(res.status).toBe(201);
    const arg = recordMarketObservation.mock.calls[0][0];
    expect(arg.source).toBe("zapier");
    expect(arg.metadata.kind).toBe("asking");
  });
});
