import type { JsonSchema } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const validateWithSchema = (
  schema: JsonSchema,
  input: unknown
): input is unknown => {
  switch (schema.type) {
    case "string":
      return typeof input === "string";
    case "number":
      return typeof input === "number" && Number.isFinite(input);
    case "boolean":
      return typeof input === "boolean";
    case "array":
      return (
        Array.isArray(input) &&
        input.every((item) => validateWithSchema(schema.items, item))
      );
    case "object":
      if (!isObject(input)) return false;
      if (schema.required) {
        for (const key of schema.required) {
          if (!(key in input)) return false;
        }
      }
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        if (key in input && !validateWithSchema(propertySchema, input[key])) {
          return false;
        }
      }
      if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys(schema.properties));
        for (const key of Object.keys(input)) {
          if (!allowed.has(key)) return false;
        }
      }
      return true;
    default:
      return false;
  }
};
