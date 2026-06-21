require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runSql(pool, filename) {
  const sqlPath = path.join(__dirname, '..', 'sql', filename);
  console.log('Running:', sqlPath);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
        console.log('  (already applied, skipped)');
      } else {
        throw err;
      }
    }
  }
}

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await runSql(pool, '008_supervisor_region.sql');
    console.log('Supervisor region migration complete.');
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
