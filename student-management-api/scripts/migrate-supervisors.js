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

  const sqlPath = path.join(__dirname, '..', 'sql', '001_supervisors.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Running migration:', sqlPath);
  await pool.query(sql);
  console.log('Tables created.');

  const academicYear = process.env.ACADEMIC_YEAR || '2025/2026';
  const [result] = await pool.query(
    `INSERT INTO primary_exam_centers (center_name, region, region_id, district, academic_year, school_count)
     SELECT
       TRIM(s.exam_center_name) AS center_name,
       NULLIF(TRIM(s.region), '') AS region,
       s.region_id,
       NULLIF(TRIM(s.district), '') AS district,
       ? AS academic_year,
       COUNT(*) AS school_count
     FROM schools_management s
     WHERE s.school_level = 'Primary'
       AND s.exam_center_name IS NOT NULL
       AND TRIM(s.exam_center_name) != ''
     GROUP BY TRIM(s.exam_center_name), NULLIF(TRIM(s.region), ''), s.region_id, NULLIF(TRIM(s.district), '')
     ON DUPLICATE KEY UPDATE
       school_count = VALUES(school_count),
       district = VALUES(district),
       updated_at = CURRENT_TIMESTAMP`,
    [academicYear]
  );
  console.log('Primary exam centers synced:', result.affectedRows, 'rows affected');

  const [[{ primaryCenters }]] = await pool.query(
    'SELECT COUNT(*) AS primaryCenters FROM primary_exam_centers'
  );
  const [[{ secondaryCenters }]] = await pool.query(
    `SELECT COUNT(*) AS secondaryCenters
     FROM exam_centers ec
     INNER JOIN schools_management sch ON ec.school_id = sch.school_id
     WHERE ec.deleted_at IS NULL AND sch.school_level IN ('Secondary', 'Technical TVET')`
  );
  console.log(`Primary exam centers in DB: ${primaryCenters}`);
  console.log(`Secondary exam centers in DB: ${secondaryCenters}`);

  await pool.end();
  console.log('Migration complete.');
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
