-- Exam / subject attendance recorded from mobile
CREATE TABLE IF NOT EXISTS student_exam_attendance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_unique_id VARCHAR(191) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
  notes TEXT NULL,
  recorded_by VARCHAR(191) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_student_subject_date (student_unique_id, subject, attendance_date),
  KEY sea_attendance_date_index (attendance_date),
  KEY sea_student_index (student_unique_id),
  KEY sea_subject_date_index (subject, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
