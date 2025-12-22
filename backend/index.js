// Load environment variables
require('dotenv').config();

// Core imports
// Force restart
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
let ngrok;
try { ngrok = require('ngrok'); } catch (_) { ngrok = null; }

// Express app
const app = express();

// Add global error handlers FIRST
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// ✅ NEW WORKING CORS (required for ngrok + mobile clients)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID", "X-Requested-With"],
  credentials: true
}));

// BODY PARSERS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- ROUTES IMPORT ----------
const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const companyRoutes = require('./routes/company.routes');
const activityRoutes = require('./routes/activity.routes');
const uploadRoutes = require('./routes/upload.routes');
const hrRoutes = require('./routes/hr.routes');
const psaHrRoutes = require('./routes/psa.hr.routes');
const employeeRoutes = require('./routes/employee.routes');
const requirementRoutes = require('./routes/requirement.routes');
const publicRoutes = require('./routes/public.routes');
const notificationRoutes = require('./routes/notification.routes');
const commentRoutes = require('./routes/comment.routes');
const entityRoutes = require('./routes/entity.routes');
const holidayRoutes = require('./routes/holiday.routes');
const attendanceRoutes = require('./routes/attendance.routes');



// ---------- ROUTES REGISTER ----------
// Public routes (before tenant middleware for some, but now using tenant middleware)
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);

// ...

// ---------- DATABASE CONNECTION ----------
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
app.use('/api/tenants', tenantRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/uploads', uploadRoutes);

// tenant middleware
const tenantMiddleware = require('./middleware/tenant.middleware');
const wrapAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
app.use('/api', wrapAsync(tenantMiddleware));

// tenant-scoped routes
app.use('/api', hrRoutes);
app.use('/api/psa', psaHrRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/attendance', attendanceRoutes);



// serve uploaded files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// ---------- ERROR HANDLING MIDDLEWARE ----------
const errorMiddleware = require('./middleware/error.middleware');
app.use(errorMiddleware);

// ---------- HEALTH / INFO ROUTES ----------
app.get('/', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.send('HRMS Backend Running');
});

app.get('/api/health', (_req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ❌ REMOVED THIS — IT BREAKS CORS FOR NGROK
// app.options('/api/health', cors());

app.get('/api/docs', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'HRMS API', version: '1.0.0' },
    paths: {
      '/api/auth/login': { post: { summary: 'Super admin login' } },
      '/api/auth/login-hr': { post: { summary: 'Tenant admin login' } },
      '/api/auth/login-employee': { post: { summary: 'Employee login' } },
      '/api/hr/employees': { get: { summary: 'List employees' } },
      '/api/hr/departments': { get: { summary: 'List departments' } },
      '/api/hr/leaves': { get: { summary: 'List leave requests' } },
    },
  });
});

// ---------- DATABASE CONNECTION ----------

if (!MONGO_URI) {
  console.error('Error: MONGO_URI not set in environment');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 5,
    maxConnecting: 2,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    family: 4
  })
  .then(async () => {
    console.log('MongoDB connected (main connection)');

    try {
      const ActivityExport = require('./models/Activity');
      const { RETENTION_DAYS } = require('./config/activity.config');
      const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * RETENTION_DAYS);

      let ActivityModel;
      if (typeof ActivityExport.deleteMany === 'function') {
        ActivityModel = ActivityExport;
      } else {
        try {
          ActivityModel = mongoose.model('Activity');
        } catch (e) {
          mongoose.model('Activity', ActivityExport);
          ActivityModel = mongoose.model('Activity');
        }
      }

      const deleted = await ActivityModel.deleteMany({ time: { $lt: cutoff } });
      if (deleted.deletedCount > 0) {
        console.log(`🧹 Cleaned ${deleted.deletedCount} old activities`);
      }
    } catch (err) {
      console.error('Activity cleanup failed:', err.message);
    }

    app.listen(PORT, async () => {
      try {
        console.log(`✅ Server running on port ${PORT}`);

        const useNgrok = String(process.env.USE_NGROK || '').toLowerCase() === 'true' &&
          process.env.NODE_ENV !== 'production';

        if (useNgrok && ngrok) {
          try {
            if (process.env.NGROK_AUTHTOKEN) {
              try { await ngrok.authtoken(process.env.NGROK_AUTHTOKEN); }
              catch (e) { console.warn('ngrok.authtoken failed:', e.message); }
            }

            const url = await ngrok.connect({ proto: 'http', addr: Number(PORT) });
            process.env.NGROK_URL = url;
            console.log('NGROK PUBLIC URL:', url);

          } catch (e) {
            console.warn('Warning: Failed to start ngrok:', e.message);
          }
        }

        console.log('✅ Server fully initialized and ready');
      } catch (err) {
        console.error('ERROR in app.listen callback:', err);
        throw err;
      }
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
