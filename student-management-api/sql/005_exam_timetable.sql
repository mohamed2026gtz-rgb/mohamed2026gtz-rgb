-- Exam subject catalog and timetable (exam day + shift + subject per school level)

CREATE TABLE IF NOT EXISTS exam_subjects (
  id BIGINT NOT NULL AUTO_INCREMENT,
  school_level VARCHAR(64) NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  subject_code VARCHAR(32) NULL,
  paper_label VARCHAR(128) NULL,
  academic_year VARCHAR(32) NOT NULL DEFAULT '2025/2026',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exam_subject_level_name_year (school_level, subject_name, academic_year),
  KEY idx_exam_subjects_level_year (school_level, academic_year, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_timetable (
  id BIGINT NOT NULL AUTO_INCREMENT,
  academic_year VARCHAR(32) NOT NULL DEFAULT '2025/2026',
  school_level VARCHAR(64) NOT NULL,
  exam_date DATE NOT NULL,
  exam_shift TINYINT NOT NULL DEFAULT 1 COMMENT '1 = first exam of the day, 2 = second exam',
  subject_id BIGINT NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exam_timetable_slot (school_level, academic_year, exam_date, exam_shift),
  KEY idx_exam_timetable_date (school_level, academic_year, exam_date),
  CONSTRAINT fk_exam_timetable_subject FOREIGN KEY (subject_id)
    REFERENCES exam_subjects (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
