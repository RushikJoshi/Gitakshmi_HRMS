# 🚀 CUSTOM ID CONFIGURATION SYSTEM - IMPLEMENTATION GUIDE

## ✅ **COMPLETE SYSTEM DELIVERED**

A production-ready, multi-tenant ID configuration system that allows each company to define custom ID formats with automatic counter management.

---

## 📦 **FILES DELIVERED**

### **Backend (5 files)**

| File | Purpose | Status |
|------|---------|--------|
| `backend/models/CompanyIdConfig.js` | MongoDB schema for ID configurations | ✅ Created |
| `backend/services/idGenerator.service.js` | Central ID generation service | ✅ Created |
| `backend/controllers/companyIdConfig.controller.js` | API handlers | ✅ Created |
| `backend/routes/companyIdConfig.routes.js` | API routes | ✅ Created |
| `backend/examples/entityCreationWithCustomIds.js` | Integration examples | ✅ Created |

### **Frontend (1 file)**

| File | Purpose | Status |
|------|---------|--------|
| `frontend/src/pages/settings/CompanySettings.jsx` | Fully functional UI | ✅ Updated |

---

## 🎯 **STEP-BY-STEP IMPLEMENTATION**

### **STEP 1: Register Routes**

**File:** `backend/app.js` or `backend/server.js`

```javascript
// Add this import
const companyIdConfigRoutes = require('./routes/companyIdConfig.routes');

// Register route
app.use('/api/company-id-config', companyIdConfigRoutes);
```

---

### **STEP 2: Update Entity Creation Controllers**

Replace hardcoded ID generation with custom ID service.

#### **Example: Job Creation**

**File:** `backend/controllers/job.controller.js`

```javascript
// OLD CODE (Remove this)
const jobId = `JOB-${Date.now()}`;

// NEW CODE (Add this)
const { generateJobId } = require('../services/idGenerator.service');
const jobId = await generateJobId(companyId);
```

#### **Example: Employee Creation**

**File:** `backend/controllers/employee.controller.js`

```javascript
// OLD CODE (Remove this)
const employeeId = `EMP-${Date.now()}`;

// NEW CODE (Add this)
const { generateEmployeeId } = require('../services/idGenerator.service');
const employeeId = await generateEmployeeId(companyId, departmentCode);
```

#### **Apply to All Entities:**

- ✅ Job → `generateJobId(companyId)`
- ✅ Candidate → `generateCandidateId(companyId)`
- ✅ Application → `generateApplicationId(companyId)`
- ✅ Interview → `generateInterviewId(companyId)`
- ✅ Offer → `generateOfferId(companyId)`
- ✅ Employee → `generateEmployeeId(companyId, departmentCode)`
- ✅ Payslip → `generatePayslipId(companyId)`

---

### **STEP 3: Update Entity Models**

Ensure all entity models have ID fields.

**Example:** `backend/models/Job.js`

```javascript
const JobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  // ... other fields
});
```

**Apply to all entities:** Job, Candidate, Application, Interview, Offer, Employee, Payslip

---

### **STEP 4: Initialize Default Configurations**

When a new company is created, initialize default ID configurations.

**File:** `backend/controllers/company.controller.js`

```javascript
const CompanyIdConfig = require('../models/CompanyIdConfig');

exports.createCompany = async (req, res) => {
  try {
    // Create company
    const company = new Company({ ... });
    await company.save();
    
    // ✅ Initialize default ID configurations
    await CompanyIdConfig.initializeDefaults(company._id, req.user.email);
    
    res.json({ success: true, data: company });
  } catch (error) {
    // Handle error
  }
};
```

---

### **STEP 5: Frontend Integration**

The frontend is already updated! Just ensure the API route is accessible.

**Test URL:**
```
http://localhost:5173/hr/settings/company
```

**Features:**
- ✅ Load all configurations
- ✅ Edit each entity configuration
- ✅ Real-time preview
- ✅ Save changes
- ✅ Lock indicator for generated IDs

---

## 🔄 **HOW IT WORKS**

### **Configuration Flow**

```
1. Admin opens Company Settings
   ↓
2. Loads existing configurations (or initializes defaults)
   ↓
3. Admin edits: Prefix, Separator, Padding, Start From, etc.
   ↓
4. Sees real-time preview
   ↓
5. Clicks "Save Configuration"
   ↓
6. Backend updates configuration
   ↓
7. Future IDs use new format
```

### **ID Generation Flow**

```
1. User creates new Job
   ↓
2. Backend calls: generateJobId(companyId)
   ↓
3. Service fetches company's JOB configuration
   ↓
4. Checks if counter needs reset (yearly/monthly)
   ↓
5. Gets current sequence number
   ↓
6. Builds ID: PREFIX + YEAR + SEQUENCE
   ↓
7. Increments counter atomically (transaction-safe)
   ↓
8. Returns: JOB-2026-0001
   ↓
9. Job saved with generated ID
```

---

## 📊 **EXAMPLE CONFIGURATIONS**

### **Company A (Conservative)**

```
Job:        JOB-2026-0001
Employee:   EMP-HR-0001
Payslip:    PAY-202601-0001
```

