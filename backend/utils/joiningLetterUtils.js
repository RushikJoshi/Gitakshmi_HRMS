// Joining Letter Utilities for HRMS SaaS
// Simplified utilities for clean joining letter generation

/**
 * Map Offer Letter data to Joining Letter variables with safe fallbacks
 * Only includes allowed placeholders for joining letters
 */
function mapOfferToJoiningData(applicant, customData = {}) {
  const today = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Extract offer data from applicant record (with safe fallbacks)
  const offerData = {
    refNo: applicant?.offerRefNo || `OFFER/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`,
    offerDate: applicant?.offerDate ? new Date(applicant.offerDate).toLocaleDateString('en-IN') : today,
    location: applicant?.location || applicant?.workLocation || '',
    joiningDate: customData?.joining_date || (applicant?.joiningDate ? new Date(applicant.joiningDate).toLocaleDateString('en-IN') : ''),
    name: applicant?.name || '',
    designation: applicant?.currentDesignation || applicant?.requirementId?.jobTitle || applicant?.position || '', // Enhanced fallback
    address: applicant?.workLocation || applicant?.address || '',
    department: applicant?.department || applicant?.requirementId?.department || '',
    title: applicant?.title || ''
  };

  // Helper function to safely get value with fallbacks
  const safeValue = (joiningValue, offerValue, defaultValue = '') => {
    if (joiningValue !== undefined && joiningValue !== null && String(joiningValue).trim() !== '') {
      return String(joiningValue);
    }

    if (offerValue !== undefined && offerValue !== null && String(offerValue).trim() !== '') {
      return String(offerValue);
    }

    return defaultValue;
  };

  // Extract salary data from snapshot (if available and properly structured)
  const salary = applicant.salarySnapshot || {};
  const earnings = salary.earnings || [];
  const deductions = salary.employeeDeductions || [];
  const contributions = salary.employerContributions || [];

  // Helper to find amount by fuzzy name match
  const findVal = (list, patterns) => {
    const found = list.find(item => {
      const n = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some(p => n.includes(p));
    });
    return {
      monthly: found ? (found.monthlyAmount || 0) : 0,
      yearly: found ? (found.annualAmount || 0) : 0
    };
  };

  const basic = findVal(earnings, ['basic']);
  const hra = findVal(earnings, ['hra', 'house']);
  const conveyance = findVal(earnings, ['conveyance', 'transport']);
  const medical = findVal(earnings, ['medical']);
  const special = findVal(earnings, ['special']);
  const pf = findVal(deductions, ['pfemployee', 'provident']);
  const pt = findVal(deductions, ['professional', 'pt', 'tax']);
  const esic = findVal(deductions, ['esic', 'stateinsurance']);

  return {
    // Required placeholders for Joining Letter (only these are allowed)
    offer_ref_code: safeValue(customData?.offer_ref_code, offerData.refNo, ''),
    employee_name: safeValue(customData?.employee_name, offerData.name, ''),
    designation: safeValue(customData?.designation, offerData.designation, ''),
    department: safeValue(customData?.department, offerData.department, ''),
    location: safeValue(customData?.location, offerData.location, ''),
    candidate_address: safeValue(customData?.candidate_address, offerData.address, ''),
    joining_date: safeValue(customData?.joining_date, offerData.joiningDate, ''),
    current_date: today,
    father_name: safeValue(customData?.father_name, applicant?.fatherName, ''),
    fatherName: safeValue(customData?.father_name, applicant?.fatherName, ''),

    // Salary Placeholders (Auto-Injected)
    annual_ctc: (salary.ctc?.yearly || 0).toLocaleString('en-IN'),
    monthly_ctc: (salary.ctc?.monthly || 0).toLocaleString('en-IN'),

    basic_monthly: basic.monthly.toLocaleString('en-IN'),
    basic_annual: basic.yearly.toLocaleString('en-IN'),

    hra_monthly: hra.monthly.toLocaleString('en-IN'),
    hra_annual: hra.yearly.toLocaleString('en-IN'),

    conveyance_monthly: conveyance.monthly.toLocaleString('en-IN'),
    conveyance_annual: conveyance.yearly.toLocaleString('en-IN'),

    medical_monthly: medical.monthly.toLocaleString('en-IN'),
    medical_annual: medical.yearly.toLocaleString('en-IN'),

    special_monthly: special.monthly.toLocaleString('en-IN'),
    special_annual: special.yearly.toLocaleString('en-IN'), // Fixed incorrect property

    pf_monthly: pf.monthly.toLocaleString('en-IN'),
    pf_annual: pf.yearly.toLocaleString('en-IN'),

    pt_monthly: pt.monthly.toLocaleString('en-IN'),
    pt_annual: pt.yearly.toLocaleString('en-IN'),

    esic_monthly: esic.monthly.toLocaleString('en-IN'),
    esic_annual: esic.yearly.toLocaleString('en-IN'),

    gross_monthly: (salary.grossA?.monthly || 0).toLocaleString('en-IN'),
    gross_annual: (salary.grossA?.yearly || 0).toLocaleString('en-IN'),

    net_monthly: (salary.takeHome?.monthly || 0).toLocaleString('en-IN'),
    net_annual: (salary.takeHome?.yearly || 0).toLocaleString('en-IN')
  };
}

module.exports = {
  mapOfferToJoiningData
};