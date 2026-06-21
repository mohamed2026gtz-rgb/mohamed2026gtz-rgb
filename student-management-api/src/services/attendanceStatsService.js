const { pool } = require('../config/db');
const {
  getCenterContext,
  getCenterSummary,
  primarySchoolFilter,
  secondarySchoolFilter,
} = require('./examCenterScope');
const {
  getAllowedSchoolAccess,
  schoolFilterClause,
} = require('./userSchoolAccess');

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function isPresentStatus(status) {
  return status === 'Present' || status === 'Late' || status === 'Excused';
}

function summarizeRows(rows) {
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;
  for (const row of rows) {
    const c = Number(row.c || row.count || 0);
    if (row.status === 'Present') presentCount += c;
    else if (row.status === 'Absent') absentCount += c;
    else if (row.status === 'Late') lateCount += c;
    else if (row.status === 'Excused') excusedCount += c;
  }
  const totalRecords = presentCount + absentCount + lateCount + excusedCount;
  const attendedCount = presentCount + lateCount + excusedCount;
  return {
    totalRecords,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    attendedCount,
    attendancePercent: pct(attendedCount, totalRecords),
  };
}

async function buildCenterStudentJoin(level, centerId) {
  const ctx = await getCenterContext(level, centerId);
  if (!ctx) return null;

  if (ctx.level === 'primary') {
    const filter = primarySchoolFilter(ctx, 'sch');
    return {
      ctx,
      joinSql: `INNER JOIN students_management st ON ea.student_unique_id = st.unique_id AND st.deleted_at IS NULL
        INNER JOIN schools_management sch ON st.school_id = sch.school_id
        WHERE ${filter.sql}`,
      params: [...filter.params],
    };
  }

  const filter = secondarySchoolFilter(ctx);
  return {
    ctx,
    joinSql: `INNER JOIN students_management st ON ea.student_unique_id = st.unique_id AND st.deleted_at IS NULL
      INNER JOIN schools_management sch ON st.school_id = sch.school_id
      INNER JOIN exam_centers ec ON ec.school_id = sch.school_id AND ec.deleted_at IS NULL
      WHERE ${filter.sql}`,
    params: [...filter.params],
  };
}

async function getCenterAttendanceStats(level, centerId) {
  const scope = await buildCenterStudentJoin(level, centerId);
  if (!scope) return null;

  const { ctx, joinSql, params } = scope;
  const summary = await getCenterSummary(level, centerId);
  const totalStudentsInCenter = summary?.studentCount ?? 0;

  const [[distinctStudents]] = await pool.query(
    `SELECT COUNT(DISTINCT ea.student_unique_id) AS c
     FROM student_exam_attendance ea ${joinSql}`,
    params
  );

  const [[distinctDays]] = await pool.query(
    `SELECT COUNT(DISTINCT ea.attendance_date) AS c
     FROM student_exam_attendance ea ${joinSql}`,
    params
  );

  const [[distinctSubjects]] = await pool.query(
    `SELECT COUNT(DISTINCT ea.subject) AS c
     FROM student_exam_attendance ea ${joinSql}`,
    params
  );

  const [statusRows] = await pool.query(
    `SELECT ea.status, COUNT(*) AS c
     FROM student_exam_attendance ea ${joinSql}
     GROUP BY ea.status`,
    params
  );

  const statusSummary = summarizeRows(statusRows);

  const [byExamDay] = await pool.query(
    `SELECT ea.attendance_date AS examDate,
            COUNT(*) AS totalRecords,
            COUNT(DISTINCT ea.student_unique_id) AS students,
            COUNT(DISTINCT ea.subject) AS subjects,
            SUM(CASE WHEN ea.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) AS attendedCount,
            SUM(CASE WHEN ea.status = 'Absent' THEN 1 ELSE 0 END) AS absentCount
     FROM student_exam_attendance ea ${joinSql}
     GROUP BY ea.attendance_date
     ORDER BY ea.attendance_date DESC`,
    params
  );

  const [bySubject] = await pool.query(
    `SELECT ea.subject,
            ea.attendance_date AS examDate,
            COUNT(*) AS totalRecords,
            COUNT(DISTINCT ea.student_unique_id) AS students,
            SUM(CASE WHEN ea.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) AS attendedCount,
            SUM(CASE WHEN ea.status = 'Absent' THEN 1 ELSE 0 END) AS absentCount
     FROM student_exam_attendance ea ${joinSql}
     GROUP BY ea.subject, ea.attendance_date
     ORDER BY ea.attendance_date DESC, ea.subject`,
    params
  );

  const studentsWithRecords = Number(distinctStudents.c);
  const examDaysRecorded = Number(distinctDays.c);
  const subjectsRecorded = Number(distinctSubjects.c);

  return {
    centerName: ctx.centerName,
    region: ctx.region,
    level: ctx.level === 'primary' ? 'Primary' : 'Secondary',
    academicYear: ctx.academicYear,
    summary: {
      totalStudentsInCenter,
      studentsWithRecords,
      examDaysRecorded,
      subjectsRecorded,
      ...statusSummary,
      coveragePercent: pct(studentsWithRecords, totalStudentsInCenter),
    },
    byExamDay: byExamDay.map((row) => ({
      examDate:
        row.examDate instanceof Date
          ? row.examDate.toISOString().slice(0, 10)
          : String(row.examDate).slice(0, 10),
      totalRecords: Number(row.totalRecords),
      students: Number(row.students),
      subjects: Number(row.subjects),
      attendedCount: Number(row.attendedCount),
      absentCount: Number(row.absentCount),
      attendancePercent: pct(Number(row.attendedCount), Number(row.totalRecords)),
    })),
    bySubject: bySubject.map((row) => ({
      subject: row.subject,
      examDate:
        row.examDate instanceof Date
          ? row.examDate.toISOString().slice(0, 10)
          : String(row.examDate).slice(0, 10),
      totalRecords: Number(row.totalRecords),
      students: Number(row.students),
      attendedCount: Number(row.attendedCount),
      absentCount: Number(row.absentCount),
      attendancePercent: pct(Number(row.attendedCount), Number(row.totalRecords)),
    })),
  };
}

