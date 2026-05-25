import type {
  JsonSchema,
  JsonSchemaArray,
  JsonSchemaBoolean,
  JsonSchemaNumber,
  JsonSchemaObject,
  JsonSchemaOneOf,
  JsonSchemaString,
} from "./types";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

const validateString = (schema: JsonSchemaString, input: unknown): boolean => {
  if (input === null) return schema.nullable === true;
  if (typeof input !== "string") return false;
  if (schema.enum && !schema.enum.includes(input)) return false;
  if (typeof schema.minLength === "number" && input.length < schema.minLength) {
    return false;
  }
  if (typeof schema.maxLength === "number" && input.length > schema.maxLength) {
    return false;
  }
  switch (schema.format) {
    case "email":
      return EMAIL_REGEX.test(input);
    case "uuid":
      return UUID_REGEX.test(input);
    case "url":
      return URL_REGEX.test(input);
    case "date-time":
      return !Number.isNaN(Date.parse(input));
    default:
      return true;
  }
};

const validateNumber = (schema: JsonSchemaNumber, input: unknown): boolean => {
  if (input === null) return schema.nullable === true;
  if (typeof input !== "number" || !Number.isFinite(input)) return false;
  if (schema.enum && !schema.enum.includes(input)) return false;
  if (typeof schema.minimum === "number" && input < schema.minimum) return false;
  if (typeof schema.maximum === "number" && input > schema.maximum) return false;
  return true;
};

const validateBoolean = (schema: JsonSchemaBoolean, input: unknown): boolean => {
  if (input === null) return schema.nullable === true;
  return typeof input === "boolean";
};

const validateArray = (schema: JsonSchemaArray, input: unknown): boolean => {
  if (input === null) return schema.nullable === true;
  if (!Array.isArray(input)) return false;
  if (typeof schema.minItems === "number" && input.length < schema.minItems) {
    return false;
  }
  if (typeof schema.maxItems === "number" && input.length > schema.maxItems) {
    return false;
  }
  return input.every((item) => validateWithSchema(schema.items, item));
};

const validateObject = (schema: JsonSchemaObject, input: unknown): boolean => {
  if (input === null) return schema.nullable === true;
  if (!isObject(input)) return false;
  if (schema.required) {
    for (const key of schema.required) {
      if (!(key in input)) return false;
      const propertySchema = schema.properties[key];
      // Required field must validate even if value is undefined; treat
      // explicit `undefined` as missing.
      if (typeof input[key] === "undefined") return false;
      if (
        propertySchema &&
        !validateWithSchema(propertySchema, input[key])
      ) {
        return false;
      }
    }
  }
  for (const [key, propertySchema] of Object.entries(schema.properties)) {
    if (schema.required?.includes(key)) continue;
    if (key in input) {
      const value = input[key];
      // Optional keys with explicit `undefined` are treated as absent.
      if (typeof value === "undefined") continue;
      if (!validateWithSchema(propertySchema, value)) {
        return false;
      }
    }
  }
  if (schema.additionalProperties === false) {
    const allowed = new Set(Object.keys(schema.properties));
    for (const key of Object.keys(input)) {
      if (!allowed.has(key)) return false;
    }
  }
  return true;
};

const validateOneOf = (schema: JsonSchemaOneOf, input: unknown): boolean => {
  if (input === null && schema.nullable === true) return true;
  return schema.oneOf.some((branch) => validateWithSchema(branch, input));
};

const isOneOfSchema = (schema: JsonSchema): schema is JsonSchemaOneOf => {
  return (schema as JsonSchemaOneOf).oneOf !== undefined;
};

export const validateWithSchema = (
  schema: JsonSchema,
  input: unknown
): boolean => {
  if (isOneOfSchema(schema)) {
    return validateOneOf(schema, input);
  }
  switch (schema.type) {
    case "string":
      return validateString(schema, input);
    case "number":
      return validateNumber(schema, input);
    case "boolean":
      return validateBoolean(schema, input);
    case "array":
      return validateArray(schema, input);
    case "object":
      return validateObject(schema, input);
    default:
      return false;
  }
};
