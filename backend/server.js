import dotenv from 'dotenv';
dotenv.config(); // MUST be first

console.log('🔥 server.js loaded');
console.log('🔥 NODE_ENV:', process.env.NODE_ENV);
console.log('🔥 PORT:', process.env.PORT);

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import fs from 'fs-extra';
import multer from 'multer';

/**
 * Express Server
 * Main entry point for the API
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// APP_BASE_URL: Use environment variable or fallback to localhost for local development
const PORT = process.env.PORT || 3001;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// Warn in production if APP_BASE_URL is not set
if (process.env.NODE_ENV === 'production' && !process.env.APP_BASE_URL) {
  console.warn('⚠️  WARNING: APP_BASE_URL not set in production. Using localhost fallback.');
}

const app = express();

// Use compression for all responses
app.use(compression());

// Prevent API responses from being cached (avoids 304 w/ empty body for JSON APIs)
app.disable('etag');
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

/* =====================
   UPLOADS
===================== */

const baseDir = process.env.K_SERVICE ? '/tmp' : path.join(process.cwd(), 'backend');
const verificationUploadsDir = path.join(
  baseDir,
  'uploads',
  'verification'
);

fs.ensureDirSync(verificationUploadsDir);
app.use('/uploads/verification', express.static(verificationUploadsDir, {
  maxAge: '1y',
  immutable: true,
  fallthrough: true
}));

/* =====================
   CORS
===================== */

