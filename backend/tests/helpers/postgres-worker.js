'use strict';
const { createPostgresStore } = require('../../src/shared/postgres-store');

(async () => {
  if (!process.send || !/^microworld_integration_[a-f0-9]{24}$/.test(process.env.SMALLWORLD_DATABASE_TABLE || '')) {
    throw new Error('Worker requires an isolated parent-owned test table and IPC');
  }
  const store = createPostgresStore({ databaseUrl: process.env.SMALLWORLD_DATABASE_URL, seed: { count: 0 } });
  try {
    await store.init();
    if (process.argv[2] === 'increment') {
      // Signal readiness only after both independent pools can access the table.
      const start = new Promise(resolve => process.once('message', resolve));
      process.send({ ready: true });
      await start;
      for (let i = 0; i < 20; i++) {
        await store.runRequest(async () => {
          const state = store.readRaw();
          await new Promise(resolve => setTimeout(resolve, 5));
          state.count++;
          store.writeRaw(state);
        });
      }
    }
    const count = await store.runRequest(() => store.readRaw().count);
    process.send({ count });
  } finally { await store.close(); process.disconnect(); }
})().catch(() => { console.error('PostgreSQL test worker failed'); process.exitCode = 1; });
