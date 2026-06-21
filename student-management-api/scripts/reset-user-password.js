/**
 * Reset a staff user's password (Laravel bcrypt compatible).
 * Usage: node scripts/reset-user-password.js admin@sneo.gov NewPassword123
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/reset-user-password.js <email> <new-password>');
  process.exit(1);
}

(async () => {
  const hash = bcrypt.hashSync(password, 10).replace(/^\$2a\$/, '$2y$');
  const [result] = await pool.query(
    'UPDATE users SET password = ?, updated_at = NOW() WHERE email = ? AND deleted_at IS NULL',
    [hash, email.trim()]
  );
  if (result.affectedRows === 0) {
    console.error(`No active user found for email: ${email}`);
    process.exit(1);
  }
  console.log(`Password updated for ${email}`);
  console.log('Use this email and the new password in the mobile app staff login.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
