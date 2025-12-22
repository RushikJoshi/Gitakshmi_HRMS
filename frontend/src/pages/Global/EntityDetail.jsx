import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CommentSection from '../../components/common/CommentSection';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { ChevronLeft, Calendar, User, Info, AlertTriangle } from 'lucide-react';

export default function EntityDetail() {
    const { entityType, entityId } = useParams();
    const navigate = useNavigate();
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/entities/${entityType}/${entityId}`);
                setEntity(res.data);
            } catch (err) {
                console.error("Failed to fetch entity details", err);
                setError(err.response?.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [entityType, entityId]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error === 'FORBIDDEN') return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 p-6 text-center">
            <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
                <AlertTriangle size={40} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">403 - Access Denied</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
                You do not have permission to view this {entityType}.
                Strict role-based isolation is enforced for this entity.
            </p>
            <button
                onClick={() => navigate(-1)}
                className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
                Go Back
            </button>
        </div>
    );

    if (error || !entity) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Entity Not Found</h1>
            <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-2">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white capitalize">
                            {entityType} Details
                        </h1>
                        <p className="text-sm text-slate-500">ID: {entityId}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Details Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <Info className="w-5 h-5 text-blue-500" />
                                Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {entity.employee && (
                                    <div className="flex items-start gap-3">
                                        <User className="w-5 h-5 text-slate-400 mt-1" />
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase text-[10px] tracking-wider">Employee</label>
                                            <div className="text-slate-800 dark:text-slate-200 font-black pt-0.5">
                                                {entity.employee.firstName} {entity.employee.lastName}
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium">{entity.employee.email}</div>
                                        </div>
                                    </div>
                                )}

                                {entity.startDate && (
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-slate-400 mt-1" />
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase text-[10px] tracking-wider">Event Date</label>
                                            <div className="text-slate-800 dark:text-slate-200 font-black pt-0.5">
                                                {formatDateDDMMYYYY(entity.startDate)}
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium">Correction applied for this day</div>
                                        </div>
                                    </div>
                                )}

                                {/* Regularization Specific Fields */}
                                {entityType === 'Regularization' && (
                                    <>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                                <Info className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase text-[10px] tracking-wider">Workflow Category</label>
                                                <div className={`text-xs font-black uppercase tracking-tight mt-1 ${entity.category === 'Attendance' ? 'text-indigo-600' : 'text-amber-600'}`}>
                                                    {entity.category} Correction
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                                <AlertTriangle className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase text-[10px] tracking-wider">Exception Type</label>
                                                <div className="text-slate-800 dark:text-slate-200 font-black text-xs mt-1 uppercase">
                                                    {entity.issueType}
                                                </div>
                                            </div>
                                        </div>

                                        {entity.requestedData && (
                                            <div className="md:col-span-2 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100/50 dark:border-blue-900/20 shadow-inner">
                                                <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-4">Requested Correction Details</h4>
                                                <div className="grid grid-cols-2 gap-8">
                                                    {entity.category === 'Attendance' ? (
                                                        <>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modified Check In</label>
                                                                <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">
                                                                    {entity.requestedData.checkIn ? new Date(entity.requestedData.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modified Check Out</label>
                                                                <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">
                                                                    {entity.requestedData.checkOut ? new Date(entity.requestedData.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Leave Type</label>
                                                            <div className="text-xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                                                                {entity.requestedData.requestedLeaveType || 'N/A'}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400 italic">Changed from: {entity.requestedData.originalLeaveType || 'None'}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-700 pt-6">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Employee Reason / Justification</label>
                                    <div className="mt-3 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-slate-700 dark:text-slate-300 text-sm font-bold leading-relaxed border border-slate-100 dark:border-slate-800 italic">
                                        "{entity.reason || entity.message || "No description provided."}"
                                    </div>
                                </div>

                                {entity.status && (
                                    <div className="md:col-span-2 flex items-center justify-between mt-4 bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${entity.status === 'Approved' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : entity.status === 'Rejected' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</label>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${entity.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' :
                                            entity.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {entity.status}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chat / Comment Panel */}
                    <div className="lg:col-span-1">
                        <CommentSection entityType={entityType} entityId={entityId} />
                    </div>
                </div>
            </div>
        </div>
    );
}
