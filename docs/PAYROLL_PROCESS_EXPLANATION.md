# 📊 Complete Payroll Process & Payslip Generation Guide

## Overview
This document explains the entire payroll processing workflow in the HRMS SaaS system, from initial setup to payslip generation.

---

## 🏗️ **Phase 1: System Setup (One-Time Configuration)**

### 1.1 **Salary Components (Earnings)**
HR creates earning components that make up an employee's salary.

**Location:** `/api/payroll/earnings`

**Components:**
- **Basic Salary** (Mandatory)
- **HRA** (House Rent Allowance)
- **Conveyance Allowance**
- **Medical Allowance**
- **LTA** (Leave Travel Allowance)
- **Special Allowances**
- Any custom allowances

**Configuration Options:**
- `calculationType`: 
  - `FLAT_AMOUNT` - Fixed monthly amount
  - `PERCENTAGE_OF_BASIC` - Percentage of Basic salary
- `isProRataBasis`: If enabled, salary is adjusted based on attendance
- `isTaxable`: Whether this component is taxable
- `showInPayslip`: Whether to display in payslip
- `epf.enabled`: If EPF contribution applies to this component
- `esi.enabled`: If ESI contribution applies to this component

### 1.2 **Deduction Masters**
HR creates deduction types that can be applied to employees.

**Components:**
- **Employee PF Contribution** (PRE_TAX)
- **Employee ESI Contribution** (PRE_TAX)
- **Professional Tax** (PRE_TAX)
- **Income Tax / TDS** (PRE_TAX)
- **Loan EMI** (POST_TAX)
- **Advance Recovery** (POST_TAX)
- **Loss of Pay (LOP)** (POST_TAX)
- **Penalties** (POST_TAX)

**Configuration:**
- `category`: `PRE_TAX` or `POST_TAX`
- `amountType`: `FIXED` or `PERCENTAGE`
- `calculationBase`: `BASIC` or `GROSS` (for percentage-based)
- `recurring`: Whether it's a monthly deduction or one-time

### 1.3 **Salary Templates**
HR creates salary structure templates based on CTC (Cost to Company).

**Location:** `/api/payroll/salary-templates`

**Process:**
1. Enter **Annual CTC** (e.g., ₹12,00,000)
2. System calculates **Monthly CTC** = Annual CTC / 12
3. Define earnings breakdown:
   - Basic (e.g., 40% of CTC)
   - HRA (e.g., 40% of Basic)
   - Other allowances
4. System automatically calculates:
   - **Employer PF Contribution** (12% of PF wage, max ₹1,800)
   - **Employer ESI Contribution** (3.25% of Gross, if Gross ≤ ₹21,000)
   - **EDLI** (0.5% of PF wage)
   - **EPF Admin Charges** (0.5% of PF wage)
   - **Fixed Allowance** (balance to match CTC)

**Important:** CTC = Gross Earnings + Employer Contributions

---

## 👤 **Phase 2: Employee Salary Assignment**

### 2.1 **Assign Salary Template to Employee**
- HR assigns a salary template to an employee
- Employee's monthly salary structure is locked from the template
- Template cannot be edited once assigned to employees

### 2.2 **Assign Employee Deductions**
- HR assigns active deductions to specific employees
- Example: Employee PF, ESI, Loan EMI, etc.
- Can override default values with custom amounts
- Set start date and end date (if applicable)

---

## 📅 **Phase 3: Monthly Payroll Processing**

### 3.1 **Payroll Run Initiation**
HR initiates payroll for a specific month (e.g., January 2025).

### 3.2 **Payroll Calculation Flow**

#### **Step 1: Fetch Employee Data**
```
For each employee:
- Get assigned Salary Template
- Get active Employee Deductions
- Fetch attendance records for the month
```

#### **Step 2: Calculate Gross Earnings**

```javascript
Gross Earnings = Sum of all Earning Components

// Example:
Basic Salary        = ₹40,000
HRA                 = ₹16,000 (40% of Basic)
Conveyance          = ₹1,600
Medical             = ₹1,250
Special Allowance   = ₹6,150
Fixed Allowance     = ₹15,000
─────────────────────────────────
Gross Earnings      = ₹80,000
```

**Pro-Rata Calculation (if enabled):**
If an earning component has `isProRataBasis: true`:
```
Pro-Rated Amount = (Monthly Amount / Days in Month) × Present Days

Example:
- Monthly Basic = ₹40,000
- Days in Month = 31
- Present Days = 28 (3 days leave)
- Pro-Rated Basic = (40,000 / 31) × 28 = ₹36,129
```

#### **Step 3: Calculate Pre-Tax Deductions**

