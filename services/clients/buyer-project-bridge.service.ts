import "server-only";

export type BuyerProjectBridgeStatus = "project_shell_only";

type BuyerProjectLike = {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
};

export type BuyerPortalProjectSummary = {
  bridgeStatus: BuyerProjectBridgeStatus;
  summary: string;
  nextAction: string;
};

export type BuyerPortalProjectPlaceholderDetail = {
  title: string | null;
  status: string;
  createdAt: string;
  bridgeStatus: BuyerProjectBridgeStatus;
  message: string;
};

export const buildBuyerPortalProjectSummary = (
  project: BuyerProjectLike
): BuyerPortalProjectSummary => ({
  bridgeStatus: "project_shell_only",
  summary: project.title ?? "Projet acquereur en preparation",
  nextAction:
    "Le suivi acquereur sera rattache a cet espace des que le pont buyer -> client_project sera finalise.",
});

export const buildBuyerPortalProjectPlaceholderDetail = (
  project: BuyerProjectLike
): BuyerPortalProjectPlaceholderDetail => ({
  title: project.title,
  status: project.status,
  createdAt: project.createdAt,
  bridgeStatus: "project_shell_only",
  message:
    "Ce projet acquereur est deja reserve dans votre espace client, mais son detail n'est pas encore active dans le portail.",
});
