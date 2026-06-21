-- Exam cheating incidents and flexible type catalog

CREATE TABLE IF NOT EXISTS exam_cheating_types (
  id BIGINT NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  label VARCHAR(191) NOT NULL,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cheating_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_cheating_incidents (
  id BIGINT NOT NULL AUTO_INCREMENT,
  student_unique_id VARCHAR(191) NOT NULL,
  student_name VARCHAR(255) NULL,
  school_id BIGINT NULL,
  school_name VARCHAR(255) NULL,
  region VARCHAR(191) NULL,
  school_level VARCHAR(64) NULL,
  exam_center_name VARCHAR(255) NULL,
  academic_year VARCHAR(32) NOT NULL DEFAULT '2025/2026',
  exam_date DATE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  exam_shift TINYINT NULL COMMENT '1 first exam, 2 second exam',
  cheating_type_id BIGINT NULL,
  custom_type_label VARCHAR(255) NULL,
  incident_description TEXT NOT NULL,
  evidence_notes TEXT NULL,
  invigilator_name VARCHAR(191) NULL,
  invigilator_action TEXT NULL,
  supervisor_name VARCHAR(191) NULL,
  supervisor_action TEXT NULL,
  action_taken TEXT NULL,
  severity ENUM('Minor', 'Moderate', 'Serious', 'Severe') NOT NULL DEFAULT 'Moderate',
  status ENUM('Reported', 'Under investigation', 'Action taken', 'Closed') NOT NULL DEFAULT 'Reported',
  follow_up_notes TEXT NULL,
  recorded_by VARCHAR(191) NULL,
  recorded_by_name VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_cheating_student (student_unique_id),
  KEY idx_cheating_date (exam_date, subject),
  KEY idx_cheating_region (region, school_level),
  CONSTRAINT fk_cheating_type FOREIGN KEY (cheating_type_id)
    REFERENCES exam_cheating_types (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
