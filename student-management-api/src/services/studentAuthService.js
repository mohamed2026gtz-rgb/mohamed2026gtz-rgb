const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { toStudentDto } = require('../utils/mappers');
const { hasStudentPicture, resolveImageFile } = require('../utils/imagePath');
const { compareFaces } = require('./faceVerifyService');

async function findStudentByLoginId(studentNo) {
  const term = String(studentNo || '').trim();
  if (!term) return null;

  const [rows] = await pool.query(
    `SELECT * FROM students_management
     WHERE deleted_at IS NULL
       AND (unique_id = ? OR student_no = ?)
     LIMIT 1`,
    [term, term]
  );
  return rows.length ? rows[0] : null;
}

function signStudentToken(student, profile) {
  const expiresMinutes = Number(process.env.JWT_EXPIRE_MINUTES || 60);
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  const studentNo = student.unique_id;

  const payload = {
    sub: `student:${studentNo}`,
    name: studentNo,
    fullName: student.student_name,
    studentNo,
    schoolId: student.school_id ? String(student.school_id) : undefined,
    roles: ['student'],
    authType: 'student-face',
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    expiresIn: `${expiresMinutes}m`,
  });

  return { token, expiresAt: expiresAt.toISOString(), user: profile };
}

async function buildStudentProfile(student) {
  const dto = toStudentDto(student);
  return {
    id: `student:${dto.studentNo}`,
    fullName: dto.fullName,
    email: undefined,
    userName: dto.studentNo,
    studentNo: dto.studentNo,
    registrationNo: dto.registrationNo,
    schoolId: dto.schoolId,
    schoolName: dto.schoolName,
    regionId: student.region_id ? Number(student.region_id) : null,
    districtId: null,
    roles: ['student'],
    hasPicture: dto.hasPicture,
    photoUrl: dto.photoUrl,
  };
}

async function loginWithFaceVerification(studentNo, selfieBuffer) {
  const student = await findStudentByLoginId(studentNo);
  if (!student) {
    return { ok: false, status: 404, message: 'Student not found for this ID' };
  }

  if (!hasStudentPicture(student)) {
    return {
      ok: false,
      status: 400,
      message: 'This student has no saved photo on record for face verification',
    };
  }

  const referencePath = resolveImageFile(student.image_url);
  if (!referencePath) {
    return {
      ok: false,
      status: 503,
      message:
        'Saved photo exists in database but file is not reachable from API server (check network share)',
    };
  }

  const verification = await compareFaces(referencePath, selfieBuffer);
  if (!verification.matched) {
    return {
      ok: false,
      status: 401,
      message: verification.reason || 'Face verification failed',
      verification,
    };
  }

  const profile = await buildStudentProfile(student);
  const session = signStudentToken(student, profile);

  return {
    ok: true,
    status: 200,
    ...session,
    verification: {
      matched: true,
      distance: verification.distance,
      threshold: verification.threshold,
    },
    message: 'Face verified — student login successful',
  };
}

async function getStudentProfileBySub(userSub) {
  const studentNo = String(userSub).replace(/^student:/, '');
  const student = await findStudentByLoginId(studentNo);
  if (!student) return null;
  return buildStudentProfile(student);
}

module.exports = { loginWithFaceVerification, getStudentProfileBySub, findStudentByLoginId };
