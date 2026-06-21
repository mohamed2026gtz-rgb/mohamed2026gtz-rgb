require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../src/config/db");
(async () => {
  const [rows] = await pool.query(`
    SELECT u.id, u.email, u.name,
      GROUP_CONCAT(DISTINCT r.name) as roles,
      s.scope_type, s.region_id
    FROM users u
    INNER JOIN user_access_scopes s ON s.user_id = u.id
    LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type LIKE '%User%'
    LEFT JOIN roles r ON r.id = mhr.role_id
    WHERE s.scope_type = 'region'
    GROUP BY u.id, s.scope_type, s.region_id
  `);
  console.log(JSON.stringify(rows, null, 2));
  const [allRoles] = await pool.query("SELECT id, name FROM roles ORDER BY name");
  console.log("All roles:", allRoles);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });