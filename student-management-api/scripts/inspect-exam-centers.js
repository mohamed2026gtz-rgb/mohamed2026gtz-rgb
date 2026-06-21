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
  for (const table of ['exam_centers', 'exam_center_assignments']) {
    const [cols] = await pool.query(`DESCRIBE ${table}`);
    console.log('\n===', table, '===');
    console.table(cols);
    const [sample] = await pool.query(`SELECT * FROM ${table} LIMIT 3`);
    console.log('sample:', sample);
  }
  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
