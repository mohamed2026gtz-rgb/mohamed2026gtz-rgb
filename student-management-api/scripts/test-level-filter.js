require('dotenv').config();
const { pool } = require('../src/config/db');
const { getAllowedSchoolAccess, schoolFilterClause } = require('../src/services/userSchoolAccess');

(async () => {
  const user = { id: (await pool.query("SELECT id FROM users WHERE email='moh@gmail.com'"))[0][0].id, roles: ['Region'] };
  const access = await getAllowedSchoolAccess(user);
  const levels = ['Primary', 'Secondary', 'ABE', 'Technical TVET', 'Unspecified'];
  for (const level of [null, ...levels]) {
    let sql = 'SELECT COUNT(*) c FROM schools_management s WHERE 1=1';
    const params = [];
    const f = schoolFilterClause(access, 's');
    sql += f.sql; params.push(...f.params);
    sql += ' AND s.region_id = 86';
    if (level === 'Unspecified') {
      sql += " AND (s.school_level IS NULL OR TRIM(s.school_level) = '')";
    } else if (level) {
      sql += ' AND s.school_level = ?';
      params.push(level);
    }
    const [r] = await pool.query(sql, params);
    console.log(level ?? 'ALL', r[0].c);
  }
  const [distinct] = await pool.query("SELECT DISTINCT school_level, COUNT(*) c FROM schools_management WHERE region_id=86 GROUP BY school_level ORDER BY c DESC LIMIT 10");
  console.log('levels in awdal:', distinct);
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});