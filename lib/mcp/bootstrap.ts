import { registerTool } from "./registry";
import { tools } from "./tools";

let bootstrapped = false;

export const bootstrapMcpRegistry = () => {
  if (bootstrapped) return;
  tools.forEach((tool) => registerTool(tool));
  bootstrapped = true;
};
