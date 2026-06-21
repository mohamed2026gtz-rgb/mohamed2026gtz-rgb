require('dotenv').config();
const { pool } = require('../src/config/db');
const { getAllowedSchoolAccess } = require('../src/services/userSchoolAccess');

(async () => {
  const [users] = await pool.query("SELECT id, email FROM users WHERE email = 'moh@gmail.com'");
  const user = { id: users[0].id, roles: ['Region'] };
  const access = await getAllowedSchoolAccess(user);
  let sql = 'SELECT COUNT(*) AS c FROM schools_management s WHERE 1=1';
  const params = [];
  const parts = [];
  if (access.schoolIds.length) { parts.push(`s.school_id IN (${access.schoolIds.map(()=>'?').join(',')})`); params.push(...access.schoolIds); }
  if (access.schoolNumbers.length) { parts.push(`s.school_number IN (${access.schoolNumbers.map(()=>'?').join(',')})`); params.push(...access.schoolNumbers); }
  sql += ` AND (${parts.join(' OR ')}) AND s.region_id = 86`;
  params.push();
  const [cnt] = await pool.query(sql, params);
  console.log({ ids: access.schoolIds.length, numbers: access.schoolNumbers.length, schools: cnt[0].c });
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});