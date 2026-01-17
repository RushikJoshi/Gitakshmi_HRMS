// Joining Letter Utilities for HRMS SaaS
// Updated to support immutable snapshots

/**
 * Map Offer Letter data to Joining Letter variables with safe fallbacks
 * 
 * @param {Object} applicant - Applicant document
 * @param {Object} customData - Any overrides
 * @param {Object} snapshot - Immutable EmployeeSalarySnapshot document
 */
/**
 * Helper for custom date format: 16th Jan'25
 */
function formatCustomDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = d.getDate();
  const month = d.toLocaleString('en-IN', { month: 'short' });
  const year = d.getFullYear();

  let suffix = 'th';
  if (day % 10 === 1 && day !== 11) suffix = 'st';
  else if (day % 10 === 2 && day !== 12) suffix = 'nd';
  else if (day % 10 === 3 && day !== 13) suffix = 'rd';

  return `${day}${suffix} ${month}. ${year}`;
}

/**
 * Map Offer Letter data to Joining Letter variables with safe fallbacks
 * 
 * @param {Object} applicant - Applicant document
 * @param {Object} customData - Any overrides
 * @param {Object} snapshot - Immutable EmployeeSalarySnapshot document
 */
function mapOfferToJoiningData(applicant, customData = {}, snapshot = {}) {
  const today = formatCustomDate(new Date());

  const fullName = `${applicant?.salutation ? applicant.salutation + ' ' : ''}${applicant?.name || ''}`;

  // Extract offer data
  const offerData = {
    refNo: applicant?.offerRefNo || `OFFER/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`,
    offerDate: applicant?.offerDate ? formatCustomDate(applicant.offerDate) : today,
    location: applicant?.location || applicant?.workLocation || '',
    joiningDate: customData?.joining_date || (applicant?.joiningDate ? formatCustomDate(applicant.joiningDate) : ''),
    name: fullName,
    designation: applicant?.currentDesignation || applicant?.requirementId?.jobTitle || '',
    address: applicant?.workLocation || applicant?.address || '',
    department: applicant?.department || applicant?.requirementId?.department || '',
    title: applicant?.title || ''
  };

  const safeValue = (joiningValue, offerValue, defaultValue = '') => {
    if (joiningValue !== undefined && joiningValue !== null && String(joiningValue).trim() !== '') return String(joiningValue);
    if (offerValue !== undefined && offerValue !== null && String(offerValue).trim() !== '') return String(offerValue);
    return defaultValue;
  };

  // Process snapshot data
  const earnings = snapshot.earnings || [];
  const deductions = snapshot.deductions || [];
  const benefits = snapshot.benefits || [];

  const findVal = (list, patterns) => {
    const found = list.find(item => {
      const n = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some(p => n.includes(p));
    });
    return {
      monthly: found ? (found.amount / 12) : 0,
      annual: found ? found.amount : 0
    };
  };

  const basic = findVal(earnings, ['basic']);
  const hra = findVal(earnings, ['hra', 'house']);
  const conveyance = findVal(earnings, ['conveyance', 'transport', 'travel']);
  const medical = findVal(earnings, ['medical']);
  const special = findVal(earnings, ['special', 'other']);
  const pf = findVal(deductions, ['pf', 'provident']);
  const pt = findVal(deductions, ['professional', 'pt', 'tax']);
  const esic = findVal(deductions, ['esic', 'stateinsurance']);

  const totalEarningsAnnual = earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalBenefitsAnnual = benefits.reduce((sum, b) => sum + b.amount, 0);
  const totalDeductionsAnnual = deductions.reduce((sum, d) => sum + d.amount, 0);

  const fmt = (val) => Math.round(val || 0).toLocaleString('en-IN');

  return {
    offer_ref_code: safeValue(customData?.offer_ref_code, offerData.refNo, ''),
    employee_name: safeValue(customData?.employee_name, offerData.name, ''),
    designation: safeValue(customData?.designation, offerData.designation, ''),
    department: safeValue(customData?.department, offerData.department, ''),
    location: safeValue(customData?.location, offerData.location, ''),
    candidate_address: safeValue(customData?.candidate_address, offerData.address, ''),
    joining_date: safeValue(customData?.joining_date, offerData.joiningDate, ''),
    current_date: today,
    father_name: safeValue(customData?.father_name, applicant?.fatherName, ''),

    // Salary Placeholders
    annual_ctc: fmt(totalEarningsAnnual + totalBenefitsAnnual),
    monthly_ctc: fmt((totalEarningsAnnual + totalBenefitsAnnual) / 12),

    basic_monthly: fmt(basic.monthly),
    basic_annual: fmt(basic.annual),

    hra_monthly: fmt(hra.monthly),
    hra_annual: fmt(hra.annual),

    conveyance_monthly: fmt(conveyance.monthly),
    conveyance_annual: fmt(conveyance.annual),

    medical_monthly: fmt(medical.monthly),
    medical_annual: fmt(medical.annual),

    special_monthly: fmt(special.monthly),
    special_annual: fmt(special.annual),

    pf_monthly: fmt(pf.monthly),
    pf_annual: fmt(pf.annual),

    pt_monthly: fmt(pt.monthly),
    pt_annual: fmt(pt.annual),

    esic_monthly: fmt(esic.monthly),
    esic_annual: fmt(esic.annual),

    gross_monthly: fmt(totalEarningsAnnual / 12),
    gross_annual: fmt(totalEarningsAnnual),

    net_monthly: fmt((totalEarningsAnnual - totalDeductionsAnnual) / 12),
    net_annual: fmt(totalEarningsAnnual - totalDeductionsAnnual)
  };
}

module.exports = {
  mapOfferToJoiningData
};