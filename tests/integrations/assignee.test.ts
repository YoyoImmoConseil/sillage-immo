import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// supabaseAdmin mock: from("admin_profiles").select(...).ilike|eq(...).limit(1).maybeSingle()
// Resolution is keyed on which filter column was used, so we can assert the
// email → sweepbright_user_id → full_name priority.

let emailRow: { id: string } | null;
let extRow: { id: string } | null;
let nameRow: { id: string } | null;

const makeBuilder = () => {
  const filters: Array<[string, unknown]> = [];
  const builder: Record<string, unknown> = {
    select() {
      return builder;
    },
    ilike(col: string, val: unknown) {
      filters.push([col, val]);
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push([col, val]);
      return builder;
    },
    limit() {
      return builder;
    },
    maybeSingle() {
      if (filters.some(([c]) => c === "email")) return Promise.resolve({ data: emailRow, error: null });
      if (filters.some(([c]) => c.startsWith("metadata"))) return Promise.resolve({ data: extRow, error: null });
      if (filters.some(([c]) => c === "full_name")) return Promise.resolve({ data: nameRow, error: null });
      return Promise.resolve({ data: null, error: null });
    },
  };
  return builder;
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: () => makeBuilder() },
}));

beforeEach(() => {
  emailRow = null;
  extRow = null;
  nameRow = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveAssignee", () => {
  it("returns null without any hint", async () => {
    const { resolveAssignee } = await import("@/lib/integrations/assignee");
    expect(await resolveAssignee({})).toEqual({ adminProfileId: null, matchedBy: null });
  });

  it("matches by email first", async () => {
    emailRow = { id: "admin-email" };
    nameRow = { id: "admin-name" };
    const { resolveAssignee } = await import("@/lib/integrations/assignee");
    const r = await resolveAssignee({ email: "Agent@Sillage.com", name: "Agent" });
    expect(r).toEqual({ adminProfileId: "admin-email", matchedBy: "email" });
  });

  it("falls back to the SweepBright user id mapping", async () => {
    extRow = { id: "admin-ext" };
    const { resolveAssignee } = await import("@/lib/integrations/assignee");
    const r = await resolveAssignee({ externalId: "49355" });
    expect(r).toEqual({ adminProfileId: "admin-ext", matchedBy: "sweepbright_user_id" });
  });

  it("returns null/unmatched when nothing matches", async () => {
    const { resolveAssignee } = await import("@/lib/integrations/assignee");
    const r = await resolveAssignee({ email: "nobody@x.com", name: "Ghost" });
    expect(r).toEqual({ adminProfileId: null, matchedBy: null });
  });
});
