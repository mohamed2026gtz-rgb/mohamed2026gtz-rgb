require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../src/config/db");
const { getUserScopes, buildAccessScopeSummary } = require("../src/services/userScopeService");
const { schoolFilterClause, getAllowedSchoolAccess } = require("../src/services/userSchoolAccess");

(async () => {
  const [regions] = await pool.query("SELECT region_id, region_name FROM regions WHERE region_name LIKE '%Awdal%' LIMIT 3");
  console.log("Regions Awdal:", regions);

  const [[byName]] = await pool.query("SELECT COUNT(*) c FROM schools_management WHERE TRIM(region) LIKE '%Awdal%'");
  const [[byId]] = regions[0] ? await pool.query("SELECT COUNT(*) c FROM schools_management WHERE region_id = ?", [regions[0].region_id]) : [{ c: 0 }];
  console.log("Schools by name Awdal:", byName.c, "by region_id:", byId.c);

  const [scopeUsers] = await pool.query(`
    SELECT u.id, u.email, u.name, s.scope_type, s.region_id, s.district_id, s.school_level
    FROM users u
    INNER JOIN user_access_scopes s ON s.user_id = u.id
    WHERE s.scope_type = 'region'
    LIMIT 5
  `);
  console.log("Region scoped users:", scopeUsers);

  if (scopeUsers[0]) {
    const uid = scopeUsers[0].id;
    const summary = await buildAccessScopeSummary(uid);
    const access = await getAllowedSchoolAccess({ id: uid, groupId: null });
    const clause = schoolFilterClause(access, "s");
    const [[cnt]] = await pool.query(`SELECT COUNT(*) c FROM schools_management s WHERE 1=1${clause.sql}`, clause.params);
    console.log("User", scopeUsers[0].email, "scope region_id", scopeUsers[0].region_id, "summary regionId", summary.regionId);
    console.log("Scoped school count:", cnt.c);

    if (regions[0]) {
      const rid = regions[0].region_id;
      const sql = `SELECT COUNT(*) c FROM schools_management s WHERE 1=1${clause.sql} AND (s.region_id = ? OR TRIM(s.region) = (SELECT TRIM(region_name) FROM regions WHERE region_id = ? LIMIT 1)) AND TRIM(s.school_level) = 'Primary'`;
      const [[cnt2]] = await pool.query(sql, [...clause.params, rid, rid]);
      console.log("Primary in Awdal with double filter:", cnt2.c);
    }
  }

  const [sampleSchools] = await pool.query("SELECT school_id, school_name, region, region_id, school_level FROM schools_management WHERE TRIM(region) LIKE '%Awdal%' LIMIT 5");
  console.log("Sample Awdal schools:", sampleSchools);

  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });