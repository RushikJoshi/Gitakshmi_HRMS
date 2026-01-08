# Frontend Payroll Module Architecture

**Status:** Analysis Complete - Implementation Plan  
**Last Updated:** January 2025

---

## 📋 **EXISTING FRONTEND STRUCTURE ANALYSIS**

### ✅ **What Already Exists**

#### **Pages:**
- ✅ `pages/HR/Payroll/SalaryComponents.jsx` - List earnings & deductions (with tabs)
- ✅ `pages/HR/Payroll/NewEarning.jsx` - Create/Edit earning component
- ✅ `pages/HR/Payroll/NewSalaryTemplate.jsx` - Create salary template (basic form)
- ✅ `pages/HR/Payroll/Deductions/NewDeduction.jsx` - Create/Edit deduction master
- ✅ `pages/ESS/Payslips.jsx` - Placeholder (empty component)

#### **Components:**
- ✅ `components/Payroll/SalaryComponentTable.jsx` - Table display for components

#### **Routes (configured):**
- ✅ `/hr/payroll/salary-components` - Salary components list
- ✅ `/hr/payroll/earnings/new` - New earning
- ✅ `/hr/payroll/earnings/edit/:id` - Edit earning
- ✅ `/hr/payroll/deductions/new` - New deduction
- ✅ `/hr/payroll/deductions/edit/:id` - Edit deduction
- ✅ `/hr/payroll/salary-templates/new` - New template

#### **Sidebar Navigation:**
- ✅ Payroll section in HRSidebar with:
  - Salary Components
  - Salary Templates

---

## ❌ **WHAT IS MISSING (To Be Implemented)**

### **1. Payroll Setup Screens**

#### **A. Salary Templates Management**
- ❌ List all salary templates
- ❌ View template details
- ❌ Edit template (if not assigned)
- ❌ Delete template (if not assigned)
- ❌ Assign template to employees

**Files Needed:**
- `pages/HR/Payroll/SalaryTemplates.jsx` (List view)
- `pages/HR/Payroll/SalaryTemplateView.jsx` (Detail/Edit view)

#### **B. Employee Payroll Configuration**
- ❌ Assign salary template to employee
- ❌ List employee deductions
- ❌ Assign employee deductions
- ❌ Edit/Remove employee deductions

**Files Needed:**
- `pages/HR/Payroll/EmployeePayrollConfig.jsx` (or integrate into EmployeeForm)
- `components/Payroll/EmployeeDeductionForm.jsx`

### **2. Payroll Processing UI**

#### **A. Payroll Run Dashboard**
- ❌ List all payroll runs
- ❌ Initiate new payroll run
- ❌ View payroll run details
- ❌ Calculate payroll
- ❌ Approve payroll
- ❌ Mark as paid
- ❌ Cancel payroll run

**Files Needed:**
- `pages/HR/Payroll/PayrollRuns.jsx` (List dashboard)
- `pages/HR/Payroll/PayrollRunDetail.jsx` (Detail & actions)
- `components/Payroll/PayrollRunCard.jsx`
- `components/Payroll/PayrollRunStatusBadge.jsx`
- `components/Payroll/InitiatePayrollModal.jsx`

#### **B. Payroll Review UI**
- ❌ Employee-wise payroll summary
- ❌ Gross vs Net comparison
- ❌ Error flags display
- ❌ Read-only review screen

**Files Needed:**
- `pages/HR/Payroll/PayrollReview.jsx` (Part of PayrollRunDetail)
- `components/Payroll/PayrollSummaryTable.jsx`
- `components/Payroll/PayrollErrorFlags.jsx`

### **3. Payslip UI**

#### **A. Employee Payslip List**
- ❌ List employee's payslips
- ❌ Month/Year filter
- ❌ Download PDF

**Files Needed:**
- `pages/ESS/Payslips.jsx` (Replace placeholder)
- `components/Payroll/PayslipCard.jsx`
- `components/Payroll/PayslipFilter.jsx`

#### **B. Payslip View Screen**
- ❌ Display payslip snapshot
- ❌ Earnings breakdown
- ❌ Deductions breakdown
- ❌ Employer contributions
- ❌ Download PDF button

**Files Needed:**
- `pages/ESS/PayslipView.jsx`
- `components/Payroll/PayslipDisplay.jsx`
- `components/Payroll/EarningsBreakdown.jsx`
- `components/Payroll/DeductionsBreakdown.jsx`

---

## 🏗️ **PROPOSED COMPONENT STRUCTURE**

