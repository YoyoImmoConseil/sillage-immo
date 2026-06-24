'use strict';

const splitList = (value) =>
  value
    ? String(value)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const criteria = {
    businessType: input.businessType || 'sale',
    cities: splitList(input.cities),
    propertyTypes: splitList(input.propertyTypes),
  };
  // CRM fields can be decimals (e.g. area 73.87 m²); the API stores integers.
  const int = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  };
  if (input.locationText) criteria.locationText = input.locationText;
  if (input.budgetMin) criteria.budgetMin = int(input.budgetMin);
  if (input.budgetMax) criteria.budgetMax = int(input.budgetMax);
  if (input.roomsMin) criteria.roomsMin = int(input.roomsMin);
  if (input.roomsMax) criteria.roomsMax = int(input.roomsMax);
  if (input.bedroomsMin) criteria.bedroomsMin = int(input.bedroomsMin);
  if (input.livingAreaMin) criteria.livingAreaMin = int(input.livingAreaMin);
  if (input.livingAreaMax) criteria.livingAreaMax = int(input.livingAreaMax);
  if (input.floorMin) criteria.floorMin = int(input.floorMin);
  if (input.floorMax) criteria.floorMax = int(input.floorMax);
  if (input.requiresTerrace !== undefined && input.requiresTerrace !== '')
    criteria.requiresTerrace = Boolean(input.requiresTerrace);
  if (input.requiresElevator !== undefined && input.requiresElevator !== '')
    criteria.requiresElevator = Boolean(input.requiresElevator);

  const body = {
    externalId: input.externalId || undefined,
    firstName: input.firstName || '',
    lastName: input.lastName || '',
    email: input.email,
    phone: input.phone || null,
    rgpdAccepted: true,
    sourceUrl: input.sourceUrl || 'zapier_integration',
    notes: input.notes || undefined,
    assigneeEmail: input.assigneeEmail || undefined,
    assigneeExternalId: input.assigneeExternalId || undefined,
    assigneeName: input.assigneeName || undefined,
    assigneePhone: input.assigneePhone || undefined,
    criteria,
  };

  const response = await z.request({
    method: 'POST',
    url: '/api/integrations/v1/buyer-leads',
    body,
  });
  return response.data;
};

module.exports = {
  key: 'buyer_lead',
  noun: 'Lead acquéreur',
  display: {
    label: 'Créer un lead acquéreur',
    description:
      'Crée (ou enrichit par email) un lead acquéreur, son projet et son profil de recherche, et lance le matching. N\'envoie pas d\'email au prospect.',
  },
  operation: {
    inputFields: [
      {
        key: 'externalId',
        label: 'ID externe (idempotence / fusion)',
        type: 'string',
        helpText:
          'ID stable du lead SweepBright. Évite les doublons et fusionne avec un acquéreur déjà présent (par email).',
      },
      { key: 'firstName', label: 'Prénom', type: 'string' },
      { key: 'lastName', label: 'Nom', type: 'string' },
      { key: 'email', label: 'Email', type: 'string', required: true },
      { key: 'phone', label: 'Téléphone', type: 'string' },
      {
        key: 'rgpdAccepted',
        label: 'Consentement RGPD recueilli',
        type: 'boolean',
        required: true,
        default: 'true',
        helpText:
          'Doit être vrai : le consentement RGPD du prospect doit avoir été recueilli en amont.',
      },
      {
        key: 'businessType',
        label: 'Type de projet',
        type: 'string',
        choices: { sale: 'Achat', rental: 'Location' },
        default: 'sale',
      },
      {
        key: 'cities',
        label: 'Villes recherchées (séparées par des virgules)',
        type: 'string',
      },
      {
        key: 'propertyTypes',
        label: 'Types de biens (séparés par des virgules)',
        type: 'string',
      },
      { key: 'budgetMin', label: 'Budget min (€)', type: 'number' },
      { key: 'budgetMax', label: 'Budget max (€)', type: 'number' },
      { key: 'roomsMin', label: 'Pièces min', type: 'number' },
      { key: 'roomsMax', label: 'Pièces max', type: 'number' },
      { key: 'bedroomsMin', label: 'Chambres min', type: 'number' },
      { key: 'livingAreaMin', label: 'Surface habitable min (m²)', type: 'number' },
      { key: 'livingAreaMax', label: 'Surface habitable max (m²)', type: 'number' },
      { key: 'floorMin', label: 'Étage min', type: 'number' },
      { key: 'floorMax', label: 'Étage max', type: 'number' },
      { key: 'requiresTerrace', label: 'Terrasse requise', type: 'boolean' },
      { key: 'requiresElevator', label: 'Ascenseur requis', type: 'boolean' },
      { key: 'locationText', label: 'Secteur (texte libre)', type: 'string' },
      { key: 'notes', label: 'Note interne', type: 'text' },
      { key: 'sourceUrl', label: 'Source', type: 'string' },
      {
        key: 'assigneeEmail',
        label: 'Collaborateur — email',
        type: 'string',
        helpText:
          'Email du collaborateur Sillage assigné (SweepBright assignee). Clé de rattachement la plus fiable.',
      },
      {
        key: 'assigneeExternalId',
        label: 'Collaborateur — ID SweepBright',
        type: 'string',
        helpText:
          'ID utilisateur SweepBright de l\'assignee (mappé via admin_profiles.metadata.sweepbright_user_id).',
      },
      { key: 'assigneeName', label: 'Collaborateur — nom', type: 'string' },
      { key: 'assigneePhone', label: 'Collaborateur — téléphone', type: 'string' },
    ],
    perform,
    sample: {
      ok: true,
      buyerLeadId: '00000000-0000-0000-0000-000000000000',
      clientProjectId: '00000000-0000-0000-0000-000000000000',
      buyerSearchProfileId: '00000000-0000-0000-0000-000000000000',
      assignedAdminProfileId: null,
      assigneeMatchedBy: null,
    },
    outputFields: [
      { key: 'buyerLeadId', label: 'ID lead acquéreur' },
      { key: 'clientProjectId', label: 'ID projet client' },
      { key: 'buyerSearchProfileId', label: 'ID profil de recherche' },
      { key: 'assignedAdminProfileId', label: 'ID collaborateur assigné' },
      { key: 'assigneeMatchedBy', label: 'Assignation par (email/id/nom)' },
    ],
  },
};
