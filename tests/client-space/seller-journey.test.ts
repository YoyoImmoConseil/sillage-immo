import { describe, expect, it } from "vitest";
import { computeSellerJourney, filterClientFacingEvents } from "@/lib/client-space/seller-journey";

const noMilestones = {
  mandateSignedAt: null,
  offerReceivedAt: null,
  preliminarySaleSignedAt: null,
  deedSignedAt: null,
};

describe("computeSellerJourney", () => {
  it("place le vendeur sur « Stratégie » quand l'estimation est faite sans mandat", () => {
    const steps = computeSellerJourney({
      projectStatus: "estimation_realisee",
      mandateStatus: "none",
      hasValuation: false,
      milestones: noMilestones,
    });
    expect(steps.map((s) => s.state)).toEqual(["done", "current", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("avance jusqu'à « Qualification » dès qu'une offre est reçue, avec les dates", () => {
    const steps = computeSellerJourney({
      projectStatus: "listing_live",
      mandateStatus: "signed",
      hasValuation: true,
      milestones: { ...noMilestones, mandateSignedAt: "2026-07-01T12:00:00Z", offerReceivedAt: "2026-08-15T12:00:00Z" },
    });
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "done", "current", "upcoming"]);
    expect(steps[1].at).toBe("2026-07-01T12:00:00Z");
    expect(steps[3].at).toBe("2026-08-15T12:00:00Z");
  });

  it("marque tout accompli quand l'acte est signé", () => {
    const steps = computeSellerJourney({
      projectStatus: "sold",
      mandateStatus: "signed",
      hasValuation: true,
      milestones: { ...noMilestones, deedSignedAt: "2026-09-01T12:00:00Z" },
    });
    expect(steps.every((s) => s.state === "done")).toBe(true);
  });

  it("démarre sur « Estimation » pour un projet neuf", () => {
    const steps = computeSellerJourney({ projectStatus: "draft", mandateStatus: null, hasValuation: false, milestones: noMilestones });
    expect(steps[0].state).toBe("current");
  });
});

describe("filterClientFacingEvents", () => {
  it("retire le bruit technique et dédoublonne", () => {
    const events = [
      { id: "1", eventName: "client_invitation.accepted" },
      { id: "2", eventName: "client_invitation.sent" },
      { id: "3", eventName: "seller_project.status_changed" },
      { id: "4", eventName: "client_invitation.accepted" },
      { id: "5", eventName: "project_property.linked_from_estimation" },
      { id: "6", eventName: "project_property.linked" },
      { id: "7", eventName: "valuation.recorded" },
    ];
    expect(filterClientFacingEvents(events).map((e) => e.id)).toEqual(["1", "5", "7"]);
  });
});
