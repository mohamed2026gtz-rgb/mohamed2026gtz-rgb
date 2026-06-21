require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DEFAULT_YEAR = '2025/2026';

const SUBJECT_SEEDS = {
  Primary: [
    'Mathematics',
    'English',
    'Somali',
    'Science',
    'Social Studies',
    'Islamic Studies',
    'Technology',
  ],
  ABE: [
    'Mathematics',
    'English',
    'Somali',
    'Science',
    'Social Studies',
    'Islamic Studies',
    'Life Skills',
  ],
  Secondary: [
    'Mathematics',
    'English',
    'Somali',
    'Biology',
    'Chemistry',
    'Physics',
    'Geography',
    'History',
    'Islamic Studies',
    'Arabic',
    'Agriculture',
    'Business Studies',
  ],
  'Technical TVET': [
    'Mathematics',
    'English',
    'Somali',
    'Technical Drawing',
    'Workshop Practice',
    'Trade Theory',
    'Entrepreneurship',
    'ICT',
  ],
};

async function seedSubjects(pool) {
  for (const [level, names] of Object.entries(SUBJECT_SEEDS)) {
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      await pool.query(
        `INSERT IGNORE INTO exam_subjects
         (school_level, subject_name, academic_year, sort_order, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [level, name, DEFAULT_YEAR, i + 1]
      );
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

  const sqlPath = path.join(__dirname, '..', 'sql', '005_exam_timetable.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Running migration:', sqlPath);
  await pool.query(sql);
  console.log('exam_subjects and exam_timetable tables ready.');

  await seedSubjects(pool);
  console.log('Default exam subjects seeded (Primary, ABE, Secondary, Technical TVET).');

  const [[subjects]] = await pool.query('SELECT COUNT(*) AS c FROM exam_subjects');
  const [[timetable]] = await pool.query('SELECT COUNT(*) AS c FROM exam_timetable');
  console.log('exam_subjects rows:', subjects.c);
  console.log('exam_timetable rows:', timetable.c);

  await pool.end();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
