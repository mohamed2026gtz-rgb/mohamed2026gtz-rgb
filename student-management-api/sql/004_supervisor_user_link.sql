-- Link supervisor registry rows to login accounts (users table).
ALTER TABLE primary_supervisors
  ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER email,
  ADD INDEX idx_primary_supervisors_user (user_id);

ALTER TABLE secondary_supervisors
  ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER email,
  ADD INDEX idx_secondary_supervisors_user (user_id);
