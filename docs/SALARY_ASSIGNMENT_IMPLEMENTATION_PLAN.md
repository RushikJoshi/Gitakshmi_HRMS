# SALARY ASSIGNMENT MODULE - IMPLEMENTATION PLAN
**Generated:** January 2025  
**Status:** Pre-Implementation Analysis

---

## 📊 **EXECUTIVE SUMMARY**

Implement a SALARY ASSIGNMENT module that allows HR to assign salary template or Annual CTC to selected candidates BEFORE joining letter generation. The system will calculate the full CTC structure automatically and store it as an immutable snapshot on the Applicant record.

---

## 1️⃣ **CURRENT STATE ANALYSIS**

### ✅ **What Exists:**

1. **Applicant Model** (`backend/models/Applicant.js`)
   - Basic fields exist
   - **MISSING:** `salaryTemplateId` field
   - **MISSING:** `salarySnapshot` field

2. **Salary Calculation Logic** (`backend/controllers/salaryTemplate.controller.js:30`)
   - Function: `calculateSalaryStructure()`
   - Calculates: Basic structure (earnings, employer deductions, employee deductions)
   - **LIMITATION:** Does NOT calculate Gross A/B/C, Gratuity, Take Home

3. **Applicant Routes**
   - Found in `backend/routes/requirement.routes.js`
   - `GET /applicants` exists
   - **MISSING:** Salary assignment endpoint

4. **Joining Letter Generation** (`backend/controllers/letter.controller.js:946`)
   - Currently does NOT use salary data
   - Needs to be updated to use `applicant.salarySnapshot`

---

### ❌ **What's Missing:**

1. **Salary Snapshot Structure in Applicant Model**
2. **Complete Salary Calculation Service** (with Gross A/B/C, Gratuity, Take Home)
3. **Salary Assignment API Endpoint**
4. **Joining Letter Integration** (to use salarySnapshot)

---

## 2️⃣ **REQUIRED IMPLEMENTATION**

### **STEP 1: Update Applicant Model**

**File:** `backend/models/Applicant.js`

**Add Fields:**
```javascript
// Salary Assignment (before joining letter)
salaryTemplateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SalaryTemplate', 
    default: null 
},
salarySnapshot: {
    // Complete immutable salary breakdown
    salaryTemplateId: ObjectId,
    earnings: [{
        name: String,
        monthlyAmount: Number,
        annualAmount: Number
    }],
    employerContributions: [{
        name: String,
        monthlyAmount: Number,
        annualAmount: Number
    }],
    employeeDeductions: [{
        name: String,
        monthlyAmount: Number,
        annualAmount: Number,
        category: String // 'PRE_TAX' | 'POST_TAX'
    }],
    grossA: {
        monthly: Number,
        yearly: Number
    },
    grossB: {
        monthly: Number,
        yearly: Number
    },
    grossC: {
        monthly: Number, // Same as monthlyCTC
        yearly: Number   // Same as annualCTC
    },
    takeHome: {
        monthly: Number,
        yearly: Number
    },
    gratuity: {
        monthly: Number, // 4.8% of Basic
        yearly: Number
    },
    ctc: {
        monthly: Number,
        yearly: Number
    },
    calculatedAt: Date
}
```

---

### **STEP 2: Create/Extend Salary Calculation Service**

**Option A:** Create new service file `backend/services/salaryCalculation.service.js`
**Option B:** Extend existing `calculateSalaryStructure` to return complete breakdown

**Function Signature:**
```javascript
function calculateCompleteSalaryBreakdown(salaryTemplate) {
    // Input: SalaryTemplate document
    // Output: Complete breakdown including Gross A/B/C, Gratuity, Take Home
}
```

**Required Calculations:**
1. Reuse existing `calculateSalaryStructure` logic for basic calculations
2. Calculate Gross A (Basic + HRA + Allowances, excluding Fixed Allowance)
3. Calculate Gratuity (4.8% of Basic monthly/yearly)
4. Calculate Gross B (Gross A + Gratuity + Insurance if applicable)
5. Calculate Gross C / CTC (Gross B + Employer Contributions)
6. Calculate Take Home (Gross A - Employee Deductions)

