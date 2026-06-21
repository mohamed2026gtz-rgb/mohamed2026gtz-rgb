require('dotenv').config();
const { pool } = require('../src/config/db');
(async () => {
  const [rows] = await pool.query(`
    SELECT r.region_id, r.region_name, GROUP_CONCAT(DISTINCT s.region SEPARATOR ' | ') AS school_region_texts,
      COUNT(*) AS school_count
    FROM regions r
    LEFT JOIN schools_management s ON s.region_id = r.region_id
    GROUP BY r.region_id, r.region_name
    HAVING school_region_texts IS NOT NULL
      AND school_region_texts NOT LIKE CONCAT('%', r.region_name, '%')
    LIMIT 20
  `);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});