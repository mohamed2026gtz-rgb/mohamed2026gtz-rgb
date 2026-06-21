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
  const query = { level: "Primary" };
  let sql = `SELECT s.*,
      (SELECT COUNT(*) FROM students_management st
       WHERE st.school_id = s.school_id AND st.deleted_at IS NULL) AS student_count
      FROM schools_management s WHERE 1=1`;
  const params = [];
  const access = await getAllowedSchoolAccess(reqUser);
  const filter = schoolFilterClause(access, "s");
  sql += filter.sql;
  params.push(...filter.params);
  const filtered = appendSchoolFilters(query, sql, params);
  const [rows] = await pool.query(filtered.sql, filtered.params);
  console.log("Full route query count:", rows.length);
  await pool.end();
})().catch(e => console.error(e));