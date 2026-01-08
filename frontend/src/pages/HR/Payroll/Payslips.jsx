import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { formatDateDDMMYYYY } from '../../../utils/dateUtils';
import { FileText, Download, Filter, Search } from 'lucide-react';

export default function Payslips() {
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

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

    async function downloadPDF(id) {
        try {
            const res = await api.get(`/payroll/payslips/my/${id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Payslip_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
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
                                            <button
                                                onClick={() => downloadPDF(p._id)}
                                                className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 px-3 py-1 rounded hover:bg-blue-50"
                                            >
                                                <Download className="h-4 w-4" /> Download
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