// CORS configuration - use APP_BASE_URL for production
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Always allow the APP_BASE_URL origin
if (APP_BASE_URL && !corsOrigins.includes(APP_BASE_URL)) {
  corsOrigins.push(APP_BASE_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // Allow Railway and Cloud Run domains
      try {
        const host = new URL(origin).host;
        if (host.endsWith('.up.railway.app') || host.endsWith('.run.app')) {
          return callback(null, true);
        }
      } catch { }

      // In development, allow localhost (but warn)
      if (process.env.NODE_ENV === 'development') {
        if (
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:')
        ) {
          console.warn('⚠️  Allowing localhost origin in development:', origin);
          return callback(null, true);
        }
      }

      // Check against allowed origins
      if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Check if origin matches APP_BASE_URL
      if (APP_BASE_URL && origin === APP_BASE_URL) {
        return callback(null, true);
      }

      console.error('❌ CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'cache-control', 'Pragma', 'pragma', 'Expires', 'expires'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86400, // 24 hours
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================
   LOGGING
===================== */

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/* =====================
   HEALTH
===================== */

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* =====================
   ROUTES
===================== */

const loadRoutes = async () => {
  const safeImport = async (p) => {
    try {
      const mod = await import(p);
      return mod.default || mod;
    } catch (err) {
      console.warn(`⚠️ Could not load ${p}:`, err.message);
      return null;
    }
  };

  // Load all routes from src/routes (legacy routes)
  const legacyRoutes = {
    auth: await safeImport('./src/routes/auth.js'),
    users: await safeImport('./src/routes/users.js'),
    projects: await safeImport('./src/routes/projects.js'),
    notifications: await safeImport('./src/routes/notifications.js'),
    leave: await safeImport('./src/routes/leave.js'),
    issues: await safeImport('./src/routes/issues.js'),
    profiles: await safeImport('./src/routes/profiles.js'),
    timesheets: await safeImport('./src/routes/timesheets.js'),
    labels: await safeImport('./src/routes/labels.js'),
    git: await safeImport('./src/routes/git.js'),
  };

  // Load feature routes
  const featureRoutes = {
    users: await safeImport('./features/users/routes/users.routes.js'),
    profiles: await safeImport('./features/profiles/routes/profiles.routes.js'),
    projects: await safeImport('./features/projects/routes/projects.routes.js'),
    timesheet: await safeImport('./features/timesheet/routes/timesheet.routes.js'),
    timeClock: await safeImport('./features/time-clock/routes/time-clock.routes.js'),
    leaveCalendar: await safeImport('./features/leave-calendar/routes/leave-calendar.routes.js'),
    issues: await safeImport('./features/issues/routes/issues.routes.js'),
    exitFormalities: await safeImport('./features/exit-formalities/routes/exit-formalities.routes.js'),
    payrollPf: await safeImport('./features/payroll-pf/routes/payroll-pf.routes.js'),
    payslips: await safeImport('./features/payslips/routes/payslips.routes.js'),
    recruitment: await safeImport('./features/recruitment/routes/index.js'),
    hrDocuments: await safeImport('./features/hr-documents/routes/hr-documents.routes.js'),
    joiningForm: await safeImport('./features/joining-form/routes/joining-form.routes.js'),
    git: await safeImport('./features/git/routes/git.routes.js'),
    monitoring: await safeImport('./features/monitoring/routes/monitoring.routes.js'),
  };

  console.log('🔍 Feature routes loaded:', Object.keys(featureRoutes).filter(k => featureRoutes[k]));

  // Register feature routes FIRST (prefer feature routes over legacy if both exist)
  if (featureRoutes.timesheet) {
    app.use('/api/timesheet', featureRoutes.timesheet);
    app.use('/api/timesheets', featureRoutes.timesheet); // Also register at plural for compatibility
    console.log('✅ Registered: /api/timesheet and /api/timesheets (feature)');
  }

  // Register legacy routes (from src/routes)
  // Skip legacy routes if feature routes exist (feature routes take precedence)
  if (legacyRoutes.auth) app.use('/api/auth', legacyRoutes.auth);
  if (legacyRoutes.users && !featureRoutes.users) app.use('/api/users', legacyRoutes.users);
  if (legacyRoutes.projects && !featureRoutes.projects) app.use('/api/projects', legacyRoutes.projects);
  if (legacyRoutes.notifications) app.use('/api/notifications', legacyRoutes.notifications);
  if (legacyRoutes.leave && !featureRoutes.leaveCalendar) app.use('/api/leave', legacyRoutes.leave);
  // Skip legacy issues route if feature route exists (feature route has the fixed code)
  if (legacyRoutes.issues && !featureRoutes.issues) {
    app.use('/api/issues', legacyRoutes.issues);
    console.log('⚠️  Using legacy /api/issues route (feature route not available)');
  }
  if (legacyRoutes.profiles && !featureRoutes.profiles) app.use('/api/profiles', legacyRoutes.profiles);
  // Skip legacy timesheets route - using feature route instead
  // if (legacyRoutes.timesheets) app.use('/api/timesheets', legacyRoutes.timesheets);
  if (legacyRoutes.labels) app.use('/api/labels', legacyRoutes.labels);
  if (legacyRoutes.git && !featureRoutes.git) app.use('/api/git', legacyRoutes.git);

  // Register feature routes (prefer feature routes over legacy if both exist)
  if (featureRoutes.users) {
    app.use('/api/users', featureRoutes.users);
    console.log('✅ Registered: /api/users (feature)');
  }
  if (featureRoutes.profiles) {
    app.use('/api/profiles', featureRoutes.profiles);
    console.log('✅ Registered: /api/profiles (feature)');
  }
  if (featureRoutes.projects) {
    app.use('/api/projects', featureRoutes.projects);
    console.log('✅ Registered: /api/projects (feature)');
  }
  if (featureRoutes.timeClock) {
    app.use('/api/time-clock', featureRoutes.timeClock);
    console.log('✅ Registered: /api/time-clock (feature)');
  }
  if (featureRoutes.leaveCalendar) {
    app.use('/api/leave-calendar', featureRoutes.leaveCalendar);
    console.log('✅ Registered: /api/leave-calendar (feature)');
    // Backward-compatible alias: some frontend code still calls /api/leave
    app.use('/api/leave', featureRoutes.leaveCalendar);
    console.log('✅ Registered: /api/leave (alias -> leave-calendar feature)');
  }
  if (featureRoutes.issues) {
    app.use('/api/issues', featureRoutes.issues);
    console.log('✅ Registered: /api/issues (feature)');
    console.log('   Available endpoints:');
    console.log('   - POST /api/issues/:id/assign (Admin)');
    console.log('   - DELETE /api/issues/:id/assign/:user_id (Admin)');
    console.log('   - POST /api/issues/:id/labels (Admin)');
    console.log('   - DELETE /api/issues/:id/labels/:label_id (Admin)');
    console.log('   - POST /api/issues/:id/comments');
  } else {
    console.warn('⚠️  Feature issues route not loaded!');
  }
  if (featureRoutes.exitFormalities) {
    app.use('/api/exit-formalities', featureRoutes.exitFormalities);
    console.log('✅ Registered: /api/exit-formalities (feature)');
  }
  if (featureRoutes.payrollPf) {
    app.use('/api/payroll-pf', featureRoutes.payrollPf);
    console.log('✅ Registered: /api/payroll-pf (feature)');
  }
  if (featureRoutes.payslips) {
    app.use('/api/payslips', featureRoutes.payslips);
    console.log('✅ Registered: /api/payslips (feature)');
  }
  if (featureRoutes.recruitment) {
    app.use('/api/recruitment', featureRoutes.recruitment);
    console.log('✅ Registered: /api/recruitment (feature)');
  }
  if (featureRoutes.hrDocuments) {
    app.use('/api/hr-documents', featureRoutes.hrDocuments);
    console.log('✅ Registered: /api/hr-documents (feature)');
  }
  if (featureRoutes.joiningForm) {
    app.use('/api/joining-form', featureRoutes.joiningForm);
    console.log('✅ Registered: /api/joining-form (feature)');
  } else {
    console.warn('⚠️  joining-form route not loaded!');
  }
  if (featureRoutes.git) {
    app.use('/api/git', featureRoutes.git);
    console.log('✅ Registered: /api/git (feature)');
  }
  if (featureRoutes.monitoring) {
    app.use('/api/monitoring', featureRoutes.monitoring);
    console.log('✅ Registered: /api/monitoring (feature)');
  }

  console.log('✅ Routes loaded successfully');
};

/* =====================
   START SERVER
===================== */

(async () => {
  await loadRoutes();

  // Initialize auto-clock-out cron job
  try {
    const cronService = await import('./features/timesheet/services/time-clock-cron.service.js');
    cronService.initAutoClockOutJob();
  } catch (err) {
    console.error('⚠️ Failed to load auto clock-out cron job:', err);
  }

  // FRONTEND_URL: Where the React app is hosted (separate Cloud Run service)
  const frontendUrl = process.env.FRONTEND_URL || null;

  // Only serve embedded static frontend if no dedicated frontend URL is configured.
  // In production, FRONTEND_URL should always be set → we redirect instead of serving
  // an old/stale embedded build (which would have no VITE_API_BASE_URL baked in).
  const frontendDistCandidates = [
    path.resolve(__dirname, '../frontend/dist'),
    path.resolve(__dirname, 'public'),
  ];
  const frontendDist = !frontendUrl
    ? frontendDistCandidates.find(p => fs.existsSync(p))
    : null;

  console.log('🔍 FRONTEND_URL:', frontendUrl);
  console.log('🔍 Frontend dist (embedded):', frontendDist || 'none (using redirect)');

  if (frontendUrl) {
    // Production: redirect all non-API routes to the real frontend service.
    // This handles old magic-link emails that still point to the backend URL.
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        console.log(`❌ 404 Catch-all reached for: ${req.method} ${req.path}`);
        return res.status(404).json({ error: 'API route not found' });
      }
      const redirectTo = `${frontendUrl}${req.path}${req.search || (Object.keys(req.query).length ? '?' + new URLSearchParams(req.query).toString() : '')}`;
      console.log(`↪️  Redirecting to frontend: ${redirectTo}`);
      res.redirect(302, redirectTo);
    });
  } else if (frontendDist) {
    // Local dev fallback: serve embedded static build
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();
