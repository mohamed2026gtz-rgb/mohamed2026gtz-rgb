require('dotenv').config();
const { pool } = require('../src/config/db');
const { getUserScopes, resolveSchoolIdsFromScopes } = require('../src/services/userScopeService');
const { getAllowedSchoolAccess, schoolFilterClause } = require('../src/services/userSchoolAccess');

(async () => {
  const [scopes] = await pool.query("SELECT DISTINCT scope_type FROM user_access_scopes");
  console.log('scope types', scopes);
  const [districtUsers] = await pool.query(`
    SELECT u.id, u.email, uas.district_id, uas.region_id
    FROM users u JOIN user_access_scopes uas ON u.id=uas.user_id
    WHERE uas.scope_type='district' LIMIT 3`);
  console.log('district users', districtUsers);
  for (const u of districtUsers) {
    const access = await getAllowedSchoolAccess({ id: u.id, roles: ['District'] });
    for (const level of [null, 'Primary', 'Secondary']) {
      let sql='SELECT COUNT(*) c FROM schools_management s WHERE 1=1';
      const p=[];
      const f=schoolFilterClause(access,'s'); sql+=f.sql; p.push(...f.params);
      if(level){ sql+=' AND s.school_level=?'; p.push(level);} 
      const [r]=await pool.query(sql,p);
      console.log(u.email, level||'ALL', r[0].c, 'ids', access.schoolIds.length);
    }
  }
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});