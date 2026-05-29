import type { ToolDefinition } from "../types";
import { leadsTools } from "./leads";
import { sellerLeadsTools } from "./seller-leads";
import { homeAssistantTools } from "./home-assistant";
import { propertiesTools } from "./properties";
import { propertyListingsTools } from "./property-listings";
import { propertyVisitsTools } from "./property-visits";
import { propertyDocumentsTools } from "./property-documents";
import { buyerLeadsTools } from "./buyer-leads";
import { buyerSearchesTools } from "./buyer-searches";
import { buyerMatchingTools } from "./buyer-matching";
import { valuationsTools } from "./valuations";
import { clientProjectsTools } from "./client-projects";
import { sellerProjectsTools } from "./seller-projects";
import { contactsTools } from "./contacts";
import { aiTools } from "./ai";
import { conversationsTools } from "./conversations";
import { mynotaryTools } from "./mynotary";
import { reconciliationTools } from "./reconciliation";
import { auditTools } from "./audit";

// Aggregated MCP tool registry. Re-exported from "../tools" via the
// barrel `lib/mcp/tools.ts` so legacy imports (`import { tools } from
// "./tools"`) keep working.
export const tools: ToolDefinition<unknown, unknown>[] = [
  ...leadsTools,
  ...sellerLeadsTools,
  ...homeAssistantTools,
  ...propertiesTools,
  ...propertyListingsTools,
  ...propertyVisitsTools,
  ...propertyDocumentsTools,
  ...buyerLeadsTools,
  ...buyerSearchesTools,
  ...buyerMatchingTools,
  ...valuationsTools,
  ...clientProjectsTools,
  ...sellerProjectsTools,
  ...contactsTools,
  ...aiTools,
  ...conversationsTools,
  ...mynotaryTools,
  ...reconciliationTools,
  ...auditTools,
];

export { leadsTools } from "./leads";
export { sellerLeadsTools } from "./seller-leads";
export { homeAssistantTools } from "./home-assistant";
export { propertiesTools } from "./properties";
export { propertyListingsTools } from "./property-listings";
export { propertyVisitsTools } from "./property-visits";
export { propertyDocumentsTools } from "./property-documents";
export { buyerLeadsTools } from "./buyer-leads";
export { buyerSearchesTools } from "./buyer-searches";
export { buyerMatchingTools } from "./buyer-matching";
export { valuationsTools } from "./valuations";
export { clientProjectsTools } from "./client-projects";
export { sellerProjectsTools } from "./seller-projects";
export { contactsTools } from "./contacts";
export { aiTools } from "./ai";
export { conversationsTools } from "./conversations";
export { mynotaryTools } from "./mynotary";
export { reconciliationTools } from "./reconciliation";
export { auditTools } from "./audit";
