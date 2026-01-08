# COMPLETE HRMS SYSTEM FLOW - DETAILED DOCUMENTATION
**Generated:** January 2025  
**Project:** Multi-Tenant MERN HRMS SaaS Application  
**Scope:** Complete System Flow from Recruitment to Payroll

---

## 📋 **TABLE OF CONTENTS**

1. [System Architecture Overview](#system-architecture-overview)
2. [Multi-Tenant Architecture](#multi-tenant-architecture)
3. [Complete Hiring Flow](#complete-hiring-flow)
4. [Employee Management Flow](#employee-management-flow)
5. [Payroll System Flow](#payroll-system-flow)
6. [Letter Generation Flow](#letter-generation-flow)
7. [Attendance & Leave Management Flow](#attendance--leave-management-flow)
8. [Database Schema & Relationships](#database-schema--relationships)
9. [API Endpoints Overview](#api-endpoints-overview)
10. [Frontend Flow](#frontend-flow)

---

## 1️⃣ **SYSTEM ARCHITECTURE OVERVIEW**

### **Technology Stack**
- **Backend:** Node.js + Express.js
- **Database:** MongoDB (Multi-tenant architecture)
- **Frontend:** React.js + TailwindCSS
- **Authentication:** JWT (JSON Web Tokens)
- **File Processing:** LibreOffice (DOCX to PDF conversion), Docxtemplater (Word template rendering)

### **Architecture Pattern**
- **Multi-Tenant SaaS:** Each tenant (company) has isolated database connection
- **RESTful API:** Standard REST endpoints for all operations
- **Service Layer:** Business logic separated from controllers
- **Schema-Based Models:** Mongoose schemas exported, models registered per tenant

---

## 2️⃣ **MULTI-TENANT ARCHITECTURE**

### **How It Works:**
1. **Main Database:** Stores `Tenant` records (company registrations)
2. **Tenant Databases:** Each tenant has a separate MongoDB database
3. **Middleware Flow:**
   - `auth.authenticate` → Extracts JWT, populates `req.user`
   - `tenantMiddleware` → Resolves tenant DB connection, populates `req.tenantDB`
   - Models registered dynamically per tenant connection
4. **Data Isolation:** All queries are tenant-scoped via `tenantId` field

### **Key Files:**
- `backend/config/dbManager.js` - Manages tenant DB connections and model registration
- `backend/middleware/tenant.middleware.js` - Tenant resolution middleware
- `backend/middleware/auth.jwt.js` - Authentication middleware

---

## 3️⃣ **COMPLETE HIRING FLOW**

### **Step 1: Job Posting Creation (HR Panel)**

**Role:** HR Admin  
**Location:** Frontend - HR Dashboard → Job Postings

**Process:**
1. HR creates a **Requirement** (Job Posting)
   - Job Title
   - Department
   - Vacancy count
   - Status (Open/Closed)
2. Requirement saved to database
3. Job posting becomes visible on public career page

**API:** `POST /api/public/requirements` (internal)  
**Model:** `Requirement`  
**Fields:** `tenant`, `jobTitle`, `department`, `vacancy`, `status`

---

### **Step 2: Candidate Application (Public)**

**Role:** External Candidate  
**Location:** Public Career Page

**Process:**
1. Candidate visits public career page (`/careers/:tenantId`)
2. Views available job postings
3. Clicks "Apply" for a position
4. Fills application form:
   - Personal Details (name, email, mobile, father name, DOB, address)
   - Professional Details (experience, current company, designation, expected CTC)
   - Resume upload
   - Consent checkbox
5. Submits application

**API:** `POST /api/public/apply`  
**Model:** `Applicant`  
**Status:** `'Applied'` (default)

**Data Flow:**
```
Public Form → POST /api/public/apply → Applicant Schema → Tenant DB → Status: 'Applied'
```

---

### **Step 3: Candidate Review (HR Panel)**

**Role:** HR Admin  
**Location:** Frontend - HR Dashboard → Applicants

**Process:**
1. HR views list of applicants (`GET /api/applicants`)
2. Filters by status: Applied, Shortlisted, Selected, Rejected
3. Reviews applicant details:
   - Personal information
   - Professional background
   - Resume
4. Can update status:
   - **Shortlisted** → Move to interview stage
   - **Selected** → Ready for offer letter
   - **Rejected** → Not selected

**API:** 
- `GET /api/applicants` - List all applicants
- `PUT /api/applicants/:id` - Update applicant (including status)

**Status Flow:**
```
Applied → Shortlisted → Selected → (Offer Letter) → (Joining Letter) → Employee
                ↓
            Rejected
```

---

### **Step 4: Offer Letter Generation (HR Panel)**

**Role:** HR Admin  
**Location:** Frontend - HR Dashboard → Applicants → Generate Offer Letter

**Prerequisites:**
- Applicant status must be at least "Selected"
- Offer Letter Template must exist (Word or HTML template)

**Process:**
1. HR selects applicant → Clicks "Generate Offer Letter"
2. Modal opens with form:
   - **Template Selection:** Choose from available offer letter templates
   - **Joining Date:** Date when candidate will join
   - **Location:** Work location
   - **Address:** Communication address
   - **Department:** Department name
   - **Father Name:** (if needed)
   - **Reference Number:** Auto-generated or manual
3. HR clicks "Generate" or "Preview"
4. Backend process:
   - Fetches Applicant data
   - Fetches selected LetterTemplate (type='offer')
   - If Word template:
     - Reads `.docx` file
     - Uses Docxtemplater to replace placeholders:
       - `{{employee_name}}` → Applicant name
       - `{{father_name}}` → Father name
       - `{{designation}}` → Job title
       - `{{joining_date}}` → Joining date
       - `{{location}}` → Work location
       - `{{address}}` → Address
       - `{{offer_ref_no}}` → Reference number
       - `{{issued_date}}` → Current date
     - Generates DOCX with data
     - Converts DOCX → PDF using LibreOffice
   - If HTML template:
     - Replaces placeholders in HTML content
     - Converts HTML → PDF using LibreOffice
5. PDF saved to `uploads/offers/` folder
6. `GeneratedLetter` record created (type='offer')
7. Applicant record updated:
   - `offerLetterPath` → PDF file path
   - `offerRefCode` → Reference number
   - `status` → 'Selected'
   - `joiningDate` → Joining date
   - `location`, `address`, `department` → Saved
8. PDF URL returned to frontend
9. Frontend displays PDF preview or download option

**API:** `POST /api/letters/generate-offer`  
**Models Used:** `Applicant`, `LetterTemplate`, `GeneratedLetter`  
**File Storage:** `uploads/offers/Offer_Letter_{applicantId}_{timestamp}.pdf`

**Note:** Currently, **NO salary/CTC data** is included in Offer Letter.

---

### **Step 5: Joining Letter Generation (HR Panel)**

**Role:** HR Admin  
**Location:** Frontend - HR Dashboard → Applicants → Generate Joining Letter

**Prerequisites:**
- Offer Letter must be generated first (`applicant.offerLetterPath` must exist)
- Joining Letter Template must exist (Word template only)
- **IMPORTANT:** Currently, salary template is NOT linked (this is a known gap)

**Process:**
1. HR selects applicant → Clicks "Generate Joining Letter"
2. System validates Offer Letter exists
3. Modal opens (or auto-generates based on settings)
4. Backend process:
   - Fetches Applicant data
   - Validates Offer Letter exists
   - Fetches selected LetterTemplate (type='joining', templateType='WORD')
   - Reads Word template `.docx` file
   - Prepares data from Applicant record:
     - `{{employee_name}}` → Applicant name
     - `{{father_name}}` → Father name
     - `{{designation}}` → Job title
     - `{{department}}` → Department
     - `{{joining_date}}` → Joining date (from offer letter)
     - `{{location}}` → Work location
     - `{{candidate_address}}` → Address
     - `{{offer_ref_code}}` → Offer reference number
     - `{{current_date}}` → Current date
     - **❌ MISSING:** Salary/CTC placeholders (basic_monthly, hra_monthly, ctc_yearly, etc.)
   - Uses Docxtemplater to replace placeholders
   - Generates DOCX with data
   - Converts DOCX → PDF using LibreOffice
5. PDF saved to `uploads/offers/` folder
6. `GeneratedLetter` record created (type='joining')
7. Applicant record updated:
   - `joiningLetterPath` → PDF file path
8. PDF URL returned to frontend

**API:** `POST /api/letters/generate-joining`  
**Models Used:** `Applicant`, `LetterTemplate`, `GeneratedLetter`  
**File Storage:** `uploads/offers/Joining_Letter_{applicantId}_{timestamp}.pdf`

**Current Gap:** Salary/CTC structure is NOT populated (this is the issue being addressed).

---

### **Step 6: Employee Creation (Onboarding)**

**Role:** HR Admin  
**Location:** Frontend - HR Dashboard → Employees → Add Employee

**Process:**
1. HR creates Employee record (can be from applicant or manual entry)
2. Employee form includes:
   - **Personal Details:** Name, DOB, Gender, Contact, Email
   - **Employee ID:** Auto-generated (format: COMPANY_DEPT_001) or manual
   - **Department:** Department assignment
   - **Manager:** Reporting manager (hierarchical)
   - **Joining Date:** Date of joining
   - **Status:** Active/Draft
   - **Bank Details:** Account number, IFSC, Bank name
   - **Documents:** PAN, Aadhaar, etc.
   - **Leave Policy:** Assignment of leave policy
   - **Salary Template:** ⚠️ **CAN be assigned here** (but not linked from Applicant)
3. Employee record saved to database
4. Leave balances initialized (if leave policy assigned)
5. Employee can now:
   - Login to Employee Self-Service portal
   - Mark attendance
   - Apply for leaves
   - View payslips

**API:** `POST /api/hr/employees`  
**Models Used:** `Employee`, `LeaveBalance`  
**Key Fields:** `tenant`, `employeeId`, `salaryTemplateId`, `departmentId`, `manager`, `leavePolicy`

---

## 4️⃣ **EMPLOYEE MANAGEMENT FLOW**

### **Employee Lifecycle:**

```
Created → Active → (Attendance/Leaves) → Payroll Processing → Payslip Generation
```

### **Key Operations:**

1. **Employee Profile Management**
   - Update personal details
   - Change department
   - Assign/change manager
   - Update bank details
   - Upload documents

2. **Department Assignment**
   - Employee belongs to one Department
   - Department has hierarchy (can have parent department)

3. **Manager Assignment**
   - Employee can have one manager (self-referencing)
   - Circular management chains prevented
   - Hierarchy tree maintained

4. **Salary Template Assignment**
   - Employee can have one `salaryTemplateId`
   - Template defines CTC structure
   - Used for payroll calculations

**API Endpoints:**
- `GET /api/hr/employees` - List all employees
- `POST /api/hr/employees` - Create employee
- `PUT /api/hr/employees/:id` - Update employee
- `GET /api/hr/employees/hierarchy` - Get organization chart
- `PUT /api/hr/employees/:id/manager` - Assign manager

---

## 5️⃣ **PAYROLL SYSTEM FLOW**

### **Payroll Workflow:**

```
Salary Template Creation → Employee Assignment → Payroll Run Initiation → Calculation → Approval → Payment → Payslip Generation
```

### **Step 1: Salary Template Creation**

**Role:** HR Admin  
**Location:** Frontend - HR Dashboard → Payroll → Salary Templates

**Process:**
1. HR creates Salary Template
2. Defines:
   - **Annual CTC:** Total cost to company per year
   - **Earnings:** Basic, HRA, Allowances (with percentages or fixed amounts)
   - **Settings:**
     - PF Wage Restriction (Max ₹15,000)
     - ESI Inclusion (if Gross ≤ ₹21,000)
   - **Employee Deductions:** PRE_TAX / POST_TAX deductions mapped
3. Backend calculates:
   - Monthly CTC
   - Basic amount (from percentage)
   - HRA, Allowances
   - EPF Employer contributions (12% of PF Wage)
   - ESI Employer contributions (3.25% of Gross, if applicable)
   - Fixed Allowance (plug to match CTC)
4. Template saved with `isAssigned: false`
5. Once assigned to employee, `isAssigned: true` (locks template)

**API:** `POST /api/payroll/salary-templates`  
**Model:** `SalaryTemplate`  
**Key Fields:** `annualCTC`, `monthlyCTC`, `earnings[]`, `employerDeductions[]`, `employeeDeductions[]`, `settings`, `isAssigned`

---

### **Step 2: Employee Salary Assignment**

**Process:**
1. HR assigns Salary Template to Employee
2. Employee record updated: `employee.salaryTemplateId = templateId`
3. Template locked: `template.isAssigned = true`
4. Employee now has salary structure defined

**Note:** Currently, this is done during Employee creation/update, but **NOT automatically linked from Applicant**.

---

### **Step 3: Payroll Run Initiation**

**Role:** HR Admin  
**Location:** Frontend - HR Dashboard → Payroll → Payroll Runs

**Process:**
1. HR initiates Payroll Run for a specific month/year
2. Backend creates `PayrollRun` record:
   - `tenantId`
   - `month` (1-12)
   - `year`
   - `status: 'INITIATED'`
   - `initiatedBy` (employee ID)
3. Only one payroll run per tenant per month/year (unique index)

**API:** `POST /api/payroll/runs`  
**Model:** `PayrollRun`  
**Status:** `'INITIATED'`

---

### **Step 4: Payroll Calculation**

**Role:** HR Admin  
**Location:** Frontend - Payroll Runs → Calculate

**Process:**
1. HR clicks "Calculate" for Payroll Run
2. Backend process (`payroll.service.js:runPayroll`):
   - Fetches all active employees with salary templates
   - For each employee:
     - **Step 4.1:** Fetch salary template
     - **Step 4.2:** Calculate Gross Earnings:
       - Sum of all earnings (Basic, HRA, Allowances)
       - Apply pro-rata based on attendance (if configured)
     - **Step 4.3:** Calculate Pre-Tax Deductions:
       - EPF Employee (12% of PF Wage, max ₹1,800)
       - ESI Employee (0.75% of Gross, if Gross ≤ ₹21,000)
       - Professional Tax (state-wise, if applicable)
       - Other PRE_TAX deductions
     - **Step 4.4:** Calculate Taxable Income:
       - Gross Earnings - Pre-Tax Deductions
     - **Step 4.5:** Calculate TDS (Income Tax):
       - Based on taxable income and tax regime
       - Currently placeholder (needs full implementation)
     - **Step 4.6:** Calculate Post-Tax Deductions:
       - Loans, Advances
       - LOP (Loss of Pay) - based on absent days
       - Penalties
     - **Step 4.7:** Calculate Net Pay:
       - Taxable Income - TDS - Post-Tax Deductions
     - **Step 4.8:** Fetch attendance for month
     - **Step 4.9:** Lock attendance (prevent edits after payroll)
     - **Step 4.10:** Create Payslip snapshot:
       - `Payslip` record created with immutable data
       - All calculations saved as snapshots
       - Hash generated for data integrity
3. Payroll Run status updated: `status: 'CALCULATED'`
4. Totals updated: `totalEmployees`, `totalNetPay`

**API:** `POST /api/payroll/runs/:id/calculate`  
**Service:** `backend/services/payroll.service.js`  
**Models:** `PayrollRun`, `Payslip`, `Employee`, `SalaryTemplate`, `Attendance`, `EmployeeDeduction`

**Calculation Order (Mandatory):**
```
1. Gross Earnings (with pro-rata)
2. Pre-Tax Deductions
3. Taxable Income = Gross - Pre-Tax
4. TDS (Income Tax)
5. Post-Tax Deductions
6. Net Pay = Taxable - TDS - Post-Tax
```

---

### **Step 5: Payroll Approval**

**Role:** HR Admin / Manager  
**Location:** Frontend - Payroll Runs → Review → Approve

**Process:**
1. HR reviews calculated payroll
2. Can view individual payslips
3. Clicks "Approve"
4. Backend updates PayrollRun:
   - `status: 'APPROVED'`
   - `approvedBy` (employee ID)
   - `approvedAt` (timestamp)
5. Payslips are now finalized (cannot be recalculated)

**API:** `POST /api/payroll/runs/:id/approve`  
**Status Transition:** `CALCULATED` → `APPROVED`

---

### **Step 6: Mark as Paid**

**Role:** HR Admin  
**Location:** Frontend - Payroll Runs → Mark Paid

**Process:**
1. After salary disbursement, HR clicks "Mark as Paid"
2. Backend updates PayrollRun:
   - `status: 'PAID'`
   - `paidAt` (timestamp)
3. Payroll cycle complete

**API:** `POST /api/payroll/runs/:id/mark-paid`  
**Status Transition:** `APPROVED` → `PAID`

---

### **Step 7: Payslip Generation & Distribution**

**Process:**
1. Payslips are automatically generated during calculation (Step 4)
2. Employee can view payslips:
   - Employee Self-Service portal → My Payslips
   - Filter by month/year
3. HR can view all payslips:
   - HR Dashboard → Payroll → Payslips
   - Filter by employee, month, year
4. PDF Generation:
   - ⚠️ **Currently structure exists but not fully implemented**
   - Should generate PDF from Payslip snapshot
   - Downloadable by employee and HR

**API:**
- `GET /api/payroll/payslips/my` - Employee's payslips
- `GET /api/payroll/payslips` - All payslips (HR)
- `GET /api/payroll/payslips/:id/download` - Download PDF

**Model:** `Payslip` (Immutable Snapshot)

---

## 6️⃣ **LETTER GENERATION FLOW**

### **Template Management:**

**Role:** HR Admin  
**Location:** Frontend - HR Dashboard → Letter Templates

**Process:**
1. HR creates Letter Template:
   - **Type:** Offer / Joining / Relieving / Experience
   - **Template Type:** LETTER_PAD / BLANK / WORD
   - **Content:**
     - HTML content (for LETTER_PAD/BLANK)
     - Word file upload (for WORD)
   - **Settings:** Header, Footer, Page Layout
2. Template saved to database
3. For WORD templates:
   - File uploaded to `uploads/templates/`
   - File path stored in `template.filePath`
   - Placeholders extracted from template

**API:** `POST /api/letters/templates`  
**Model:** `LetterTemplate`

---

### **Letter Generation Flow:**

**Common Flow:**
1. Select Template
2. Prepare Data (from Applicant/Employee)
3. Replace Placeholders
4. Generate PDF
5. Save GeneratedLetter Record
6. Return PDF URL

**Placeholders Supported:**
- Basic: `{{employee_name}}`, `{{designation}}`, `{{joining_date}}`, etc.
- **⚠️ Salary placeholders NOT currently supported in Joining Letter**

---

## 7️⃣ **ATTENDANCE & LEAVE MANAGEMENT FLOW**

### **Attendance Marking:**

**Process:**
1. Employee marks attendance (Employee Self-Service portal)
2. System records:
   - Check-in time
   - Check-out time
   - Status (present/absent/leave/holiday)
   - Working hours
   - Overtime (if applicable)
3. Attendance locked after payroll processing (`locked: true`)
4. Used for pro-rata salary calculation

**API:** `POST /api/attendance/punch`  
**Model:** `Attendance`

---

### **Leave Management:**

**Process:**
1. **Leave Policy Creation:**
   - HR creates Leave Policy
   - Defines leave types (Sick, Casual, Earned, etc.)
   - Assigns to employees/departments
2. **Leave Balances:**
   - Auto-initialized when policy assigned
   - Updated when leaves approved
3. **Leave Application:**
   - Employee applies for leave
   - Manager/HR approves/rejects
   - Balance deducted on approval
4. **Leave History:**
   - Track all leave applications
   - Used in payroll (LOP calculation)

**API:**
- `POST /api/leaves/policies` - Create leave policy
- `POST /api/leaves/requests` - Apply for leave
- `PUT /api/leaves/requests/:id/approve` - Approve leave

**Models:** `LeavePolicy`, `LeaveBalance`, `LeaveRequest`

---

## 8️⃣ **DATABASE SCHEMA & RELATIONSHIPS**

### **Core Models:**

1. **Tenant**
   - Company/organization record
   - Links to tenant-specific database

2. **User**
   - System users (HR, Employees)
   - Authentication credentials
   - Role-based access

3. **Applicant**
   - Job applicants
   - Fields: `requirementId`, `name`, `email`, `status`, `offerLetterPath`, `joiningLetterPath`
   - **❌ Missing:** `salaryTemplateId` (currently not linked)

4. **Requirement**
   - Job postings
   - Fields: `jobTitle`, `department`, `vacancy`, `status`

5. **Employee**
   - Active employees
   - Fields: `tenant`, `employeeId`, `salaryTemplateId`, `departmentId`, `manager`, `leavePolicy`
   - Linked to: SalaryTemplate, Department, Employee (manager), LeavePolicy

6. **SalaryTemplate**
   - Salary structure definitions
   - Fields: `annualCTC`, `monthlyCTC`, `earnings[]`, `employerDeductions[]`, `employeeDeductions[]`, `isAssigned`

7. **LetterTemplate**
   - Letter templates (Offer/Joining/etc.)
   - Fields: `type`, `templateType`, `bodyContent`, `filePath`

8. **GeneratedLetter**
   - Generated letter records
   - Fields: `applicantId`, `templateId`, `letterType`, `pdfPath`, `snapshotData`
   - **⚠️ Missing:** `salarySnapshot` in `snapshotData`

9. **PayrollRun**
   - Payroll processing runs
   - Fields: `tenantId`, `month`, `year`, `status`, `initiatedBy`, `totalEmployees`, `totalNetPay`

10. **Payslip**
    - Immutable payslip snapshots
    - Fields: `employeeId`, `payrollRunId`, `month`, `year`, `earningsSnapshot[]`, `deductionsSnapshot[]`, `grossEarnings`, `netPay`, `hash`

11. **Attendance**
    - Employee attendance records
    - Fields: `employee`, `date`, `status`, `checkIn`, `checkOut`, `locked`

12. **LeavePolicy, LeaveBalance, LeaveRequest**
    - Leave management

---

## 9️⃣ **API ENDPOINTS OVERVIEW**

### **Public APIs (No Auth):**
- `GET /api/public/requirements` - List job postings
- `POST /api/public/apply` - Submit job application

### **HR APIs (Require HR Role):**
- **Applicants:**
  - `GET /api/applicants` - List applicants
  - `PUT /api/applicants/:id` - Update applicant
  
- **Employees:**
  - `GET /api/hr/employees` - List employees
  - `POST /api/hr/employees` - Create employee
  - `PUT /api/hr/employees/:id` - Update employee
  
- **Letter Templates:**
  - `GET /api/letters/templates` - List templates
  - `POST /api/letters/templates` - Create template
  - `POST /api/letters/upload-word-template` - Upload Word template
  - `POST /api/letters/generate-offer` - Generate offer letter
  - `POST /api/letters/generate-joining` - Generate joining letter
  
- **Payroll:**
  - `POST /api/payroll/salary-templates` - Create salary template
  - `GET /api/payroll/salary-templates` - List templates
  - `POST /api/payroll/runs` - Initiate payroll run
  - `POST /api/payroll/runs/:id/calculate` - Calculate payroll
  - `POST /api/payroll/runs/:id/approve` - Approve payroll
  - `GET /api/payroll/payslips` - List payslips

### **Employee APIs (Require Employee Role):**
- `GET /api/attendance/my` - My attendance
- `POST /api/attendance/punch` - Mark attendance
- `GET /api/payroll/payslips/my` - My payslips
- `POST /api/leaves/requests` - Apply for leave

---

## 🔟 **FRONTEND FLOW**

### **HR Dashboard Flow:**

1. **Login** → JWT token stored
2. **Dashboard** → Overview cards (employees, applicants, payroll runs)
3. **Applicants:**
   - View list → Filter by status
   - Generate Offer Letter → Modal → Preview/Generate → PDF download
   - Generate Joining Letter → Modal → Preview/Generate → PDF download
4. **Employees:**
   - View list → Filter by department/status
   - Create/Edit employee → Form → Assign salary template
   - View hierarchy chart
5. **Payroll:**
   - Salary Templates → Create/Edit templates
   - Payroll Runs → Initiate → Calculate → Approve → Mark Paid
   - Payslips → View/Download
6. **Letter Templates:**
   - Create/Edit templates
   - Upload Word templates
   - Preview templates

### **Employee Self-Service Portal Flow:**

1. **Login** → Employee credentials
2. **Dashboard** → Attendance summary, leave balance, recent activity
3. **Attendance:**
   - View calendar
   - Mark check-in/check-out
   - View attendance history
4. **Leaves:**
   - View leave balance
   - Apply for leave
   - View leave history
5. **Payslips:**
   - View payslip list
   - Download payslip PDF

---

## 📊 **COMPLETE FLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE HRMS FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. RECRUITMENT FLOW:
   Job Posting → Candidate Application → Review → Shortlist → 
   Select → Offer Letter → Joining Letter → Employee Creation

2. EMPLOYEE MANAGEMENT:
   Employee Creation → Department Assignment → Manager Assignment → 
   Salary Template Assignment → Leave Policy Assignment

3. PAYROLL FLOW:
   Salary Template Creation → Employee Assignment → Monthly Payroll Run → 
   Calculate (with Attendance) → Approve → Mark Paid → Payslip Generation

4. LETTER GENERATION:
   Template Creation → Data Preparation → Placeholder Replacement → 
   PDF Generation → Storage → Download

5. ATTENDANCE & LEAVES:
   Attendance Marking → Leave Application → Approval → 
   Balance Update → Payroll Integration
```

---

## ⚠️ **KNOWN GAPS & LIMITATIONS**

1. **Joining Letter CTC Missing:**
   - Salary/CTC structure not populated in Joining Letter
   - No link between Applicant and SalaryTemplate
   - Missing Gross A/B/C, Gratuity, Take Home calculations

2. **Offer Letter CTC Missing:**
   - Currently no salary data (may be intentional)

3. **Payslip PDF Generation:**
   - Structure exists but not fully implemented

4. **TDS Calculation:**
   - Placeholder implementation only
   - Needs full tax regime support

5. **Bank Transfer File:**
   - Not implemented
   - Should generate CSV/XLS for bank transfers

---

**Document Status:** ✅ **COMPLETE**  
**Last Updated:** January 2025

