import type { ToolDefinition } from "./types";

const toolMap = new Map<string, ToolDefinition<unknown, unknown>>();

export const registerTool = <Input, Output>(
  tool: ToolDefinition<Input, Output>
) => {
  if (toolMap.has(tool.name)) {
    throw new Error(`Duplicate tool registration: ${tool.name}`);
  }
  toolMap.set(tool.name, tool as ToolDefinition<unknown, unknown>);
};

export const getTool = (name: string) => {
  return toolMap.get(name) ?? null;
};

export const listTools = () => {
  return Array.from(toolMap.values())
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      version: tool.version,
      inputSchema: tool.inputSchema,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
