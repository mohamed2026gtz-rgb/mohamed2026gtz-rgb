require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../src/config/db");
const authService = require("../src/services/authService");

(async () => {
  const [users] = await pool.query(`
    SELECT u.id, u.email, u.name FROM users u
    INNER JOIN user_access_scopes s ON s.user_id = u.id
    WHERE s.scope_type = 'region' LIMIT 1
  `);
  const [roles] = await pool.query(`
    SELECT r.name FROM model_has_roles mhr
    INNER JOIN roles r ON r.id = mhr.role_id
    WHERE mhr.model_id = ? AND mhr.model_type LIKE '%User%'
  `, [users[0].id]);
  console.log("User roles:", roles.map(r => r.name));

  // Test schools query as this user via simulated req
  const { getAllowedSchoolAccess, schoolFilterClause } = require("../src/services/userSchoolAccess");
  const user = { id: users[0].id, roles: roles.map(r => r.name) };
  const access = await getAllowedSchoolAccess(user);
  console.log("Has scopes:", !!access?.scopes?.length);

  let sql = "SELECT COUNT(*) c FROM schools_management s WHERE 1=1";
  const f = schoolFilterClause(access, "s");
  sql += f.sql;
  const params = [...f.params];
  const rid = 86;
  sql += " AND (s.region_id = ? OR TRIM(s.region) = (SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1))";
  params.push(rid, rid);
  sql += " AND TRIM(s.school_level) = 'Primary'";
  const [[c]] = await pool.query(sql, params);
  console.log("Schools count via full query:", c.c);

  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });