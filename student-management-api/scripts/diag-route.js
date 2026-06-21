require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../src/config/db");
const { getAllowedSchoolAccess, schoolFilterClause } = require("../src/services/userSchoolAccess");

function appendSchoolFilters(query, sql, params) {
  let nextSql = sql;
  const nextParams = [...params];
  if (query.regionId) {
    const rid = Number(query.regionId);
    nextSql += ` AND (s.region_id = ? OR TRIM(s.region) = (
      SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1
    ))`;
    nextParams.push(rid, rid);
  }
  if (query.level) {
    nextSql += ' AND TRIM(s.school_level) = ?';
    nextParams.push(String(query.level).trim());
  }
  return { sql: nextSql, params: nextParams };
}

(async () => {
  const reqUser = { id: "37", roles: [] };
  const query = { regionId: "86", level: "Primary" };
  let sql = `SELECT s.school_id, s.school_name FROM schools_management s WHERE 1=1`;
  const params = [];
  const access = await getAllowedSchoolAccess(reqUser);
  console.log("access scopes:", access?.scopes?.length, access?.scopes?.[0]);
  const filter = schoolFilterClause(access, "s");
  console.log("filter sql:", filter.sql);
  console.log("filter params:", filter.params);
  sql += filter.sql;
  params.push(...filter.params);
  const filtered = appendSchoolFilters(query, sql, params);
  sql = filtered.sql;
  const [rows] = await pool.query(sql, filtered.params);
  console.log("Row count:", rows.length);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });