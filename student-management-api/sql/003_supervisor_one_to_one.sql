-- Enforce one supervisor ↔ one exam center per academic year (active assignments)
-- Run after 001_supervisors.sql

DELETE a FROM primary_supervisor_center_assignments a
INNER JOIN primary_supervisor_center_assignments b
  ON a.primary_supervisor_id = b.primary_supervisor_id
  AND a.academic_year = b.academic_year
  AND a.deleted_at IS NULL AND b.deleted_at IS NULL
  AND a.id < b.id;

DELETE a FROM primary_supervisor_center_assignments a
INNER JOIN primary_supervisor_center_assignments b
  ON a.primary_exam_center_id = b.primary_exam_center_id
  AND a.academic_year = b.academic_year
  AND a.deleted_at IS NULL AND b.deleted_at IS NULL
  AND a.id < b.id;

DELETE a FROM secondary_supervisor_center_assignments a
INNER JOIN secondary_supervisor_center_assignments b
  ON a.secondary_supervisor_id = b.secondary_supervisor_id
  AND a.academic_year = b.academic_year
  AND a.deleted_at IS NULL AND b.deleted_at IS NULL
  AND a.id < b.id;

DELETE a FROM secondary_supervisor_center_assignments a
INNER JOIN secondary_supervisor_center_assignments b
  ON a.exam_center_id = b.exam_center_id
  AND a.academic_year = b.academic_year
  AND a.deleted_at IS NULL AND b.deleted_at IS NULL
  AND a.id < b.id;

DELETE FROM primary_supervisor_center_assignments WHERE deleted_at IS NOT NULL;
DELETE FROM secondary_supervisor_center_assignments WHERE deleted_at IS NOT NULL;

ALTER TABLE primary_supervisor_center_assignments
  ADD UNIQUE KEY unique_psca_supervisor_year (primary_supervisor_id, academic_year),
  ADD UNIQUE KEY unique_psca_center_year (primary_exam_center_id, academic_year);

ALTER TABLE primary_supervisor_center_assignments
  DROP INDEX unique_primary_supervisor_center;

ALTER TABLE secondary_supervisor_center_assignments
  ADD UNIQUE KEY unique_ssca_supervisor_year (secondary_supervisor_id, academic_year),
  ADD UNIQUE KEY unique_ssca_center_year (exam_center_id, academic_year);

ALTER TABLE secondary_supervisor_center_assignments
  DROP INDEX unique_secondary_supervisor_center;
