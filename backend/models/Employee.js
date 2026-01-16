const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true, required: true },
  firstName: { type: String, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: false },
  employeeId: { type: String, trim: true, unique: true, index: true },
  dob: { type: Date },
  contactNo: { type: String, trim: true },
  email: {
    type: String,
    trim: true,
    // required: function() { return this.status === 'Active'; } // Removed as per user request 
  },
  status: { type: String, enum: ['Active', 'Draft'], default: 'Active' },
  lastStep: { type: Number, default: 6 }, // Default to 6 (completed) for existing/direct creations
  password: { type: String, trim: true },
  profilePic: { type: String, trim: true },
  bloodGroup: { type: String, trim: true },
  role: { type: String, trim: true },
  leavePolicy: { type: mongoose.Schema.Types.ObjectId, ref: 'LeavePolicy', default: null },
  // Salary Template reference
  salaryTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryTemplate', default: null, index: true },
  // Department reference (ObjectId for proper relationship)
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
  // logical department linkage (name or code) - kept for backward compatibility
  department: { type: String, trim: true },
  // direct manager (self-referencing within same tenant)
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
  // joining date
  joiningDate: { type: Date, default: Date.now },
  maritalStatus: { type: String, trim: true },
  nationality: { type: String, trim: true },
  fatherName: { type: String, trim: true },
  motherName: { type: String, trim: true },
  emergencyContactName: { type: String, trim: true },
  emergencyContactNumber: { type: String, trim: true },

  tempAddress: {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    country: { type: String, trim: true },
  },

  permAddress: {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    country: { type: String, trim: true },
  },

  experience: [
    {
      companyName: { type: String, trim: true },
      from: { type: Date },
      to: { type: Date },
      lastDrawnSalary: { type: Number },
      reportingPersonName: { type: String, trim: true },
      reportingPersonContact: { type: String, trim: true },
      reportingPersonEmail: { type: String, trim: true },
      payslips: [String], // Array of URLs
      bankProofUrl: { type: String, trim: true }, // Chequebook or passbook photo
    }
  ],

  jobType: { type: String, enum: ['Full-Time', 'Part-Time', 'Internship'], trim: true },

  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    branchName: { type: String, trim: true },
    location: { type: String, trim: true }, // City or Address
    bankProofUrl: { type: String, trim: true } // Cancelled check or passbook
  },

  education: {
    type: { type: String, enum: ['Diploma', 'Bachelor'], trim: true },
    class10Marksheet: { type: String, trim: true }, // URL
    class12Marksheet: { type: String, trim: true }, // URL (Bachelor only)
    diplomaCertificate: { type: String, trim: true }, // URL (Diploma only)
    bachelorDegree: { type: String, trim: true }, // URL (Bachelor only)
    masterDegree: { type: String, trim: true }, // URL (Optional)
    otherDegree: { type: String, trim: true }, // Optional degree for diploma
    lastSem1Marksheet: { type: String, trim: true }, // Alternative to Degree
    lastSem2Marksheet: { type: String, trim: true }, // Alternative to Degree
    lastSem3Marksheet: { type: String, trim: true } // Alternative to Degree
  },

  documents: {
    aadharFront: { type: String, trim: true },
    aadharBack: { type: String, trim: true },
    panCard: { type: String, trim: true }
  },

  // ========================================
  // SALARY SNAPSHOT SYSTEM (IMMUTABLE)
  // ========================================

  // Array of ALL salary snapshots (historical + current)
  salarySnapshots: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeSalarySnapshot'
  }],

  // Current active snapshot (for quick access)
  currentSalarySnapshotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeSalarySnapshot',
    default: null,
    index: true
  },

  // NEW: State for Mandatory Salary Lock
  salaryAssigned: { type: Boolean, default: false },
  salaryLocked: { type: Boolean, default: false },
  currentSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeSalarySnapshot', default: null },

  // Legacy reference (kept for backward compatibility - will phase out in favor of currentSnapshotId)
  salarySnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeSalarySnapshot', default: null },
  currentSalarySnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeSalarySnapshot', default: null },

  // ========================================
  // PROMOTION & CAREER PROGRESSION
  // ========================================

  // Current designation/title
  designation: {
    type: String,
    trim: true,
    index: true
  },

  // Current grade/level
  grade: {
    type: String,
    trim: true,
    index: true
  },

  // Last promotion date
  lastPromotionDate: {
    type: Date
  },

  // Last increment date
  lastIncrementDate: {
    type: Date
  },

  // Last salary revision date
  lastRevisionDate: {
    type: Date
  },

  meta: { type: Object, default: {} },
}, { timestamps: true });

// Compound indexes for efficient org/department queries
EmployeeSchema.index({ tenant: 1, manager: 1 });
EmployeeSchema.index({ tenant: 1, department: 1 });
EmployeeSchema.index({ tenant: 1, departmentId: 1 });
EmployeeSchema.index({ tenant: 1, joiningDate: -1 });


// ❗ MULTI-TENANT FIX
// Do NOT export mongoose.model()
// Only export Schema
module.exports = EmployeeSchema;
