const express = require('express');
const multer = require('multer');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const authService = require('../services/authService');
const studentAuthService = require('../services/studentAuthService');
const { getSupervisorAssignment } = require('../services/supervisorScopeService');
const {
  getCenterSummary,
  getCenterSchools,
  getCenterStudents,
  findCenterStudent,
} = require('../services/examCenterScope');
const { getCenterAttendanceStats } = require('../services/attendanceStatsService');
const { paginate, pagedResult } = require('../utils/pagination');
const { toStudentDto } = require('../utils/mappers');
const { isExamSupervisor } = require('../utils/auth');
const {
  resolveImageFile,
  photoContentType,
  hasStudentPicture,
} = require('../utils/imagePath');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again later.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      cb(new Error('Selfie must be an image file'));
      return;
    }
    cb(null, true);
  },
});

router.post(
  '/login',
  authLimiter,
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const result = await authService.login(req.body.username, req.body.password);
      if (!result) {
        return res.status(401).json({ message: 'Invalid username or password.' });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/change-password',
  authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Current and new password are required (min 6 chars)' });
      }

      const result = await authService.changePassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
      );
      if (!result.ok) {
        return res.status(result.status).json({ message: result.message });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/student-face-login', authLimiter, upload.single('selfie'), async (req, res, next) => {
  try {
    const studentNo = String(req.body.studentNo || req.body.uniqueId || '').trim();
    if (!studentNo) {
      return res.status(400).json({ message: 'Student unique ID or student number is required' });
    }
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: 'Selfie photo is required for face verification' });
    }

    const result = await studentAuthService.loginWithFaceVerification(
      studentNo,
      req.file.buffer
    );

    if (!result.ok) {
      return res.status(result.status).json({
        message: result.message,
        verification: result.verification,
      });
    }

    res.json({
      token: result.token,
      expiresAt: result.expiresAt,
      user: result.user,
      verification: result.verification,
      message: result.message,
    });
  } catch (err) {
    next(err);
    }
});

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ message: 'User not found' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.get('/my-supervisor-assignment', authenticate, async (req, res, next) => {
  try {
    const { findSupervisorAssignmentForUser } = require('../services/supervisorScopeService');
    const assignment = await findSupervisorAssignmentForUser(req.user);
    if (!assignment) {
      return res.status(404).json({
        message: 'No exam center assigned yet. Contact administration.',
      });
    }
    res.json(assignment);
  } catch (err) {
    next(err);
  }
});

router.get('/my-center/summary', authenticate, async (req, res, next) => {
  try {
    const assignment = await getSupervisorAssignment(req.user);
    if (!assignment) {
      return res.status(404).json({ message: 'No exam center assignment found' });
    }
    const summary = await getCenterSummary(assignment.level, assignment.centerId);
    if (!summary) return res.status(404).json({ message: 'Exam center not found' });
    res.json({
      id: summary.centerId,
      centerName: summary.centerName,
      region: summary.region,
      district: summary.district,
      academicYear: summary.academicYear,
      level: summary.level === 'primary' ? 'Primary' : 'Secondary',
      schoolCount: summary.schoolCount,
      studentCount: summary.studentCount,
      assignment,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/my-center/schools', authenticate, async (req, res, next) => {
  try {
    const assignment = await getSupervisorAssignment(req.user);
    if (!assignment) {
      return res.status(404).json({ message: 'No exam center assignment found' });
    }
    const result = await getCenterSchools(assignment.level, assignment.centerId, req.query.search);
    if (!result) return res.status(404).json({ message: 'Exam center not found' });
    res.json(result.schools);
  } catch (err) {
    next(err);
  }
});

router.get('/my-center/students/lookup', authenticate, async (req, res, next) => {
  try {
    const assignment = await getSupervisorAssignment(req.user);
    if (!assignment) {
      return res.status(404).json({ message: 'No exam center assignment found' });
    }
    const query = String(req.query.q || req.query.query || req.query.studentNo || '').trim();
    if (!query) {
      return res.status(400).json({ message: 'Search term is required (unique ID or student number)' });
    }

    const found = await findCenterStudent(assignment.level, assignment.centerId, query);
    if (!found) {
      return res.status(404).json({
        message: 'Student not found in your assigned exam center',
      });
    }

    res.json({
      ...toStudentDto(found.row),
      examCenterName: assignment.centerName,
      examCenterLevel: assignment.level === 'primary' ? 'Primary' : 'Secondary',
      academicYear: assignment.academicYear,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/my-center/students/:studentNo/photo', authenticate, async (req, res, next) => {
  try {
    const assignment = await getSupervisorAssignment(req.user);
    if (!assignment) {
      return res.status(404).json({ message: 'No exam center assignment found' });
    }

    const found = await findCenterStudent(
      assignment.level,
      assignment.centerId,
      req.params.studentNo
    );
    if (!found) {
      return res.status(404).json({ message: 'Student not found in your assigned exam center' });
    }

    const student = found.row;
    if (!hasStudentPicture(student)) {
      return res.status(404).json({ message: 'Student has no picture on record' });
    }

    const filePath = resolveImageFile(student.image_url);
    if (!filePath) {
      return res.status(404).json({
        message: 'Picture file not reachable from API server (check network share)',
      });
    }

    res.setHeader('Content-Type', photoContentType(filePath));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ message: 'Cannot read student picture file' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

router.get('/my-center/attendance/stats', authenticate, async (req, res, next) => {
  try {
    const assignment = await getSupervisorAssignment(req.user);
    if (!assignment) {
      return res.status(404).json({ message: 'No exam center assignment found' });
    }
    const stats = await getCenterAttendanceStats(assignment.level, assignment.centerId);
    if (!stats) return res.status(404).json({ message: 'Exam center not found' });
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/my-center/students', authenticate, async (req, res, next) => {
  try {
    const assignment = await getSupervisorAssignment(req.user);
    if (!assignment) {
      return res.status(404).json({ message: 'No exam center assignment found' });
    }
    const { page, pageSize, offset } = paginate(req.query.page, req.query.pageSize);
    const result = await getCenterStudents(assignment.level, assignment.centerId, {
      page,
      pageSize,
      offset,
      search: req.query.search,
      schoolId: req.query.schoolId ? Number(req.query.schoolId) : undefined,
    });
    if (!result) return res.status(404).json({ message: 'Exam center not found' });
    res.json(
      pagedResult(result.rows.map(toStudentDto), result.totalCount, page, pageSize)
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
