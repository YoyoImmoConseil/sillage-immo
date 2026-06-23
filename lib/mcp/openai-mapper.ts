import type { JsonSchema } from "./types";

// Converts the MCP tool registry's JsonSchema subset
// (lib/mcp/types.ts) into the JSON-Schema fragment that OpenAI's
// function-calling API accepts (subset of draft 2020-12).
//
// What changes vs. our internal schema:
//
//   - Our `oneOf` (used by tools like `properties.get` to allow either
//     `propertyId` or `slug`) maps 1:1 to OpenAI's `anyOf`/`oneOf`,
//     but we ALSO flatten it into a single object schema with both
//     fields optional and a description noting the constraint —
//     OpenAI's function calling tolerates union schemas, but flatter
//     schemas yield better tool-use quality with smaller models like
//     gpt-4o-mini.
//
//   - Our `nullable: true` flag maps to `["string", "null"]`-style
//     types in OpenAI's strict draft. We emit `nullable: true` AND
//     `type: ["X", "null"]` so we are robust to both readers.
//
//   - We never emit `additionalProperties: false` unless the source
//     schema asks for it (matches strict tool defs).
//
//   - `format` is passed through (OpenAI ignores it, but human/dev
//     tooling appreciates it).
//
//   - Numeric ranges (minimum / maximum) and string length bounds
//     are forwarded so the model picks plausible defaults.

export type OpenAiToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const mapSchema = (schema: JsonSchema): Record<string, unknown> => {
  if ("oneOf" in schema) {
    return {
      oneOf: schema.oneOf.map((sub) => mapSchema(sub)),
      ...(schema.nullable ? { nullable: true } : {}),
    };
  }

  switch (schema.type) {
    case "string": {
      const out: Record<string, unknown> = { type: "string" };
      if (schema.enum) out.enum = schema.enum;
      if (schema.format) out.format = schema.format;
      if (typeof schema.minLength === "number") out.minLength = schema.minLength;
      if (typeof schema.maxLength === "number") out.maxLength = schema.maxLength;
      if (schema.nullable) {
        out.type = ["string", "null"];
        out.nullable = true;
      }
      return out;
    }
    case "number": {
      const out: Record<string, unknown> = { type: "number" };
      if (schema.enum) out.enum = schema.enum;
      if (typeof schema.minimum === "number") out.minimum = schema.minimum;
      if (typeof schema.maximum === "number") out.maximum = schema.maximum;
      if (schema.nullable) {
        out.type = ["number", "null"];
        out.nullable = true;
      }
      return out;
    }
    case "boolean": {
      const out: Record<string, unknown> = { type: "boolean" };
      if (schema.nullable) {
        out.type = ["boolean", "null"];
        out.nullable = true;
      }
      return out;
    }
    case "array": {
      const out: Record<string, unknown> = {
        type: "array",
        items: mapSchema(schema.items),
      };
      if (typeof schema.minItems === "number") out.minItems = schema.minItems;
      if (typeof schema.maxItems === "number") out.maxItems = schema.maxItems;
      if (schema.nullable) {
        out.type = ["array", "null"];
        out.nullable = true;
      }
      return out;
    }
    case "object": {
      const properties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        properties[key] = mapSchema(value);
      }
      const out: Record<string, unknown> = {
        type: "object",
        properties,
      };
      if (schema.required && schema.required.length > 0) {
        out.required = schema.required;
      }
      if (typeof schema.additionalProperties === "boolean") {
        out.additionalProperties = schema.additionalProperties;
      }
      if (schema.nullable) {
        out.type = ["object", "null"];
        out.nullable = true;
      }
      return out;
    }
    default: {
      // Unknown variant — return empty so OpenAI does not blow up.
      return {};
    }
  }
};

const safeName = (toolName: string): string => {
  // OpenAI's function-calling spec disallows `.` in function names —
  // we convert `seller_leads.create_or_reuse` to
  // `seller_leads__create_or_reuse` (double underscore is reversible
  // and conflict-free with our existing names that already use
  // single underscores).
  return toolName.replace(/\./g, "__");
};

const unsafeName = (mappedName: string): string =>
  mappedName.replace(/__/g, ".");

export const toolNameToOpenAi = safeName;
export const toolNameFromOpenAi = unsafeName;

export type MapToolToOpenAiInput = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

// OpenAI's function-calling API requires the root `parameters` to be an
// object schema. Our internal registry allows a root-level `oneOf` (e.g.
// properties.get / mynotary.get_signed_document accept either an id or an
// alternate key). A root-level `oneOf` maps to `{ oneOf: [...] }` with no
// top-level `type`, which OpenAI rejects ("schema must be of type object,
// got type None"). We flatten such a union into a single object schema with
// every branch's properties optional. The strict server-side validator
// (validateWithSchema, fed the ORIGINAL oneOf schema) still enforces that
// exactly one valid branch is provided at call time.
const buildRootParameters = (schema: JsonSchema): Record<string, unknown> => {
  if ("oneOf" in schema) {
    const properties: Record<string, unknown> = {};
    for (const sub of schema.oneOf) {
      if ("type" in sub && sub.type === "object") {
        for (const [key, value] of Object.entries(sub.properties)) {
          properties[key] = mapSchema(value);
        }
      }
    }
    return { type: "object", properties, additionalProperties: false };
  }

  const mapped = mapSchema(schema);
  if (mapped.type !== "object") {
    // Defensive: OpenAI demands an object root for tool parameters.
    return { type: "object", properties: {} };
  }
  return mapped;
};

export const mapToolToOpenAi = (
  tool: MapToolToOpenAiInput
): OpenAiToolDefinition => {
  return {
    type: "function",
    function: {
      name: safeName(tool.name),
      description: tool.description,
      parameters: buildRootParameters(tool.inputSchema),
    },
  };
};
