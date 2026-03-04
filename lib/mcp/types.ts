export type JsonSchema =
  | { type: "string" }
  | { type: "number" }
  | { type: "boolean" }
  | { type: "array"; items: JsonSchema }
  | {
      type: "object";
      properties: Record<string, JsonSchema>;
      required?: string[];
      additionalProperties?: boolean;
    };

export type ToolContext = {
  requestId: string;
  actor: "system" | "anonymous" | "user";
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
