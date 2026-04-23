import "server-only";

import type { AppLocale } from "@/lib/i18n/config";
import {
  getClientProjectTypeLabel,
  getMandateStatusLabel,
  getSellerProjectStatusLabel,
  translateGenericStatus,
} from "@/lib/i18n/domain";
import {
  CLIENT_PROJECT_TYPE_LABELS,
  isClientProjectType,
} from "@/types/domain/client";
import {
  buildBuyerPortalProjectPlaceholderDetail,
  buildBuyerPortalProjectSummary,
  listBuyerPortalProjectBridge,
  type BuyerPortalProjectPlaceholderDetail,
  type BuyerPortalProjectSummary,
} from "./buyer-project-bridge.service";
import { countUnreadMatchesByClientProjectIds } from "@/services/buyers/buyer-portal.service";
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

const getProjectTypeLabel = (projectType: string, locale: AppLocale) => {
  return isClientProjectType(projectType)
    ? getClientProjectTypeLabel(projectType, locale) ?? CLIENT_PROJECT_TYPE_LABELS[projectType]
    : locale === "en"
      ? "Project"
      : locale === "es"
        ? "Proyecto"
        : locale === "ru"
          ? "Проект"
          : "Projet";
};

const getUnsupportedProjectDetail = (
  project: Pick<ClientProjectRecord, "title" | "createdAt" | "status" | "projectType">,
  locale: AppLocale
): ClientPortalPlaceholderDetail => ({
  title: project.title,
  createdAt: project.createdAt,
  status: translateGenericStatus(project.status, locale) ?? project.status,
  projectType: project.projectType,
  projectTypeLabel: getProjectTypeLabel(project.projectType, locale),
  message:
    locale === "en"
      ? "This type of project will be integrated progressively into your client portal. Your account is already ready to host it."
      : locale === "es"
        ? "Este tipo de proyecto se integrará progresivamente en su espacio cliente. Su cuenta ya está preparada para recibirlo."
        : locale === "ru"
          ? "Этот тип проекта будет постепенно интегрирован в ваше клиентское пространство. Ваш аккаунт уже готов его принять."
          : "Ce type de projet sera integre progressivement dans votre espace client. Votre compte est deja pret pour l'accueillir.",
});

const mapSellerProjectSummary = (
  sellerProject: SellerPortalProjectSummary,
  locale: AppLocale
): ClientPortalProjectSummary => ({
  id: sellerProject.id,
  href: `/espace-client/projets/${sellerProject.id}`,
  title: sellerProject.title,
  createdAt: sellerProject.createdAt,
  projectType: "seller",
  projectTypeLabel: getClientProjectTypeLabel("seller", locale) ?? CLIENT_PROJECT_TYPE_LABELS.seller,
  statusLabel:
    getSellerProjectStatusLabel(sellerProject.projectStatus, locale) ??
    (locale === "en"
      ? "Status to be defined"
      : locale === "es"
        ? "Estado por definir"
        : locale === "ru"
          ? "Статус уточняется"
          : "Statut a definir"),
  primaryDescriptor:
    sellerProject.primaryPropertyAddress ??
    (locale === "en"
      ? "Address being qualified"
      : locale === "es"
        ? "Dirección en fase de cualificación"
        : locale === "ru"
          ? "Адрес уточняется"
          : "Adresse en cours de qualification"),
  secondaryDescriptor: sellerProject.advisorName
    ? locale === "en"
      ? `Advisor: ${sellerProject.advisorName}`
      : locale === "es"
        ? `Asesor: ${sellerProject.advisorName}`
        : locale === "ru"
          ? `Консультант: ${sellerProject.advisorName}`
          : `Conseiller : ${sellerProject.advisorName}`
    : locale === "en"
      ? "Advisor: assignment in progress"
      : locale === "es"
        ? "Asesor: asignación en curso"
        : locale === "ru"
          ? "Консультант: назначение в процессе"
          : "Conseiller : affectation en cours",
  nextAction: sellerProject.hasAppointmentLink
    ? locale === "en"
      ? "Open the project to book an appointment"
      : locale === "es"
        ? "Abra el proyecto para reservar una cita"
        : locale === "ru"
          ? "Откройте проект, чтобы забронировать встречу"
          : "Ouvrir le projet pour reserver un rendez-vous"
    : sellerProject.advisorName
      ? locale === "en"
        ? "Open the project to contact your advisor"
        : locale === "es"
          ? "Abra el proyecto para contactar con su asesor"
          : locale === "ru"
            ? "Откройте проект, чтобы связаться с вашим консультантом"
            : "Ouvrir le projet pour contacter votre conseiller"
      : locale === "en"
        ? "Open the project to follow your advisor assignment"
        : locale === "es"
          ? "Abra el proyecto para seguir la asignación de su asesor"
          : locale === "ru"
            ? "Откройте проект, чтобы следить за назначением консультанта"
            : "Ouvrir le projet pour suivre l'affectation de votre conseiller",
  seller: sellerProject,
  buyer: null,
});

