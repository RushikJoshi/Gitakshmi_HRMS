# ONBOARDING MODULE - ANALYSIS REPORT
**Generated:** January 2025  
**Status:** Pre-Implementation Analysis

---

## 📊 **EXECUTIVE SUMMARY**

After comprehensive codebase scan, I've identified that **NO onboarding module currently exists**. Employee creation happens directly via `POST /api/hr/employees` and allows salary template assignment, which violates the requirement that salary must be locked after Joining Letter generation.

---

## 1️⃣ **CURRENT STATE ANALYSIS**

### ✅ **What Exists:**

1. **Employee Creation API** (`backend/controllers/hr.employee.controller.js:315`)
   - Endpoint: `POST /api/hr/employees`
   - Accepts: `req.body` with all employee fields including `salaryTemplateId`
   - **PROBLEM:** Allows salary template to be set during creation
   - **PROBLEM:** No validation that salary comes from Joining Letter

2. **Employee Model** (`backend/models/Employee.js`)
   - Has `salaryTemplateId` field (line 25)
   - Has all required fields for employee data

3. **GeneratedLetter Model** (`backend/models/GeneratedLetter.js`)
   - Has `snapshotData` field (lines 28-35)
   - **CURRENT:** Only stores basic data (candidateName, designation, department, ctc, joiningDate, location)
   - **MISSING:** `salarySnapshot` field (to store complete salary breakdown)

4. **Applicant Model** (`backend/models/Applicant.js`)
   - Has: `name`, `email`, `mobile`, `joiningDate`, `offerLetterPath`, `joiningLetterPath`
   - **MISSING:** `salaryTemplateId` field (to link salary template)

---

### ❌ **What's Missing:**

1. **Onboarding Model** - Does NOT exist
2. **Onboarding Controller** - Does NOT exist
3. **Onboarding Routes** - Does NOT exist
4. **Salary Snapshot in GeneratedLetter** - Current `snapshotData` is minimal, no salary breakdown
5. **Applicant.salaryTemplateId** - No link between Applicant and SalaryTemplate
6. **Employee Creation Validation** - No check to prevent salary edits
7. **Onboarding → Employee Flow** - No structured process

---

## 2️⃣ **CRITICAL GAPS IDENTIFIED**

### **Gap 1: Joining Letter Salary Snapshot**

**Current State:**
- `GeneratedLetter.snapshotData` only has basic fields
- No salary breakdown stored
- Salary placeholders not saved

**Required State:**
- `GeneratedLetter.snapshotData.salarySnapshot` must contain:
  - Complete salary breakdown (earnings, deductions, Gross A/B/C, Gratuity, Take Home, CTC)
  - Immutable snapshot
  - Used by Onboarding and Employee creation

**Note:** This aligns with the earlier requirement to implement Joining Letter CTC population. The salary snapshot should be created when Joining Letter is generated.

---

### **Gap 2: No Onboarding Module**

**Current State:**
- Employee created directly from manual form
- No intermediate step between Joining Letter and Employee
- Salary can be set/edited during employee creation

**Required State:**
- Onboarding module as intermediate step
- Collects missing information
- Copies salary snapshot from Joining Letter
- Creates Employee with locked salary

---

### **Gap 3: Employee Creation Allows Salary Edits**

**Current State:**
- `POST /api/hr/employees` accepts `salaryTemplateId` in `req.body`
- HR can set any salary template
- No validation that salary matches Joining Letter

**Required State:**
- Employee creation should NOT accept salary template
- Salary must come from Onboarding → Joining Letter snapshot
- Or: Employee creation should only accept `onboardingId` and copy data from Onboarding

---

## 3️⃣ **REQUIRED DATA FLOW**

```
Applicant
  ↓
Offer Letter Generated
  ↓
Joining Letter Generated (with salarySnapshot)
  ↓
ONBOARDING STARTED
  - Copy salarySnapshot from GeneratedLetter
  - Collect additional employee info
  ↓
ONBOARDING COMPLETED
  - Create Employee record
  - Copy personal data from Applicant
  - Copy salarySnapshot from Onboarding (locked)
  - Set salaryTemplateId from snapshot
  ↓
Employee Active (salary locked)
  ↓
Payroll (uses salaryTemplateId)
```

---

## 4️⃣ **IMPLEMENTATION PLAN**

### **PHASE 1: Update GeneratedLetter Model**

**File:** `backend/models/GeneratedLetter.js`

**Add Field:**
```javascript
snapshotData: {
    // ... existing fields ...
    salarySnapshot: {
        salaryTemplateId: ObjectId,
        earnings: Array,
        employerContributions: Array,
        employeeDeductions: Array,
        grossA: { monthly, yearly },
        grossB: { monthly, yearly },
        grossC: { monthly, yearly },
        takeHome: { monthly, yearly },
        gratuity: { monthly, yearly },
        ctc: { monthly, yearly },
        calculatedAt: Date
    }
}
```

**Note:** This assumes Joining Letter generation will populate `salarySnapshot`. If that's not implemented yet, Onboarding can fetch salary template directly for now.

---

### **PHASE 2: Create Onboarding Model**

