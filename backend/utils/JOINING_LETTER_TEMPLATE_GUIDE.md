# Joining Letter Word Template Variables Guide

## Overview
Joining Letters are generated using Word templates with variable placeholders. The system automatically maps Offer Letter data to Joining Letter variables, ensuring consistency.

## Variable Categories

### 1. Candidate Details (From Offer Letter)
- `{{EMPLOYEE_NAME}}` - Full name of the employee
- `{{EMPLOYEE_TITLE}}` - Title (Mr./Ms./Mrs.)
- `{{DESIGNATION}}` - Job position/title
- `{{DEPARTMENT}}` - Department name
- `{{JOINING_DATE}}` - Date of joining (formatted)
- `{{ADDRESS}}` - Employee's full address

### 2. Offer Letter Reference Data
- `{{OFFER_REF_NO}}` - Reference number from Offer Letter
- `{{OFFER_DATE}}` - Date when Offer Letter was issued
- `{{LOCATION}}` - Work location/base location

### 3. Company Information
- `{{COMPANY_NAME}}` - Company name
- `{{COMPANY_ADDRESS}}` - Company registered address

### 4. Salary Breakdown (Annexure A)
**Earnings:**
- `{{BASIC_SALARY}}` - Basic salary amount
- `{{HRA}}` - House Rent Allowance
- `{{CONVEYANCE}}` - Conveyance allowance
- `{{LTA}}` - Leave Travel Allowance
- `{{MEDICAL}}` - Medical allowance
- `{{OTHER_ALLOWANCES}}` - Other allowances
- `{{TOTAL_EARNINGS}}` - Sum of all earnings

**Deductions:**
- `{{PF_EMPLOYEE}}` - Employee PF contribution
- `{{PF_EMPLOYER}}` - Employer PF contribution
- `{{GRATUITY}}` - Gratuity provision
- `{{TOTAL_DEDUCTIONS}}` - Sum of all deductions

**Final Calculations:**
- `{{TAKE_HOME}}` - Monthly take-home salary
- `{{CTC}}` - Cost to Company (Annual)

### 5. Signatures & Dates
- `{{CURRENT_DATE}}` - Today's date
- `{{EMPLOYEE_SIGNATURE}}` - Left blank for manual signing
- `{{AUTHORIZED_SIGNATORY}}` - Auto-filled from company profile

## Template Structure Example

```
[Company Letterhead]

{{COMPANY_NAME}}
{{COMPANY_ADDRESS}}

{{CURRENT_DATE}}

{{EMPLOYEE_TITLE}} {{EMPLOYEE_NAME}}
{{ADDRESS}}

Subject: Appointment Letter

Dear {{EMPLOYEE_TITLE}} {{EMPLOYEE_NAME}},

With reference to your Offer Letter dated {{OFFER_DATE}} (Ref: {{OFFER_REF_NO}}),
we are pleased to appoint you as {{DESIGNATION}} in {{DEPARTMENT}} department
at our {{LOCATION}} office.

Your date of joining is {{JOINING_DATE}}.

ANNEXURE A - SALARY BREAKDOWN

Earnings:
- Basic Salary: ₹{{BASIC_SALARY}}
- HRA: ₹{{HRA}}
- Conveyance: ₹{{CONVEYANCE}}
- LTA: ₹{{LTA}}
- Medical: ₹{{MEDICAL}}
- Other Allowances: ₹{{OTHER_ALLOWANCES}}
- Total Earnings: ₹{{TOTAL_EARNINGS}}

Deductions:
- PF (Employee): ₹{{PF_EMPLOYEE}}
- Gratuity: ₹{{GRATUITY}}
- Total Deductions: ₹{{TOTAL_DEDUCTIONS}}

Take Home (Monthly): ₹{{TAKE_HOME}}
CTC (Annual): ₹{{CTC}}

Employee Signature: {{EMPLOYEE_SIGNATURE}}

For {{COMPANY_NAME}}

{{AUTHORIZED_SIGNATORY}}
Authorized Signatory
```

## Important Notes

1. **No Hard-coded Names**: All variables use placeholders, never actual names
2. **CTC Not in Offer Letter**: Salary details are ONLY in Joining Letter
3. **Employee Signature Blank**: Left empty for manual signing
4. **Authorized Signatory Auto-filled**: From company profile settings
5. **Data Reuse**: Candidate details automatically copied from Offer Letter

## Validation Rules

- Basic Salary must be > 0
- Total Earnings = Sum of all earning components
- Total Deductions = Sum of all deduction components
- CTC = Total Earnings + Employer Contributions
- Take Home = (Total Earnings - Total Deductions) / 12

## File Format
- Template: .docx (Word 2007+ format)
- Output: .pdf (converted automatically)
- Storage: uploads/offers/ folder