const mapNonSellerProjectSummary = (
  project: ClientProjectRecord,
  locale: AppLocale,
  buyerBridge?: BuyerPortalProjectSummary | null
): ClientPortalProjectSummary => {
  if (project.projectType === "buyer") {
    const buyerSummary = buyerBridge ?? buildBuyerPortalProjectSummary(project, null, locale);
    return {
      id: project.id,
      href: `/espace-client/recherches/${project.id}`,
      title: project.title,
      createdAt: project.createdAt,
      projectType: "buyer",
      projectTypeLabel: getClientProjectTypeLabel("buyer", locale) ?? CLIENT_PROJECT_TYPE_LABELS.buyer,
      statusLabel: translateGenericStatus(project.status, locale) ?? project.status,
      primaryDescriptor: buyerSummary.summary,
      secondaryDescriptor:
        locale === "en"
          ? "Your client portal is already ready to host this project."
          : locale === "es"
            ? "Su espacio cliente ya está preparado para acoger este proyecto."
            : locale === "ru"
              ? "Ваше клиентское пространство уже готово принять этот проект."
              : "Votre espace client est deja pret pour accueillir ce projet.",
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
    projectTypeLabel: getProjectTypeLabel(project.projectType, locale),
    statusLabel: translateGenericStatus(project.status, locale) ?? project.status,
    primaryDescriptor:
      project.title ??
      (locale === "en"
        ? "Project linked to your account"
        : locale === "es"
          ? "Proyecto vinculado a su cuenta"
          : locale === "ru"
            ? "Проект, связанный с вашей учетной записью"
            : "Projet rattache a votre compte"),
    secondaryDescriptor:
      locale === "en"
        ? "This client journey will be activated in a future phase."
        : locale === "es"
          ? "Este recorrido cliente se activará en una próxima fase."
          : locale === "ru"
            ? "Этот клиентский сценарий будет активирован в следующем этапе."
            : "Ce parcours client sera active dans un prochain lot.",
    nextAction:
      locale === "en"
        ? "The full detail of this project is not yet available in the portal."
        : locale === "es"
          ? "El detalle completo de este proyecto aún no está disponible en el portal."
          : locale === "ru"
            ? "Полная детализация этого проекта пока недоступна в портале."
            : "Le detail complet de ce projet n'est pas encore disponible dans le portail.",
    seller: null,
    buyer: null,
  };
};

export const getClientPortalClientByAuthUserId = async (authUserId: string) => {
  return getClientByAuthUserId(authUserId);
};

export const listClientPortalProjects = async (
  clientProfileId: string,
  locale: AppLocale = "fr"
): Promise<ClientPortalProjectSummary[]> => {
  // Single pass over client_projects (all types). listSellerPortalProjects
  // reuses this result instead of refetching with projectTypes: ["seller"].
  const projects = await getClientProjectsByClientId(clientProfileId, {
    projectTypes: ["seller", "buyer", "rental", "wealth"],
  });
  const buyerProjectIds = projects
    .filter((project) => project.projectType === "buyer")
    .map((project) => project.id);

  const [sellerProjects, buyerBridgeByProjectId, unreadMatchCountByProject] =
    await Promise.all([
      listSellerPortalProjects(clientProfileId, { preloadedProjects: projects }),
      listBuyerPortalProjectBridge(buyerProjectIds),
      countUnreadMatchesByClientProjectIds(buyerProjectIds),
    ]);
  const sellerProjectById = new Map(sellerProjects.map((project) => [project.id, project]));

  return projects.map((project) => {
    const sellerProject = sellerProjectById.get(project.id);
    if (sellerProject) return mapSellerProjectSummary(sellerProject, locale);
    const buyerBridge =
      project.projectType === "buyer"
        ? buildBuyerPortalProjectSummary(
            project,
            buyerBridgeByProjectId.get(project.id) ?? null,
            locale,
            { unreadMatchCount: unreadMatchCountByProject[project.id] ?? 0 }
          )
        : null;
    return mapNonSellerProjectSummary(project, locale, buyerBridge);
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
  locale?: AppLocale;
}): Promise<ClientPortalProjectDetailResolver | null> => {
  const locale = input.locale ?? "fr";
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
        buyerBridgeByProjectId.get(project.id) ?? null,
        locale
      ),
    };
  }

  return {
    kind: "unsupported",
    projectType: project.project_type,
    detail: getUnsupportedProjectDetail(baseProject, locale),
  };
};

export const getClientPortalContextByAuthUserId = async (
  authUserId: string
): Promise<ClientPortalClient | null> => {
  const client = await getClientPortalClientByAuthUserId(authUserId);
  return client ? toClient(client) : null;
};

export const getClientPortalMandateLabel = (value: string | null, locale: AppLocale = "fr") => {
  if (!value) {
    return locale === "en"
      ? "None"
      : locale === "es"
        ? "Ninguno"
        : locale === "ru"
          ? "Нет"
          : "Aucun";
  }
  return getMandateStatusLabel(value, locale) ?? value;
};
