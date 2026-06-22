import type { ToolDefinition } from "../types";
import { getHomeAssistantContextSnapshot } from "@/services/home/home-assistant-context.service";

export const homeAssistantTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "home_assistant.get_context",
    readsPii: true,
    description: "Retourne un contexte global pour l'assistant commercial homepage.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      return getHomeAssistantContextSnapshot();
    },
  },
];
