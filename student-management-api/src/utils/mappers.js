const { hasStudentPicture } = require('./imagePath');

function studentPhotoUrl(uniqueId, row) {
  if (!hasStudentPicture(row)) return null;
  return `/api/students/${encodeURIComponent(uniqueId)}/photo`;
}

function toStudentDto(row) {
  const uniqueId = row.unique_id;
  const hasPicture = hasStudentPicture(row);
  return {
    auto: Number(row.id),
    studentNo: uniqueId,
    registrationNo: row.student_no ? String(row.student_no).trim() : null,
    firstName: null,
    secondName: null,
    thirdName: null,
    forthName: null,
    fullName: row.student_name,
    sex: row.sex,
    yearOfBirth: row.date_of_birth
      ? new Date(row.date_of_birth).toISOString().slice(0, 10)
      : null,
    studentTell: row.telephone,
    studentAddress: row.location,
    schoolId: Number(row.school_id),
    classId: row.class_id,
    section: null,
    uniqueIds: uniqueId,
    disability: null,
    status: row.status,
    level: row.level || null,
    schoolLevel: row.joined_school_level || null,
    schoolName: row.joined_school_name || row.school_name || null,
    region: row.joined_region || row.region || null,
    examCenterName: row.joined_exam_center_name || row.exam_center_name || null,
    hasPicture,
    photoUrl: hasPicture ? studentPhotoUrl(uniqueId, row) : null,
  };
}

function toChangeHistoryDto(row) {
  return {
    year: row.created_at
      ? new Date(row.created_at).toISOString().slice(0, 10)
      : '',
    class: row.field_name,
    section: row.change_type,
    term1Total: row.old_value,
    term2Total: row.new_value,
    status: row.notes,
  };
}

module.exports = { toStudentDto, toChangeHistoryDto };
