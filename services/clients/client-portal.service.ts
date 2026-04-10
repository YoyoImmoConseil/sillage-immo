import "server-only";

import {
  CLIENT_PROJECT_TYPE_LABELS,
  isClientProjectType,
  MANDATE_STATUS_LABELS,
  SELLER_PROJECT_STATUS_LABELS,
} from "@/types/domain/client";
import {
  buildBuyerPortalProjectPlaceholderDetail,
  buildBuyerPortalProjectSummary,
  listBuyerPortalProjectBridge,
  type BuyerPortalProjectPlaceholderDetail,
  type BuyerPortalProjectSummary,
} from "./buyer-project-bridge.service";
import { getClientByAuthUserId, type ClientProfileRow } from "./client-profile.service";
import {
  getClientProjectById,
  getClientProjectsByClientId,
  type ClientProjectRecord,
} from "./client-project.service";
import {
  getSellerPortalProjectDetail,
  listSellerPortalProjects,
  type SellerPortalProjectDetail,
  type SellerPortalProjectSummary,
} from "./seller-portal.service";

export type ClientPortalClient = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  lastLoginAt: string | null;
};

export type ClientPortalProjectSummary = {
  id: string;
  href: string;
  title: string | null;
  createdAt: string;
  projectType: string;
  projectTypeLabel: string;
  statusLabel: string;
  primaryDescriptor: string | null;
  secondaryDescriptor: string | null;
  nextAction: string | null;
  seller: SellerPortalProjectSummary | null;
  buyer: BuyerPortalProjectSummary | null;
};

export type ClientPortalProjectGroup = {
  projectType: string;
  projectTypeLabel: string;
  projects: ClientPortalProjectSummary[];
};

export type ClientPortalPlaceholderDetail = {
  title: string | null;
  createdAt: string;
  status: string;
  projectType: string;
  projectTypeLabel: string;
  message: string;
};

export type ClientPortalProjectDetailResolver =
  | {
      kind: "seller";
      projectType: "seller";
      detail: SellerPortalProjectDetail;
    }
  | {
      kind: "buyer";
      projectType: "buyer";
      detail: BuyerPortalProjectPlaceholderDetail;
    }
  | {
      kind: "unsupported";
      projectType: string;
      detail: ClientPortalPlaceholderDetail;
    };

const toClient = (client: ClientProfileRow): ClientPortalClient => ({
  id: client.id,
  email: client.email,
  firstName: client.first_name,
  lastName: client.last_name,
  fullName: client.full_name,
  lastLoginAt: client.last_login_at,
});

const getProjectTypeLabel = (projectType: string) => {
  return isClientProjectType(projectType) ? CLIENT_PROJECT_TYPE_LABELS[projectType] : "Projet";
};

const getUnsupportedProjectDetail = (
  project: Pick<ClientProjectRecord, "title" | "createdAt" | "status" | "projectType">
): ClientPortalPlaceholderDetail => ({
  title: project.title,
  createdAt: project.createdAt,
  status: project.status,
  projectType: project.projectType,
  projectTypeLabel: getProjectTypeLabel(project.projectType),
  message:
    "Ce type de projet sera integre progressivement dans votre espace client. Votre compte est deja pret pour l'accueillir.",
});

const mapSellerProjectSummary = (
  sellerProject: SellerPortalProjectSummary
): ClientPortalProjectSummary => ({
  id: sellerProject.id,
  href: `/espace-client/projets/${sellerProject.id}`,
  title: sellerProject.title,
  createdAt: sellerProject.createdAt,
  projectType: "seller",
  projectTypeLabel: CLIENT_PROJECT_TYPE_LABELS.seller,
  statusLabel: sellerProject.projectStatus
    ? SELLER_PROJECT_STATUS_LABELS[
        sellerProject.projectStatus as keyof typeof SELLER_PROJECT_STATUS_LABELS
      ] ?? sellerProject.projectStatus
    : "Statut a definir",
  primaryDescriptor: sellerProject.primaryPropertyAddress ?? "Adresse en cours de qualification",
  secondaryDescriptor: sellerProject.advisorName
    ? `Conseiller : ${sellerProject.advisorName}`
    : "Conseiller : affectation en cours",
  nextAction: sellerProject.hasAppointmentLink
    ? "Ouvrir le projet pour reserver un rendez-vous"
    : sellerProject.advisorName
      ? "Ouvrir le projet pour contacter votre conseiller"
      : "Ouvrir le projet pour suivre l'affectation de votre conseiller",
  seller: sellerProject,
  buyer: null,
});

