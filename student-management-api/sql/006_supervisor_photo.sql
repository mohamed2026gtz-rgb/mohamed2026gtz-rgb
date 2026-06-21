-- Supervisor profile photo

ALTER TABLE primary_supervisors
  ADD COLUMN image_url VARCHAR(512) NULL AFTER experience_for_supervision;

ALTER TABLE secondary_supervisors
  ADD COLUMN image_url VARCHAR(512) NULL AFTER experience_for_supervision;
