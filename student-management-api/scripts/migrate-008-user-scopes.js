require('dotenv').config();
const mysql = require('mysql2/promise');

const sql = "CREATE TABLE IF NOT EXISTS user_access_scopes ( id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, user_id BIGINT UNSIGNED NOT NULL, scope_type ENUM('region', 'district', 'school_level', 'school') NOT NULL, region_id BIGINT UNSIGNED NULL, district_id BIGINT UNSIGNED NULL, school_level VARCHAR(64) NULL, school_id BIGINT UNSIGNED NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), KEY idx_user_access_scopes_user (user_id) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await conn.query(sql);
  console.log('user_access_scopes table ready');
  await conn.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
