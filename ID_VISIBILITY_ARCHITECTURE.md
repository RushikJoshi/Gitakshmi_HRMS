# 🔐 ID VISIBILITY & SECURITY ARCHITECTURE

## **Professional HRMS ID Management System**

> **Core Philosophy:** IDs are backend control entities. UI shows IDs only where legally or operationally required.

---

## 📋 **TABLE OF CONTENTS**

1. [ID Visibility Matrix](#id-visibility-matrix)
2. [Backend Architecture](#backend-architecture)
3. [API Response Design](#api-response-design)
4. [Frontend Implementation](#frontend-implementation)
5. [Security Enforcement](#security-enforcement)
6. [Best Practices](#best-practices)
7. [Common Mistakes](#common-mistakes)

---

## 🎯 **ID VISIBILITY MATRIX**

### **Role-Based ID Visibility**

| Entity | Candidate Portal | HR Admin | Documents/PDF | API Response | Notes |
|--------|-----------------|----------|---------------|--------------|-------|
| **Job ID** | ❌ Never | ✅ Detail header only | ❌ No | HR only | Small text, not prominent |
| **Candidate ID** | ❌ Never | ✅ Profile header | ❌ No | HR only | Internal tracking |
| **Application ID** | ❌ Never | 🟡 Tooltip only | ❌ No | HR only | Optional, not required |
| **Interview ID** | ❌ Never | ❌ Never | ❌ No | Never | Pure backend entity |
| **Offer ID** | ✅ In offer letter | ✅ Offer view | ✅ Mandatory | Always | Legal requirement |
| **Employee ID** | ✅ Profile & payslip | ✅ All views | ✅ Mandatory | Always | Official identifier |
| **Payslip ID** | ✅ On payslip | ✅ Payroll view | ✅ Mandatory | Always | Audit requirement |
| **MongoDB _id** | ❌ NEVER | ❌ NEVER | ❌ NEVER | ❌ NEVER | Internal only |

### **UI Display Rules**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ID VISIBILITY HIERARCHY                       │
└─────────────────────────────────────────────────────────────────┘

NEVER SHOW:
├── MongoDB ObjectId (_id)
├── Interview ID (INT-2026-0001)
└── Internal reference IDs

SHOW ONLY TO HR:
├── Job ID (JOB-2026-0001) → Small text in detail view
├── Candidate ID (CAN-2026-0042) → Profile header
└── Application ID (APP-2026-0123) → Optional tooltip

SHOW TO EVERYONE:
├── Offer ID (OFF-2026-0015) → Offer letter, PDF
├── Employee ID (EMP-HR-0001) → Profile, payslip, all docs
└── Payslip ID (PAY-202601-0001) → Payslip document

SHOW AS STATUS TEXT:
├── "Application Submitted" (not APP-2026-0123)
├── "Interview Scheduled" (not INT-2026-0089)
└── "Offer Sent" (not OFF-2026-0015)
```

---

## 🏗️ **BACKEND ARCHITECTURE**

### **1. Response Shaping Middleware**

Create middleware to filter responses based on user role:

**File: `backend/middleware/responseShaper.js`**

```javascript
/**
 * Response Shaping Middleware
 * Removes sensitive IDs based on user role
 */

const ROLE_PERMISSIONS = {
  candidate: {
    showIds: ['employeeId', 'offerId', 'payslipId'],
    hideIds: ['_id', 'jobOpeningId', 'applicationId', 'interviewId', 'candidateId']
  },
  hr: {
    showIds: ['jobOpeningId', 'candidateId', 'applicationId', 'offerId', 'employeeId', 'payslipId'],
    hideIds: ['_id', 'interviewId'] // Interview ID never shown
  },
  admin: {
    showIds: ['jobOpeningId', 'candidateId', 'applicationId', 'offerId', 'employeeId', 'payslipId'],
    hideIds: ['_id', 'interviewId']
  },
  psa: {
    showIds: ['jobOpeningId', 'candidateId', 'applicationId', 'offerId', 'employeeId', 'payslipId'],
    hideIds: ['_id']
  }
};

/**
 * Shape response based on user role
 */
function shapeResponse(data, userRole, context = 'list') {
  if (!data) return data;
  
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.candidate;
  
  // For list views, be more restrictive
  if (context === 'list') {
    return shapeListResponse(data, permissions);
  }
  
  // For detail views, show more info
  return shapeDetailResponse(data, permissions);
}

/**
 * Shape list response - minimal info
 */
function shapeListResponse(data, permissions) {
  const items = Array.isArray(data) ? data : [data];
  
  return items.map(item => {
    const shaped = {};
    
    // Always include display fields
    const displayFields = [
      'title', 'name', 'status', 'createdAt', 'updatedAt',
      'jobTitle', 'department', 'designation', 'email',
      'date', 'time', 'mode', 'location' // Interview fields
    ];
    
    displayFields.forEach(field => {
      if (item[field] !== undefined) {
        shaped[field] = item[field];
      }
    });
    
    // Add allowed IDs only
    permissions.showIds.forEach(idField => {
      if (item[idField]) {
        shaped[idField] = item[idField];
      }
    });
    
    // Add nested objects if needed
    if (item.candidateInfo) {
      shaped.candidateInfo = {
        name: item.candidateInfo.name,
        email: item.candidateInfo.email
        // No IDs from candidateInfo
      };
    }
    
    if (item.jobDetails) {
      shaped.jobDetails = {
        title: item.jobDetails.title,
        department: item.jobDetails.department
        // No IDs from jobDetails
      };
    }
    
    return shaped;
  });
}

/**
 * Shape detail response - more info
 */
function shapeDetailResponse(data, permissions) {
  const shaped = { ...data };
  
  // Remove hidden IDs
  permissions.hideIds.forEach(idField => {
    delete shaped[idField];
  });
  
  // Remove MongoDB _id always
  delete shaped._id;
  delete shaped.__v;
  
  // Clean nested objects
  if (shaped.candidateInfo) {
    delete shaped.candidateInfo._id;
  }
  
  if (shaped.jobDetails) {
    delete shaped.jobDetails._id;
  }
  
  // Clean arrays
  if (shaped.interviews) {
    shaped.interviews = shaped.interviews.map(interview => {
      const cleaned = { ...interview };
      delete cleaned._id;
      delete cleaned.interviewId; // Never show interview ID
      return cleaned;
    });
  }
  
  if (shaped.statusHistory) {
    shaped.statusHistory = shaped.statusHistory.map(history => {
      const cleaned = { ...history };
      delete cleaned._id;
      return cleaned;
    });
  }
  
  return shaped;
}

/**
 * Express middleware wrapper
 */
function responseShaper(context = 'list') {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      const userRole = req.user?.role || 'candidate';
      
      if (data && data.data) {
        data.data = shapeResponse(data.data, userRole, context);
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

module.exports = {
  shapeResponse,
  responseShaper,
  ROLE_PERMISSIONS
};
```

---

### **2. Enhanced API Controllers**

Update controllers to use response shaping:

**File: `backend/controllers/recruitment.workflow.controller.js`** (Updated)

```javascript
const { shapeResponse } = require('../middleware/responseShaper');

/**
 * Get applications list (for HR)
 * Shows minimal info, IDs only for HR role
 */
exports.getApplications = async (req, res) => {
  try {
    const { tenantId, db, user } = req;
    const { jobId, status } = req.query;
    
    const { Application } = getModels(db);
    
    const query = { tenant: tenantId, isActive: true };
    if (jobId) query.jobId = jobId;
    if (status) query.status = status;
    
    const applications = await Application.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(); // Use lean for better performance
    
    // Shape response based on user role
    const shaped = shapeResponse(applications, user.role, 'list');
    
    res.json({
      success: true,
      data: shaped,
      count: applications.length
    });
    
  } catch (error) {
    console.error('Get Applications Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch applications',
      error: error.message 
    });
  }
};

/**
 * Get single application (detail view)
 * Shows more info including IDs for HR
 */
exports.getApplicationDetail = async (req, res) => {
  try {
    const { tenantId, db, user } = req;
    const { applicationId } = req.params;
    
    const { Application } = getModels(db);
    
    const application = await Application.findOne({ 
      _id: applicationId, 
      tenant: tenantId 
    })
    .populate('jobId', 'jobTitle department jobOpeningId')
    .populate('candidateId', 'name email candidateId')
    .lean();
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }
    
    // Shape response based on user role
    const shaped = shapeResponse(application, user.role, 'detail');
    
    res.json({
      success: true,
      data: shaped
    });
    
  } catch (error) {
    console.error('Get Application Detail Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch application',
      error: error.message 
    });
  }
};

/**
 * Candidate view - their own applications
 * NO IDs shown, only status and messages
 */
exports.getCandidateApplications = async (req, res) => {
  try {
    const { tenantId, db, user } = req;
    const candidateId = user.candidateId || user._id;
    
    const { Application } = getModels(db);
    
    const applications = await Application.find({ 
      tenant: tenantId,
      candidateId: candidateId,
      isActive: true
    })
    .populate('jobId', 'jobTitle department location')
    .sort({ createdAt: -1 })
    .lean();
    
    // For candidates, show ONLY status and job info
    const candidateView = applications.map(app => ({
      // NO IDs at all
      jobTitle: app.jobId?.jobTitle,
      department: app.jobId?.department,
      location: app.jobId?.location,
      status: app.status,
      statusMessage: getStatusMessage(app.status),
      appliedDate: app.createdAt,
      
      // Interview info (if scheduled)
      ...(app.interviews?.length > 0 && {
        nextInterview: {
          date: app.interviews[app.interviews.length - 1].date,
          time: app.interviews[app.interviews.length - 1].time,
          mode: app.interviews[app.interviews.length - 1].mode,
          location: app.interviews[app.interviews.length - 1].location
        }
      }),
      
      // Offer info (if offered)
      ...(app.offerStatus && {
        offerStatus: app.offerStatus,
        offerMessage: getOfferMessage(app.offerStatus)
      })
    }));
    
    res.json({
      success: true,
      data: candidateView,
      count: candidateView.length
    });
    
  } catch (error) {
    console.error('Get Candidate Applications Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch your applications',
      error: error.message 
    });
  }
};

/**
 * Helper: Get user-friendly status message
 */
function getStatusMessage(status) {
  const messages = {
    'APPLIED': 'Your application has been submitted successfully',
    'SHORTLISTED': 'Congratulations! You have been shortlisted',
    'INTERVIEW': 'Interview has been scheduled',
    'SELECTED': 'Congratulations! You have been selected',
    'OFFERED': 'Offer letter has been sent to you',
    'JOINED': 'Welcome to the team!',
    'REJECTED': 'Thank you for your interest. We will keep your profile for future opportunities',
    'WITHDRAWN': 'Application withdrawn',
    'ON_HOLD': 'Your application is on hold. We will update you soon'
  };
  
  return messages[status] || 'Application in progress';
}

/**
 * Helper: Get offer status message
 */
function getOfferMessage(offerStatus) {
  const messages = {
    'PENDING': 'Offer is being prepared',
    'SENT': 'Offer letter has been sent. Please review and respond',
    'ACCEPTED': 'Offer accepted. Welcome aboard!',
    'REJECTED': 'Offer declined',
    'EXPIRED': 'Offer has expired'
  };
  
  return messages[offerStatus] || '';
}
```

---

### **3. Route-Level Response Shaping**

Apply middleware at route level:

**File: `backend/routes/recruitment.workflow.routes.js`** (Updated)

```javascript
const { responseShaper } = require('../middleware/responseShaper');

// List endpoints - minimal info
router.get('/applications', 
  responseShaper('list'), 
  workflowController.getApplications
);

// Detail endpoints - more info
router.get('/applications/:applicationId', 
  responseShaper('detail'), 
  workflowController.getApplicationDetail
);

// Candidate endpoints - no IDs
router.get('/my-applications', 
  workflowController.getCandidateApplications // Custom shaping inside
);

// Offer endpoints - show offer ID
router.get('/offers/:offerId', 
  responseShaper('detail'), 
  workflowController.getOfferDetail
);
```

---

## 📡 **API RESPONSE DESIGN**

### **Example Responses by Role**

#### **1. Application List (HR View)**

```json
{
  "success": true,
  "data": [
    {
      "applicationId": "APP-2026-0123",
      "candidateInfo": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "jobTitle": "Senior Developer",
      "department": "Engineering",
      "status": "SHORTLISTED",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Note:** No `_id`, no `interviewId`, no internal references.

#### **2. Application List (Candidate View)**

```json
{
  "success": true,
  "data": [
    {
      "jobTitle": "Senior Developer",
      "department": "Engineering",
      "location": "Bangalore",
      "status": "SHORTLISTED",
      "statusMessage": "Congratulations! You have been shortlisted",
      "appliedDate": "2026-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Note:** NO IDs at all. Only status and messages.

#### **3. Application Detail (HR View)**

```json
{
  "success": true,
  "data": {
    "applicationId": "APP-2026-0123",
    "jobOpeningId": "JOB-2026-0001",
    "candidateId": "CAN-2026-0042",
    "candidateInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "mobile": "+1234567890",
      "experience": "5 years"
    },
    "status": "INTERVIEW",
    "interviews": [
      {
        "round": 1,
        "date": "2026-01-20",
        "time": "10:00 AM",
        "mode": "Online",
        "status": "SCHEDULED"
      }
    ],
    "statusHistory": [
      {
        "from": "APPLIED",
        "to": "SHORTLISTED",
        "changedBy": "HR Manager",
        "timestamp": "2026-01-16T09:00:00Z"
      }
    ]
  }
}
```

**Note:** Shows `applicationId`, `jobOpeningId`, `candidateId` but NO `interviewId`, NO `_id`.

#### **4. Offer Letter (Both HR & Candidate)**

```json
{
  "success": true,
  "data": {
    "offerId": "OFF-2026-0015",
    "candidateInfo": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "jobDetails": {
      "title": "Senior Developer",
      "department": "Engineering",
      "designation": "Senior Developer"
    },
    "salarySnapshot": {
      "ctc": 1200000,
      "grossSalary": 100000,
      "netSalary": 85000
    },
    "joiningDate": "2026-02-01",
    "validUntil": "2026-01-25",
    "status": "SENT"
  }
}
```

**Note:** `offerId` is MANDATORY for legal/audit purposes.

#### **5. Employee Profile (Employee View)**

```json
{
  "success": true,
  "data": {
    "employeeId": "EMP-HR-0001",
    "name": "John Doe",
    "email": "john@company.com",
    "department": "Engineering",
    "designation": "Senior Developer",
    "joiningDate": "2026-02-01",
    "status": "Active"
  }
}
```

**Note:** `employeeId` is shown - it's their official identifier.

---

## 🎨 **FRONTEND IMPLEMENTATION**

### **1. Conditional ID Display Component**

**File: `frontend/src/components/IDDisplay.jsx`**

```javascript
import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Conditional ID Display Component
 * Shows IDs only when appropriate for user role
 */
const IDDisplay = ({ 
  id, 
  type, 
  showFor = ['hr', 'admin'], 
  className = '',
  tooltip = false 
}) => {
  const { user } = useAuth();
  
  // Check if current user role is allowed to see this ID
  const canSee = showFor.includes(user?.role);
  
  if (!canSee || !id) return null;
  
  const idLabels = {
    job: 'Job ID',
    application: 'Application ID',
    offer: 'Offer ID',
    employee: 'Employee ID',
    payslip: 'Payslip ID'
  };
  
  const label = idLabels[type] || 'ID';
  
  if (tooltip) {
    return (
      <span 
        className={`id-tooltip ${className}`}
        title={`${label}: ${id}`}
      >
        ℹ️
      </span>
    );
  }
  
  return (
    <div className={`id-display ${className}`}>
      <span className="id-label">{label}:</span>
      <span className="id-value">{id}</span>
    </div>
  );
};

export default IDDisplay;
```

**CSS:**

```css
.id-display {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: 'Courier New', monospace;
  margin-top: 0.5rem;
}

.id-label {
  font-weight: 600;
  margin-right: 0.5rem;
}

.id-value {
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
}

.id-tooltip {
  cursor: help;
  opacity: 0.6;
  margin-left: 0.5rem;
}
```

---

### **2. Status-Based UI Component**

**File: `frontend/src/components/ApplicationCard.jsx`**

```javascript
import React from 'react';
import IDDisplay from './IDDisplay';
import StatusBadge from './StatusBadge';

const ApplicationCard = ({ application, userRole }) => {
  // Candidate view - NO IDs
  if (userRole === 'candidate') {
    return (
      <div className="application-card">
        <h3>{application.jobTitle}</h3>
        <p className="department">{application.department}</p>
        
        <StatusBadge status={application.status} />
        <p className="status-message">{application.statusMessage}</p>
        
        <div className="meta">
          <span>Applied: {new Date(application.appliedDate).toLocaleDateString()}</span>
        </div>
        
        {application.nextInterview && (
          <div className="interview-info">
            <h4>Upcoming Interview</h4>
            <p>{application.nextInterview.date} at {application.nextInterview.time}</p>
            <p>{application.nextInterview.mode}: {application.nextInterview.location}</p>
          </div>
        )}
      </div>
    );
  }
  
  // HR view - Show IDs
  return (
    <div className="application-card">
      <div className="card-header">
        <h3>{application.candidateInfo.name}</h3>
        
        {/* Application ID - small, not prominent */}
        <IDDisplay 
          id={application.applicationId} 
          type="application" 
          showFor={['hr', 'admin']}
          tooltip={true}
        />
      </div>
      
      <p className="job-title">{application.jobTitle}</p>
      <StatusBadge status={application.status} />
      
      <div className="meta">
        <span>Applied: {new Date(application.createdAt).toLocaleDateString()}</span>
      </div>
      
      <div className="actions">
        {/* Status-based action buttons */}
        <ActionButtons application={application} />
      </div>
    </div>
  );
};

export default ApplicationCard;
```

---

### **3. Action Buttons (Status-Driven)**

**File: `frontend/src/components/ActionButtons.jsx`**

```javascript
import React from 'react';

const ActionButtons = ({ application }) => {
  const canScheduleInterview = ['SHORTLISTED', 'INTERVIEW'].includes(application.status);
  const canCreateOffer = application.status === 'SELECTED' && !application.offerId;
  const canConvertToEmployee = application.offerStatus === 'ACCEPTED' && !application.employeeId;
  
  return (
    <div className="action-buttons">
      {canScheduleInterview && (
        <button 
          className="btn btn-primary"
          onClick={() => handleScheduleInterview(application._id)}
        >
          Schedule Interview
        </button>
      )}
      
      {canCreateOffer && (
        <button 
          className="btn btn-success"
          onClick={() => handleCreateOffer(application._id)}
        >
          Create Offer
        </button>
      )}
      
      {canConvertToEmployee && (
        <button 
          className="btn btn-info"
          onClick={() => handleConvertToEmployee(application.offerId)}
        >
          Create Employee
        </button>
      )}
      
      {/* Always show view details */}
      <button 
        className="btn btn-secondary"
        onClick={() => handleViewDetails(application._id)}
      >
        View Details
      </button>
    </div>
  );
};

// Note: We use application._id for API calls internally,
// but NEVER display it to the user
```

---

### **4. Offer Letter View**

**File: `frontend/src/pages/HR/OfferLetterView.jsx`**

```javascript
import React from 'react';
import IDDisplay from '../../components/IDDisplay';

const OfferLetterView = ({ offer }) => {
  return (
    <div className="offer-letter">
      <div className="letter-header">
        <h1>Offer Letter</h1>
        
        {/* Offer ID - ALWAYS shown (legal requirement) */}
        <IDDisplay 
          id={offer.offerId} 
          type="offer" 
          showFor={['hr', 'admin', 'candidate']} // Everyone can see
          className="offer-id-prominent"
        />
        
        <p className="date">{new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="letter-body">
        <p>Dear {offer.candidateInfo.name},</p>
        
        <p>
          We are pleased to offer you the position of <strong>{offer.jobDetails.designation}</strong> 
          in the <strong>{offer.jobDetails.department}</strong> department.
        </p>
        
        {/* Salary details */}
        <div className="salary-section">
          <h3>Compensation</h3>
          <table>
            <tr>
              <td>Annual CTC:</td>
              <td>₹{offer.salarySnapshot.ctc.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Monthly Gross:</td>
              <td>₹{offer.salarySnapshot.grossSalary.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Monthly Net (approx):</td>
              <td>₹{offer.salarySnapshot.netSalary.toLocaleString()}</td>
            </tr>
          </table>
        </div>
        
        <p>
          <strong>Joining Date:</strong> {new Date(offer.joiningDate).toLocaleDateString()}
        </p>
        
        <p className="validity">
          This offer is valid until {new Date(offer.validUntil).toLocaleDateString()}
        </p>
        
        <p>
          <strong>Reference:</strong> {offer.offerId}
        </p>
      </div>
      
      <div className="letter-footer">
        <button className="btn btn-success" onClick={handleAccept}>
          Accept Offer
        </button>
        <button className="btn btn-secondary" onClick={handleDownloadPDF}>
          Download PDF
        </button>
      </div>
    </div>
  );
};
```

---

## 🔐 **SECURITY ENFORCEMENT**

### **1. Backend Validation Middleware**

**File: `backend/middleware/idValidation.js`**

```javascript
/**
 * Prevent ID tampering from frontend
 */
function validateIdFormat(req, res, next) {
  const { applicationId, offerId, employeeId } = req.params;
  
  // Validate ID formats
  const patterns = {
    applicationId: /^APP-\d{4}-\d{4}$/,
    offerId: /^OFF-\d{4}-\d{4}$/,
    employeeId: /^EMP-[A-Z]+-\d{4}$/
  };
  
  if (applicationId && !patterns.applicationId.test(applicationId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid application ID format',
      code: 'INVALID_ID_FORMAT'
    });
  }
  
  if (offerId && !patterns.offerId.test(offerId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid offer ID format',
      code: 'INVALID_ID_FORMAT'
    });
  }
  
  if (employeeId && !patterns.employeeId.test(employeeId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid employee ID format',
      code: 'INVALID_ID_FORMAT'
    });
  }
  
  next();
}

/**
 * Prevent MongoDB ObjectId exposure
 */
function sanitizeRequestBody(req, res, next) {
  if (req.body) {
    // Remove any _id fields from request body
    delete req.body._id;
    delete req.body.__v;
    
    // Remove any MongoDB ObjectId patterns
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string' && /^[0-9a-fA-F]{24}$/.test(req.body[key])) {
        console.warn(`⚠️ Potential ObjectId in request body: ${key}`);
        // Optionally reject or sanitize
      }
    });
  }
  
  next();
}

module.exports = {
  validateIdFormat,
  sanitizeRequestBody
};
```

---

### **2. Role-Based Access Control**

**File: `backend/middleware/rbac.js`**

```javascript
/**
 * Role-Based Access Control
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        code: 'FORBIDDEN'
      });
    }
    
    next();
  };
}

/**
 * Ensure candidate can only access their own data
 */
function ensureOwnData(req, res, next) {
  const { user } = req;
  const { candidateId, applicationId } = req.params;
  
  if (user.role === 'candidate') {
    // Verify the resource belongs to this candidate
    // This check should be done in the controller with DB query
    req.mustVerifyOwnership = true;
  }
  
  next();
}

module.exports = {
  requireRole,
  ensureOwnData
};
```

---

## ✅ **BEST PRACTICES**

### **1. ID Visibility Guidelines**

```
DO:
✅ Show Employee ID on payslips (legal requirement)
✅ Show Offer ID on offer letters (audit trail)
✅ Show Job ID to HR in detail view (small text)
✅ Use status text for candidates ("Application Submitted")
✅ Hide all MongoDB ObjectIds

DON'T:
❌ Show Application ID to candidates
❌ Show Interview ID to anyone
❌ Show MongoDB _id to anyone
❌ Make IDs prominent in UI
❌ Use IDs as primary display text
```

### **2. API Design Guidelines**

```
DO:
✅ Shape responses based on user role
✅ Return minimal data in list APIs
✅ Use meaningful field names (title, status, name)
✅ Provide user-friendly messages
✅ Validate ID formats on backend

DON'T:
❌ Return full documents with all IDs
❌ Expose internal references
❌ Trust frontend to filter IDs
❌ Send MongoDB ObjectIds in responses
❌ Allow ID tampering from frontend
```

### **3. Frontend Guidelines**

```
DO:
✅ Use status-based UI logic
✅ Show friendly messages to candidates
✅ Conditionally render ID components
✅ Use role-based visibility
✅ Store IDs internally for API calls

DON'T:
❌ Display IDs prominently
❌ Show IDs to candidates unnecessarily
❌ Use IDs as primary identifiers in UI
❌ Allow users to edit IDs
❌ Display MongoDB ObjectIds
```

---

## ❌ **COMMON MISTAKES TO AVOID**

### **Mistake 1: Showing All IDs to Everyone**

```javascript
// ❌ WRONG
<div>
  <p>Application ID: {application.applicationId}</p>
  <p>Job ID: {application.jobId}</p>
  <p>Candidate ID: {application.candidateId}</p>
</div>

// ✅ CORRECT
<div>
  <h3>{application.candidateInfo.name}</h3>
  <p>{application.jobTitle}</p>
  <StatusBadge status={application.status} />
  
  {/* Show ID only to HR, small text */}
  <IDDisplay 
    id={application.applicationId} 
    type="application" 
    showFor={['hr']}
    tooltip={true}
  />
</div>
```

### **Mistake 2: Exposing MongoDB ObjectIds**

```javascript
// ❌ WRONG
{
  "_id": "65abc123def456...",
  "applicationId": "APP-2026-0001"
}

// ✅ CORRECT
{
  "applicationId": "APP-2026-0001",
  "candidateInfo": { "name": "John Doe" },
  "status": "APPLIED"
}
```

### **Mistake 3: Not Shaping Responses by Role**

```javascript
// ❌ WRONG - Same response for everyone
app.get('/applications', (req, res) => {
  const apps = await Application.find();
  res.json(apps); // Exposes everything
});

// ✅ CORRECT - Role-based shaping
app.get('/applications', responseShaper('list'), (req, res) => {
  const apps = await Application.find();
  // Response automatically shaped based on user role
  res.json({ success: true, data: apps });
});
```

### **Mistake 4: Making IDs Prominent in UI**

```javascript
// ❌ WRONG
<h1>Application APP-2026-0123</h1>

// ✅ CORRECT
<h1>Application for Senior Developer</h1>
<small className="text-muted">Ref: APP-2026-0123</small> {/* Only for HR */}
```

### **Mistake 5: Trusting Frontend for Security**

```javascript
// ❌ WRONG - Frontend decides what to show
if (userRole === 'hr') {
  // Show IDs
}

// ✅ CORRECT - Backend controls what's sent
// Frontend just displays what it receives
const shaped = shapeResponse(data, userRole);
res.json(shaped);
```

---

## 📊 **SUMMARY TABLE**

| Aspect | Candidate Portal | HR Admin | Documents |
|--------|-----------------|----------|-----------|
| **Job ID** | ❌ Never | ✅ Detail only (small) | ❌ No |
| **Application ID** | ❌ Never | 🟡 Tooltip only | ❌ No |
| **Interview ID** | ❌ Never | ❌ Never | ❌ No |
| **Offer ID** | ✅ Offer letter | ✅ Offer view | ✅ Mandatory |
| **Employee ID** | ✅ Profile/Payslip | ✅ All views | ✅ Mandatory |
| **MongoDB _id** | ❌ NEVER | ❌ NEVER | ❌ NEVER |
| **Status Text** | ✅ Always | ✅ Always | ✅ Always |

---

**This architecture ensures professional, secure, and user-friendly ID management matching Zoho/Darwinbox standards!** 🚀