```javascript
Pre-Tax Deductions = Sum of all PRE_TAX deductions

// Example:
Employee PF         = ₹1,800 (12% of PF wage, max ₹15,000)
Employee ESI        = ₹325 (0.75% of Gross, if Gross ≤ ₹21,000)
Professional Tax    = ₹200 (Fixed)
Income Tax (TDS)    = ₹5,000 (Based on tax regime)
─────────────────────────────────
Total Pre-Tax       = ₹7,325
```

**Taxable Income:**
```
Taxable Income = Gross Earnings - Pre-Tax Deductions
                = ₹80,000 - ₹7,325
                = ₹72,675
```

#### **Step 4: Calculate Post-Tax Deductions**

```javascript
Post-Tax Deductions = Sum of all POST_TAX deductions

// Example:
Loan EMI            = ₹3,000
Advance Recovery     = ₹1,000
LOP Deduction        = ₹1,935 (3 days leave)
─────────────────────────────────
Total Post-Tax      = ₹5,935
```

**Important:** Post-tax deductions do NOT reduce tax liability. They are deducted after tax calculation.

#### **Step 5: Calculate Net Pay**

```javascript
Net Pay = (Taxable Income - TDS) - Post-Tax Deductions
        = (₹72,675 - ₹5,000) - ₹5,935
        = ₹67,675 - ₹5,935
        = ₹61,740
```

---

## 📄 **Phase 4: Payslip Generation**

### 4.1 **Payslip Structure**

A payslip contains the following sections:

#### **A. Employee Information**
- Employee Name
- Employee ID
- Department
- Designation
- Bank Account Details
- Pay Period (Month & Year)

#### **B. Earnings Breakdown**
```
┌─────────────────────────────┬──────────────┐
│ Component                   │ Amount       │
├─────────────────────────────┼──────────────┤
│ Basic Salary                │ ₹40,000      │
│ HRA                         │ ₹16,000      │
│ Conveyance Allowance        │ ₹1,600       │
│ Medical Allowance           │ ₹1,250       │
│ Special Allowance           │ ₹6,150       │
│ Fixed Allowance             │ ₹15,000      │
├─────────────────────────────┼──────────────┤
│ Gross Earnings              │ ₹80,000      │
└─────────────────────────────┴──────────────┘
```

#### **C. Deductions Breakdown**

**Pre-Tax Deductions:**
```
┌─────────────────────────────┬──────────────┐
│ Employee PF                 │ ₹1,800       │
│ Employee ESI                │ ₹325         │
│ Professional Tax            │ ₹200         │
│ Income Tax (TDS)            │ ₹5,000       │
├─────────────────────────────┼──────────────┤
│ Total Pre-Tax Deductions    │ ₹7,325       │
└─────────────────────────────┴──────────────┘
```

**Post-Tax Deductions:**
```
┌─────────────────────────────┬──────────────┐
│ Loan EMI                    │ ₹3,000       │
│ Advance Recovery             │ ₹1,000       │
│ Loss of Pay (LOP)           │ ₹1,935       │
├─────────────────────────────┼──────────────┤
│ Total Post-Tax Deductions   │ ₹5,935       │
└─────────────────────────────┴──────────────┘
```

#### **D. Summary**
```
┌─────────────────────────────┬──────────────┐
│ Gross Earnings              │ ₹80,000      │
│ Less: Pre-Tax Deductions    │ -₹7,325      │
│ Taxable Income              │ ₹72,675      │
│ Less: Income Tax (TDS)      │ -₹5,000      │
│ Less: Post-Tax Deductions   │ -₹5,935      │
├─────────────────────────────┼──────────────┤
│ Net Pay (Take Home)         │ ₹61,740      │
└─────────────────────────────┴──────────────┘
```

#### **E. Employer Contributions (Informational)**
```
┌─────────────────────────────┬──────────────┐
│ EPF Employer (12%)          │ ₹1,800       │
│ ESI Employer (3.25%)        │ ₹2,600       │
│ EDLI (0.5%)                 │ ₹75          │
│ EPF Admin (0.5%)            │ ₹75          │
├─────────────────────────────┼──────────────┤
│ Total Employer Contribution │ ₹4,550       │
└─────────────────────────────┴──────────────┘
```

**Note:** Employer contributions are NOT deducted from employee salary. They are additional costs to the company.

#### **F. Year-to-Date (YTD) Summary**
- Total Earnings (YTD)
- Total Deductions (YTD)
- Total Net Pay (YTD)
- Total Tax Paid (YTD)

---

