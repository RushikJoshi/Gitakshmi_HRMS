# 🔧 COMPANY ID CONFIGURATION SYSTEM

## **Professional Multi-Tenant ID Customization**

This system allows each company to customize ID formats for all HRMS entities while maintaining backend control and data integrity.

---

## 📋 **TABLE OF CONTENTS**

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Configuration Options](#configuration-options)
5. [Implementation Guide](#implementation-guide)
6. [API Reference](#api-reference)
7. [Frontend Usage](#frontend-usage)
8. [Security & Validation](#security--validation)
9. [Best Practices](#best-practices)

---

## 🎯 **OVERVIEW**

### **What This System Does**

- ✅ Allows each company to define custom ID formats
- ✅ Supports all HRMS entities (Job, Application, Offer, Employee, Payslip)
- ✅ Real-time preview of ID formats
- ✅ Locks configuration after first ID generation
- ✅ Multi-tenant safe (each company has independent config)
- ✅ Backend-controlled ID generation
- ✅ Prevents manual ID editing

### **Example Configurations**

```
Company A:
├── Job ID: JOB-2026-0001
├── Employee ID: EMP-HR-0001
└── Payslip ID: PAY-202601-0001

Company B:
├── Job ID: JOBREQ_26_001
├── Employee ID: STAFF/IT/001
└── Payslip ID: SALARY-2026-01-001
```

---

## ✨ **FEATURES**

### **1. Customizable Components**

| Component | Options | Example |
|-----------|---------|---------|
| **Prefix** | Any uppercase text (max 10 chars) | JOB, EMP, STAFF |
| **Separator** | -, _, /, or none | - |
| **Year** | YYYY or YY | 2026 or 26 |
| **Month** | MM or M (payslip only) | 01 or 1 |
| **Department** | CODE or FULL (employee only) | HR or HUMAN-RESOURCES |
| **Padding** | 2-6 digits | 0001, 001, 01 |
| **Reset Policy** | YEARLY, MONTHLY, NEVER | - |

### **2. Configuration Locking**

```
┌─────────────────────────────────────────────────────┐
│         CONFIGURATION LIFECYCLE                      │
└─────────────────────────────────────────────────────┘

UNLOCKED                    LOCKED
┌──────────┐               ┌──────────┐
│ Can Edit │──────────────▶│ Read-Only│
│ Config   │  First ID     │ Config   │
└──────────┘  Generated    └──────────┘
     │                           │
     ▼                           ▼
 Preview Only              IDs Generated
 No IDs Yet               Cannot Modify
```

### **3. Real-Time Preview**

```javascript
// Configuration:
{
  prefix: "EMP",
  separator: "-",
  includeDepartment: true,
  departmentFormat: "CODE",
  paddingLength: 4
}

// Preview:
EMP-HR-0001
```

---

## 🏗️ **ARCHITECTURE**

### **Backend Components**

```
backend/
├── models/
│   └── CompanyIdConfig.js          ✅ Configuration storage
├── utils/
│   └── configurableIdGenerator.js  ✅ ID generation logic
├── controllers/
│   └── idConfig.controller.js      ✅ API handlers
└── routes/
    └── idConfig.routes.js          ✅ API endpoints
```

### **Frontend Components**

```
frontend/
└── src/
    └── pages/
        └── Admin/
            ├── IdConfiguration.jsx  ✅ UI component
            └── IdConfiguration.css  ✅ Styles
```

### **Data Flow**

```
┌──────────────────────────────────────────────────────────┐
│                    ID GENERATION FLOW                     │
└──────────────────────────────────────────────────────────┘

1. Admin configures ID format
   └─▶ Saved to CompanyIdConfig collection

2. Application creates new entity (e.g., Job)
   └─▶ Calls generateJobId(db, tenantId)
       └─▶ Reads company configuration
           └─▶ Builds ID based on config
               └─▶ Increments counter atomically
                   └─▶ Returns formatted ID (JOB-2026-0001)
                       └─▶ Locks configuration on first use
```

---

## ⚙️ **CONFIGURATION OPTIONS**

### **Entity-Specific Options**

#### **Job Opening**
```javascript
{
  entityType: 'job',
  prefix: 'JOB',
  separator: '-',
  includeYear: true,
  yearFormat: 'YYYY',
  paddingLength: 4,
  resetPolicy: 'YEARLY'
}
// Result: JOB-2026-0001
```

#### **Employee**
```javascript
{
  entityType: 'employee',
  prefix: 'EMP',
  separator: '-',
  includeDepartment: true,
  departmentFormat: 'CODE',
  paddingLength: 4,
  resetPolicy: 'NEVER'
}
// Result: EMP-HR-0001
```

#### **Payslip**
```javascript
{
  entityType: 'payslip',
  prefix: 'PAY',
  separator: '-',
  includeYear: true,
  includeMonth: true,
  yearFormat: 'YYYY',
  monthFormat: 'MM',
  paddingLength: 4,
  resetPolicy: 'MONTHLY'
}
// Result: PAY-202601-0001
```

### **Reset Policies**

| Policy | Behavior | Use Case |
|--------|----------|----------|
| **YEARLY** | Counter resets every year | Jobs, Applications, Offers |
| **MONTHLY** | Counter resets every month | Payslips |
| **NEVER** | Counter never resets | Employees, Candidates |

---

## 🚀 **IMPLEMENTATION GUIDE**

### **Step 1: Register Routes**

**File: `backend/app.js` or `backend/server.js`**

```javascript
const idConfigRoutes = require('./routes/idConfig.routes');

// Register routes
app.use('/api/id-config', idConfigRoutes);
```

### **Step 2: Update ID Generation**

**File: `backend/controllers/job.controller.js`** (Example)

```javascript
// OLD (static format)
const { generateJobId } = require('../utils/idGenerator');
const jobOpeningId = await generateJobId(db);

// NEW (configurable format)
const { generateJobId } = require('../utils/configurableIdGenerator');
const jobOpeningId = await generateJobId(db, tenantId);
```

### **Step 3: Add to Frontend Routes**

**File: `frontend/src/router/AppRoutes.jsx`**

```javascript
import IdConfiguration from '../pages/Admin/IdConfiguration';

// Add route
<Route path="/admin/id-configuration" element={<IdConfiguration />} />
```

### **Step 4: Add to Sidebar**

**File: `frontend/src/components/Sidebar.jsx`**

```javascript
{
  label: 'ID Configuration',
  icon: '🔧',
  path: '/admin/id-configuration',
  roles: ['admin', 'psa']
}
```

---

## 📡 **API REFERENCE**

### **GET /api/id-config**

Get company ID configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "configurations": [
      {
        "entityType": "job",
        "prefix": "JOB",
        "separator": "-",
        "includeYear": true,
        "yearFormat": "YYYY",
        "paddingLength": 4,
        "resetPolicy": "YEARLY",
        "exampleFormat": "JOB-2026-0001",
        "isLocked": false,
        "generatedCount": 0
      }
    ]
  }
}
```

### **PATCH /api/id-config/:entityType**

Update configuration for specific entity type.

**Request:**
```json
{
  "prefix": "JOBREQ",
  "separator": "_",
  "yearFormat": "YY",
  "paddingLength": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "ID configuration updated for job",
  "data": {
    "entityType": "job",
    "exampleFormat": "JOBREQ_26_001"
  }
}
```

**Error (Locked):**
```json
{
  "success": false,
  "message": "Configuration is locked for job. IDs have already been generated.",
  "code": "CONFIGURATION_LOCKED"
}
```

### **GET /api/id-config/:entityType/preview**

Preview ID format without generating.

**Query Parameters:**
- `department` (optional) - For employee IDs
- `year` (optional) - Override year
- `month` (optional) - For payslip IDs

**Response:**
```json
{
  "success": true,
  "data": {
    "format": "EMP-HR-0001",
    "config": {
      "prefix": "EMP",
      "separator": "-",
      "includeDepartment": true,
      "isLocked": false
    }
  }
}
```

### **POST /api/id-config/:entityType/reset**

Reset configuration to defaults (only if not locked).

**Response:**
```json
{
  "success": true,
  "message": "Configuration reset to defaults for job"
}
```

---

## 🎨 **FRONTEND USAGE**

### **Accessing the Page**

1. Navigate to **Admin** → **ID Configuration**
2. View all entity configurations
3. Click on any card to expand and edit
4. Save changes or reset to defaults

### **UI Features**

#### **Configuration Card**

```
┌─────────────────────────────────────────────────┐
│ 💼 Job Opening                    🔒 Locked  ▼ │
│ JOB-2026-0001                                   │
├─────────────────────────────────────────────────┤
│ ⚠️ Configuration Locked                         │
│ 5 Job Opening IDs have been generated.         │
│                                                 │
│ Prefix:          [JOB          ]               │
│ Separator:       [Hyphen (-)   ▼]              │
│ ☑ Include Year   [Full Year    ▼]              │
│ Padding:         [4 digits     ▼]              │
│ Reset Policy:    [Yearly       ▼]              │
│                                                 │
│ Preview:                                        │
│ ┌─────────────────────────────────────────┐   │
│ │          JOB-2026-0001                  │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ [Save Configuration] [Reset to Default]        │
└─────────────────────────────────────────────────┘
```

#### **Real-Time Preview**

As you change configuration options, the preview updates instantly:

```
Prefix: EMP → EMPLOYEE
Preview: EMP-HR-0001 → EMPLOYEE-HR-0001

Separator: - → _
Preview: EMP-HR-0001 → EMP_HR_0001

Padding: 4 → 6
Preview: EMP-HR-0001 → EMP-HR-000001
```

---

## 🔐 **SECURITY & VALIDATION**

### **Backend Validation**

```javascript
// 1. Configuration Locking
if (config.isLocked) {
  throw new Error('Configuration is locked. IDs have already been generated.');
}

// 2. Prefix Validation
if (prefix.length > 10) {
  throw new Error('Prefix must be max 10 characters');
}

// 3. Padding Validation
if (paddingLength < 2 || paddingLength > 6) {
  throw new Error('Padding must be between 2 and 6 digits');
}

// 4. Tenant Isolation
const config = await CompanyIdConfig.findOne({ tenant: tenantId });
```

### **Frontend Validation**

```javascript
// 1. Disable editing if locked
<input disabled={config.isLocked} />

// 2. Show warning for locked configs
{config.isLocked && (
  <div className="lock-warning">
    Configuration locked - IDs already generated
  </div>
)}

// 3. Uppercase prefix
onChange={(e) => onChange('prefix', e.target.value.toUpperCase())}

// 4. Max length
<input maxLength={10} />
```

---

## ✅ **BEST PRACTICES**

### **DO:**

✅ **Configure before generating IDs**
```javascript
// 1. Set up configuration
await api.patch('/id-config/job', { prefix: 'JOBREQ' });

// 2. Then create jobs
const job = await createJob({ title: 'Developer' });
// ID: JOBREQ-2026-0001
```

✅ **Use meaningful prefixes**
```javascript
// Good
JOB, EMP, APP, OFF, PAY

// Bad
X, Y, Z, ABC, TEST
```

✅ **Choose appropriate reset policies**
```javascript
// Jobs - YEARLY (JOB-2026-0001, JOB-2027-0001)
// Employees - NEVER (EMP-HR-0001, EMP-HR-0002, ...)
// Payslips - MONTHLY (PAY-202601-0001, PAY-202602-0001)
```

✅ **Test configuration with preview**
```javascript
// Preview before saving
const preview = await api.get('/id-config/job/preview');
console.log(preview.data.format); // JOB-2026-0001
```

### **DON'T:**

❌ **Don't change config after IDs generated**
```javascript
// This will fail if IDs exist
await api.patch('/id-config/job', { prefix: 'NEWPREFIX' });
// Error: Configuration is locked
```

❌ **Don't use special characters in prefix**
```javascript
// Bad
prefix: 'JOB@#$'

// Good
prefix: 'JOB'
```

❌ **Don't manually edit sequence numbers**
```javascript
// NEVER do this
config.startingNumber = 1000; // ❌

// Let the system handle it
const id = await generateJobId(db, tenantId); // ✅
```

---

## 🎓 **SUMMARY**

### **What You Get**

✅ **Customizable ID Formats** - Each company defines their own patterns  
✅ **Real-Time Preview** - See changes before saving  
✅ **Configuration Locking** - Prevents changes after IDs generated  
✅ **Multi-Tenant Safe** - Each company has independent config  
✅ **Backend Controlled** - UI never sends or edits IDs  
✅ **Professional UI** - Zoho/Darwinbox-level design  
✅ **Atomic Counters** - Thread-safe ID generation  
✅ **Reset Policies** - Yearly, monthly, or never  

### **Files Delivered**

- ✅ `backend/models/CompanyIdConfig.js` - Configuration model
- ✅ `backend/utils/configurableIdGenerator.js` - ID generator
- ✅ `backend/controllers/idConfig.controller.js` - API handlers
- ✅ `backend/routes/idConfig.routes.js` - API routes
- ✅ `frontend/src/pages/Admin/IdConfiguration.jsx` - UI component
- ✅ `frontend/src/pages/Admin/IdConfiguration.css` - Styles

---

**Professional, secure, and fully customizable ID management!** 🚀

**Version:** 2.0  
**Date:** 2026-01-16
