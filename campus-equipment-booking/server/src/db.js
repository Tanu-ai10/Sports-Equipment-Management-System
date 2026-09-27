const { Pool } = require('pg');
require('dotenv').config();

function createRealPool() {
  const baseConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      };

  const pool = new Pool(baseConfig);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pool;
}

function createMemoryPool() {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const { Pool: MemoryPool } = db.adapters.createPg();
  const pool = new MemoryPool();

  pool.on('error', (err) => {
    console.error('Unexpected error on idle memory database client', err);
  });

  return pool;
}

let activePool = process.env.USE_PG_MEM === 'true' ? createMemoryPool() : createRealPool();
let usingMemory = process.env.USE_PG_MEM === 'true';

async function ensureDatabase() {
  if (usingMemory) return;

  try {
    await activePool.query('SELECT 1');
  } catch (err) {
    console.warn('PostgreSQL connection failed. Falling back to the in-memory database.');
    console.warn(err.message);
    try {
      await activePool.end();
    } catch (endErr) {
      console.warn('Could not close failed PostgreSQL pool.', endErr.message);
    }
    activePool = createMemoryPool();
    usingMemory = true;
  }
}

const pool = {
  query: async (...args) => {
    await ensureDatabase();
    return activePool.query(...args);
  },
  connect: async (...args) => {
    await ensureDatabase();
    return activePool.connect(...args);
  },
  end: async (...args) => activePool.end(...args),
  on: (...args) => activePool.on(...args),
};

module.exports = {
  query: pool.query,
  getClient: pool.connect,
  pool,
};