**File:** `backend/models/Onboarding.js` (NEW)

**Schema:**
```javascript
{
    tenantId: ObjectId (required),
    applicantId: ObjectId (required, ref: 'Applicant'),
    joiningLetterId: ObjectId (required, ref: 'GeneratedLetter'),
    salarySnapshot: Object (IMMUTABLE - copied from Joining Letter),
    personalDetails: {
        emergencyContact: String,
        alternatePhone: String,
        currentAddress: Object,
        permanentAddress: Object
    },
    bankDetails: {
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        branchName: String
    },
    statutoryDetails: {
        pan: String,
        aadhaar: String,
        pfNumber: String,
        esiNumber: String
    },
    documents: {
        photo: String,
        idProof: String,
        addressProof: String,
        educationCertificates: [String]
    },
    status: Enum ['PENDING', 'COMPLETED'],
    completedAt: Date,
    createdBy: ObjectId (ref: 'User')
}
```

---

### **PHASE 3: Create Onboarding Controller**

**File:** `backend/controllers/onboarding.controller.js` (NEW)

**Functions:**
1. `startOnboarding` - Create onboarding record
2. `getOnboarding` - Fetch onboarding data
3. `updateOnboarding` - Update onboarding fields
4. `completeOnboarding` - Create Employee from onboarding

---

### **PHASE 4: Create Onboarding Routes**

**File:** `backend/routes/onboarding.routes.js` (NEW)

**Endpoints:**
- `POST /api/onboarding/start` - Start onboarding
- `GET /api/onboarding/:applicantId` - Get onboarding data
- `PUT /api/onboarding/:id` - Update onboarding
- `POST /api/onboarding/:id/complete` - Complete onboarding (create employee)

---

### **PHASE 5: Update Employee Creation (Optional)**

**Option A:** Keep current Employee creation for manual entries (non-applicant employees)
**Option B:** Remove salary template from Employee creation, require onboarding flow
**Option C:** Add validation - if `applicantId` provided, require onboarding completion

**Recommendation:** Option C - Support both flows:
- Manual employee creation (no applicant) → Can set salary template
- Applicant-based employee creation → Must use onboarding flow

---

## 5️⃣ **CRITICAL QUESTIONS TO RESOLVE**

### **Question 1: Salary Snapshot Source**

**Scenario A:** Joining Letter already has salary snapshot
- Onboarding copies from `GeneratedLetter.snapshotData.salarySnapshot`

**Scenario B:** Joining Letter does NOT have salary snapshot yet
- Onboarding needs to fetch `Applicant.salaryTemplateId` and calculate
- OR: Onboarding requires salary template to be passed

**Recommendation:** Assume Scenario B for now (salary snapshot in Joining Letter not implemented yet). Onboarding can:
1. Check if `GeneratedLetter.snapshotData.salarySnapshot` exists → use it
2. If not, fetch `Applicant.salaryTemplateId` → calculate breakdown → store in Onboarding

---

### **Question 2: Applicant.salaryTemplateId**

**Current:** Applicant model has no `salaryTemplateId` field

**Options:**
1. Add `salaryTemplateId` to Applicant (when Offer Letter generated)
2. Store in Onboarding only (passed when starting onboarding)
3. Fetch from Joining Letter snapshot

**Recommendation:** Option 1 - Add `salaryTemplateId` to Applicant when Offer Letter is generated (or when Joining Letter is generated). This ensures salary template is linked early.

---

### **Question 3: Employee Creation Flow**

**Current:** `POST /api/hr/employees` accepts all fields

**Options:**
1. Keep as-is for manual entries, add new endpoint for onboarding completion
2. Modify existing endpoint to check for `onboardingId`
3. Create separate endpoint `POST /api/onboarding/:id/complete` → creates employee

**Recommendation:** Option 3 - Separate endpoint for onboarding completion. Keeps flows distinct and clear.

---

## 6️⃣ **IMPLEMENTATION CHECKLIST**

### **Backend:**
- [ ] Update `GeneratedLetter` model (add `salarySnapshot` structure)
- [ ] Add `salaryTemplateId` to `Applicant` model (optional, but recommended)
- [ ] Create `Onboarding` model
- [ ] Create `onboarding.controller.js`
- [ ] Create `onboarding.routes.js`
- [ ] Register Onboarding schema in `dbManager.js`
- [ ] Update `index.js` to include onboarding routes

### **Integration:**
- [ ] Update Joining Letter generation to save salary snapshot (if not already done)
- [ ] Test onboarding flow end-to-end
- [ ] Ensure employee creation from onboarding works

---

## 7️⃣ **ASSUMPTIONS & NOTES**

1. **Salary Snapshot Format:** Assuming same structure as required in Joining Letter (earnings, deductions, Gross A/B/C, Gratuity, Take Home, CTC)
2. **Applicant → Employee Mapping:** Onboarding will map Applicant fields to Employee fields
3. **Tenant Isolation:** All operations are tenant-scoped
4. **Model Registration:** Onboarding model must be registered in `dbManager.js`

---

**Report Status:** ✅ **COMPLETE**  
**Ready for Implementation:** ✅ **YES**  
**Next Step:** Create Onboarding model and controller

