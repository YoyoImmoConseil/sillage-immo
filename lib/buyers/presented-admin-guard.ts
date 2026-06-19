import "server-only";

import { getClientProjectById } from "@/services/clients/client-project.service";
import {
  getPresentedProperty,
  type PresentedProperty,
} from "@/services/buyers/buyer-presented-property.service";

/**
 * Validate that a presented property belongs to a BUYER client_project that
 * itself belongs to the given client. Returns the presented property when the
 * full chain is consistent, otherwise null (caller answers 404).
 */
export const resolvePresentedForClientProject = async (
  clientId: string,
  projectId: string,
  presentedId: string
): Promise<PresentedProperty | null> => {
  const project = await getClientProjectById(projectId);
  if (!project || project.client_profile_id !== clientId) return null;
  if (project.project_type !== "buyer") return null;
  const presented = await getPresentedProperty(presentedId);
  if (!presented || presented.clientProjectId !== projectId) return null;
  return presented;
};
