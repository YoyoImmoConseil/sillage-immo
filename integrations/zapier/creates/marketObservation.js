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
    url: '/api/integrations/v1/market-observations',
    body: buildBody(bundle.inputData),
  });
  return response.data;
};

module.exports = {
  key: 'market_observation',
  noun: 'Observation de marché',
  display: {
    label: 'Créer une observation de marché',
    description:
      'Enregistre une observation prix/m² (fournir pricePerM2, ou estimatedPrice + livingAreaM2). Alimente les tendances de marché du Copilot.',
  },
  operation: {
    inputFields: [
      {
        key: 'externalId',
        label: 'ID externe (déduplication)',
        type: 'string',
        helpText: 'ID stable de l\'enregistrement source pour éviter les doublons.',
      },
      { key: 'city', label: 'Ville', type: 'string' },
      { key: 'postalCode', label: 'Code postal', type: 'string' },
      { key: 'neighborhood', label: 'Quartier', type: 'string' },
      { key: 'propertyType', label: 'Type de bien', type: 'string' },
      {
        key: 'businessType',
        label: 'Type',
        type: 'string',
        choices: { sale: 'Vente', rental: 'Location' },
        default: 'sale',
      },
      { key: 'pricePerM2', label: 'Prix au m² (€)', type: 'number' },
      { key: 'estimatedPrice', label: 'Prix estimé total (€)', type: 'number' },
      { key: 'livingAreaM2', label: 'Surface habitable (m²)', type: 'number' },
      { key: 'valuationLow', label: 'Fourchette basse (€)', type: 'number' },
      { key: 'valuationHigh', label: 'Fourchette haute (€)', type: 'number' },
      { key: 'currency', label: 'Devise (ISO, ex. EUR)', type: 'string', default: 'EUR' },
      { key: 'observedAt', label: 'Date d\'observation', type: 'datetime' },
      {
        key: 'kind',
        label: 'Nature du point',
        type: 'string',
        choices: {
          asking: 'Prix affiché (annonce)',
          valuation: 'Estimation / valuation',
          sold: 'Vendu (prix réalisé)',
        },
        helpText: 'Pour filtrer ensuite annonces vs estimations vs ventes.',
      },
    ],
    perform,
    sample: {
      ok: true,
      observationId: '00000000-0000-0000-0000-000000000000',
    },
    outputFields: [{ key: 'observationId', label: 'ID observation Sillage' }],
  },
};
