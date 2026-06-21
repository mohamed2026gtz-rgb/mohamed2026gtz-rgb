-- Supervisor home region (where the supervisor comes from)
ALTER TABLE primary_supervisors
  ADD COLUMN region VARCHAR(191) NULL AFTER residency;

ALTER TABLE secondary_supervisors
  ADD COLUMN region VARCHAR(191) NULL AFTER residency;

CREATE INDEX idx_primary_supervisors_region ON primary_supervisors (region);
CREATE INDEX idx_secondary_supervisors_region ON secondary_supervisors (region);