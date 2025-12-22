import React, { useState, useEffect } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';
import { Check, X, Eye, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

export default function LeaveApprovals({
    isManagerView = false,
    endpoint = '/hr/leaves/requests',
    actionEndpoint = '/hr/leaves/requests'
}) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    // Modals state
    const [viewReason, setViewReason] = useState(null); // content string or null
    const [actionModal, setActionModal] = useState(null); // { id, type } or null
    const [remark, setRemark] = useState('');

    useEffect(() => {
        fetchRequests(pagination.page);
    }, [pagination.page, endpoint]);

    const fetchRequests = async (page = 1) => {
        setLoading(true);
        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            const res = await api.get(`${endpoint}${separator}page=${page}&limit=${pagination.limit}`);
            if (res.data.data) {
                // New format with pagination
                setRequests(res.data.data);
                setPagination(prev => ({ ...prev, ...res.data.meta }));
            } else {
                // Fallback for old API if something goes wrong or returns array
                setRequests(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleActionSubmit = async () => {
        if (!actionModal) return;
        if (!remark.trim()) {
            alert("Remark is mandatory.");
            return;
        }

        try {
            const body = { remark, rejectionReason: remark };
            await api.post(`${actionEndpoint}/${actionModal.id}/${actionModal.type}`, body);
            setActionModal(null);
            setRemark('');
            fetchRequests(pagination.page);
        } catch (err) {
            alert(err.response?.data?.error || "Action failed");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    return (
        <div className="space-y-6">
            {!isManagerView && <h1 className="text-2xl font-bold text-slate-800">Leave Requests</h1>}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dates</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Days</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan="7" className="p-10 text-center text-gray-500">Loading...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-500">No leave requests found.</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req._id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white border border-blue-200">
                                                    {req.employee?.firstName?.[0] || 'U'}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                        {req.employee?.firstName} {req.employee?.lastName}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{req.employee?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                                {req.leaveType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                                            <div className="flex flex-col">
                                                <span>{formatDateDDMMYYYY(req.startDate)} - {formatDateDDMMYYYY(req.endDate)}</span>
                                                {req.isHalfDay && (
                                                    <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">
                                                        Half-day on {req.halfDayTarget || 'Start'} ({req.halfDaySession})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{req.daysCount}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setViewReason(req.reason)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-blue-600 text-xs font-medium transition shadow-sm"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full border ${getStatusColor(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {req.status === 'Pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => { setActionModal({ id: req._id, type: 'approve' }); setRemark(''); }}
                                                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition shadow-sm"
                                                        title="Approve"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setActionModal({ id: req._id, type: 'reject' }); setRemark(''); }}
                                                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition shadow-sm"
                                                        title="Reject"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-900/50">
                    <Pagination
                        current={pagination.page}
                        pageSize={pagination.limit}
                        total={pagination.total}
                        onChange={(page) => setPagination(prev => ({ ...prev, page }))}
                        showSizeChanger={false}
                        hideOnSinglePage
                    />
                </div>
            </div>

            {/* View Reason Modal */}
            {viewReason !== null && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Leave Reason</h3>
                            <button onClick={() => setViewReason(null)} className="text-slate-400 hover:text-slate-600 transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-sm text-slate-700 dark:text-slate-300 min-h-[100px] whitespace-pre-wrap border border-slate-200 dark:border-slate-700">
                            {viewReason || "No reason provided by the employee."}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setViewReason(null)} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 text-sm font-medium transition shadow-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Confirmation Modal */}
            {actionModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center mb-5 text-center">
                            <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ${actionModal.type === 'approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {actionModal.type === 'approve' ? <Check size={28} /> : <AlertCircle size={28} />}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                                {actionModal.type} Request
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 px-2">
                                Are you sure you want to {actionModal.type} this leave request? This action is irreversible.
                            </p>
                        </div>

                        <div className="mb-5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                                Admin Remark <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[100px] resize-none dark:text-white"
                                placeholder="Enter compulsory remark..."
                                autoFocus
                            ></textarea>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setActionModal(null)}
                                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleActionSubmit}
                                className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm transition-colors ${actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

