'use strict';

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const criteria = {
    businessType: input.businessType || 'sale',
    cities: input.cities
      ? String(input.cities)
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : [],
    propertyTypes: input.propertyTypes
      ? String(input.propertyTypes)
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : [],
  };
  if (input.budgetMin) criteria.budgetMin = Number(input.budgetMin);
  if (input.budgetMax) criteria.budgetMax = Number(input.budgetMax);
  if (input.locationText) criteria.locationText = input.locationText;

  const body = {
    firstName: input.firstName || '',
    lastName: input.lastName || '',
    email: input.email,
    phone: input.phone || null,
    rgpdAccepted: true,
    sourceUrl: input.sourceUrl || 'zapier_integration',
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
      { key: 'locationText', label: 'Secteur (texte libre)', type: 'string' },
      { key: 'sourceUrl', label: 'Source', type: 'string' },
    ],
    perform,
    sample: {
      ok: true,
      buyerLeadId: '00000000-0000-0000-0000-000000000000',
      clientProjectId: '00000000-0000-0000-0000-000000000000',
      buyerSearchProfileId: '00000000-0000-0000-0000-000000000000',
    },
    outputFields: [
      { key: 'buyerLeadId', label: 'ID lead acquéreur' },
      { key: 'clientProjectId', label: 'ID projet client' },
      { key: 'buyerSearchProfileId', label: 'ID profil de recherche' },
    ],
  },
};
