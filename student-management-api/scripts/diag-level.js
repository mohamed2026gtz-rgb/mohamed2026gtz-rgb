require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../src/config/db");
(async () => {
  const [rows] = await pool.query(`
    SELECT DISTINCT school_level, LENGTH(school_level) len, HEX(school_level) hex
    FROM schools_management WHERE region_id = 86 LIMIT 10
  `);
  console.log(rows);
  const [[c1]] = await pool.query("SELECT COUNT(*) c FROM schools_management WHERE region_id=86 AND TRIM(school_level)='Primary'");
  const [[c2]] = await pool.query("SELECT COUNT(*) c FROM schools_management WHERE region_id=86 AND school_level='Primary'");
  console.log("trim Primary:", c1.c, "exact Primary:", c2.c);
  await pool.end();
})().catch(e => console.error(e));