const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Applying schema.sql ...');
  try {
    await pool.query(sql);
    console.log('✔ Schema applied successfully.');
    return true;
  } catch (err) {
    console.error('✘ Migration failed:', err.message);
    process.exitCode = 1;
    return false;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
