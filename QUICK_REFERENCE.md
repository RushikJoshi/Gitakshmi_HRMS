# 🎯 QUICK REFERENCE CARD - ID-Based Workflow System

## 📋 **ID FORMATS**

```
JOB-2026-0001        → Job/Requirement
CAN-2026-0042        → Candidate
APP-2026-0123        → Application
INT-2026-0089        → Interview
OFF-2026-0015        → Offer
EMP-HR-0001          → Employee (dept-specific)
PAY-202601-0001      → Payslip (month-specific)
```

---

## 🔄 **STATUS FLOWS**

### Application Status
```
APPLIED → SHORTLISTED → INTERVIEW → SELECTED → OFFERED → JOINED
   ↓          ↓            ↓           ↓          ↓
REJECTED   REJECTED    REJECTED   REJECTED   REJECTED
```

### Offer Status
```
DRAFT → SENT → ACCEPTED
          ↓       ↓
      REJECTED  EXPIRED
```

---

## 🚀 **QUICK API CALLS**

### 1. Create Application
```javascript
POST /api/recruitment/applications
{
  "jobId": "...",
  "candidateId": "...",
  "candidateInfo": { "name": "...", "email": "...", "mobile": "..." }
}
```

### 2. Update Status
```javascript
PATCH /api/recruitment/applications/:id/status
{ "status": "SHORTLISTED", "reason": "..." }
```

### 3. Schedule Interview
```javascript
POST /api/recruitment/applications/:id/interviews
{ "date": "2026-01-20", "time": "10:00 AM", "mode": "Online" }
```

### 4. Create Offer
```javascript
POST /api/recruitment/applications/:id/offer
{ "salaryStructureId": "...", "joiningDate": "2026-02-01" }
```

### 5. Convert to Employee
```javascript
POST /api/recruitment/offers/:id/convert-to-employee
{ "actualJoiningDate": "2026-02-01", "department": "HR" }
```

---

## 💻 **CODE SNIPPETS**

### Generate ID
```javascript
const { generateApplicationId } = require('./utils/idGenerator');
const appId = await generateApplicationId(db);
```

### Change Status (with validation)
```javascript
application.changeStatus('SELECTED', userId, userName, 'Passed all rounds');
await application.save();
```

### Check Permissions
```javascript
if (application.canCreateOffer) {
  // Create offer
}

if (offer.canBeAccepted) {
  // Accept offer
}
```

---

## ⚠️ **COMMON ERRORS**

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `JOB_NOT_OPEN` | Job is closed | Reopen job first |
| `DUPLICATE_APPLICATION` | Already applied | Check existing applications |
| `INVALID_STATUS_FOR_INTERVIEW` | Wrong status | Move to SHORTLISTED first |
| `CANNOT_CREATE_OFFER` | Not SELECTED | Update status to SELECTED |
| `CANNOT_CREATE_EMPLOYEE` | Offer not accepted | Wait for offer acceptance |

---

## ✅ **VALIDATION RULES**

```
✓ Job must be OPEN to apply
✓ One candidate = One application per job
✓ Interview requires SHORTLISTED status
✓ Offer requires SELECTED status
✓ Employee requires ACCEPTED offer
✗ Cannot skip status stages
✗ Cannot create duplicate offers
✗ Cannot change immutable IDs
```

---

## 🎨 **FRONTEND HELPERS**

### Status Badge Colors
```javascript
const statusColors = {
  APPLIED: 'blue',
  SHORTLISTED: 'purple',
  INTERVIEW: 'orange',
  SELECTED: 'green',
  OFFERED: 'teal',
  JOINED: 'success',
  REJECTED: 'red'
};
```

### Action Buttons Logic
```javascript
const canScheduleInterview = ['SHORTLISTED', 'INTERVIEW'].includes(status);
const canCreateOffer = status === 'SELECTED' && !offerId;
const canConvertToEmployee = offerStatus === 'ACCEPTED' && !employeeId;
```

---

## 🔧 **DEBUGGING TIPS**

1. **Check Status History**
   ```javascript
   console.log(application.statusHistory);
   ```

2. **Verify Counter**
   ```javascript
   const { getCurrentCounter } = require('./utils/idGenerator');
   const count = await getCurrentCounter(db, 'APP', 2026);
   console.log('Current APP counter:', count);
   ```

3. **Test Transitions**
   ```javascript
   try {
     application.changeStatus('OFFERED', userId, userName);
   } catch (error) {
     console.log('Invalid transition:', error.message);
   }
   ```

---

## 📊 **DATABASE QUERIES**

### Get Pipeline Stats
```javascript
const stats = await Application.getPipelineStats(tenantId, jobId);
// Returns: { APPLIED: 10, SHORTLISTED: 5, ... }
```

### Find Pending Offers
```javascript
const offers = await Offer.getPendingOffers(tenantId);
```

### Check Duplicate
```javascript
const exists = await Application.hasApplied(tenantId, jobId, candidateId);
```

---

## 🎯 **BEST PRACTICES**

1. ✅ Always use transactions for multi-step operations
2. ✅ Use model methods for validation (don't bypass)
3. ✅ Maintain audit trails for all changes
4. ✅ Check permissions before state changes
5. ✅ Use virtual fields for business logic
6. ❌ Never hardcode IDs
7. ❌ Never skip status validations
8. ❌ Never modify IDs after creation

---

## 📞 **QUICK HELP**

**Documentation:** `RECRUITMENT_WORKFLOW_GUIDE.md`  
**Implementation:** `IMPLEMENTATION_CHECKLIST.md`  
**Models:** `backend/models/Application.js`, `backend/models/Offer.js`  
**Controller:** `backend/controllers/recruitment.workflow.controller.js`  
**Routes:** `backend/routes/recruitment.workflow.routes.js`  
**Utils:** `backend/utils/idGenerator.js`

---

**Print this card and keep it handy! 📌**
