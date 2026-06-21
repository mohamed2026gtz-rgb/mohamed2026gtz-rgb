require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../src/config/db");
const { getAllowedSchoolAccess, schoolFilterClause } = require("../src/services/userSchoolAccess");

(async () => {
  const reqUser = { id: "37", roles: [] };
  const access = await getAllowedSchoolAccess(reqUser);
  const filter = schoolFilterClause(access, "s");
  
  // Test 1: scope only
  let sql = "SELECT COUNT(*) c FROM schools_management s WHERE 1=1" + filter.sql;
  let [[r1]] = await pool.query(sql, filter.params);
  console.log("Scope only:", r1.c);

  // Test 2: scope + level
  sql = "SELECT COUNT(*) c FROM schools_management s WHERE 1=1" + filter.sql + " AND TRIM(s.school_level) = ?";
  let [[r2]] = await pool.query(sql, [...filter.params, "Primary"]);
  console.log("Scope + level Primary:", r2.c);

  // Test 3: check param binding issue - maybe filter has wrong number of params
  console.log("Filter:", filter.sql);
  console.log("Params:", filter.params);

  // Test 4: run full route query with subquery
  sql = `SELECT s.school_id, s.school_level FROM schools_management s WHERE 1=1${filter.sql} AND TRIM(s.school_level) = ? LIMIT 5`;
  const [rows] = await pool.query(sql, [...filter.params, "Primary"]);
  console.log("Sample rows:", rows);

  await pool.end();
})().catch(e => console.error(e));