**Settings:**
- Separator: `-`
- Include Year: Yes
- Padding: 4 digits
- Reset: Yearly

### **Company B (Modern)**

```
Job:        JOBREQ_26_001
Employee:   STAFF/IT/001
Payslip:    SALARY-2026-01-001
```

**Settings:**
- Separator: `_` or `/`
- Year Format: Short (26)
- Padding: 3 digits
- Reset: Never

### **Company C (Detailed)**

```
Job:        REQUISITION-2026-000001
Employee:   EMPLOYEE-ENGINEERING-000001
Payslip:    PAYSLIP-202601-000001
```

**Settings:**
- Long prefixes
- Separator: `-`
- Padding: 6 digits
- Include Month: Yes (payslip)

---

## 🔐 **SECURITY & RULES**

### **Backend Enforcement**

✅ **Frontend NEVER sends IDs**
```javascript
// ❌ WRONG
const job = { jobId: 'JOB-123', title: 'Developer' };

// ✅ CORRECT
const job = { title: 'Developer' };
// Backend generates jobId automatically
```

✅ **IDs are immutable**
```javascript
// ❌ WRONG - Cannot update ID
await Job.updateOne({ _id }, { jobId: 'NEW-ID' });

// ✅ CORRECT - IDs cannot be changed
```

✅ **Transaction-safe increments**
```javascript
// Uses MongoDB transactions
const session = await mongoose.startSession();
session.startTransaction();
// ... generate ID and increment counter
await session.commitTransaction();
```

✅ **Auto-reset counters**
```javascript
// Yearly reset
if (resetPolicy === 'YEARLY' && currentYear !== lastResetYear) {
  currentSeq = startFrom;
}

// Monthly reset
if (resetPolicy === 'MONTHLY' && currentMonth !== lastResetMonth) {
  currentSeq = startFrom;
}
```

---

## 📡 **API ENDPOINTS**

```
GET    /api/company-id-config                → Get all configurations
GET    /api/company-id-config/:entityType    → Get specific config
GET    /api/company-id-config/:entityType/preview → Preview format
PUT    /api/company-id-config/:entityType    → Update configuration
POST   /api/company-id-config/:entityType/reset → Reset to defaults
POST   /api/company-id-config/initialize     → Initialize defaults
```

---

## 🧪 **TESTING**

### **Test 1: Initialize Defaults**

```bash
POST /api/company-id-config/initialize
```

**Expected:** 7 default configurations created

### **Test 2: Get Configurations**

```bash
GET /api/company-id-config
```

**Expected:** Array of 7 configurations with previews

### **Test 3: Update Configuration**

```bash
PUT /api/company-id-config/JOB
{
  "prefix": "JOBREQ",
  "separator": "_",
  "padding": 3,
  "startFrom": 100
}
```

**Expected:** Configuration updated, preview shows `JOBREQ_2026_100`

### **Test 4: Generate ID**

```javascript
const { generateJobId } = require('./services/idGenerator.service');
const jobId = await generateJobId(companyId);
console.log(jobId); // JOBREQ_2026_0100
```

**Expected:** First ID starts from 100, next is 101, etc.

### **Test 5: Counter Reset**

```javascript
// Set resetPolicy to YEARLY
// Wait for year change (or manually change lastResetYear)
const jobId = await generateJobId(companyId);
console.log(jobId); // JOBREQ_2027_0100 (reset to startFrom)
```

---

## ⚠️ **IMPORTANT NOTES**

### **Configuration Locking**

- After first ID is generated, `isLocked = true`
- `startFrom` cannot be changed once locked
- Other settings (prefix, separator, etc.) can still be updated
- This prevents sequence number conflicts

### **Department Codes**

For Employee IDs, always pass department code:

```javascript
// ✅ CORRECT
const employeeId = await generateEmployeeId(companyId, 'IT');
// Result: EMP-IT-0001

// ❌ WRONG
const employeeId = await generateEmployeeId(companyId);
// Error: Department code is required
```

### **Error Handling**

```javascript
try {
  const jobId = await generateJobId(companyId);
} catch (error) {
  // Handle errors:
  // - Configuration not found
  // - Database transaction failed
  // - Invalid parameters
  console.error('ID Generation Failed:', error.message);
}
```

---

## 🎓 **SUMMARY**

### **What You Have:**

✅ **MongoDB Model** - Stores configurations per company per entity  
✅ **ID Generator Service** - Transaction-safe, atomic increments  
✅ **API Controllers** - Get, update, preview, reset  
✅ **API Routes** - RESTful endpoints  
✅ **Frontend UI** - Fully functional settings page  
✅ **Examples** - Integration code for all entities  
✅ **Auto-Reset** - Yearly/monthly counter reset  
✅ **Multi-Tenant** - Each company has independent config  

### **Next Steps:**

1. ✅ Register routes in `app.js`
2. ✅ Update entity controllers to use ID service
3. ✅ Initialize defaults for existing companies
4. ✅ Test ID generation
5. ✅ Deploy to production

---

**Your HRMS now has Zoho/Darwinbox-level ID management!** 🚀

**Version:** 3.0  
**Date:** 2026-01-16
