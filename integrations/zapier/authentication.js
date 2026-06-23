'use strict';

const { DEFAULT_BASE_URL } = require('./middleware');

// Validates the API key by hitting the connection-test endpoint, which
// returns the agency label + the key's scopes.
const test = (z) => z.request({ url: '/api/integrations/v1/me' });

module.exports = {
  type: 'custom',
  test,
  fields: [
    {
      key: 'apiKey',
      label: 'Clé API Sillage Immo',
      type: 'password',
      required: true,
      helpText:
        'Générez une clé dans le back-office Sillage Immo : /admin/mcp-keys → « Préréglage Zapier ». La clé commence par `sk_mcp_`.',
    },
    {
      key: 'baseUrl',
      label: 'URL de base',
      type: 'string',
      required: false,
      default: DEFAULT_BASE_URL,
      helpText:
        'Laisser la valeur par défaut (https://sillage-immo.com) sauf pour un environnement de test.',
    },
  ],
  // The /me response exposes `connectionLabel`; show it on the connection.
  connectionLabel: '{{connectionLabel}}',
};
