import { describe, expect, it } from "vitest";
import { collectBuyerLeadIds } from "@/lib/buyers/collect-buyer-lead-ids";

describe("collectBuyerLeadIds", () => {
  it("accepte la relation embarquée sous forme d'objet (relation 1-1 PostgREST)", () => {
    expect(collectBuyerLeadIds([{ buyer_projects: { buyer_lead_id: "lead-1" } }])).toEqual(["lead-1"]);
  });

  it("accepte la forme tableau et déduplique", () => {
    expect(
      collectBuyerLeadIds([
        { buyer_projects: [{ buyer_lead_id: "lead-1" }, { buyer_lead_id: "lead-2" }] },
        { buyer_projects: { buyer_lead_id: "lead-1" } },
      ])
    ).toEqual(["lead-1", "lead-2"]);
  });

  it("ignore les relations absentes ou sans lead", () => {
    expect(
      collectBuyerLeadIds([{ buyer_projects: null }, { buyer_projects: { buyer_lead_id: null } }, {}])
    ).toEqual([]);
  });
});
