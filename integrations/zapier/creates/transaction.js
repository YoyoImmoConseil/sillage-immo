'use strict';

// Build a request body from the Zap input, omitting empty values so the API
// only patches provided fields (important for the upsert-by-externalId path).
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
    url: '/api/integrations/v1/transactions',
    body: buildBody(bundle.inputData),
  });
  return response.data;
};

module.exports = {
  key: 'transaction',
  noun: 'Transaction',
  display: {
    label: 'Créer ou mettre à jour une transaction',
    description:
      'Crée une transaction (mandat / compromis / acte + honoraires) ou la met à jour si l\'ID externe existe déjà. Alimente le CA et les analyses du Copilot.',
  },
  operation: {
    inputFields: [
      {
        key: 'externalId',
        label: 'ID externe (idempotence)',
        type: 'string',
        helpText:
          'ID stable de l\'enregistrement source (ex. ID du deal SweepBright). Permet les mises à jour sans doublon.',
      },
      { key: 'reference', label: 'Référence', type: 'string' },
      {
        key: 'businessType',
        label: 'Type',
        type: 'string',
        choices: { sale: 'Vente', rental: 'Location' },
        default: 'sale',
      },
      {
        key: 'status',
        label: 'Statut',
        type: 'string',
        choices: {
          prospect: 'Prospect',
          mandate: 'Mandat',
          offer: 'Offre',
          compromis: 'Compromis',
          acte: 'Acte authentique',
          cancelled: 'Annulée',
        },
      },
      { key: 'currency', label: 'Devise (ISO, ex. EUR)', type: 'string', default: 'EUR' },
      { key: 'mandatePriceAmount', label: 'Prix mandat', type: 'number' },
      { key: 'agreedPriceAmount', label: 'Prix négocié', type: 'number' },
      { key: 'deedPriceAmount', label: 'Prix acte', type: 'number' },
      { key: 'honorairesAmount', label: 'Honoraires (CA HT)', type: 'number' },
      { key: 'mandateSignedAt', label: 'Date signature mandat', type: 'datetime' },
      { key: 'offerReceivedAt', label: 'Date offre reçue', type: 'datetime' },
      { key: 'preliminarySaleSignedAt', label: 'Date compromis', type: 'datetime' },
      { key: 'deedSignedAt', label: 'Date acte authentique', type: 'datetime' },
      { key: 'notes', label: 'Notes', type: 'text' },
    ],
    perform,
    sample: {
      ok: true,
      transactionId: '00000000-0000-0000-0000-000000000000',
      created: true,
    },
    outputFields: [
      { key: 'transactionId', label: 'ID transaction Sillage' },
      { key: 'created', label: 'Créée (true) ou mise à jour (false)', type: 'boolean' },
    ],
  },
};