```
frontend/src/
├── pages/
│   ├── HR/
│   │   └── Payroll/
│   │       ├── SalaryComponents.jsx          ✅ EXISTS
│   │       ├── NewEarning.jsx                ✅ EXISTS
│   │       ├── NewSalaryTemplate.jsx         ✅ EXISTS (needs enhancement)
│   │       ├── SalaryTemplates.jsx           ❌ NEW - List templates
│   │       ├── SalaryTemplateView.jsx        ❌ NEW - View/Edit template
│   │       ├── PayrollRuns.jsx               ❌ NEW - Payroll dashboard
│   │       ├── PayrollRunDetail.jsx          ❌ NEW - Run details & review
│   │       ├── EmployeePayrollConfig.jsx     ❌ NEW - Assign template/deductions
│   │       └── Deductions/
│   │           └── NewDeduction.jsx          ✅ EXISTS
│   │
│   └── ESS/
│       ├── Payslips.jsx                      ✅ EXISTS (placeholder - needs rewrite)
│       └── PayslipView.jsx                   ❌ NEW - View payslip details
│
├── components/
│   └── Payroll/
│       ├── SalaryComponentTable.jsx          ✅ EXISTS
│       ├── PayrollRunCard.jsx                ❌ NEW - Run card component
│       ├── PayrollRunStatusBadge.jsx         ❌ NEW - Status badge
│       ├── InitiatePayrollModal.jsx          ❌ NEW - Initiate run modal
│       ├── PayrollSummaryTable.jsx           ❌ NEW - Summary table
│       ├── PayrollErrorFlags.jsx             ❌ NEW - Error indicators
│       ├── PayslipCard.jsx                   ❌ NEW - Payslip list item
│       ├── PayslipFilter.jsx                 ❌ NEW - Filter component
│       ├── PayslipDisplay.jsx                ❌ NEW - Full payslip view
│       ├── EarningsBreakdown.jsx             ❌ NEW - Earnings section
│       ├── DeductionsBreakdown.jsx           ❌ NEW - Deductions section
│       ├── EmployeeDeductionForm.jsx         ❌ NEW - Assign deduction form
│       └── SalaryTemplatePreview.jsx         ❌ NEW - Template preview card
```

---

## 📱 **SCREEN FLOW & NAVIGATION**

### **HR Payroll Flow:**

```
HR Dashboard
    ↓
Payroll Section (Sidebar)
    ├─→ Salary Components
    │   ├─→ List (Earnings/Deductions tabs)
    │   ├─→ Add/Edit Earning
    │   └─→ Add/Edit Deduction
    │
    ├─→ Salary Templates
    │   ├─→ List Templates
    │   ├─→ Create Template
    │   ├─→ View/Edit Template
    │   └─→ Assign to Employees
    │
    ├─→ Payroll Runs
    │   ├─→ Dashboard (List all runs)
    │   ├─→ Initiate Payroll
    │   ├─→ Run Detail
    │   │   ├─→ Calculate
    │   │   ├─→ Review
    │   │   ├─→ Approve
    │   │   └─→ Mark as Paid
    │   └─→ Payroll Review (Employee summary)
    │
    └─→ Employee Payroll Config
        ├─→ Assign Salary Template
        └─→ Manage Deductions
```

### **Employee Payslip Flow:**

```
Employee Dashboard
    ↓
Payslips (Sidebar)
    ├─→ My Payslips List
    │   ├─→ Filter by Month/Year
    │   └─→ Select Payslip
    │
    └─→ Payslip View
        ├─→ Display Snapshot
        └─→ Download PDF
```

---

## 🎨 **NAVIGATION HIERARCHY UPDATE**

### **HRSidebar Update:**

```javascript
{
  title: 'Payroll',
  items: [
    { to: '/hr/payroll/salary-components', label: 'Salary Components', icon: ICONS.payroll },
    { to: '/hr/payroll/salary-templates', label: 'Salary Templates', icon: ICONS.payroll },
    { to: '/hr/payroll/runs', label: 'Payroll Runs', icon: ICONS.payroll },
    { to: '/hr/payroll/employee-config', label: 'Employee Config', icon: ICONS.payroll }
  ]
}
```

### **EmployeeSidebar Update:**

```javascript
// In EssLayout or EmployeeSidebar
{
  title: 'PAYROLL',
  items: [
    { to: '/employee/payslips', label: 'My Payslips', icon: ICONS.fileText }
  ]
}
```

---

## 📊 **COMPONENT SPECIFICATIONS**

### **1. Payroll Runs Dashboard (`PayrollRuns.jsx`)**

**Purpose:** List all payroll runs, initiate new runs

**Features:**
- Table/list of payroll runs
- Status badges (INITIATED, CALCULATED, APPROVED, PAID, CANCELLED)
- Filter by year, month, status
- "Initiate Payroll" button
- Quick stats (total runs, current month status)

**API Calls:**
- `GET /api/payroll/runs` - List runs
- `POST /api/payroll/runs` - Initiate run

**State:**
- `payrollRuns[]` - List of runs
- `loading` - Loading state
- `filters` - Year, month, status

