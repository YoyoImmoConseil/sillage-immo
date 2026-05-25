// JSON Schema (subset) used by the MCP tool input validators. We
// intentionally only support the small fragment we actually need: the
// tools/validator pair is meant to be cheap and dependency-free.
//
// The "primitive" types support a small set of optional refinements
// (enum/format/min/max/...) so we can express "an email", "a UUID" or
// "a small integer 1..50" without bringing a full JSON Schema engine.
export type JsonSchemaString = {
  type: "string";
  enum?: string[];
  format?: "email" | "uuid" | "date-time" | "url";
  minLength?: number;
  maxLength?: number;
  nullable?: boolean;
};

export type JsonSchemaNumber = {
  type: "number";
  enum?: number[];
  minimum?: number;
  maximum?: number;
  nullable?: boolean;
};

export type JsonSchemaBoolean = {
  type: "boolean";
  nullable?: boolean;
};

export type JsonSchemaArray = {
  type: "array";
  items: JsonSchema;
  minItems?: number;
  maxItems?: number;
  nullable?: boolean;
};

export type JsonSchemaObject = {
  type: "object";
  properties: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  nullable?: boolean;
};

export type JsonSchemaOneOf = {
  oneOf: JsonSchema[];
  nullable?: boolean;
};

export type JsonSchema =
  | JsonSchemaString
  | JsonSchemaNumber
  | JsonSchemaBoolean
  | JsonSchemaArray
  | JsonSchemaObject
  | JsonSchemaOneOf;

// Backward-compatible ToolContext shape.
//
// All existing call sites read `context.actor` as a string literal
// ("system" | "anonymous" | "user"); we keep that exact field with the
// exact same type. New optional fields (actorType / actorId / actorRole
// / actorEmail / scope) carry the richer admin / RBAC context the
// route can now extract from the request.
//
// `actorType` is the same value as `actor` (mirrored on purpose) so
// new tools can use the modern alias without having to disambiguate
// from a richer "actor" object.
export type ToolActorType = "system" | "anonymous" | "user";

export type ToolActorRole =
  | "administrateur"
  | "manager"
  | "collaborateur"
  | "client"
  | "anonymous"
  | "system";

export type ToolContext = {
  requestId: string;
  actor: ToolActorType;
  actorType: ToolActorType;
  actorId?: string | null;
  actorRole?: ToolActorRole | null;
  actorEmail?: string | null;
  scope?: {
    projectId?: string | null;
  };
};

export type ToolDefinition<Input, Output> = {
  name: string;
  description: string;
  version?: string;
  inputSchema: JsonSchema;
  handler: (input: Input, context: ToolContext) => Promise<Output>;
};

export type ToolCallRequest = {
  tool: string;
  input: unknown;
};

export type ToolCallSuccess<Output> = {
  ok: true;
  tool: string;
  requestId: string;
  data: Output;
};

export type ToolCallError = {
  ok: false;
  tool: string;
  requestId: string;
  error: {
    code:
      | "invalid_request"
      | "invalid_input"
      | "tool_not_found"
      | "tool_version_unregistered"
      | "rate_limited"
      | "failed";
    message: string;
  };
};

export type ToolListItem = {
  name: string;
  description: string;
  version?: string;
  inputSchema: JsonSchema;
};

export type ToolListResponse = {
  tools: ToolListItem[];
};
