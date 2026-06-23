'use strict';

const DEFAULT_BASE_URL = 'https://sillage-immo.com';

// Prepend the configured base URL to relative request paths and attach the
// API key as a Bearer token. Endpoints accept either `Authorization: Bearer`
// or `x-api-key`; we use the bearer form.
const addBaseUrlAndAuth = (request, z, bundle) => {
  const baseUrl = (
    (bundle.authData && bundle.authData.baseUrl) ||
    DEFAULT_BASE_URL
  ).replace(/\/$/, '');

  if (request.url && request.url.startsWith('/')) {
    request.url = `${baseUrl}${request.url}`;
  }

  if (bundle.authData && bundle.authData.apiKey) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.apiKey}`;
  }

  return request;
};

// Surface the API's JSON error message to the Zap editor / run logs.
const handleErrors = (response, z) => {
  if (response.status >= 400) {
    let message = response.content;
    try {
      const data = response.data || JSON.parse(response.content);
      message = (data && (data.message || data.code)) || message;
    } catch (e) {
      // keep raw content
    }
    throw new z.errors.Error(
      `Sillage Immo (${response.status}): ${message}`,
      'SillageImmoError',
      response.status
    );
  }
  return response;
};

module.exports = { addBaseUrlAndAuth, handleErrors, DEFAULT_BASE_URL };