**Components Used:**
- `PayrollRunCard` - Individual run card
- `InitiatePayrollModal` - Modal to initiate new run

---

### **2. Payroll Run Detail (`PayrollRunDetail.jsx`)**

**Purpose:** View run details, perform actions (calculate, approve, pay)

**Features:**
- Run information (month, year, status, dates)
- Action buttons (based on status):
  - INITIATED → "Calculate Payroll"
  - CALCULATED → "Approve" / "Cancel"
  - APPROVED → "Mark as Paid" / "Cancel"
  - PAID → Read-only
- Statistics (total employees, gross, net, errors)
- Employee payslip list
- Error summary

**API Calls:**
- `GET /api/payroll/runs/:id` - Get run details
- `POST /api/payroll/runs/:id/calculate` - Calculate
- `POST /api/payroll/runs/:id/approve` - Approve
- `POST /api/payroll/runs/:id/mark-paid` - Mark paid
- `POST /api/payroll/runs/:id/cancel` - Cancel

**State:**
- `payrollRun` - Run details
- `payslips[]` - List of payslips
- `loading` - Loading state
- `actionLoading` - Action in progress

**Components Used:**
- `PayrollRunStatusBadge` - Status display
- `PayrollSummaryTable` - Summary stats
- `PayrollErrorFlags` - Error indicators
- `PayslipCard` - Payslip list items

---

### **3. Salary Templates List (`SalaryTemplates.jsx`)**

**Purpose:** List all salary templates, create new, view/edit existing

**Features:**
- Table/cards of templates
- Template details (name, CTC, assigned count)
- Actions: View, Edit, Delete, Assign
- "Create Template" button
- Filter/search

**API Calls:**
- `GET /api/payroll/salary-templates` - List templates
- `DELETE /api/payroll/salary-templates/:id` - Delete (if not assigned)

**State:**
- `templates[]` - List of templates
- `loading` - Loading state

**Components Used:**
- `SalaryTemplatePreview` - Template card

---

### **4. Salary Template View (`SalaryTemplateView.jsx`)**

**Purpose:** View/edit template details, assign to employees

**Features:**
- Template information display
- Earnings breakdown (read-only)
- Employer contributions (read-only)
- Employee deductions reference (read-only)
- Edit button (disabled if `isAssigned`)
- Assign to employees section
- Template statistics

**API Calls:**
- `GET /api/payroll/salary-templates/:id` - Get template
- `PUT /api/payroll/salary-templates/:id` - Update (if not assigned)
- `GET /api/hr/employees` - List employees for assignment
- `PUT /api/hr/employees/:id/salary-template` - Assign (TODO: backend)

**State:**
- `template` - Template data
- `employees[]` - Employee list
- `loading` - Loading state
- `editMode` - Edit mode flag

---

### **5. Employee Payslips (`Payslips.jsx`)**

**Purpose:** Employee self-service payslip list

**Features:**
- List of payslips (cards or table)
- Month/Year filter dropdown
- Payslip card showing:
  - Month/Year
  - Net Pay
  - Status
  - View button
  - Download PDF button
- Empty state message

**API Calls:**
- `GET /api/payroll/payslips/my?year=2025&month=1` - Get payslips

**State:**
- `payslips[]` - List of payslips
- `loading` - Loading state
- `filters` - Year, month

**Components Used:**
- `PayslipCard` - Payslip list item
- `PayslipFilter` - Filter component

---

### **6. Payslip View (`PayslipView.jsx`)**

**Purpose:** Display payslip snapshot (read-only)

**Features:**
- Employee information section
- Earnings breakdown table
- Pre-tax deductions table
- Post-tax deductions table
- Employer contributions (informational)
- Summary totals
- Attendance summary
- Download PDF button
- Print-friendly layout

**API Calls:**
- `GET /api/payroll/payslips/my/:id` - Get payslip
- `GET /api/payroll/payslips/my/:id/download` - Download PDF

**State:**
- `payslip` - Payslip data
- `loading` - Loading state
- `downloading` - PDF download state

**Components Used:**
- `PayslipDisplay` - Main display component
- `EarningsBreakdown` - Earnings section
- `DeductionsBreakdown` - Deductions section

---

## 🎯 **IMPLEMENTATION PRIORITY**

### **Phase 1: Core Payroll Processing** (High Priority)
1. ✅ Payroll Runs Dashboard (`PayrollRuns.jsx`)
2. ✅ Payroll Run Detail (`PayrollRunDetail.jsx`)
3. ✅ Initiate Payroll Modal (`InitiatePayrollModal.jsx`)
4. ✅ Payroll Run Status Badge (`PayrollRunStatusBadge.jsx`)
5. ✅ Payroll Summary Table (`PayrollSummaryTable.jsx`)

