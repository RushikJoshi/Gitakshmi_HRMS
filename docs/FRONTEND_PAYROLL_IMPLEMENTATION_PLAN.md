# Frontend Payroll Implementation Plan

## 📊 **ANALYSIS COMPLETE**

### ✅ **Existing Frontend Structure:**

**Pages Found:**
- ✅ `pages/HR/Payroll/SalaryComponents.jsx` - Working component list
- ✅ `pages/HR/Payroll/NewEarning.jsx` - Create/Edit earning
- ✅ `pages/HR/Payroll/NewSalaryTemplate.jsx` - Basic template form
- ✅ `pages/HR/Payroll/Deductions/NewDeduction.jsx` - Create/Edit deduction
- ✅ `pages/ESS/Payslips.jsx` - **Placeholder (needs complete rewrite)**

**Components Found:**
- ✅ `components/Payroll/SalaryComponentTable.jsx` - Table component

**Routes Configured:**
- ✅ Salary components routes
- ✅ Earnings routes
- ✅ Deductions routes
- ❌ Missing: Payroll runs, Template list, Payslip view

**Navigation:**
- ✅ HR Sidebar has Payroll section (2 items)
- ✅ Employee Sidebar has "My Payslips" (already configured!)

---

## 🎯 **IMPLEMENTATION PLAN**

### **Priority 1: Payroll Processing UI** (Critical)

**1. Payroll Runs Dashboard**
- File: `pages/HR/Payroll/PayrollRuns.jsx`
- Features:
  - List all payroll runs (table/cards)
  - Filter by year, month, status
  - "Initiate Payroll" button
  - Status badges
  - Quick stats
- APIs: `GET /api/payroll/runs`, `POST /api/payroll/runs`

**2. Payroll Run Detail**
- File: `pages/HR/Payroll/PayrollRunDetail.jsx`
- Features:
  - Run information display
  - Action buttons (Calculate, Approve, Mark Paid, Cancel)
  - Employee payslip summary
  - Error display
  - Statistics
- APIs: `GET /api/payroll/runs/:id`, `POST /api/payroll/runs/:id/*`

**3. Supporting Components:**
- `components/Payroll/PayrollRunCard.jsx`
- `components/Payroll/PayrollRunStatusBadge.jsx`
- `components/Payroll/InitiatePayrollModal.jsx`
- `components/Payroll/PayrollSummaryTable.jsx`

---

### **Priority 2: Employee Payslip Views** (High)

**1. Payslips List (Rewrite existing)**
- File: `pages/ESS/Payslips.jsx` (replace placeholder)
- Features:
  - List employee payslips
  - Month/Year filter
  - Payslip cards with net pay
  - View & Download buttons
- APIs: `GET /api/payroll/payslips/my`

**2. Payslip View**
- File: `pages/ESS/PayslipView.jsx`
- Features:
  - Full payslip display (read-only)
  - Earnings breakdown
  - Deductions breakdown
  - Employer contributions
  - Download PDF button
- APIs: `GET /api/payroll/payslips/my/:id`, `GET /api/payroll/payslips/my/:id/download`

**3. Supporting Components:**
- `components/Payroll/PayslipCard.jsx`
- `components/Payroll/PayslipDisplay.jsx`
- `components/Payroll/EarningsBreakdown.jsx`
- `components/Payroll/DeductionsBreakdown.jsx`
- `components/Payroll/PayslipFilter.jsx`

---

### **Priority 3: Template Management** (Medium)

**1. Salary Templates List**
- File: `pages/HR/Payroll/SalaryTemplates.jsx`
- Features:
  - List all templates
  - Template cards with details
  - Create, View, Edit, Delete actions
  - Assign to employees
- APIs: `GET /api/payroll/salary-templates`

**2. Template View/Edit**
- File: `pages/HR/Payroll/SalaryTemplateView.jsx`
- Features:
  - View template details
  - Edit (if not assigned)
  - Assign to employees section
  - Template breakdown display
- APIs: `GET /api/payroll/salary-templates/:id`, `PUT /api/payroll/salary-templates/:id`

---

### **Priority 4: Employee Configuration** (Medium)

**1. Employee Payroll Config**
- File: `pages/HR/Payroll/EmployeePayrollConfig.jsx`
- Features:
  - Assign salary template
  - Manage employee deductions
  - View current assignments
- APIs: `PUT /api/hr/employees/:id/salary-template` (TODO backend), `GET /api/deductions/employee/:id`

---

## 📐 **COMPONENT ARCHITECTURE**

```
PayrollRuns (Page)
  ├─ PayrollRunCard (Component)
  ├─ PayrollRunStatusBadge (Component)
  └─ InitiatePayrollModal (Component)

PayrollRunDetail (Page)
  ├─ PayrollRunStatusBadge (Component)
  ├─ PayrollSummaryTable (Component)
  ├─ PayrollErrorFlags (Component)
  └─ PayslipCard (Component)

Payslips (Page - Employee)
  ├─ PayslipFilter (Component)
  └─ PayslipCard (Component)

PayslipView (Page - Employee)
  ├─ PayslipDisplay (Component)
  │   ├─ EarningsBreakdown (Component)
  │   └─ DeductionsBreakdown (Component)
  └─ Download Button

SalaryTemplates (Page)
  └─ SalaryTemplatePreview (Component)

SalaryTemplateView (Page)
  └─ Template Breakdown Display
```

---

## 🎨 **DESIGN PATTERNS TO FOLLOW**

### **Existing Patterns (from codebase):**
- ✅ Uses Tailwind CSS
- ✅ Slate color scheme (slate-900, slate-200, etc.)
- ✅ Blue-600 primary color
- ✅ Rounded-xl cards with shadow-sm
- ✅ Lucide React icons
- ✅ useState/useEffect hooks
- ✅ api utility from `utils/api.js`
- ✅ Loading states with Loader2 icon
- ✅ Error handling with try/catch
- ✅ Navigation with useNavigate

### **Status Badge Colors:**
```javascript
INITIATED → Slate (gray)
CALCULATED → Blue
APPROVED → Emerald (green)
PAID → Purple
CANCELLED → Rose (red)
```

---

## 🔌 **ROUTES TO ADD**

```javascript
// HR Routes (in AppRoutes.jsx)
<Route path="payroll/runs" element={<PayrollRuns />} />
<Route path="payroll/runs/:id" element={<PayrollRunDetail />} />
<Route path="payroll/salary-templates" element={<SalaryTemplates />} />
<Route path="payroll/salary-templates/:id" element={<SalaryTemplateView />} />

// Employee Routes (already configured but needs PayslipView)
<Route path="payslips" element={<Payslips />} />
<Route path="payslips/:id" element={<PayslipView />} />
```

---

## 🚦 **WORKFLOW STATES**

### **Payroll Run Status Flow:**
```
INITIATED
  ↓ [Calculate]
CALCULATED
  ↓ [Approve]
APPROVED
  ↓ [Mark Paid]
PAID
```

### **Button States:**
- INITIATED: Show "Calculate Payroll" button
- CALCULATED: Show "Approve" and "Cancel" buttons
- APPROVED: Show "Mark as Paid" and "Cancel" buttons
- PAID: Show read-only view (no action buttons)
- CANCELLED: Show read-only view

---

## ✅ **READY TO IMPLEMENT**

All analysis complete. Architecture planned. Following existing patterns.

**Start with:** Payroll Runs Dashboard (Priority 1)

---

**Document Status:** ✅ Complete  
**Next Step:** Begin implementation

