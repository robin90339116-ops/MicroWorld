'use strict';
// Deterministic transport/row-lock simulator, not PostgreSQL compatibility proof.
function fakeDatabase(initial = { count: 0 }) {
  const db = { data: structuredClone(initial), queries: [], configs: [], releases: 0, fail: '', commitGate: null, onCommit: null, tail: Promise.resolve() };
  db.Pool = class {
    constructor(config) { db.configs.push(config); }
    on() {}
    async end() {}
    async query(sql, args) {
      db.queries.push(sql);
      if (sql.startsWith('INSERT') && db.data === undefined) db.data = JSON.parse(args[0]);
      return { rows: sql.startsWith('SELECT') ? [{ data: structuredClone(db.data) }] : [] };
    }
    async connect() {
      if (db.fail === 'connect') throw new Error('private database connection details');
      let unlock = null, staged, dirty = false;
      const releaseLock = () => { if (unlock) { unlock(); unlock = null; } };
      return {
        on() {}, removeListener() {},
        async query(sql, args) {
          db.queries.push(sql);
          if (sql.includes('FOR UPDATE')) {
            const previous = db.tail;
            db.tail = new Promise(resolve => { unlock = resolve; });
            await previous;
            staged = structuredClone(db.data);
            return { rows: staged === undefined ? [] : [{ data: staged }] };
          }
          if (sql.startsWith('UPDATE')) {
            if (db.fail === 'update') throw new Error('private sql details');
            staged = JSON.parse(args[0]); dirty = true;
            return { rowCount: 1 };
          }
          if (sql === 'COMMIT') {
            if (db.onCommit) db.onCommit();
            if (db.commitGate) await db.commitGate;
            if (db.fail === 'commit-before') throw new Error('connection lost');
            if (dirty) db.data = structuredClone(staged);
            releaseLock();
            if (db.fail === 'commit-after') throw new Error('lost acknowledgement');
          }
          if (sql === 'ROLLBACK') releaseLock();
          return { rows: [] };
        },
        release() { releaseLock(); db.releases++; }
      };
    }
  };
  return db;
}
module.exports = { fakeDatabase };
