import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { formatDateDDMMYYYY } from '../../../utils/dateUtils';
import { FileText, Download, Filter, Search, Eye, X } from 'lucide-react';

export default function Payslips() {
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [previewPayslip, setPreviewPayslip] = useState(null);

    useEffect(() => {
        loadPayslips();
    }, [selectedMonth, selectedYear]);

    async function loadPayslips() {
        setLoading(true);
        try {
            // NOTE: Use a query param for filtering by month/year on the backend if implemented,
            // otherwise fetch all and filter client side.
            // Based on controller, it fetches all.
            const res = await api.get(`/payroll/payslips`);
            setPayslips(res.data?.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // Filter Logic
    const filtered = payslips.filter(p => {
        if (p.year !== selectedYear) return false;
        if (selectedMonth && p.month !== selectedMonth) return false;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const empName = p.employeeInfo?.name?.toLowerCase() || '';
            const empId = p.employeeInfo?.employeeId?.toLowerCase() || '';
            return empName.includes(term) || empId.includes(term);
        }
        return true;
    });

    async function downloadPDF(payslip) {
        try {
            // Generate PDF using backend endpoint
            const res = await api.post(`/payroll/payslips/${payslip._id}/generate-pdf`, {}, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            const fileName = `Payslip_${payslip.employeeInfo?.name}_${payslip.month}-${payslip.year}.pdf`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed", err);
            alert("Failed to download PDF. Please try again.");
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Payslips</h1>
                    <p className="text-slate-500 mt-1">View and download generated payslips</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                {/* Filters */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(parseInt(e.target.value))}
                            className="rounded border-slate-300 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Months</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(parseInt(e.target.value))}
                            className="rounded border-slate-300 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 relative max-w-md ml-auto">
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 rounded border-slate-300 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading payslips...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">No payslips found for selected period</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 text-left tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-left tracking-wider">Period</th>
                                    <th className="px-6 py-3 text-left tracking-wider">Gross Pay</th>
                                    <th className="px-6 py-3 text-left tracking-wider">Net Pay</th>
                                    <th className="px-6 py-3 text-left tracking-wider">Generated On</th>
                                    <th className="px-6 py-3 text-right tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filtered.map(p => (
                                    <tr key={p._id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-slate-900">{p.employeeInfo?.name}</div>
                                            <div className="text-xs text-slate-500">{p.employeeInfo?.employeeId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            {new Date(0, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            ₹{p.grossEarnings?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                            ₹{p.netPay?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                                            {formatDateDDMMYYYY(p.generatedAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setPreviewPayslip(p)}
                                                    className="text-emerald-600 hover:text-emerald-800 font-medium inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-emerald-50"
                                                >
                                                    <Eye className="h-4 w-4" /> Preview
                                                </button>
                                                <button
                                                    onClick={() => downloadPDF(p)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-blue-50"
                                                >
                                                    <Download className="h-4 w-4" /> Download
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewPayslip && (
                <PayslipPreviewModal
                    payslip={previewPayslip}
                    onClose={() => setPreviewPayslip(null)}
                    onDownload={() => downloadPDF(previewPayslip)}
                />
            )}
        </div>
    );
}

// Preview Modal Component
function PayslipPreviewModal({ payslip, onClose, onDownload }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-900">Payslip Preview</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Payslip Content */}
                <div className="p-8 space-y-6">
                    {/* Employee Info */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">{payslip.employeeInfo?.name}</h3>
                            <p className="text-sm text-slate-600">Employee ID: {payslip.employeeInfo?.employeeId}</p>
                            <p className="text-sm text-slate-600">Department: {payslip.employeeInfo?.department}</p>
                            <p className="text-sm text-slate-600">Designation: {payslip.employeeInfo?.designation}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-semibold text-slate-900">
                                {new Date(0, payslip.month - 1).toLocaleString('default', { month: 'long' })} {payslip.year}
                            </p>
                            <p className="text-sm text-slate-600">Generated: {formatDateDDMMYYYY(payslip.generatedAt)}</p>
                        </div>
                    </div>

                    {/* Earnings */}
                    <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Earnings</h4>
                        <table className="w-full text-sm">
                            <tbody>
                                {payslip.earningsSnapshot?.map((e, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-2 text-slate-700">{e.name}</td>
                                        <td className="py-2 text-right font-medium">₹{e.amount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="font-semibold">
                                    <td className="py-2 text-slate-900">Gross Earnings</td>
                                    <td className="py-2 text-right text-slate-900">₹{payslip.grossEarnings?.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Deductions */}
                    <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Deductions</h4>
                        <table className="w-full text-sm">
                            <tbody>
                                {payslip.preTaxDeductionsSnapshot?.map((d, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-2 text-slate-700">{d.name}</td>
                                        <td className="py-2 text-right font-medium">₹{d.amount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {payslip.incomeTax > 0 && (
                                    <tr className="border-b border-slate-100">
                                        <td className="py-2 text-slate-700">Income Tax (TDS)</td>
                                        <td className="py-2 text-right font-medium">₹{payslip.incomeTax?.toLocaleString()}</td>
                                    </tr>
                                )}
                                {payslip.postTaxDeductionsSnapshot?.map((d, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-2 text-slate-700">{d.name}</td>
                                        <td className="py-2 text-right font-medium">₹{d.amount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="font-semibold">
                                    <td className="py-2 text-slate-900">Total Deductions</td>
                                    <td className="py-2 text-right text-slate-900">
                                        ₹{((payslip.preTaxDeductionsTotal || 0) + (payslip.incomeTax || 0) + (payslip.postTaxDeductionsTotal || 0)).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Net Pay */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-emerald-900">Net Pay</span>
                            <span className="text-2xl font-bold text-emerald-600">₹{payslip.netPay?.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Attendance Summary */}
                    {payslip.attendanceSummary && (
                        <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Attendance Summary</h4>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-600">Total Days</p>
                                    <p className="font-semibold text-slate-900">{payslip.attendanceSummary.totalDays}</p>
                                </div>
                                <div>
                                    <p className="text-slate-600">Present</p>
                                    <p className="font-semibold text-emerald-600">{payslip.attendanceSummary.presentDays}</p>
                                </div>
                                <div>
                                    <p className="text-slate-600">Leaves</p>
                                    <p className="font-semibold text-blue-600">{payslip.attendanceSummary.leaveDays || 0}</p>
                                </div>
                                <div>
                                    <p className="text-slate-600">LOP Days</p>
                                    <p className="font-semibold text-red-600">{payslip.attendanceSummary.lopDays || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                    >
                        Close
                    </button>
                    <button
                        onClick={onDownload}
                        className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" /> Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
