require('dotenv').config();
const { pool } = require('../src/config/db');
const { resolveSchoolNumbersFromScopes, getUserScopes } = require('../src/services/userScopeService');

(async () => {
  const [users] = await pool.query("SELECT id, email FROM users WHERE email IN ('moh@gmail.com', 'cigaal@gmail.com')");
  for (const user of users) {
    const scopes = await getUserScopes(user.id);
    const numbers = await resolveSchoolNumbersFromScopes(scopes);
    let sql = `SELECT COUNT(*) AS c FROM schools_management s WHERE 1=1`;
    const params = [];
    if (numbers.length) {
      sql += ` AND s.school_number IN (${numbers.map(()=>'?').join(',')})`;
      params.push(...numbers);
    } else sql += ' AND 1=0';
    const [cnt] = await pool.query(sql, params);
    const regionName = scopes[0]?.regionId ? (await pool.query('SELECT region_name FROM regions WHERE region_id=?',[scopes[0].regionId]))[0][0]?.region_name : null;
    let sql2 = sql + ' AND s.region = ?';
    const params2 = [...params, regionName];
    const [cnt2] = await pool.query(sql2, params2);
    console.log(user.email, { scopeType: scopes[0]?.scopeType, regionId: scopes[0]?.regionId, regionName, allowed: numbers.length, schoolsNoRegionFilter: cnt[0].c, schoolsWithRegionName: cnt2[0].c });
  }
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});