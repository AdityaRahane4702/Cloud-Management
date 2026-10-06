const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const isRemoteHost = process.env.PGHOST && !['127.0.0.1', 'localhost'].includes(process.env.PGHOST);

const dbConfig = {
  user: process.env.PGUSER || process.env.USER || 'postgres',
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'vm_monitoring',
  password: process.env.PGPASSWORD || '',
  ssl: process.env.PGSSL === 'true' || isRemoteHost ? { rejectUnauthorized: false } : false,
};

let pool = null;
let isPostgresAvailable = false;

// Fallback in-memory data store in case PostgreSQL daemon is not running
const inMemoryStore = {
  vms: new Map(), // vm_id -> vm object
  metrics: [], // array of metric objects
  alertRules: [
    { id: 1, metric_name: 'cpu', warning_threshold: 75.0, critical_threshold: 90.0, enabled: true },
    { id: 2, metric_name: 'memory', warning_threshold: 80.0, critical_threshold: 92.0, enabled: true },
    { id: 3, metric_name: 'disk', warning_threshold: 85.0, critical_threshold: 95.0, enabled: true }
  ],
  alerts: [] // array of alert objects
};

async function ensureDatabaseExists() {
  if (dbConfig.database === 'postgres') return;

  const rootPool = new Pool({
    ...dbConfig,
    database: 'postgres'
  });

  try {
    const res = await rootPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbConfig.database]
    );
    if (res.rowCount === 0) {
      console.log(`Database '${dbConfig.database}' does not exist. Creating...`);
      await rootPool.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`Database '${dbConfig.database}' created successfully.`);
    }
  } catch (err) {
    console.warn(`Could not verify/create database via root pool: ${err.message}`);
  } finally {
    await rootPool.end().catch(() => {});
  }
}

async function initDbPool() {
  try {
    await ensureDatabaseExists();
    
    pool = new Pool(dbConfig);
    const client = await pool.connect();
    console.log(`Connected to PostgreSQL database '${dbConfig.database}' at ${dbConfig.host}:${dbConfig.port}`);
    client.release();
    isPostgresAvailable = true;
    return true;
  } catch (err) {
    console.warn(`⚠️ PostgreSQL connection failed (${err.message}). Defaulting to high-performance in-memory state engine.`);
    isPostgresAvailable = false;
    return false;
  }
}

function getPool() {
  return pool;
}

function getInMemoryStore() {
  return inMemoryStore;
}

function getIsPostgresAvailable() {
  return isPostgresAvailable;
}

const deregisteredVms = new Set();

function getDeregisteredVms() {
  return deregisteredVms;
}

module.exports = {
  initDbPool,
  getPool,
  getInMemoryStore,
  getIsPostgresAvailable,
  getDeregisteredVms,
  dbConfig
};
