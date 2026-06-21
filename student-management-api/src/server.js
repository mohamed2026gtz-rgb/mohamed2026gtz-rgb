require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ping } = require('./config/db');
const { validateEnvironment } = require('./config/validateEnv');
const { canAccessShare, SHARE_HOST, SHARE_ROOT } = require('./utils/imagePath');
const { errorHandler } = require('./middleware/errorHandler');
const { sanitizeInputs } = require('./middleware/security');
const { securityLogger } = require('./middleware/securityLogger');

validateEnvironment();

const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const schoolsRoutes = require('./routes/schools');
const teachersRoutes = require('./routes/teachers');
const dashboardRoutes = require('./routes/dashboard');
const attendanceRoutes = require('./routes/attendance');
const regionsRoutes = require('./routes/regions');
const supervisorsRoutes = require('./routes/supervisors');
const examCentersRoutes = require('./routes/examCenters');
const examScheduleRoutes = require('./routes/examSchedule');
const examCheatingRoutes = require('./routes/examCheating');
const usersRoutes = require('./routes/users');
const publicSupervisorVerifyRoutes = require('./routes/publicSupervisorVerify');

const app = express();
const PORT = Number(process.env.PORT || 5103);

// Required when API is behind ngrok / reverse proxy (X-Forwarded-For headers).
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeInputs);
app.use(securityLogger);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 500),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/', (req, res) => {
  res.json({
    name: 'Student Management API',
    version: '1.0.0',
    database: `MySQL ${process.env.DB_NAME || 'Sneo_final'}`,
    health: '/health',
    login: 'POST /api/auth/login',
    docs: 'Use /health to verify the server is running',
  });
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
});

app.get('/health/ready', async (req, res) => {
  const started = Date.now();
  try {
    await ping();
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      latencyMs: Date.now() - started,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      error: err.message,
    });
  }
});

app.get('/health', async (req, res) => {
  const wantsJson =
    req.headers.accept?.includes('application/json') || req.query.format === 'json';
  try {
    await ping();
    const payload = {
      status: 'Healthy',
      database: 'connected',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
    };
    if (wantsJson) return res.status(200).json(payload);
    res.type('text').send('Healthy');
  } catch {
    if (wantsJson) {
      return res.status(503).json({ status: 'Unhealthy', database: 'disconnected' });
    }
    res.status(503).type('text').send('Unhealthy');
  }
});

app.get('/health/share', (req, res) => {
  res.json({
    shareHost: SHARE_HOST,
    shareRoot: SHARE_ROOT,
    accessible: canAccessShare(),
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Student Management API',
    version: '1.0.0',
    database: `MySQL ${process.env.DB_NAME || 'Sneo_final'}`,
  });
});

app.use('/api/public', publicSupervisorVerifyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/supervisors', supervisorsRoutes);
app.use('/api/exam-centers', examCentersRoutes);
app.use('/api/exam-schedule', examScheduleRoutes);
app.use('/api/exam-cheating', examCheatingRoutes);
app.use('/api/users', usersRoutes);

app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Student Management API listening on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Stop the other API process first, or run: .\\run.ps1`
    );
  } else {
    console.error('Server failed to start:', err.message);
  }
  process.exit(1);
});