## 🔄 **Complete Workflow Summary**

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: SETUP (One-Time)                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Create Salary Components (Earnings)                      │
│    → Basic, HRA, Allowances, etc.                           │
│                                                              │
│ 2. Create Deduction Masters                                 │
│    → PF, ESI, TDS, Loans, etc.                              │
│                                                              │
│ 3. Create Salary Templates                                  │
│    → Define CTC-based salary structures                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: EMPLOYEE ASSIGNMENT                                 │
├─────────────────────────────────────────────────────────────┤
│ 4. Assign Salary Template to Employee                       │
│    → Employee gets fixed salary structure                   │
│                                                              │
│ 5. Assign Employee Deductions                               │
│    → PF, ESI, Loans, etc. for specific employee             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: MONTHLY PAYROLL RUN                                 │
├─────────────────────────────────────────────────────────────┤
│ 6. HR Initiates Payroll for Month                           │
│    → Select month/year (e.g., January 2025)                 │
│                                                              │
│ 7. System Calculates for Each Employee:                     │
│    a) Gross Earnings (from template + attendance)           │
│    b) Pre-Tax Deductions (PF, ESI, TDS)                     │
│    c) Taxable Income = Gross - Pre-Tax                      │
│    d) Income Tax (TDS) calculation                          │
│    e) Post-Tax Deductions (Loans, LOP, etc.)                │
│    f) Net Pay = (Taxable - TDS) - Post-Tax                  │
│                                                              │
│ 8. Generate Payslips                                        │
│    → PDF format with complete breakdown                     │
│                                                              │
│ 9. Approve & Process Payroll                                │
│    → Lock attendance records                                 │
│    → Mark deductions as processed                            │
│    → Generate bank file for salary transfer                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: EMPLOYEE ACCESS                                     │
├─────────────────────────────────────────────────────────────┤
│ 10. Employees View Payslips                                 │
│     → Login to Employee Portal                              │
│     → Navigate to "My Payslips"                             │
│     → Download PDF payslips                                 │
│                                                              │
│ 11. Historical Access                                       │
│     → View all past payslips                                │
│     → Year-to-date summaries                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 **Key Concepts Explained**

### **CTC (Cost to Company)**
The total cost the company incurs for an employee, including:
- Gross Salary (what employee receives)
- Employer PF Contribution
- Employer ESI Contribution
- Other employer contributions

**Formula:** `CTC = Gross Salary + Employer Contributions`

### **Gross Salary**
Total earnings before any deductions.

**Formula:** `Gross = Basic + HRA + Allowances + Fixed Allowance`

### **Taxable Income**
The amount on which income tax is calculated.

**Formula:** `Taxable Income = Gross - Pre-Tax Deductions`

### **Net Pay (Take Home Salary)**
The final amount transferred to employee's bank account.

**Formula:** `Net Pay = (Taxable Income - TDS) - Post-Tax Deductions`

### **Pre-Tax vs Post-Tax Deductions**

**PRE_TAX Deductions:**
- Reduce taxable income
- Examples: PF, ESI, Professional Tax, TDS
- **Benefit:** Lower tax liability

**POST_TAX Deductions:**
- Do NOT reduce taxable income
- Examples: Loan EMI, Advance Recovery, LOP, Penalties
- **Note:** Already taxed income is deducted

### **Pro-Rata Calculation**
If an employee joins mid-month or takes leave, salary is adjusted proportionally.

**Formula:** `Pro-Rated Amount = (Monthly Amount / Days in Month) × Present Days`

---

## 📋 **Calculation Order (Critical)**

**The order of calculations is MANDATORY:**

1. ✅ **Gross Earnings** (Sum of all earnings)
2. ✅ **Pre-Tax Deductions** (PF, ESI, Professional Tax)
3. ✅ **Taxable Income** = Gross - Pre-Tax
4. ✅ **Income Tax (TDS)** (Calculated on Taxable Income)
5. ✅ **Post-Tax Deductions** (Loans, LOP, etc.)
6. ✅ **Net Pay** = (Taxable Income - TDS) - Post-Tax

**⚠️ Wrong Order = Wrong Calculations!**

---

## 🔒 **Data Integrity & Business Rules**

### **Template Rules:**
- ✅ Once a template is assigned to employees, it cannot be edited
- ✅ Only description can be changed for assigned templates
- ✅ New template must be created for changes

### **Component Rules:**
- ✅ Components used in payroll cannot be deleted
- ✅ Only name, payslip name, and amounts can be edited for used components
- ✅ Calculation types cannot be changed once used

### **Attendance Lock:**
- ✅ After payroll processing, attendance records are locked
- ✅ No manual overrides allowed for processed months
- ✅ Regularization requests required for corrections

---

