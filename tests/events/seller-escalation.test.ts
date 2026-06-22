import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/services/ai/embedding-worker.service", () => ({
  embedFromDomainEvent: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/services/documents/document-ai-rename.service", () => ({
  analyzeAndRenameDocument: vi.fn(),
}));

const sendSellerEscalationEmailMock = vi.fn().mockResolvedValue({ sent: true });
vi.mock("@/lib/email/seller-escalation", () => ({
  sendSellerEscalationEmail: (input: unknown) => sendSellerEscalationEmailMock(input),
}));

type PendingEvent = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_name: string;
  event_version: number;
  payload: Record<string, unknown>;
  attempts: number;
};

const limitMock = vi.fn();
const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

// Minimal chainable builder returning the configured maybeSingle payload.
const singleTableSelect = (row: unknown) => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    })),
  })),
});

const fromMock = vi.fn((table: string) => {
  if (table === "audit_log") return { insert: auditInsertMock };
  if (table === "domain_events") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          lt: vi.fn(() => ({
            order: vi.fn(() => ({ limit: limitMock })),
          })),
        })),
      })),
      update: vi.fn(() => ({ eq: updateEqMock })),
    };
  }
  if (table === "seller_leads") {
    return singleTableSelect({
      full_name: "Marie Dupont",
      city: "Nice",
      property_type: "apartment",
      assigned_admin_profile_id: "advisor-1",
    });
  }
  if (table === "admin_profiles") {
    return singleTableSelect({
      email: "advisor@sillage.test",
      full_name: "Jordan Conseil",
      is_active: true,
    });
  }
  throw new Error(`Unexpected table mock: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: (table: string) => fromMock(table) },
}));

beforeEach(() => {
  limitMock.mockReset();
  updateEqMock.mockClear();
  auditInsertMock.mockClear();
  sendSellerEscalationEmailMock.mockClear();
  fromMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("seller_lead.escalation_requested handler", () => {
  it("emails the assigned advisor and marks the event processed", async () => {
    limitMock.mockResolvedValueOnce({
      data: [
        {
          id: "evt-esc-1",
          aggregate_type: "seller_lead",
          aggregate_id: "lead-1",
          event_name: "seller_lead.escalation_requested",
          event_version: 1,
          payload: {
            assignedAdminProfileId: "advisor-1",
            lastUserMessage: "C'est urgent, je dois vendre avant un divorce.",
          },
          attempts: 0,
        },
      ] satisfies PendingEvent[],
      error: null,
    });

    const { processPendingDomainEvents } = await import(
      "@/services/events/domain-events-processor.service"
    );
    const result = await processPendingDomainEvents(10);

    expect(result.processed).toBe(1);
    expect(sendSellerEscalationEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendSellerEscalationEmailMock.mock.calls[0][0] as {
      to: string;
      advisorName: string | null;
      sellerFirstName: string | null;
    };
    expect(arg.to).toBe("advisor@sillage.test");
    expect(arg.advisorName).toBe("Jordan Conseil");
    expect(arg.sellerFirstName).toBe("Marie");
  });
});
