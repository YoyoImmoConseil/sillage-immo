'use strict';

const core = require('zapier-platform-core');

const authentication = require('./authentication');
const { addBaseUrlAndAuth, handleErrors } = require('./middleware');
const transaction = require('./creates/transaction');
const marketObservation = require('./creates/marketObservation');
const buyerLead = require('./creates/buyerLead');
const sellerLead = require('./creates/sellerLead');

const App = {
  version: require('./package.json').version,
  platformVersion: core.version,

  authentication,

  beforeRequest: [addBaseUrlAndAuth],
  afterResponse: [handleErrors],

  triggers: {},
  searches: {},
  creates: {
    [transaction.key]: transaction,
    [marketObservation.key]: marketObservation,
    [buyerLead.key]: buyerLead,
    [sellerLead.key]: sellerLead,
  },
};

module.exports = App;
