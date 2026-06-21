require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  const sqlPath = path.join(__dirname, '..', 'sql', '003_supervisor_one_to_one.sql');
  console.log('Running migration:', sqlPath);
  await pool.query(fs.readFileSync(sqlPath, 'utf8'));
  console.log('One-to-one supervisor ↔ exam center constraints applied.');

  await pool.end();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