## 🎯 **Example: Complete Calculation**

Let's calculate payroll for **Rajesh Kumar** for **January 2025**:

### **Employee Details:**
- **CTC:** ₹12,00,000 per annum
- **Monthly CTC:** ₹1,00,000
- **Basic:** 40% of CTC = ₹40,000
- **HRA:** 40% of Basic = ₹16,000
- **Present Days:** 28 out of 31 (3 days leave)

### **Step-by-Step Calculation:**

#### **1. Gross Earnings:**
```
Basic              = ₹40,000
HRA                = ₹16,000
Conveyance         = ₹1,600
Medical            = ₹1,250
Special Allowance  = ₹6,150
Fixed Allowance    = ₹15,000
─────────────────────────────
Gross Earnings     = ₹80,000
```

#### **2. Pre-Tax Deductions:**
```
Employee PF        = ₹1,800 (12% of ₹15,000)
Professional Tax   = ₹200 (Fixed)
Income Tax (TDS)   = ₹5,000 (Based on tax slab)
─────────────────────────────
Total Pre-Tax      = ₹7,000
```

#### **3. Taxable Income:**
```
Taxable Income = ₹80,000 - ₹7,000 = ₹73,000
```

#### **4. Post-Tax Deductions:**
```
Loan EMI           = ₹3,000
LOP (3 days)       = ₹1,935 (Pro-rated for 3 days)
─────────────────────────────
Total Post-Tax     = ₹4,935
```

#### **5. Net Pay:**
```
Net Pay = (₹73,000 - ₹5,000) - ₹4,935
        = ₹68,000 - ₹4,935
        = ₹63,065
```

**Result:** ₹63,065 will be transferred to Rajesh's bank account.

---

## 📱 **Current System Status**

### **✅ Implemented:**
- Salary Component creation and management
- Salary Template creation and management
- Deduction Master and Employee Deduction management
- Salary structure calculation logic
- Multi-tenant isolation

### **🚧 Partially Implemented:**
- Payslip generation (UI placeholder exists)
- Payroll run processing (calculation logic exists in docs)

### **📝 Next Steps (To Complete):**
1. Create `Payslip` model to store generated payslips
2. Implement payroll run controller
3. Implement payslip PDF generation
4. Create employee payslip viewing interface
5. Add payroll approval workflow
6. Generate bank file for salary transfers

---

## 🛠️ **API Endpoints Reference**

### **Earnings:**
- `POST /api/payroll/earnings` - Create earning component
- `GET /api/payroll/earnings` - List all earnings
- `PUT /api/payroll/earnings/:id` - Update earning
- `DELETE /api/payroll/earnings/:id` - Delete earning

### **Salary Templates:**
- `POST /api/payroll/salary-templates` - Create template
- `GET /api/payroll/salary-templates` - List templates
- `GET /api/payroll/salary-templates/:id` - Get template
- `PUT /api/payroll/salary-templates/:id` - Update template

### **Payslips (To be implemented):**
- `POST /api/payroll/process` - Run payroll for a month
- `GET /api/payroll/payslips` - List employee payslips
- `GET /api/payroll/payslips/:id` - Get payslip details
- `GET /api/payroll/payslips/:id/download` - Download payslip PDF

---

## ❓ **Frequently Asked Questions**

### **Q1: What happens if an employee joins mid-month?**
**A:** Use pro-rata calculation. The system calculates salary based on the number of days worked.

### **Q2: How is LOP (Loss of Pay) calculated?**
**A:** LOP = (Basic + Pro-rated components) / Days in Month × LOP Days

### **Q3: Can I change salary template after assigning?**
**A:** No. Once assigned, the template is locked. Create a new template and reassign.

### **Q4: How does ESI calculation work?**
**A:** ESI applies only if Gross Salary ≤ ₹21,000. Employee contributes 0.75%, Employer contributes 3.25%.

### **Q5: What's the difference between CTC and Gross?**
**A:** CTC includes employer contributions. Gross is what the employee receives before deductions.

### **Q6: Can employees see their payslips?**
**A:** Yes (once implemented). Employees can access payslips in the Employee Portal under "My Payslips".

---

## 📚 **Additional Resources**

- [Payroll Calculation Logic](./PAYROLL_CALC_LOGIC.md) - Detailed calculation formulas
- Salary Component Schema - `backend/models/SalaryComponent.js`
- Salary Template Schema - `backend/models/SalaryTemplate.js`
- Deduction Master Schema - `backend/models/DeductionMaster.js`
- Employee Deduction Schema - `backend/models/EmployeeDeduction.js`

---

**Last Updated:** January 2025  
**Version:** 1.0

