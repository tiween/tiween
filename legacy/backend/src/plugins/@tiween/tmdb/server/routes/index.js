'use strict'

const settings = require('./settings');
const mdbRequests = require('./mdb-requests');
const moviemeta = require('./moviemeta');

module.exports = {
  settings,
  'mdb-requests': mdbRequests,
  moviemeta
};