### **Phase 2: Employee Payslips** (High Priority)
6. ✅ Employee Payslips List (`Payslips.jsx` - rewrite)
7. ✅ Payslip View (`PayslipView.jsx`)
8. ✅ Payslip Display Component (`PayslipDisplay.jsx`)
9. ✅ Payslip Card (`PayslipCard.jsx`)

### **Phase 3: Salary Templates Management** (Medium Priority)
10. ✅ Salary Templates List (`SalaryTemplates.jsx`)
11. ✅ Salary Template View (`SalaryTemplateView.jsx`)
12. ✅ Template Preview Component (`SalaryTemplatePreview.jsx`)

### **Phase 4: Employee Configuration** (Medium Priority)
13. ✅ Employee Payroll Config (`EmployeePayrollConfig.jsx`)
14. ✅ Employee Deduction Form (`EmployeeDeductionForm.jsx`)

### **Phase 5: Enhancements** (Low Priority)
15. ✅ Error Flags Component (`PayrollErrorFlags.jsx`)
16. ✅ Filter Components
17. ✅ Export/Print functionality

---

## 🎨 **UI/UX PATTERNS TO FOLLOW**

### **Design System:**
- Colors: Blue-600 primary, Slate-900 text, Slate-200 borders
- Typography: Tailwind classes (text-sm, font-semibold, etc.)
- Spacing: Consistent padding (p-4, p-6), gaps (gap-4, gap-6)
- Cards: White bg, rounded-xl, shadow-sm, border border-slate-200
- Buttons: Blue-600 bg, white text, rounded-lg, hover effects
- Status Badges: Color-coded (emerald=active, amber=pending, red=error)

### **Common Patterns:**
```jsx
// Loading State
{loading ? (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
  </div>
) : (
  // Content
)}

// Error Handling
catch (err) {
  console.error('Error:', err);
  alert(err.response?.data?.error || 'Failed to load data');
}

// Empty State
{data.length === 0 && (
  <div className="text-center py-12 text-slate-400">
    <p>No data found</p>
  </div>
)}
```

### **Status Badge Pattern:**
```jsx
const statusColors = {
  INITIATED: 'bg-slate-100 text-slate-700',
  CALCULATED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PAID: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-rose-100 text-rose-700'
};
```

---

## 📝 **ROUTES TO ADD**

```javascript
// In AppRoutes.jsx - HR routes section

{/* Payroll */}
<Route path="payroll/salary-components" element={<SalaryComponents />} />
<Route path="payroll/earnings/new" element={<NewEarning />} />
<Route path="payroll/earnings/edit/:id" element={<NewEarning />} />
<Route path="payroll/deductions/new" element={<NewDeduction />} />
<Route path="payroll/deductions/edit/:id" element={<NewDeduction />} />
<Route path="payroll/salary-templates" element={<SalaryTemplates />} /> {/* NEW */}
<Route path="payroll/salary-templates/new" element={<NewSalaryTemplate />} />
<Route path="payroll/salary-templates/:id" element={<SalaryTemplateView />} /> {/* NEW */}
<Route path="payroll/runs" element={<PayrollRuns />} /> {/* NEW */}
<Route path="payroll/runs/:id" element={<PayrollRunDetail />} /> {/* NEW */}
<Route path="payroll/employee-config" element={<EmployeePayrollConfig />} /> {/* NEW */}

// Employee routes section
<Route path="payslips" element={<Payslips />} />
<Route path="payslips/:id" element={<PayslipView />} /> {/* NEW */}
```

---

## 🔒 **VALIDATION & RULES (Frontend Only)**

### **Form Validations:**
- Month: 1-12
- Year: 2000-2100
- CTC: > 0
- All required fields must be filled

### **UI State Rules:**
- Disable "Calculate" if status !== INITIATED
- Disable "Approve" if status !== CALCULATED
- Disable "Mark Paid" if status !== APPROVED
- Show confirmation modals before:
  - Calculate payroll
  - Approve payroll
  - Mark as paid
  - Cancel payroll run

### **Read-Only Rules:**
- Payslips are always read-only (immutable)
- Payroll run details read-only after PAID
- Template read-only if `isAssigned === true`

---

## 🚀 **NEXT STEPS**

1. **Start with Phase 1:** Payroll Runs Dashboard
2. **Implement core workflow:** Initiate → Calculate → Approve → Pay
3. **Then Phase 2:** Employee payslip views
4. **Follow existing patterns:** Use same styling, API patterns, component structure
5. **Test incrementally:** Each screen independently

---

## ✅ **CHECKLIST BEFORE STARTING**

- [x] Understand existing codebase patterns
- [x] Identify existing payroll components
- [x] Document missing components
- [x] Plan component structure
- [x] Define routes
- [x] Plan navigation hierarchy
- [ ] Start implementation (Phase 1)

---

**Ready to implement!** 🎯