---

### **STEP 3: Create Salary Assignment Controller Function**

**Location:** Create new controller `backend/controllers/applicant.controller.js` OR add to existing controller

**Function:** `assignSalary`

**Logic:**
1. Validate applicant exists and is in "Selected" status
2. Accept either:
   - `salaryTemplateId` - Use existing template
   - `annualCTC` + `earnings` + `settings` - Create calculation on-the-fly
3. Fetch SalaryTemplate if `salaryTemplateId` provided
4. Call `calculateCompleteSalaryBreakdown()` to get full breakdown
5. Store `salaryTemplateId` and `salarySnapshot` on Applicant
6. Return success response with salary snapshot

---

### **STEP 4: Create API Route**

**File:** `backend/routes/applicant.routes.js` (NEW) or add to existing routes

**Route:**
```javascript
POST /api/applicants/:id/assign-salary
```

**Request Body:**
```javascript
{
    // Option 1: Use existing template
    salaryTemplateId: "..." 
    
    // OR Option 2: Provide CTC directly
    annualCTC: 600000,
    earnings: [...],
    settings: {...}
}
```

**Response:**
```javascript
{
    success: true,
    data: {
        applicant: {...},
        salarySnapshot: {...}
    }
}
```

---

### **STEP 5: Update Joining Letter Generation**

**File:** `backend/controllers/letter.controller.js:generateJoiningLetter`

**Changes:**
1. Validate `applicant.salarySnapshot` exists
2. If missing, return error: "Salary not assigned. Please assign salary to applicant first."
3. Map `applicant.salarySnapshot` to placeholders:
   - `basic_monthly`, `basic_yearly`
   - `hra_monthly`, `hra_yearly`
   - `gross_a_monthly`, `gross_a_yearly`
   - `gross_b_monthly`, `gross_b_yearly`
   - `gross_c_monthly`, `gross_c_yearly`
   - `gratuity_monthly`, `gratuity_yearly`
   - `take_home_monthly`, `take_home_yearly`
   - `ctc_monthly`, `ctc_yearly`
   - All other earnings
4. NO calculation - only mapping from snapshot

---

## 3️⃣ **IMPLEMENTATION CHECKLIST**

### **Backend:**
- [ ] Update `Applicant` model (add `salaryTemplateId` and `salarySnapshot`)
- [ ] Create/extend salary calculation service (calculateCompleteSalaryBreakdown)
- [ ] Create applicant controller (`assignSalary` function)
- [ ] Create applicant routes file (if needed)
- [ ] Register route in `index.js`
- [ ] Update joining letter generation to use salarySnapshot
- [ ] Test salary assignment flow
- [ ] Test joining letter with salary snapshot

---

## 4️⃣ **CRITICAL LOGIC DETAILS**

### **Gross A Calculation:**
- Sum of: Basic + HRA + All Allowances (excluding Fixed Allowance)
- Fixed Allowance is a "plug" component, not part of Gross A

### **Gratuity Calculation:**
- Monthly: (Basic Monthly * 0.048)
- Yearly: (Basic Annual * 0.048)
- Employer cost only

### **Gross B Calculation:**
- Gross A + Gratuity + Insurance (if applicable)
- Insurance is optional (may not exist in all templates)

### **Gross C / CTC Calculation:**
- Gross B + Employer Contributions (EPF, ESI, EDLI, Admin Charges)
- Should match `monthlyCTC` / `annualCTC` from template

### **Take Home Calculation:**
- Gross A - Employee Deductions (PRE_TAX + POST_TAX)
- Does NOT include TDS (for joining letter, indicative only)

---

**Report Status:** ✅ **COMPLETE**  
**Ready for Implementation:** ✅ **YES**

