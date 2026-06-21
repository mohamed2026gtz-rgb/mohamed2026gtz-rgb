require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const CHEATING_TYPES = [
  { code: 'mobile_phone', label: 'Mobile phone use', description: 'Using or possessing a mobile phone during the exam', sort: 1 },
  { code: 'unauthorized_materials', label: 'Unauthorized materials', description: 'Notes, books, or aids not permitted in the exam room', sort: 2 },
  { code: 'copying', label: 'Copying', description: 'Copying from another candidate or shared materials', sort: 3 },
  { code: 'communication', label: 'Communication with others', description: 'Talking, signaling, or exchanging information during the exam', sort: 4 },
  { code: 'impersonation', label: 'Impersonation', description: 'Someone else sitting the exam on behalf of the candidate', sort: 5 },
  { code: 'leaving_unauthorized', label: 'Leaving without permission', description: 'Leaving the exam room without invigilator approval', sort: 6 },
  { code: 'disturbing', label: 'Disturbing candidates', description: 'Disruptive behaviour affecting other candidates', sort: 7 },
  { code: 'other', label: 'Other', description: 'Other type of cheating — specify in the description', sort: 99 },
];

async function runSql(pool, filename) {
  const sqlPath = path.join(__dirname, '..', 'sql', filename);
  console.log('Running:', sqlPath);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('  (column already exists, skipped)');
      } else {
        throw err;
      }
    }
  }
}

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  await runSql(pool, '006_supervisor_photo.sql');
  console.log('Supervisor photo columns ready.');

  await runSql(pool, '007_exam_cheating.sql');
  console.log('Exam cheating tables ready.');

  for (const t of CHEATING_TYPES) {
    await pool.query(
      `INSERT IGNORE INTO exam_cheating_types (code, label, description, sort_order, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [t.code, t.label, t.description, t.sort]
    );
  }
  console.log('Cheating types seeded.');

  const uploadsDir = path.join(__dirname, '..', 'uploads', 'supervisors');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Upload directory:', uploadsDir);

  await pool.end();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
