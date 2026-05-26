import { describe, expect, it } from "vitest";
import { maskPiiInText, maskPiiWithMeta } from "@/lib/ai/pii-mask";

describe("maskPiiInText — basic-v1", () => {
  it("masks a plain email", () => {
    expect(maskPiiInText("contactez alice@example.com s'il vous plait")).toBe(
      "contactez [email masqué] s'il vous plait"
    );
  });

  it("masks emails embedded in punctuation", () => {
    expect(maskPiiInText("Mail: alice@example.com,merci")).toBe(
      "Mail: [email masqué],merci"
    );
  });

  it("masks French mobile phones (space-separated)", () => {
    expect(maskPiiInText("Appelez 06 12 34 56 78")).toBe(
      "Appelez [téléphone masqué]"
    );
  });

  it("masks French mobile phones (dotted)", () => {
    expect(maskPiiInText("Tel 06.12.34.56.78 svp")).toBe(
      "Tel [téléphone masqué] svp"
    );
  });

  it("masks French mobile phones (international +33)", () => {
    expect(maskPiiInText("+33 6 12 34 56 78 est mon numero")).toBe(
      "[téléphone masqué] est mon numero"
    );
  });

  it("does not mask short numeric strings (room counts, prices)", () => {
    expect(maskPiiInText("J'ai un T3 de 75m2 a 450000")).toBe(
      "J'ai un T3 de 75m2 a 450000"
    );
  });

  it("leaves non-PII text untouched", () => {
    const input =
      "Je cherche un appartement de 3 pieces avec terrasse a Nice Mont Boron.";
    expect(maskPiiInText(input)).toBe(input);
  });

  it("returns empty input unchanged", () => {
    expect(maskPiiInText("")).toBe("");
  });
});

describe("maskPiiWithMeta", () => {
  it("flags email_masked when an email was found", () => {
    const result = maskPiiWithMeta("envoyez moi sur alice@example.com");
    expect(result.meta.email_masked).toBe(true);
    expect(result.meta.phone_masked).toBe(false);
    expect(result.meta.masking_version).toBe("basic-v1");
  });

  it("flags phone_masked when a phone was found", () => {
    const result = maskPiiWithMeta("appelez moi au 06 12 34 56 78");
    expect(result.meta.email_masked).toBe(false);
    expect(result.meta.phone_masked).toBe(true);
  });

  it("flags both when both are present", () => {
    const result = maskPiiWithMeta(
      "Email alice@example.com Tel 06 12 34 56 78"
    );
    expect(result.meta.email_masked).toBe(true);
    expect(result.meta.phone_masked).toBe(true);
  });
});
