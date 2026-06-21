require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  const [tables] = await pool.query("SHOW TABLES LIKE '%center%'");
  console.log('center tables:', tables);
  const [tables2] = await pool.query("SHOW TABLES LIKE '%exam%'");
  console.log('exam tables:', tables2);
  const [levels] = await pool.query(
    'SELECT DISTINCT school_level FROM schools_management ORDER BY school_level LIMIT 20'
  );
  console.log('school levels:', levels);
  const [centers] = await pool.query(
    "SELECT DISTINCT exam_center_name, school_level FROM schools_management WHERE exam_center_name IS NOT NULL AND TRIM(exam_center_name) != '' LIMIT 20"
  );
  console.log('sample exam centers:', centers);
  const [allTables] = await pool.query('SHOW TABLES');
  const names = allTables.map((t) => Object.values(t)[0]);
  console.log(
    'matching tables:',
    names.filter((n) => /primary|secondary|center|supervisor/i.test(n))
  );
  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
