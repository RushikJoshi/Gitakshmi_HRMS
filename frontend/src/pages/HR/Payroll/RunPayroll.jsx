import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { formatDateDDMMYYYY } from '../../../utils/dateUtils';
import { Play, CheckCircle, AlertTriangle, FileText, Loader } from 'lucide-react';

export default function RunPayroll() {
    const [loading, setLoading] = useState(false);
    const [runs, setRuns] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadRuns();
    }, [selectedYear]);

    async function loadRuns() {
        setLoading(true);
        try {
            const res = await api.get(`/payroll/runs?year=${selectedYear}`);
            setRuns(res.data?.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleInitiate() {
        setCalculating(true);
        setError('');
        setSuccess('');
        try {
            // 1. Initiate
            const initRes = await api.post('/payroll/runs', { month: selectedMonth, year: selectedYear });
            const runId = initRes.data?.data?._id;

            if (runId) {
                // 2. Calculate
                await api.post(`/payroll/runs/${runId}/calculate`);
                setSuccess(`Payroll for ${selectedMonth}/${selectedYear} calculated successfully!`);
                loadRuns();
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.response?.data?.error || "Failed to run payroll");
        } finally {
            setCalculating(false);
        }
    }

    async function handleApprove(id) {
        if (!confirm("Are you sure you want to approve this payroll? This will allow payslip generation.")) return;
        try {
            await api.post(`/payroll/runs/${id}/approve`);
            loadRuns();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to approve");
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Run Payroll</h1>
                    <p className="text-slate-500 mt-1">Manage monthly payroll processing</p>
                </div>
            </div>

            {/* Runner Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Play className="h-5 w-5 text-blue-600" />
                    Run New Payroll
                </h3>

                <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Month</label>
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(parseInt(e.target.value))}
                            className="w-40 rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 bg-white"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Year</label>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(parseInt(e.target.value))}
                            className="w-32 rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 bg-white"
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleInitiate}
                        disabled={calculating}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium transition flex items-center gap-2"
                    >
                        {calculating ? <Loader className="animate-spin h-5 w-5" /> : 'Process Payroll'}
                    </button>
                </div>

                {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> {error}</div>}
                {success && <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 flex items-center gap-2"><CheckCircle className="h-5 w-5" /> {success}</div>}
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-slate-800">Payroll History ({selectedYear})</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading history...</div>
                ) : runs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No payroll runs found for {selectedYear}</div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500">
                            <tr>
                                <th className="px-6 py-3 text-left tracking-wider">Month</th>
                                <th className="px-6 py-3 text-left tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left tracking-wider">Headcount</th>
                                <th className="px-6 py-3 text-left tracking-wider">Total Net Pay</th>
                                <th className="px-6 py-3 text-left tracking-wider">Processed On</th>
                                <th className="px-6 py-3 text-right tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {runs.map(run => (
                                <tr key={run._id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                        {new Date(0, run.month - 1).toLocaleString('default', { month: 'long' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={run.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                        {run.processedEmployees} / {run.totalEmployees}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                        ₹{run.totalNetPay?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                                        {formatDateDDMMYYYY(run.updatedAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        {run.status === 'CALCULATED' && (
                                            <button
                                                onClick={() => handleApprove(run._id)}
                                                className="text-emerald-600 hover:text-emerald-800 font-medium px-3 py-1 rounded hover:bg-emerald-50 mr-2"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        {run.status === 'APPROVED' && (
                                            <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded text-xs">Ready for Payment</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = {
        INITIATED: "bg-blue-100 text-blue-800",
        CALCULATED: "bg-purple-100 text-purple-800",
        APPROVED: "bg-emerald-100 text-emerald-800",
        PAID: "bg-green-100 text-green-800",
        CANCELLED: "bg-red-100 text-red-800"
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.INITIATED}`}>
            {status}
        </span>
    );
}
