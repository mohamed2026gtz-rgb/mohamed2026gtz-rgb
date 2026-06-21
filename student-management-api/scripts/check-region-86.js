require('dotenv').config();
const { pool } = require('../src/config/db');
(async () => {
  const [region] = await pool.query('SELECT region_id, region_name FROM regions WHERE region_id = 86 LIMIT 1');
  const [schoolRegions] = await pool.query('SELECT DISTINCT region FROM schools_management WHERE region_id = 86 LIMIT 5');
  const [countByName] = await pool.query(
    'SELECT COUNT(*) AS c FROM schools_management WHERE region = ?',
    [region[0]?.region_name]
  );
  const [countById] = await pool.query(
    'SELECT COUNT(*) AS c FROM schools_management WHERE region_id = 86'
  );
  console.log(JSON.stringify({ region: region[0], schoolRegions, countByName: countByName[0].c, countById: countById[0].c }, null, 2));
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});