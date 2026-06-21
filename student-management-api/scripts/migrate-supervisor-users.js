require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const sqlPath = path.join(__dirname, '..', 'sql', '004_supervisor_user_link.sql');

(async () => {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await pool.query(statement);
      console.log('OK:', statement.slice(0, 60).replace(/\s+/g, ' ') + '...');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Skip (already applied):', err.message);
      } else {
        throw err;
      }
    }
  }
  console.log('Supervisor user link migration complete.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
