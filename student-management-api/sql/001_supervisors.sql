-- Primary & Secondary Supervisors + Exam Center Assignments
-- Database: NEWSCHEMA

CREATE TABLE IF NOT EXISTS primary_supervisors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(191) NOT NULL,
  sex VARCHAR(20) NULL,
  mobile VARCHAR(50) NULL,
  year_of_birth DATE NULL,
  residency VARCHAR(191) NULL,
  email VARCHAR(191) NULL,
  current_institution VARCHAR(191) NULL,
  title VARCHAR(191) NULL,
  experience_for_supervision TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY primary_supervisors_name_index (name),
  KEY primary_supervisors_email_index (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS secondary_supervisors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(191) NOT NULL,
  sex VARCHAR(20) NULL,
  mobile VARCHAR(50) NULL,
  year_of_birth DATE NULL,
  residency VARCHAR(191) NULL,
  email VARCHAR(191) NULL,
  current_institution VARCHAR(191) NULL,
  title VARCHAR(191) NULL,
  experience_for_supervision TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY secondary_supervisors_name_index (name),
  KEY secondary_supervisors_email_index (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Primary exam centers (derived from schools_management.exam_center_name)
CREATE TABLE IF NOT EXISTS primary_exam_centers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_name VARCHAR(191) NOT NULL,
  region VARCHAR(191) NULL,
  region_id BIGINT UNSIGNED NULL,
  district VARCHAR(191) NULL,
  academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  school_count INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_primary_exam_center (center_name, region, academic_year),
  KEY primary_exam_centers_region_index (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS primary_supervisor_center_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  primary_supervisor_id BIGINT UNSIGNED NOT NULL,
  primary_exam_center_id BIGINT UNSIGNED NOT NULL,
  academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  assigned_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_psca_supervisor_year (primary_supervisor_id, academic_year),
  UNIQUE KEY unique_psca_center_year (primary_exam_center_id, academic_year),
  KEY psca_center_index (primary_exam_center_id),
  CONSTRAINT psca_supervisor_fk FOREIGN KEY (primary_supervisor_id) REFERENCES primary_supervisors (id),
  CONSTRAINT psca_center_fk FOREIGN KEY (primary_exam_center_id) REFERENCES primary_exam_centers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS secondary_supervisor_center_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  secondary_supervisor_id BIGINT UNSIGNED NOT NULL,
  exam_center_id BIGINT UNSIGNED NOT NULL,
  academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  assigned_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_ssca_supervisor_year (secondary_supervisor_id, academic_year),
  UNIQUE KEY unique_ssca_center_year (exam_center_id, academic_year),
  KEY ssca_center_index (exam_center_id),
  CONSTRAINT ssca_supervisor_fk FOREIGN KEY (secondary_supervisor_id) REFERENCES secondary_supervisors (id),
  CONSTRAINT ssca_exam_center_fk FOREIGN KEY (exam_center_id) REFERENCES exam_centers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
