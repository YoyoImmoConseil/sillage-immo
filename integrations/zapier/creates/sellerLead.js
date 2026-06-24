'use strict';

const buildBody = (inputData) => {
  const body = {};
  Object.keys(inputData).forEach((key) => {
    const value = inputData[key];
    if (value !== undefined && value !== null && value !== '') {
      body[key] = value;
    }
  });
  return body;
};

const perform = async (z, bundle) => {
  const response = await z.request({
    method: 'POST',
    url: '/api/integrations/v1/seller-leads',
    body: buildBody(bundle.inputData),
  });
  return response.data;
};

module.exports = {
  key: 'seller_lead',
  noun: 'Lead vendeur',
  display: {
    label: 'Créer ou mettre à jour un lead vendeur',
    description:
      'Crée (ou fusionne par email / ID externe) un propriétaire / vendeur et son bien. Idéal pour SweepBright "Owner Created/Updated".',
  },
  operation: {
    inputFields: [
      {
        key: 'externalId',
        label: 'ID externe (idempotence / fusion)',
        type: 'string',
        helpText:
          'ID stable du propriétaire SweepBright. Permet la mise à jour sans doublon et la fusion avec un vendeur déjà présent.',
      },
      { key: 'fullName', label: 'Nom complet', type: 'string' },
      { key: 'email', label: 'Email', type: 'string', required: true },
      { key: 'phone', label: 'Téléphone', type: 'string' },
      { key: 'propertyType', label: 'Type de bien', type: 'string' },
      { key: 'propertyAddress', label: 'Adresse du bien', type: 'string' },
      { key: 'city', label: 'Ville', type: 'string' },
      { key: 'postalCode', label: 'Code postal', type: 'string' },
      {
        key: 'timeline',
        label: 'Échéance de vente',
        type: 'string',
        helpText: 'Ex. "immediate", "3_mois", "6_mois"…',
      },
      { key: 'occupancyStatus', label: "Statut d'occupation", type: 'string' },
      { key: 'estimatedPrice', label: 'Prix estimé (€)', type: 'number' },
      { key: 'message', label: 'Message / note', type: 'text' },
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
      },
      { key: 'assigneeName', label: 'Collaborateur — nom', type: 'string' },
      { key: 'assigneePhone', label: 'Collaborateur — téléphone', type: 'string' },
      {
        key: 'sendPortalInvite',
        label: 'Envoyer le lien espace client',
        type: 'boolean',
        default: 'true',
        helpText:
          'Crée l\'espace client vendeur et envoie le mail avec le lien de connexion (magic link) à la création du lead. Désactive pour ne pas envoyer d\'email.',
      },
    ],
    perform,
    sample: {
      ok: true,
      sellerLeadId: '00000000-0000-0000-0000-000000000000',
      created: true,
      merged: false,
      assignedAdminProfileId: null,
      assigneeMatchedBy: null,
      portalEmailSent: true,
    },
    outputFields: [
      { key: 'sellerLeadId', label: 'ID lead vendeur Sillage' },
      { key: 'created', label: 'Créé (true) ou enrichi (false)', type: 'boolean' },
      { key: 'merged', label: 'Fusionné avec un lead existant', type: 'boolean' },
      { key: 'assignedAdminProfileId', label: 'ID collaborateur assigné' },
      { key: 'assigneeMatchedBy', label: 'Assignation par (email/id/nom)' },
      { key: 'portalEmailSent', label: 'Email espace client envoyé', type: 'boolean' },
    ],
  },
};
