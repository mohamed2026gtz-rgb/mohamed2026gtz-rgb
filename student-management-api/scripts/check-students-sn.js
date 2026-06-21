require('dotenv').config();
const { pool } = require('../src/config/db');
(async () => {
  const [r] = await pool.query("SELECT COUNT(*) c FROM students_management WHERE school_number IS NULL OR TRIM(school_number)=''");
  const [r2] = await pool.query('SELECT COUNT(*) c FROM students_management WHERE deleted_at IS NULL');
  console.log({ studentsTotal: r2[0].c, studentsMissingSchoolNumber: r[0].c });
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});