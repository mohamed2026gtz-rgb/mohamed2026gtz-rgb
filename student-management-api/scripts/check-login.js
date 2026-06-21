require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../src/config/db');
const { verifyLaravelBcrypt } = require('../src/utils/auth');
const { resolveImageFile, canAccessShare } = require('../src/utils/imagePath');

(async () => {
  const [users] = await pool.query(
    'SELECT id, email, status FROM users WHERE deleted_at IS NULL LIMIT 5'
  );
  console.log('Users:', users.map((u) => u.email).join(', '));

  const testEmail = process.env.TEST_EMAIL?.trim();
  const testPassword = process.env.TEST_PASSWORD?.trim();
  if (testEmail && testPassword) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [testEmail]
    );
    if (!rows.length) {
      console.log(`Login test ${testEmail}: user not found`);
    } else {
      const ok = verifyLaravelBcrypt(testPassword, rows[0].password);
      console.log(`Login test ${testEmail}: ${ok ? 'PASSWORD OK' : 'wrong password'}`);
    }
  } else {
    console.log('Set TEST_EMAIL and TEST_PASSWORD in .env to run a login check (never commit real passwords).');
  }

  console.log('Share reachable:', canAccessShare());
  const [students] = await pool.query(
    `SELECT unique_id, image_url FROM students_management
     WHERE deleted_at IS NULL AND image_url IS NOT NULL AND image_url != '' LIMIT 3`
  );
  for (const s of students) {
    console.log(
      `Student ${s.unique_id}: photo=${resolveImageFile(s.image_url) ? 'OK' : 'MISSING'}`
    );
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
