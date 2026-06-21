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
  const [rows] = await pool.query(`
    SELECT sch.school_level, COUNT(DISTINCT ec.id) AS center_count
    FROM exam_centers ec
    INNER JOIN schools_management sch ON ec.school_id = sch.school_id
    WHERE ec.deleted_at IS NULL
    GROUP BY sch.school_level
  `);
  console.log('centers by level:', rows);
  const [primarySample] = await pool.query(`
    SELECT ec.id, ec.center_name, sch.school_level, sch.region
    FROM exam_centers ec
    INNER JOIN schools_management sch ON ec.school_id = sch.school_id
    WHERE ec.deleted_at IS NULL AND sch.school_level = 'Primary'
    LIMIT 5
  `);
  console.log('primary sample:', primarySample);
  const [secondarySample] = await pool.query(`
    SELECT ec.id, ec.center_name, sch.school_level, sch.region
    FROM exam_centers ec
    INNER JOIN schools_management sch ON ec.school_id = sch.school_id
    WHERE ec.deleted_at IS NULL AND sch.school_level = 'Secondary'
    LIMIT 5
  `);
  console.log('secondary sample:', secondarySample);
  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
