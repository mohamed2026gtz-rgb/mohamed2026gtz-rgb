require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [r] = await pool.query(
    "SELECT COUNT(DISTINCT exam_center_name) AS c FROM schools_management WHERE school_level='Primary' AND exam_center_name IS NOT NULL AND TRIM(exam_center_name) != ''"
  );
  console.log('primary distinct centers in schools:', r);
  const [r2] = await pool.query(
    "SELECT COUNT(*) AS c FROM exam_centers ec JOIN schools_management s ON ec.school_id = s.school_id WHERE s.school_level = 'Primary' AND ec.deleted_at IS NULL"
  );
  console.log('exam_centers linked to primary schools:', r2);
  await pool.end();
})();
