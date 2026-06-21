require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  const [total] = await pool.query('SELECT COUNT(*) AS c FROM schools_management');
  const [withNumber] = await pool.query(
    "SELECT COUNT(*) AS c FROM schools_management WHERE school_number IS NOT NULL AND TRIM(school_number) <> ''"
  );
  const [withRegionId] = await pool.query(
    'SELECT COUNT(*) AS c FROM schools_management WHERE region_id IS NOT NULL'
  );
  const [sample] = await pool.query(
    'SELECT school_id, school_number, region, region_id FROM schools_management LIMIT 5'
  );
  const [scopes] = await pool.query(
    'SELECT uas.scope_type, uas.region_id, uas.district_id, u.email FROM user_access_scopes uas JOIN users u ON u.id = uas.user_id LIMIT 5'
  );
  if (scopes.length) {
    const scope = scopes[0];
    const [regionSchools] = await pool.query(
      "SELECT COUNT(*) AS c FROM schools_management WHERE region_id = ?",
      [scope.region_id]
    );
    const [regionSchoolsWithNumber] = await pool.query(
      "SELECT COUNT(*) AS c FROM schools_management WHERE region_id = ? AND school_number IS NOT NULL AND TRIM(school_number) <> ''",
      [scope.region_id]
    );
    console.log('scopeRegionCounts', regionSchools[0].c, regionSchoolsWithNumber[0].c);
  }
  console.log(JSON.stringify({ total: total[0].c, withNumber: withNumber[0].c, withRegionId: withRegionId[0].c, sample, scopes }, null, 2));
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });