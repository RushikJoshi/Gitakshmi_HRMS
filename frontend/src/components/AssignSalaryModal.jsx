import React, { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * ============================================
 * ASSIGN SALARY MODAL - REFACTORED
 * ============================================
 * 
 * CORE PRINCIPLES:
 * 1. HR enters ONLY CTC
 * 2. Frontend NEVER calculates
 * 3. Backend is the SINGLE SOURCE OF TRUTH
 * 4. All component amounts are READ-ONLY
 */

export default function AssignSalaryModal({
    isOpen,
    onClose,
    applicant,
    onSuccess
}) {
    const [ctcAnnual, setCtcAnnual] = useState('');
    const [salaryPreview, setSalaryPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState(null);

    // Load existing salary if already assigned
    useEffect(() => {
        if (isOpen && applicant) {
            if (applicant.salarySnapshot) {
                setSalaryPreview(applicant.salarySnapshot);
                setCtcAnnual(applicant.salarySnapshot.ctc || applicant.salarySnapshot.annualCTC || '');
            } else {
                setSalaryPreview(null);
                setCtcAnnual('');
            }
            setError(null);
        }
    }, [isOpen, applicant]);

    // Calculate salary breakdown from CTC
    const handleCalculate = async () => {
        if (!ctcAnnual || isNaN(ctcAnnual) || Number(ctcAnnual) <= 0) {
            setError('Please enter a valid Annual CTC');
            return;
        }

        try {
            setCalculating(true);
            setError(null);

            const res = await api.post('/salary/preview', {
                ctcAnnual: Number(ctcAnnual)
            });

            if (res.data.success) {
                setSalaryPreview(res.data.data);
            } else {
                setError(res.data.message || 'Failed to calculate salary');
            }
        } catch (err) {
            console.error('Failed to calculate salary:', err);
            const errorMsg = err.response?.data?.message ||
                err.response?.data?.errors?.join(', ') ||
                'Failed to calculate salary breakdown';
            setError(errorMsg);
            setSalaryPreview(null);
        } finally {
            setCalculating(false);
        }
    };

    // Assign salary to applicant
    const handleAssign = async () => {
        if (!ctcAnnual || !salaryPreview) {
            setError('Please calculate salary first');
            return;
        }

        try {
            setAssigning(true);
            setError(null);

            const res = await api.post('/salary/assign', {
                applicantId: applicant._id,
                ctcAnnual: Number(ctcAnnual)
            });

            if (res.data.success) {
                // Auto-confirm to lock the snapshot
                const confirmRes = await api.post('/salary/confirm', {
                    applicantId: applicant._id,
                    reason: 'JOINING'
                });

                if (confirmRes.data.success) {
                    alert('Salary assigned and locked successfully!');
                    onSuccess && onSuccess(confirmRes.data.data);
                    onClose();
                }
            }
        } catch (err) {
            console.error('Failed to assign salary:', err);
            const errorMsg = err.response?.data?.message ||
                err.response?.data?.errors?.join(', ') ||
                'Failed to assign salary';
            setError(errorMsg);
        } finally {
            setAssigning(false);
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '₹0.00';
        return `₹${Number(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const isViewOnly = !!applicant?.salaryLocked;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
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
                    {/* Applicant Info */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-600">Candidate:</span>
                                <span className="ml-2 font-semibold text-slate-900">{applicant?.name}</span>
                            </div>
                            <div>
                                <span className="text-slate-600">Position:</span>
                                <span className="ml-2 font-semibold text-slate-900">
                                    {applicant?.requirementId?.jobTitle || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* CTC Input */}
                    {!isViewOnly && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Annual CTC (Cost to Company) *
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="number"
                                        value={ctcAnnual}
                                        onChange={(e) => setCtcAnnual(e.target.value)}
                                        placeholder="e.g., 600000"
                                        disabled={calculating || assigning}
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                                    />
                                    <button
                                        onClick={handleCalculate}
                                        disabled={!ctcAnnual || calculating || assigning}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                    >
                                        {calculating ? 'Calculating...' : 'Calculate'}
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Enter the annual CTC and click Calculate to see the breakdown
                                </p>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm text-red-700">⚠️ {error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Salary Preview */}
                    {salaryPreview && (
                        <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                💰 Salary Breakdown
                                {isViewOnly && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Locked</span>}
                            </h3>

                            <div className="space-y-4">
                                {/* CTC Summary */}
                                <div className="bg-white rounded-lg p-4 border border-slate-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-900 font-bold text-lg">Annual CTC</span>
                                        <div className="text-right">
                                            <div className="text-slate-900 font-bold text-lg">
                                                {formatCurrency(salaryPreview.annualCTC || salaryPreview.ctc)}
                                            </div>
                                            <div className="text-sm text-slate-600">
                                                {formatCurrency(salaryPreview.monthlyCTC)} /month
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Earnings */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">📈 Earnings</h4>
                                    <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                                        {salaryPreview.earnings?.map((earning, idx) => (
                                            <div key={idx} className="flex justify-between items-center px-4 py-2">
                                                <div>
                                                    <span className="text-slate-700 font-medium">{earning.name}</span>
                                                    {earning.formula && (
                                                        <span className="ml-2 text-xs text-slate-500">({earning.formula})</span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-slate-900 font-semibold">
                                                        {formatCurrency(earning.monthlyAmount)}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {formatCurrency(earning.annualAmount)} /year
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center px-4 py-2 bg-slate-50 font-semibold">
                                            <span className="text-slate-900">Gross Earnings</span>
                                            <div className="text-right">
                                                <div className="text-slate-900">
                                                    {formatCurrency(salaryPreview.grossEarnings?.monthly)}
                                                </div>
                                                <div className="text-xs text-slate-600">
                                                    {formatCurrency(salaryPreview.grossEarnings?.yearly)} /year
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Employer Benefits */}
                                {salaryPreview.benefits && salaryPreview.benefits.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-2">🏢 Employer Benefits (CTC Components)</h4>
                                        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                                            {salaryPreview.benefits.map((benefit, idx) => (
                                                <div key={idx} className="flex justify-between items-center px-4 py-2">
                                                    <div>
                                                        <span className="text-slate-700 font-medium">{benefit.name}</span>
                                                        {benefit.formula && (
                                                            <span className="ml-2 text-xs text-slate-500">({benefit.formula})</span>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-slate-900 font-semibold">
                                                            {formatCurrency(benefit.monthlyAmount)}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {formatCurrency(benefit.annualAmount)} /year
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Employee Deductions */}
                                {salaryPreview.employeeDeductions && salaryPreview.employeeDeductions.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-2">📉 Employee Deductions</h4>
                                        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                                            {salaryPreview.employeeDeductions.map((deduction, idx) => (
                                                <div key={idx} className="flex justify-between items-center px-4 py-2">
                                                    <div>
                                                        <span className="text-slate-700 font-medium">{deduction.name}</span>
                                                        {deduction.formula && (
                                                            <span className="ml-2 text-xs text-slate-500">({deduction.formula})</span>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-red-600 font-semibold">
                                                            -{formatCurrency(deduction.monthlyAmount)}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            -{formatCurrency(deduction.annualAmount)} /year
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Net Take-Home */}
                                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-900 font-bold text-lg">💵 Net Take-Home</span>
                                        <div className="text-right">
                                            <div className="text-green-700 font-bold text-xl">
                                                {formatCurrency(salaryPreview.netPay?.monthly || salaryPreview.breakdown?.takeHome)}
                                            </div>
                                            <div className="text-sm text-green-600">
                                                {formatCurrency(salaryPreview.netPay?.yearly)} /year
                                            </div>
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
                            className="px-6 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
                        >
                            {isViewOnly ? 'Close' : 'Cancel'}
                        </button>
                        {!isViewOnly && salaryPreview && (
                            <button
                                onClick={handleAssign}
                                disabled={!salaryPreview || assigning}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {assigning ? 'Assigning...' : 'Assign & Lock Salary'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
