// Load environment variables
require('dotenv').config();

// Core imports
const express = require('express');
console.log('Server restarting... [DEBUG CHECK]');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

let ngrok;
try { ngrok = require('ngrok'); } catch (_) { ngrok = null; }

// Express app
const app = express();

/* ===============================
   GLOBAL ERROR HANDLERS
================================ */
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

/* ===============================
   CORS
================================ */
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://hrms.gitakshmi.com'
];

app.use(cors());

// Handle OPTIONS requests explicitly
app.options('*', cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
  credentials: true
}));

/* ===============================
   BODY PARSERS
================================ */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ===============================
   ROUTES IMPORT
================================ */
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
const letterRoutes = require('./routes/letter.routes');
const offerTemplateRoutes = require('./routes/offerTemplate.routes');

// Payroll
const payrollRoutes = require('./routes/payroll.routes');
const deductionRoutes = require('./routes/deduction.routes');
const salaryStructureRoutes = require('./routes/salaryStructure.routes');
const payrollRuleRoutes = require('./routes/payrollRule.routes');

/* ===============================
   ROUTES (NO TENANT)
================================ */
app.use('/api/public', publicRoutes);
app.use('/api/candidate', require('./routes/candidate.routes'));
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/company', companyRoutes);
// app.use('/api/activities', activityRoutes); // Moved below
app.use('/api/uploads', uploadRoutes);

/* ===============================
   TENANT MIDDLEWARE
================================ */
const tenantMiddleware = require('./middleware/tenant.middleware');
const wrapAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.use('/api', wrapAsync(tenantMiddleware));

/* ===============================
   TENANT SCOPED ROUTES
================================ */
app.use('/api/letters', letterRoutes);
app.use('/api/offer-templates', offerTemplateRoutes);
app.use('/api', hrRoutes);
app.use('/api/psa', psaHrRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salary-structure', salaryStructureRoutes);
app.use('/api/activities', activityRoutes); // Moved here
// Moved from above to ensure tenantDB is available
app.use('/api/payroll', payrollRoutes);
app.use('/api/payroll-rules', payrollRuleRoutes);
app.use('/api/tracker', require('./routes/tracker.routes'));
app.use('/api/hr/candidate-status', require('./routes/tracker.routes'));
app.use('/api', deductionRoutes);

/* ===============================
   STATIC FILE SERVING
================================ */
const uploadsDir = path.join(__dirname, 'uploads');
const offersDir = path.join(uploadsDir, 'offers');

[uploadsDir, offersDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use('/uploads', express.static(uploadsDir));

/* ===============================
   ERROR HANDLING
================================ */
const errorMiddleware = require('./middleware/error.middleware');

app.use((err, req, res, next) => {
  // console.error('ðŸ”¥ EXPRESS ERROR:', err);
  next(err);
});
app.use(errorMiddleware);

/* ===============================
   HEALTH CHECK
================================ */
app.get('/', (_req, res) => {
  res.send('HRMS Backend Running');
});

app.get('/api/health', (_req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ===============================
   DATABASE CONNECTION
================================ */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';

if (!process.env.MONGO_URI) {
  console.warn('MONGO_URI not set in environment — defaulting to mongodb://localhost:27017/hrms');
}

const connectOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  family: 4
};

async function connectWithFallback(uri) {
  try {
    await mongoose.connect(uri, connectOptions);
    return uri;
  } catch (err) {
    console.error('MongoDB initial connection failed:', err && err.message ? err.message : err);

    // Helpful guidance for SRV/DNS failures (common with mongodb+srv URIs)
    if (err && (err.syscall === 'querySrv' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED')) {
      console.error('It looks like DNS SRV lookup failed for the provided MongoDB URI.');
      console.error('If you are using a mongodb+srv URI (Atlas), ensure your environment can resolve DNS SRV records.');
      console.error('Temporary workaround: set MONGO_FALLBACK_URI to a standard mongodb://host:port URI (or run a local MongoDB).');
    }

    // If SRV was used and DNS SRV resolution failed, try a fallback URI
    if (String(uri).includes('+srv')) {
      const fallback = process.env.MONGO_FALLBACK_URI || 'mongodb://localhost:27017/hrms';
      console.warn(`Attempting fallback MongoDB URI: ${fallback}`);
      try {
        await mongoose.connect(fallback, connectOptions);
        return fallback;
      } catch (err2) {
        console.error('Fallback MongoDB connection also failed:', err2 && err2.message ? err2.message : err2);
        throw err2;
      }
    }

    // No fallback possible, rethrow
    throw err;
  }
}

connectWithFallback(MONGO_URI)
  .then(async (usedUri) => {
    console.log('âœ… MongoDB connected');

    // Register models for main DB (for super admin fallback)
    mongoose.model('Notification', require('./models/Notification'));
    mongoose.model('LeaveRequest', require('./models/LeaveRequest'));
    mongoose.model('Regularization', require('./models/Regularization'));
    mongoose.model('Applicant', require('./models/Applicant'));
    mongoose.model('Requirement', require('./models/Requirement'));
    mongoose.model('Candidate', require('./models/Candidate'));
    mongoose.model('Interview', require('./models/Interview'));
    mongoose.model('TrackerCandidate', require('./models/TrackerCandidate'));
    mongoose.model('CandidateStatusLog', require('./models/CandidateStatusLog'));

    app.listen(PORT, async () => {
      console.log(`âœ… Server running on port ${PORT}`);

      const useNgrok =
        String(process.env.USE_NGROK || '').toLowerCase() === 'true' &&
        process.env.NODE_ENV !== 'production';

      if (useNgrok && ngrok) {
        try {
          if (process.env.NGROK_AUTHTOKEN) {
            await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
          }
          const url = await ngrok.connect({ addr: PORT });
          process.env.NGROK_URL = url;
          console.log('ðŸŒ NGROK URL:', url);
        } catch (e) {
          console.warn('ngrok failed:', e.message);
        }
      }

      console.log('âœ… Server fully initialized');
    });
  })
  .catch((err) => {
    console.error('âŒ MongoDB connection failed:', err);
    process.exit(1);
  });
