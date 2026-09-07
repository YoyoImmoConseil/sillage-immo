type BuyerProjectLeadRef = { buyer_lead_id: string | null };

/**
 * `buyer_projects.client_project_id` est unique, donc PostgREST renvoie la
 * relation embarquée comme un OBJET (et non un tableau) : itérer dessus
 * levait « object is not iterable », ce qui faisait échouer silencieusement
 * la vérification d'email après le lien magique — et donc bloquait toutes
 * les alertes acquéreur. On accepte les deux formes.
 */
export const collectBuyerLeadIds = (
  rows: Array<{ buyer_projects?: BuyerProjectLeadRef | BuyerProjectLeadRef[] | null }>
): string[] => {
  const ids = new Set<string>();
  for (const row of rows) {
    const raw = row.buyer_projects;
    const projects = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const bp of projects) {
      if (bp?.buyer_lead_id) ids.add(bp.buyer_lead_id);
    }
  }
  return [...ids];
};
