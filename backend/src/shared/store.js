'use strict';
const { createFileStore } = require('./file-store');
const { createPostgresStore } = require('./postgres-store');

// File writes are synchronous/atomic. PostgreSQL operations require runRequest;
// the HTTP layer must wait for it before sending the captured response.
function createStore({ databaseUrl, dataFile, seed }) {
  const url = String(databaseUrl || '').trim();
  return url ? createPostgresStore({ databaseUrl: url, seed }) : createFileStore({ dataFile, seed });
}
module.exports = { createStore, createFileStore, createPostgresStore };
