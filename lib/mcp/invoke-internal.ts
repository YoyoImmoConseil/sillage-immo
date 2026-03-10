import "server-only";
import { bootstrapMcpRegistry } from "./bootstrap";
import { getTool } from "./registry";
import { validateWithSchema } from "./validate";

export const invokeMcpToolInternal = async (toolName: string, input: unknown) => {
  bootstrapMcpRegistry();
  const tool = getTool(toolName);
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }
  if (!validateWithSchema(tool.inputSchema, input)) {
    throw new Error(`Invalid input for tool: ${toolName}`);
  }
  return tool.handler(input, {
    requestId: crypto.randomUUID(),
    actor: "system",
  });
};
