import { describe, expect, it } from "vitest";
import {
  mapToolToOpenAi,
  toolNameToOpenAi,
  toolNameFromOpenAi,
} from "@/lib/mcp/openai-mapper";
import type { JsonSchema } from "@/lib/mcp/types";

describe("toolNameToOpenAi / toolNameFromOpenAi", () => {
  it("escapes dots to double underscores and round-trips", () => {
    expect(toolNameToOpenAi("seller_leads.create_or_reuse")).toBe(
      "seller_leads__create_or_reuse"
    );
    expect(toolNameFromOpenAi("seller_leads__create_or_reuse")).toBe(
      "seller_leads.create_or_reuse"
    );
  });

  it("leaves tool names without dots untouched", () => {
    expect(toolNameToOpenAi("audit_search")).toBe("audit_search");
  });
});

describe("mapToolToOpenAi", () => {
  it("maps a simple object schema with required strings", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string", format: "email" },
      },
      required: ["fullName", "email"],
      additionalProperties: false,
    };
    const out = mapToolToOpenAi({
      name: "leads.create",
      description: "Create a lead.",
      inputSchema: schema,
    });
    expect(out.type).toBe("function");
    expect(out.function.name).toBe("leads__create");
    expect(out.function.description).toBe("Create a lead.");
    expect(out.function.parameters).toEqual({
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string", format: "email" },
      },
      required: ["fullName", "email"],
      additionalProperties: false,
    });
  });

  it("forwards numeric bounds + enums + minLength", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        priceMin: { type: "number", minimum: 0, maximum: 100_000_000 },
        status: { type: "string", enum: ["draft", "active"] },
        slug: { type: "string", minLength: 1, maxLength: 80 },
      },
      required: [],
    };
    const out = mapToolToOpenAi({
      name: "properties.search",
      description: "x",
      inputSchema: schema,
    });
    const params = out.function.parameters as Record<string, unknown>;
    const props = params.properties as Record<string, unknown>;
    expect(props.priceMin).toEqual({
      type: "number",
      minimum: 0,
      maximum: 100_000_000,
    });
    expect(props.status).toEqual({ type: "string", enum: ["draft", "active"] });
    expect(props.slug).toEqual({
      type: "string",
      minLength: 1,
      maxLength: 80,
    });
  });

  it("maps oneOf to OpenAI oneOf", () => {
    const schema: JsonSchema = {
      oneOf: [
        {
          type: "object",
          properties: {
            propertyId: { type: "string", format: "uuid" },
          },
          required: ["propertyId"],
        },
        {
          type: "object",
          properties: { slug: { type: "string" } },
          required: ["slug"],
        },
      ],
    };
    const out = mapToolToOpenAi({
      name: "properties.get",
      description: "x",
      inputSchema: schema,
    });
    const params = out.function.parameters as Record<string, unknown>;
    expect(params.oneOf).toBeDefined();
    expect((params.oneOf as unknown[]).length).toBe(2);
  });

  it("maps array items", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        channels: {
          type: "array",
          items: {
            type: "string",
            enum: ["home_assistant", "seller_chat"],
          },
        },
      },
      required: [],
    };
    const out = mapToolToOpenAi({
      name: "conversations.search",
      description: "x",
      inputSchema: schema,
    });
    const params = out.function.parameters as Record<string, unknown>;
    const props = params.properties as Record<string, unknown>;
    expect(props.channels).toEqual({
      type: "array",
      items: { type: "string", enum: ["home_assistant", "seller_chat"] },
    });
  });

  it("emits `nullable: true` + type tuple when schema is nullable", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        note: { type: "string", nullable: true },
      },
      required: [],
    };
    const out = mapToolToOpenAi({
      name: "tool",
      description: "x",
      inputSchema: schema,
    });
    const props = (out.function.parameters as Record<string, unknown>)
      .properties as Record<string, unknown>;
    const note = props.note as Record<string, unknown>;
    expect(note.nullable).toBe(true);
    expect(note.type).toEqual(["string", "null"]);
  });

  it("does NOT include `required` when the source schema lists no required fields", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { q: { type: "string" } },
      required: [],
    };
    const out = mapToolToOpenAi({
      name: "tool",
      description: "x",
      inputSchema: schema,
    });
    const params = out.function.parameters as Record<string, unknown>;
    expect(params.required).toBeUndefined();
  });

  it("preserves additionalProperties when explicitly set", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { q: { type: "string" } },
      required: ["q"],
      additionalProperties: false,
    };
    const out = mapToolToOpenAi({
      name: "tool",
      description: "x",
      inputSchema: schema,
    });
    expect(
      (out.function.parameters as Record<string, unknown>).additionalProperties
    ).toBe(false);
  });
});