async function applyAdminScope(joinSql, params, user, schoolId) {
  const allowed = await getAllowedSchoolAccess(user);
  const filter = schoolFilterClause(allowed, 'sch');
  let sql = joinSql + filter.sql;
  const nextParams = [...params, ...filter.params];
  if (schoolId) {
    sql += ' AND st.school_id = ?';
    nextParams.push(Number(schoolId));
  }
  return { joinSql: sql, params: nextParams };
}

async function getAdminAttendanceStats(user, schoolId) {
  const baseJoin = `INNER JOIN students_management st ON ea.student_unique_id = st.unique_id AND st.deleted_at IS NULL
    INNER JOIN schools_management sch ON st.school_id = sch.school_id
    WHERE 1=1`;
  const { joinSql, params } = await applyAdminScope(baseJoin, [], user, schoolId);

  const studentFilter = await applyAdminScope(
    'FROM students_management st INNER JOIN schools_management sch ON st.school_id = sch.school_id WHERE st.deleted_at IS NULL',
    [],
    user,
    schoolId
  );

  const [[{ totalStudents }]] = await pool.query(
    `SELECT COUNT(*) AS totalStudents ${studentFilter.joinSql}`,
    studentFilter.params
  );

  const [[distinctStudents]] = await pool.query(
    `SELECT COUNT(DISTINCT ea.student_unique_id) AS c
     FROM student_exam_attendance ea ${joinSql}`,
    params
  );

  const [[distinctDays]] = await pool.query(
    `SELECT COUNT(DISTINCT ea.attendance_date) AS c
     FROM student_exam_attendance ea ${joinSql}`,
    params
  );

  const [[distinctSubjects]] = await pool.query(
    `SELECT COUNT(DISTINCT ea.subject) AS c
     FROM student_exam_attendance ea ${joinSql}`,
    params
  );

  const [statusRows] = await pool.query(
    `SELECT ea.status, COUNT(*) AS c
     FROM student_exam_attendance ea ${joinSql}
     GROUP BY ea.status`,
    params
  );

  const statusSummary = summarizeRows(statusRows);
  const studentsWithRecords = Number(distinctStudents.c);

  const [byRegionAttendance] = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(sch.region), ''), 'Unspecified') AS region,
            COUNT(DISTINCT ea.student_unique_id) AS studentsWithRecords,
            COUNT(*) AS totalRecords,
            SUM(CASE WHEN ea.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) AS attendedCount,
            SUM(CASE WHEN ea.status = 'Absent' THEN 1 ELSE 0 END) AS absentCount
     FROM student_exam_attendance ea ${joinSql}
     GROUP BY COALESCE(NULLIF(TRIM(sch.region), ''), 'Unspecified')
     ORDER BY totalRecords DESC`,
    params
  );

  const [byRegionStudents] = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(sch.region), ''), 'Unspecified') AS region,
            COUNT(*) AS totalStudents
     ${studentFilter.joinSql}
     GROUP BY COALESCE(NULLIF(TRIM(sch.region), ''), 'Unspecified')`,
    studentFilter.params
  );

  const regionStudentMap = new Map(
    byRegionStudents.map((row) => [row.region, Number(row.totalStudents)])
  );

  const [byLevelAttendance] = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(sch.school_level), ''), 'Unspecified') AS level,
            COUNT(DISTINCT ea.student_unique_id) AS studentsWithRecords,
            COUNT(*) AS totalRecords,
            SUM(CASE WHEN ea.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) AS attendedCount,
            SUM(CASE WHEN ea.status = 'Absent' THEN 1 ELSE 0 END) AS absentCount
     FROM student_exam_attendance ea ${joinSql}
     GROUP BY COALESCE(NULLIF(TRIM(sch.school_level), ''), 'Unspecified')
     ORDER BY totalRecords DESC`,
    params
  );

  const [byLevelStudents] = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(sch.school_level), ''), 'Unspecified') AS level,
            COUNT(*) AS totalStudents
     ${studentFilter.joinSql}
     GROUP BY COALESCE(NULLIF(TRIM(sch.school_level), ''), 'Unspecified')`,
    studentFilter.params
  );

  const levelStudentMap = new Map(
    byLevelStudents.map((row) => [row.level, Number(row.totalStudents)])
  );

  const [byExamDay] = await pool.query(
    `SELECT ea.attendance_date AS examDate,
            COUNT(*) AS totalRecords,
            COUNT(DISTINCT ea.student_unique_id) AS students,
            COUNT(DISTINCT ea.subject) AS subjects,
            SUM(CASE WHEN ea.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) AS attendedCount,
            SUM(CASE WHEN ea.status = 'Absent' THEN 1 ELSE 0 END) AS absentCount
     FROM student_exam_attendance ea ${joinSql}
     GROUP BY ea.attendance_date
     ORDER BY ea.attendance_date DESC`,
    params
  );

  const allowed = await getAllowedSchoolAccess(user);
  const scopeFilter = schoolFilterClause(allowed, 'sch');
  let centerScopeSql = scopeFilter.sql;
  const centerScopeParams = [...scopeFilter.params];
  if (schoolId) {
    centerScopeSql += ' AND sch.school_id = ?';
    centerScopeParams.push(Number(schoolId));
  }

  const [bySupervisorCenter] = await pool.query(
    `SELECT 'Primary' AS level,
            COALESCE(NULLIF(TRIM(pec.center_name), ''), NULLIF(TRIM(sch.exam_center_name), ''), 'Unknown center') AS centerName,
            pec.region,
            ps.name AS supervisorName,
            COUNT(DISTINCT ea.student_unique_id) AS studentsWithRecords,
            COUNT(*) AS totalRecords,
            SUM(CASE WHEN ea.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) AS attendedCount,
            SUM(CASE WHEN ea.status = 'Absent' THEN 1 ELSE 0 END) AS absentCount
     FROM student_exam_attendance ea
     INNER JOIN students_management st ON ea.student_unique_id = st.unique_id AND st.deleted_at IS NULL
     INNER JOIN schools_management sch ON st.school_id = sch.school_id
     LEFT JOIN primary_exam_centers pec ON TRIM(sch.exam_center_name) = TRIM(pec.center_name)
       AND (pec.region IS NULL OR sch.region = pec.region)
     LEFT JOIN primary_supervisor_center_assignments pa ON pa.primary_exam_center_id = pec.id AND pa.deleted_at IS NULL
     LEFT JOIN primary_supervisors ps ON pa.primary_supervisor_id = ps.id AND ps.deleted_at IS NULL
     WHERE sch.school_level = 'Primary'${centerScopeSql}
     GROUP BY centerName, pec.region, ps.name
     HAVING totalRecords > 0

     UNION ALL

     SELECT 'Secondary' AS level,
            COALESCE(NULLIF(TRIM(ec.center_name), ''), 'Unknown center') AS centerName,
            sch.region,
            ss.name AS supervisorName,
            COUNT(DISTINCT ea.student_unique_id) AS studentsWithRecords,
            COUNT(*) AS totalRecords,
            SUM(CASE WHEN ea.status IN ('Present','Late','Excused') THEN 1 ELSE 0 END) AS attendedCount,
            SUM(CASE WHEN ea.status = 'Absent' THEN 1 ELSE 0 END) AS absentCount
     FROM student_exam_attendance ea
     INNER JOIN students_management st ON ea.student_unique_id = st.unique_id AND st.deleted_at IS NULL
     INNER JOIN schools_management sch ON st.school_id = sch.school_id
     INNER JOIN exam_centers ec ON ec.school_id = sch.school_id AND ec.deleted_at IS NULL
     LEFT JOIN secondary_supervisor_center_assignments sa ON sa.exam_center_id = ec.id AND sa.deleted_at IS NULL
     LEFT JOIN secondary_supervisors ss ON sa.secondary_supervisor_id = ss.id AND ss.deleted_at IS NULL
     WHERE sch.school_level IN ('Secondary', 'Technical TVET')${centerScopeSql}
     GROUP BY centerName, sch.region, ss.name
     HAVING totalRecords > 0
     ORDER BY totalRecords DESC
     LIMIT 50`,
    [...centerScopeParams, ...centerScopeParams]
  );

  return {
    summary: {
      totalStudents: Number(totalStudents),
      studentsWithRecords,
      examDaysRecorded: Number(distinctDays.c),
      subjectsRecorded: Number(distinctSubjects.c),
      ...statusSummary,
      coveragePercent: pct(studentsWithRecords, Number(totalStudents)),
    },
    byRegion: byRegionAttendance.map((row) => {
      const totalStudents = regionStudentMap.get(row.region) || 0;
      return {
        region: row.region,
        totalStudents,
        studentsWithRecords: Number(row.studentsWithRecords),
        totalRecords: Number(row.totalRecords),
        attendedCount: Number(row.attendedCount),
        absentCount: Number(row.absentCount),
        attendancePercent: pct(Number(row.attendedCount), Number(row.totalRecords)),
        coveragePercent: pct(Number(row.studentsWithRecords), totalStudents),
      };
    }),
    byLevel: byLevelAttendance.map((row) => {
      const totalStudents = levelStudentMap.get(row.level) || 0;
      return {
        level: row.level,
        totalStudents,
        studentsWithRecords: Number(row.studentsWithRecords),
        totalRecords: Number(row.totalRecords),
        attendedCount: Number(row.attendedCount),
        absentCount: Number(row.absentCount),
        attendancePercent: pct(Number(row.attendedCount), Number(row.totalRecords)),
        coveragePercent: pct(Number(row.studentsWithRecords), totalStudents),
      };
    }),
    byExamDay: byExamDay.map((row) => ({
      examDate:
        row.examDate instanceof Date
          ? row.examDate.toISOString().slice(0, 10)
          : String(row.examDate).slice(0, 10),
      totalRecords: Number(row.totalRecords),
      students: Number(row.students),
      subjects: Number(row.subjects),
      attendedCount: Number(row.attendedCount),
      absentCount: Number(row.absentCount),
      attendancePercent: pct(Number(row.attendedCount), Number(row.totalRecords)),
    })),
    bySupervisorCenter: bySupervisorCenter.map((row) => ({
      level: row.level,
      centerName: row.centerName || 'Unknown center',
      region: row.region || null,
      supervisorName: row.supervisorName || 'Unassigned',
      studentsWithRecords: Number(row.studentsWithRecords),
      totalRecords: Number(row.totalRecords),
      attendedCount: Number(row.attendedCount),
      absentCount: Number(row.absentCount),
      attendancePercent: pct(Number(row.attendedCount), Number(row.totalRecords)),
    })),
  };
}

module.exports = {
  getCenterAttendanceStats,
  getAdminAttendanceStats,
  isPresentStatus,
};
