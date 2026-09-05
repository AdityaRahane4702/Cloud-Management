const fs = require('fs');
const path = require('path');
const { getPool, getIsPostgresAvailable } = require('../config/db');

async function initializeSchema() {
  if (!getIsPostgresAvailable()) {
    console.log('In-memory database initialized with default tables and rules.');
    return;
  }

  const pool = getPool();
  const schemaPath = path.join(__dirname, '../../../database/schema.sql');

  try {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('PostgreSQL database schema and indexes initialized successfully.');
  } catch (err) {
    console.error('Error executing schema initialization SQL:', err.message);
  }
}

module.exports = { initializeSchema };
