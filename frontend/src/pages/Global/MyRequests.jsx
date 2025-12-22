import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

export default function MyRequests() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [requests, setRequests] = useState({ leaves: [], regularizations: [], notifications: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyRequests = async () => {
            try {
                setLoading(true);
                const res = await api.get('/notifications/my-requests');
                setRequests(res.data);
            } catch (error) {
                console.error("Failed to fetch my requests", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMyRequests();
    }, []);

    const StatusBadge = ({ status }) => {
        const styles = {
            Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.Pending}`}>
                {status}
            </span>
        );
    };

    const handleItemClick = (type, id) => {
        const basePath = user?.role === 'hr' ? '/hr' : '/employee';
        navigate(`${basePath}/details/${type}/${id}`);
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <header className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">My Requests</h1>
                    <p className="text-sm text-slate-500 mt-1">Showing all applications and notifications relevant to you</p>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Requests Column */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Leave Requests */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
                                <span className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                                    <Calendar className="w-5 h-5" />
                                </span>
                                Leave History
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {requests.leaves.length === 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-2xl text-center border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                                    No leave applications yet.
                                </div>
                            ) : (
                                requests.leaves.map(req => (
                                    <div
                                        key={req._id}
                                        onClick={() => handleItemClick('LeaveRequest', req._id)}
                                        className="group bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all active:scale-[0.98]"
                                    >
                                        <div className="flex gap-4 items-center">
                                            <div className="h-10 w-1 rounded-full bg-blue-500"></div>
                                            <div className="space-y-1">
                                                <div className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{req.leaveType}</div>
                                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDateDDMMYYYY(req.startDate)} - {formatDateDDMMYYYY(req.endDate)}
                                                </div>
                                            </div>
                                        </div>
                                        <StatusBadge status={req.status} />
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Regularization Requests */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
                                <span className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg text-purple-600 dark:text-purple-400">
                                    <Clock className="w-5 h-5" />
                                </span>
                                Regularizations
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {requests.regularizations.length === 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-2xl text-center border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                                    No regularization requests.
                                </div>
                            ) : (
                                requests.regularizations.map(req => (
                                    <div
                                        key={req._id}
                                        onClick={() => handleItemClick('Regularization', req._id)}
                                        className="group bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-all active:scale-[0.98]"
                                    >
                                        <div className="flex gap-4 items-center">
                                            <div className="h-10 w-1 rounded-full bg-purple-500"></div>
                                            <div className="space-y-1">
                                                <div className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors uppercase tracking-tight">{req.category}</div>
                                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDateDDMMYYYY(req.startDate)}
                                                </div>
                                            </div>
                                        </div>
                                        <StatusBadge status={req.status} />
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Notifications Column */}
                <div className="space-y-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
                        <span className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400">
                            <AlertCircle className="w-5 h-5" />
                        </span>
                        Activity History
                    </h2>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {requests.notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No recent activity.</div>
                            ) : (
                                requests.notifications.map(notif => (
                                    <div
                                        key={notif._id}
                                        onClick={() => handleItemClick(notif.entityType, notif.entityId)}
                                        className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="text-xs font-bold text-slate-800 dark:text-white mb-1">{notif.title}</div>
                                        <div className="text-[11px] text-slate-500 line-clamp-2">{notif.message}</div>
                                        <div className="text-[9px] text-slate-400 mt-2 font-bold uppercase">{formatDateDDMMYYYY(notif.createdAt)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
