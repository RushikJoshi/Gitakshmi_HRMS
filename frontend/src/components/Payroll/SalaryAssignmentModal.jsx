import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

export default function SalaryAssignmentModal({ employee, onClose, onSuccess }) {
    const [templates, setTemplates] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, [employee]);

    async function loadData() {
        setLoading(true);
        try {
            // Fetch templates
            const resTemp = await api.get('/payroll/salary-templates');
            setTemplates(resTemp.data?.data || []);

            // Fetch history for this employee
            if (employee) {
                const resHist = await api.get(`/payroll/history/${employee._id}`);
                setHistory(resHist.data?.data || []);

                // Pre-select current if exists
                if (employee.salaryTemplateId) {
                    const currentId = typeof employee.salaryTemplateId === 'object' ? employee.salaryTemplateId._id : employee.salaryTemplateId;
                    setSelectedTemplate(currentId);
                }
            }
        } catch (err) {
            console.error("Failed to load payroll data", err);
            setError("Failed to load templates or history");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedTemplate || !effectiveFrom) {
            setError("Please fill all fields");
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await api.post('/payroll/assign-template', {
                employeeId: employee._id,
                salaryTemplateId: selectedTemplate,
                effectiveFrom
            });
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to assign template");
        } finally {
            setSubmitting(false);
        }
    }

    if (!employee) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">Assign Salary Structure</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-800"><span className="font-semibold">Employee:</span> {employee.firstName} {employee.lastName} ({employee.employeeId})</p>
                        <p className="text-sm text-blue-800"><span className="font-semibold">Department:</span> {employee.department}</p>
                    </div>

                    {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Template</label>
                            <select
                                value={selectedTemplate}
                                onChange={e => setSelectedTemplate(e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                required
                            >
                                <option value="">Select a Template</option>
                                {templates.map(t => (
                                    <option key={t._id} value={t._id}>
                                        {t.templateName} (CTC: ₹{t.annualCTC?.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                            <input
                                type="date"
                                value={effectiveFrom}
                                onChange={e => setEffectiveFrom(e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Assignments take effect from this date onwards.</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting && <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                Assign Template
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Assignment History</h3>
                        {loading ? <p className="text-sm text-gray-400">Loading history...</p> : (
                            <div className="overflow-hidden rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {history.length === 0 ? (
                                            <tr><td colSpan="3" className="px-4 py-3 text-sm text-gray-500 text-center">No history found</td></tr>
                                        ) : (
                                            history.map(h => (
                                                <tr key={h._id}>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{h.salaryTemplateId?.templateName || 'Unknown'}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-600">{formatDateDDMMYYYY(h.effectiveFrom)}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-600">{h.assignedBy?.firstName || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
