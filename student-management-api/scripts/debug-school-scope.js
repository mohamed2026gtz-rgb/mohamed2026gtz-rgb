require('dotenv').config();
const { pool } = require('../src/config/db');
const { getUserScopes, resolveSchoolIdsFromScopes } = require('../src/services/userScopeService');
const { getAllowedSchoolAccess, schoolFilterClause } = require('../src/services/userSchoolAccess');

(async () => {
  const [users] = await pool.query("SELECT id, email FROM users WHERE email LIKE '%cigaal%' OR email LIKE '%moh%'");
  for (const u of users) {
    const scopes = await getUserScopes(u.id);
    const access = await getAllowedSchoolAccess({ id: u.id, roles: ['data entry staff'] });
    let sql = 'SELECT school_id, school_name, region, region_id, school_level FROM schools_management s WHERE 1=1';
    const filter = schoolFilterClause(access, 's');
    sql += filter.sql;
    const [rows] = await pool.query(sql, filter.params);
    let sql2 = sql + ' AND s.region_id = 86';
    const [rows2] = await pool.query(sql2, filter.params);
    console.log(u.email, {
      scopeType: scopes[0]?.scopeType,
      regionId: scopes[0]?.regionId,
      schoolScopeRows: scopes.filter(s=>s.scopeType==='school').length,
      accessIds: access.schoolIds.length,
      allScoped: rows.length,
      withRegion86: rows2.length,
      sample: rows.slice(0,3).map(r=>({id:r.school_id,name:r.school_name,region:r.region,level:r.school_level}))
    });
  }
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});