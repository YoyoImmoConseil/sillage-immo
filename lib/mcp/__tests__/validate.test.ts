import { describe, expect, it } from "vitest";
import { validateWithSchema } from "@/lib/mcp/validate";
import type { JsonSchema } from "@/lib/mcp/types";

describe("validateWithSchema — primitives (backward-compat)", () => {
  it("accepts a string when the schema is { type: 'string' }", () => {
    expect(validateWithSchema({ type: "string" }, "hello")).toBe(true);
    expect(validateWithSchema({ type: "string" }, 42)).toBe(false);
  });

  it("accepts only finite numbers when the schema is { type: 'number' }", () => {
    expect(validateWithSchema({ type: "number" }, 3.14)).toBe(true);
    expect(validateWithSchema({ type: "number" }, Number.NaN)).toBe(false);
    expect(validateWithSchema({ type: "number" }, "3.14")).toBe(false);
  });

  it("accepts booleans when the schema is { type: 'boolean' }", () => {
    expect(validateWithSchema({ type: "boolean" }, true)).toBe(true);
    expect(validateWithSchema({ type: "boolean" }, false)).toBe(true);
    expect(validateWithSchema({ type: "boolean" }, "false")).toBe(false);
  });
});

describe("validateWithSchema — object/array (backward-compat)", () => {
  it("enforces required keys", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    };
    expect(validateWithSchema(schema, { name: "Alice" })).toBe(true);
    expect(validateWithSchema(schema, {})).toBe(false);
  });

  it("enforces additionalProperties = false", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { name: { type: "string" } },
      additionalProperties: false,
    };
    expect(validateWithSchema(schema, { name: "Alice", surprise: 1 })).toBe(false);
  });

  it("validates array items", () => {
    const schema: JsonSchema = { type: "array", items: { type: "number" } };
    expect(validateWithSchema(schema, [1, 2, 3])).toBe(true);
    expect(validateWithSchema(schema, [1, "two", 3])).toBe(false);
  });
});

describe("validateWithSchema — enum", () => {
  it("accepts only enum values for strings", () => {
    const schema: JsonSchema = {
      type: "string",
      enum: ["sale", "rental"],
    };
    expect(validateWithSchema(schema, "sale")).toBe(true);
    expect(validateWithSchema(schema, "lease")).toBe(false);
  });

  it("accepts only enum values for numbers", () => {
    const schema: JsonSchema = { type: "number", enum: [1, 2, 3] };
    expect(validateWithSchema(schema, 2)).toBe(true);
    expect(validateWithSchema(schema, 4)).toBe(false);
  });
});

describe("validateWithSchema — format", () => {
  it("accepts only valid emails when format is 'email'", () => {
    const schema: JsonSchema = { type: "string", format: "email" };
    expect(validateWithSchema(schema, "alice@example.com")).toBe(true);
    expect(validateWithSchema(schema, "not-an-email")).toBe(false);
  });

  it("accepts only valid UUIDs when format is 'uuid'", () => {
    const schema: JsonSchema = { type: "string", format: "uuid" };
    expect(
      validateWithSchema(schema, "550e8400-e29b-41d4-a716-446655440000")
    ).toBe(true);
    expect(validateWithSchema(schema, "not-a-uuid")).toBe(false);
  });

  it("accepts only valid http(s) URLs when format is 'url'", () => {
    const schema: JsonSchema = { type: "string", format: "url" };
    expect(validateWithSchema(schema, "https://example.com/path")).toBe(true);
    expect(validateWithSchema(schema, "javascript:alert(1)")).toBe(false);
  });

  it("accepts only ISO-parseable date-times", () => {
    const schema: JsonSchema = { type: "string", format: "date-time" };
    expect(validateWithSchema(schema, "2024-01-02T03:04:05Z")).toBe(true);
    expect(validateWithSchema(schema, "not-a-date")).toBe(false);
  });
});

describe("validateWithSchema — min/max", () => {
  it("respects minLength/maxLength on strings", () => {
    const schema: JsonSchema = { type: "string", minLength: 2, maxLength: 4 };
    expect(validateWithSchema(schema, "ab")).toBe(true);
    expect(validateWithSchema(schema, "abcd")).toBe(true);
    expect(validateWithSchema(schema, "a")).toBe(false);
    expect(validateWithSchema(schema, "abcde")).toBe(false);
  });

  it("respects minimum/maximum on numbers", () => {
    const schema: JsonSchema = { type: "number", minimum: 1, maximum: 50 };
    expect(validateWithSchema(schema, 1)).toBe(true);
    expect(validateWithSchema(schema, 50)).toBe(true);
    expect(validateWithSchema(schema, 0)).toBe(false);
    expect(validateWithSchema(schema, 51)).toBe(false);
  });

  it("respects minItems/maxItems on arrays", () => {
    const schema: JsonSchema = {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 2,
    };
    expect(validateWithSchema(schema, ["a"])).toBe(true);
    expect(validateWithSchema(schema, ["a", "b"])).toBe(true);
    expect(validateWithSchema(schema, [])).toBe(false);
    expect(validateWithSchema(schema, ["a", "b", "c"])).toBe(false);
  });
});

describe("validateWithSchema — nullable", () => {
  it("accepts null only when nullable: true is set", () => {
    expect(validateWithSchema({ type: "string", nullable: true }, null)).toBe(
      true
    );
    expect(validateWithSchema({ type: "string" }, null)).toBe(false);
    expect(validateWithSchema({ type: "number", nullable: true }, null)).toBe(
      true
    );
    expect(validateWithSchema({ type: "boolean", nullable: true }, null)).toBe(
      true
    );
  });
});

describe("validateWithSchema — oneOf", () => {
  it("accepts when at least one branch matches", () => {
    const schema: JsonSchema = {
      oneOf: [{ type: "string" }, { type: "number" }],
    };
    expect(validateWithSchema(schema, "hello")).toBe(true);
    expect(validateWithSchema(schema, 42)).toBe(true);
    expect(validateWithSchema(schema, true)).toBe(false);
  });
});

describe("validateWithSchema — required + undefined", () => {
  it("treats explicit undefined on a required key as missing", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    };
    expect(validateWithSchema(schema, { id: undefined })).toBe(false);
  });

  it("accepts optional keys whose value is explicitly undefined", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        id: { type: "string" },
        nickname: { type: "string" },
      },
      required: ["id"],
    };
    expect(validateWithSchema(schema, { id: "x", nickname: undefined })).toBe(
      true
    );
  });
});
