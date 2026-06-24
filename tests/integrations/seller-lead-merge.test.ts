import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Boundary test for the seller-lead identity merge used by the integrations
// rail. supabaseAdmin is a chainable mock whose lookups return configurable
// rows; dependencies of the service module are stubbed so importing it is
// side-effect free.

type Row = { data: unknown; error: unknown };

let externalLookup: Row;
let emailLookup: Row;
let metadataLookup: Row;
let updateLog: Array<{ payload: Record<string, unknown>; eqs: Array<[string, unknown]> }>;

const makeBuilder = () => {
  const eqs: Array<[string, unknown]> = [];
  let updatePayload: Record<string, unknown> | null = null;
  const builder: Record<string, unknown> = {
    select() {
      return builder;
    },
    update(payload: Record<string, unknown>) {
      updatePayload = payload;
      return builder;
    },
    eq(col: string, val: unknown) {
      eqs.push([col, val]);
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    is() {
      return builder;
    },
    maybeSingle() {
      if (eqs.some(([c]) => c === "external_id")) return Promise.resolve(externalLookup);
      if (eqs.some(([c]) => c === "email")) return Promise.resolve(emailLookup);
      return Promise.resolve({ data: null, error: null });
    },
    single() {
      return Promise.resolve(metadataLookup);
    },
    then(resolve: (value: { error: unknown }) => void) {
      if (updatePayload) updateLog.push({ payload: updatePayload, eqs });
      resolve({ error: null });
    },
  };
  return builder;
};

const supabaseAdmin = { from: () => makeBuilder() };

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin }));
vi.mock("@/services/contacts/contact-identity.service", () => ({
  ensureContactIdentity: vi.fn().mockResolvedValue({ id: "ci-1" }),
  normalizeEmail: (e: string | null | undefined) =>
    e ? String(e).trim().toLowerCase() : null,
  normalizePhone: (p: string | null | undefined) => (p ? String(p) : null),
}));
vi.mock("@/lib/events/domain-events", () => ({
  emitDomainEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/services/sellers/seller-score.service", () => ({
  scoreSellerLead: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/audit/sanitize", () => ({
  sanitizeAuditInput: (x: unknown) => x,
}));

beforeEach(() => {
  externalLookup = { data: null, error: null };
  emailLookup = { data: null, error: null };
  metadataLookup = { data: { metadata: {} }, error: null };
  updateLog = [];
});

afterEach(() => {
  vi.clearAllMocks();
});

const onlyExternalIdUpdate = (u: { payload: Record<string, unknown> }) =>
  Object.keys(u.payload).length === 1 && "external_id" in u.payload;

describe("upsertSellerLeadFromIntegration", () => {
  it("updates the lead matched by external_id (no attach, no create)", async () => {
    externalLookup = {
      data: { id: "sl-1", external_id: "ext-1" },
      error: null,
    };
    const { upsertSellerLeadFromIntegration } = await import(
      "@/services/sellers/seller-lead.service"
    );
    const result = await upsertSellerLeadFromIntegration({
      externalId: "ext-1",
      fullName: "Jean Vendeur",
      email: "JEAN@example.com",
    });
    expect(result).toEqual({ sellerLeadId: "sl-1", created: false, merged: true });
    // external_id already set → no attach-only update issued.
    expect(updateLog.some(onlyExternalIdUpdate)).toBe(false);
  });

  it("merges on email and attaches the external_id when missing", async () => {
    emailLookup = { data: { id: "sl-2", external_id: null }, error: null };
    const { upsertSellerLeadFromIntegration } = await import(
      "@/services/sellers/seller-lead.service"
    );
    const result = await upsertSellerLeadFromIntegration({
      externalId: "ext-2",
      fullName: "Marie Vendeuse",
      email: "marie@example.com",
    });
    expect(result).toEqual({ sellerLeadId: "sl-2", created: false, merged: true });
    const attach = updateLog.find(onlyExternalIdUpdate);
    expect(attach?.payload.external_id).toBe("ext-2");
    expect(attach?.eqs.some(([c, v]) => c === "id" && v === "sl-2")).toBe(true);
  });
});