const mapNonSellerProjectSummary = (
  project: ClientProjectRecord,
  buyerBridge?: BuyerPortalProjectSummary | null
): ClientPortalProjectSummary => {
  if (project.projectType === "buyer") {
    const buyerSummary = buyerBridge ?? buildBuyerPortalProjectSummary(project, null);
    return {
      id: project.id,
      href: `/espace-client/projets/${project.id}`,
      title: project.title,
      createdAt: project.createdAt,
      projectType: "buyer",
      projectTypeLabel: CLIENT_PROJECT_TYPE_LABELS.buyer,
      statusLabel: project.status,
      primaryDescriptor: buyerSummary.summary,
      secondaryDescriptor: "Votre espace client est deja pret pour accueillir ce projet.",
      nextAction: buyerSummary.nextAction,
      seller: null,
      buyer: buyerSummary,
    };
  }

  return {
    id: project.id,
    href: `/espace-client/projets/${project.id}`,
    title: project.title,
    createdAt: project.createdAt,
    projectType: project.projectType,
    projectTypeLabel: getProjectTypeLabel(project.projectType),
    statusLabel: project.status,
    primaryDescriptor: project.title ?? "Projet rattache a votre compte",
    secondaryDescriptor: "Ce parcours client sera active dans un prochain lot.",
    nextAction: "Le detail complet de ce projet n'est pas encore disponible dans le portail.",
    seller: null,
    buyer: null,
  };
};

export const getClientPortalClientByAuthUserId = async (authUserId: string) => {
  return getClientByAuthUserId(authUserId);
};

export const listClientPortalProjects = async (
  clientProfileId: string
): Promise<ClientPortalProjectSummary[]> => {
  const projects = await getClientProjectsByClientId(clientProfileId, {
    projectTypes: ["seller", "buyer", "rental", "wealth"],
  });
  const sellerProjects = await listSellerPortalProjects(clientProfileId);
  const sellerProjectById = new Map(sellerProjects.map((project) => [project.id, project]));
  const buyerProjectIds = projects
    .filter((project) => project.projectType === "buyer")
    .map((project) => project.id);
  const buyerBridgeByProjectId = await listBuyerPortalProjectBridge(buyerProjectIds);

  return projects.map((project) => {
    const sellerProject = sellerProjectById.get(project.id);
    if (sellerProject) return mapSellerProjectSummary(sellerProject);
    const buyerBridge =
      project.projectType === "buyer"
        ? buildBuyerPortalProjectSummary(project, buyerBridgeByProjectId.get(project.id) ?? null)
        : null;
    return mapNonSellerProjectSummary(project, buyerBridge);
  });
};

export const groupClientPortalProjects = (
  projects: ClientPortalProjectSummary[]
): ClientPortalProjectGroup[] => {
  const groups = new Map<string, ClientPortalProjectGroup>();

  for (const project of projects) {
    const currentGroup = groups.get(project.projectType) ?? {
      projectType: project.projectType,
      projectTypeLabel: project.projectTypeLabel,
      projects: [],
    };
    currentGroup.projects.push(project);
    groups.set(project.projectType, currentGroup);
  }

  return Array.from(groups.values());
};

export const getClientPortalProjectDetail = async (input: {
  authUserId: string;
  projectId: string;
}): Promise<ClientPortalProjectDetailResolver | null> => {
  const client = await getClientPortalClientByAuthUserId(input.authUserId);
  if (!client) return null;

  const project = await getClientProjectById(input.projectId);
  if (!project || project.client_profile_id !== client.id) {
    return null;
  }

  const baseProject = {
    id: project.id,
    title: project.title,
    createdAt: project.created_at,
    status: project.status,
    projectType: project.project_type,
  };

  if (project.project_type === "seller") {
    const detail = await getSellerPortalProjectDetail(input);
    if (!detail) return null;
    return {
      kind: "seller",
      projectType: "seller",
      detail,
    };
  }

  if (project.project_type === "buyer") {
    const buyerBridgeByProjectId = await listBuyerPortalProjectBridge([project.id]);
    return {
      kind: "buyer",
      projectType: "buyer",
      detail: buildBuyerPortalProjectPlaceholderDetail(
        baseProject,
        buyerBridgeByProjectId.get(project.id) ?? null
      ),
    };
  }

  return {
    kind: "unsupported",
    projectType: project.project_type,
    detail: getUnsupportedProjectDetail(baseProject),
  };
};

export const getClientPortalContextByAuthUserId = async (
  authUserId: string
): Promise<ClientPortalClient | null> => {
  const client = await getClientPortalClientByAuthUserId(authUserId);
  return client ? toClient(client) : null;
};

export const getClientPortalMandateLabel = (value: string | null) => {
  if (!value) return "Aucun";
  return MANDATE_STATUS_LABELS[value as keyof typeof MANDATE_STATUS_LABELS] ?? value;
};
