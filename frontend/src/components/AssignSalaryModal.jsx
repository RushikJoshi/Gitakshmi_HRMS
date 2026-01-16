import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export default function AssignSalaryModal({
    isOpen,
    onClose,
    applicant,
    onSuccess
}) {
    const [salaryTemplates, setSalaryTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [salaryPreview, setSalaryPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);

    // Load salary templates
    useEffect(() => {
        if (isOpen) {
            loadSalaryTemplates();
            // If applicant already has salary, load it
            if (applicant?.salarySnapshot) {
                setSalaryPreview(applicant.salarySnapshot);
                setSelectedTemplateId(applicant.salaryTemplateId || '');
            } else {
                setSalaryPreview(null);
                setSelectedTemplateId('');
            }
        }
    }, [isOpen, applicant]);

    const loadSalaryTemplates = async () => {
        try {
            setLoading(true);
            const res = await api.get('/payroll/salary-templates');
            console.log('[AssignSalaryModal] Templates API response:', res.data);

            // Handle response correctly - use res.data.data
            if (res.data.success && res.data.data) {
                setSalaryTemplates(res.data.data);
                console.log(`[AssignSalaryModal] Loaded ${res.data.data.length} templates`);
            } else {
                console.warn('[AssignSalaryModal] Unexpected response format:', res.data);
                setSalaryTemplates([]);
            }
        } catch (err) {
            console.error('Failed to load salary templates:', err);
            console.error('Error details:', err.response?.data);
            alert('Failed to load salary templates: ' + (err.response?.data?.error || err.message));
            setSalaryTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    // When template is selected, fetch preview/calculation
    const handleTemplateSelect = async (templateId) => {
        // Ensure templateId is always a string (not null/undefined)
        const safeTemplateId = templateId || '';
        setSelectedTemplateId(safeTemplateId);

        if (!safeTemplateId) {
            setSalaryPreview(null);
            return;
        }

        try {
            setLoading(true);
            // Use preview API to get calculated breakdown
            const res = await api.get(`/payroll/salary-templates/${safeTemplateId}/preview`);
            if (res.data.success && res.data.data) {
                // Use the calculated snapshot from backend
                setSalaryPreview(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load template preview:', err);
            // Fallback: try to get template details
            try {
                const templateRes = await api.get(`/payroll/salary-templates/${safeTemplateId}`);
                if (templateRes.data.success && templateRes.data.data) {
                    const template = templateRes.data.data;
                    // Calculate preview from template (fallback)
                    const preview = calculatePreview(template);
                    setSalaryPreview(preview);
                }
            } catch (fallbackErr) {
                console.error('Failed to load template details (fallback):', fallbackErr);
                setSalaryPreview(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedTemplateId) {
            alert('Please select a salary template');
            return;
        }

        try {
            setAssigning(true);

            // Get ctcAnnual from preview or template
            const ctcAnnual = salaryPreview?.ctc?.yearly || salaryPreview?.grossC?.yearly || 0;

            if (!ctcAnnual) {
                alert('Could not determine CTC. Please select a template with a valid CTC.');
                setAssigning(false);
                return;
            }

            // Determine if we are dealing with an applicant or employee
            const isEmployee = !!applicant.employeeId;
            const endpoint = isEmployee
                ? `/salary/assign` // Use the modern salary controller for employees too
                : `/requirements/applicants/${applicant._id}/assign-salary`;

            const payload = {
                salaryTemplateId: selectedTemplateId,
                ctcAnnual: ctcAnnual
            };

            // If it's the direct /salary/assign route, we need to specify employeeId/applicantId
            if (isEmployee) {
                payload.employeeId = applicant._id;
            } else {
                payload.applicantId = applicant._id;
            }

            const res = await api.post(endpoint, payload);

            if (res.data.success) {
                alert('Salary assigned successfully');
                onSuccess && onSuccess(res.data.data);
                onClose();
            }
        } catch (err) {
            console.error('Failed to assign salary:', err);
            const errorMsg = err.response?.data?.error ||
                err.response?.data?.message ||
                'Failed to assign salary';
            alert(errorMsg);
        } finally {
            setAssigning(false);
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount) return '₹0.00';
        return `₹${Number(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    // Calculate preview values (similar to backend calculation)
    const calculatePreview = (template) => {
        if (!template || !template.earnings) return null;

        const basic = template.earnings.find(e => e.name.toLowerCase().includes('basic'));
        const basicMonthly = basic?.monthlyAmount || 0;
        const basicYearly = basic?.annualAmount || 0;

        // Gross A (sum of earnings excluding Fixed Allowance)
        const grossAMonthly = template.earnings
            .filter(e => !e.name.toLowerCase().includes('fixed allowance'))
            .reduce((sum, e) => sum + (e.monthlyAmount || 0), 0);
        const grossAYearly = grossAMonthly * 12;

        // Gratuity (4.8% of Basic)
        const gratuityMonthly = (basicMonthly * 0.048);
        const gratuityYearly = gratuityMonthly * 12;

        // Gross B (Gross A + Gratuity)
        const grossBMonthly = grossAMonthly + gratuityMonthly;
        const grossBYearly = grossAYearly + gratuityYearly;

        // Employer Contributions
        const employerContribMonthly = template.employerDeductions?.reduce(
            (sum, ed) => sum + (ed.monthlyAmount || 0), 0
        ) || 0;

        // Gross C / CTC
        const grossCMonthly = grossBMonthly + employerContribMonthly;
        const grossCYearly = grossCMonthly * 12;

        // Employee Deductions
        const employeeDedMonthly = template.employeeDeductions?.reduce(
            (sum, ed) => sum + (ed.monthlyAmount || 0), 0
        ) || 0;

        // Take Home
        const takeHomeMonthly = grossAMonthly - employeeDedMonthly;
        const takeHomeYearly = takeHomeMonthly * 12;

        return {
            basic: { monthly: basicMonthly, yearly: basicYearly },
            grossA: { monthly: grossAMonthly, yearly: grossAYearly },
            grossB: { monthly: grossBMonthly, yearly: grossBYearly },
            grossC: { monthly: grossCMonthly, yearly: grossCYearly },
            gratuity: { monthly: gratuityMonthly, yearly: gratuityYearly },
            takeHome: { monthly: takeHomeMonthly, yearly: takeHomeYearly },
            ctc: { monthly: template.monthlyCTC || 0, yearly: template.annualCTC || 0 }
        };
    };

    // Get preview data (from snapshot or from preview API response)
    // Only show preview if we have actual data (not empty/null)
    const previewData = applicant?.salarySnapshot
        ? applicant.salarySnapshot
        : (salaryPreview && (salaryPreview.grossA || salaryPreview.ctc || (salaryPreview.earnings && salaryPreview.earnings.length > 0)))
            ? salaryPreview
            : null;

    const isViewOnly = !!applicant?.salarySnapshot;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">
                        {isViewOnly ? "View Salary" : "Assign Salary"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Salary Template Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Salary Template *
                        </label>
                        <select
                            value={selectedTemplateId || ''}
                            onChange={(e) => handleTemplateSelect(e.target.value)}
                            disabled={isViewOnly || loading || assigning}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                            <option value="">-- Select Salary Template --</option>
                            {salaryTemplates.map(template => (
                                <option key={template._id} value={template._id || ''}>
                                    {template.templateName} - ₹{template.annualCTC?.toLocaleString('en-IN') || 0}/year
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Salary Preview Section */}
                    {previewData && (
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                Salary Structure Preview {isViewOnly && '(Assigned)'}
                            </h3>

                            <div className="space-y-4">
                                {/* Basic */}
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-700 font-medium">Basic Salary</span>
                                    <div className="text-right">
                                        <div className="text-slate-900 font-semibold">
                                            {formatCurrency(previewData.basic?.monthly || previewData.earnings?.find(e => e.name.toLowerCase().includes('basic'))?.monthlyAmount)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {formatCurrency(previewData.basic?.yearly || previewData.earnings?.find(e => e.name.toLowerCase().includes('basic'))?.annualAmount)} /year
                                        </div>
                                    </div>
                                </div>

                                {/* HRA */}
                                {previewData.earnings?.find(e => e.name.toLowerCase().includes('hra')) && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-700 font-medium">HRA</span>
                                        <div className="text-right">
                                            <div className="text-slate-900 font-semibold">
                                                {formatCurrency(previewData.earnings.find(e => e.name.toLowerCase().includes('hra'))?.monthlyAmount)}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {formatCurrency(previewData.earnings.find(e => e.name.toLowerCase().includes('hra'))?.annualAmount)} /year
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Gross A */}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                                    <span className="text-slate-700 font-medium">Gross A</span>
                                    <div className="text-right">
                                        <div className="text-slate-900 font-semibold">
                                            {formatCurrency(previewData.grossA?.monthly)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {formatCurrency(previewData.grossA?.yearly)} /year
                                        </div>
                                    </div>
                                </div>

                                {/* Gratuity */}
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-700 font-medium">Gratuity</span>
                                    <div className="text-right">
                                        <div className="text-slate-900 font-semibold">
                                            {formatCurrency(previewData.gratuity?.monthly)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {formatCurrency(previewData.gratuity?.yearly)} /year
                                        </div>
                                    </div>
                                </div>

                                {/* Gross B */}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                                    <span className="text-slate-700 font-medium">Gross B</span>
                                    <div className="text-right">
                                        <div className="text-slate-900 font-semibold">
                                            {formatCurrency(previewData.grossB?.monthly)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {formatCurrency(previewData.grossB?.yearly)} /year
                                        </div>
                                    </div>
                                </div>

                                {/* Gross C / CTC */}
                                <div className="flex justify-between items-center pt-2 border-t-2 border-slate-400">
                                    <span className="text-slate-900 font-bold text-lg">Total CTC</span>
                                    <div className="text-right">
                                        <div className="text-slate-900 font-bold text-lg">
                                            {formatCurrency(previewData.ctc?.monthly || previewData.grossC?.monthly)}
                                        </div>
                                        <div className="text-sm text-slate-600 font-semibold">
                                            {formatCurrency(previewData.ctc?.yearly || previewData.grossC?.yearly)} /year
                                        </div>
                                    </div>
                                </div>

                                {/* Take Home */}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                                    <span className="text-slate-700 font-medium">Take Home</span>
                                    <div className="text-right">
                                        <div className="text-green-700 font-semibold">
                                            {formatCurrency(previewData.takeHome?.monthly)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {formatCurrency(previewData.takeHome?.yearly)} /year
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            onClick={onClose}
                            disabled={assigning}
                            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
                        >
                            {isViewOnly ? 'Close' : 'Cancel'}
                        </button>
                        {!isViewOnly && (
                            <button
                                onClick={handleAssign}
                                disabled={!selectedTemplateId || assigning || loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {assigning ? 'Assigning...' : 'Assign Salary'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

