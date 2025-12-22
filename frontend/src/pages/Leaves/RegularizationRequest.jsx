import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Info, AlertTriangle } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import dayjs from 'dayjs';

export default function RegularizationRequest() {
    const [activeTab, setActiveTab] = useState('apply'); // apply | history
    const [requests, setRequests] = useState([]);

    // Calendar & Data State
    const [attendance, setAttendance] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [settings, setSettings] = useState({});
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Form
    const [form, setForm] = useState({
        category: 'Attendance', // Attendance | Leave
        startDate: '',
        endDate: '',
        issueType: '',
        reason: '',
        // Dynamic Fields
        checkIn: '',
        checkOut: '',
        requestedLeaveType: '',
        originalLeaveType: ''
    });

    useEffect(() => {
        if (activeTab === 'history') fetchHistory();
        if (activeTab === 'apply') fetchData();
    }, [activeTab, currentMonth, currentYear]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [attRes, holidayRes, settingsRes] = await Promise.all([
                api.get(`/attendance/my?month=${currentMonth + 1}&year=${currentYear}`),
                api.get('/holidays'),
                api.get('/attendance/settings')
            ]);
            setAttendance(attRes.data || []);
            setHolidays(holidayRes.data || []);
            setSettings(settingsRes.data || {});
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/employee/regularization/my');
            setRequests(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    // Calculate Disabled Dates based on strict rules
    const disabledDates = useMemo(() => {
        const disabled = {};
        const today = dayjs().format('YYYY-MM-DD');
        const weeklyOffs = settings.weeklyOffDays || [0];

        // Helper to check range
        const startOfMonth = dayjs(`${currentYear}-${currentMonth + 1}-01`);
        const endOfMonth = startOfMonth.endOf('month');

        let current = startOfMonth;
        while (current.isBefore(endOfMonth) || current.isSame(endOfMonth)) {
            const dateStr = current.format('YYYY-MM-DD');

            // 1. Future Dates
            if (dateStr > today) {
                disabled[dateStr] = "Future date selection is blocked";
            }

            // 2. Weekly Offs
            if (weeklyOffs.includes(current.day())) {
                disabled[dateStr] = "Selection blocked on Weekly Offs";
            }

            current = current.add(1, 'day');
        }

        // 3. Company Holidays
        holidays.forEach(h => {
            const dStr = h.date.split('T')[0];
            disabled[dStr] = `Holiday: ${h.name}`;
        });

        // 4. Payroll Locked & Approved Leave Days
        attendance.forEach(att => {
            const dStr = att.date.split('T')[0];
            if (att.locked) {
                disabled[dStr] = "Attendance record is locked by Payroll";
            }
            if (att.status === 'leave') {
                disabled[dStr] = "Regularization not allowed on Approved Leave";
            }
        });

        return disabled;
    }, [currentMonth, currentYear, attendance, holidays, settings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.startDate) return alert("Please select a date from the calendar");

        try {
            const payload = {
                category: form.category,
                startDate: form.startDate,
                endDate: form.endDate || form.startDate,
                issueType: form.issueType,
                reason: form.reason,
                requestedData: {}
            };

            if (form.category === 'Attendance') {
                if (form.checkIn) payload.requestedData.checkIn = `${form.startDate}T${form.checkIn}:00`;
                if (form.checkOut) payload.requestedData.checkOut = `${form.startDate}T${form.checkOut}:00`;
            } else {
                payload.requestedData.requestedLeaveType = form.requestedLeaveType;
                payload.requestedData.originalLeaveType = form.originalLeaveType;
            }

            await api.post('/employee/regularization', payload);
            alert('Request Submitted Successfully');
            setActiveTab('history');
            setForm({ category: 'Attendance', startDate: '', endDate: '', issueType: '', reason: '', checkIn: '', checkOut: '', requestedLeaveType: '', originalLeaveType: '' });
        } catch (err) {
            alert(err.response?.data?.error || "Submission Failed");
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'Approved') return <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold border border-green-200">Approved</span>;
        if (status === 'Rejected') return <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded text-xs font-bold border border-rose-200">Rejected</span>;
        return <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-bold border border-amber-200">Pending</span>;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 min-h-[600px] overflow-hidden">
            {/* Header Tabs */}
            <div className="flex bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 p-1">
                <button
                    onClick={() => setActiveTab('apply')}
                    className={`flex-1 py-4 text-xs font-black uppercase tracking-widest text-center transition-all rounded-2xl ${activeTab === 'apply' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xl shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    Apply Correction
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-4 text-xs font-black uppercase tracking-widest text-center transition-all rounded-2xl ${activeTab === 'history' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xl shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    Request History
                </button>
            </div>

            <div className="p-8">
                {activeTab === 'apply' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        {/* Selector Section (Left) */}
                        <div className="xl:col-span-8 space-y-6">
                            <div className="flex items-center justify-between px-2 mb-2">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Select Day</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correction is allowed only on working days</p>
                                </div>
                                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition"><ChevronLeft size={16} /></button>
                                    <div className="px-4 text-[10px] font-black text-slate-700 dark:text-slate-300 min-w-[120px] text-center uppercase tracking-widest">
                                        {dayjs(new Date(currentYear, currentMonth)).format('MMMM YYYY')}
                                    </div>
                                    <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition"><ChevronRight size={16} /></button>
                                </div>
                            </div>

                            <AttendanceCalendar
                                data={attendance}
                                holidays={holidays}
                                settings={settings}
                                currentMonth={currentMonth}
                                currentYear={currentYear}
                                onDateClick={(date) => setForm({ ...form, startDate: date })}
                                selectedDate={form.startDate}
                                selectionMode={true}
                                disabledDates={disabledDates}
                            />
                        </div>

                        {/* Form Section (Right) */}
                        <div className="xl:col-span-4 bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Correction Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, category: 'Attendance' })}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${form.category === 'Attendance' ? 'bg-white border-blue-500 text-blue-600 shadow-lg shadow-blue-500/10' : 'bg-transparent border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            <Clock size={20} />
                                            <span className="text-[10px] font-black uppercase">Punches</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, category: 'Leave' })}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${form.category === 'Leave' ? 'bg-white border-blue-500 text-blue-600 shadow-lg shadow-blue-500/10' : 'bg-transparent border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            <CalendarIcon size={20} />
                                            <span className="text-[10px] font-black uppercase">Leaves</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Issue Type</label>
                                        <select required className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                            value={form.issueType} onChange={e => setForm({ ...form, issueType: e.target.value })}>
                                            <option value="">-- Select Issue --</option>
                                            {form.category === 'Attendance' ? (
                                                <>
                                                    <option>Missed Check In</option>
                                                    <option>Missed Check Out</option>
                                                    <option>Forgot to Punch (Both)</option>
                                                    <option>Actually Present (Approved Leave Reversal)</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option>Applied Wrong Leave Type</option>
                                                    <option>Forgot to Apply Leave</option>
                                                    <option>LOP Correction</option>
                                                    <option>Cancel Approved Leave</option>
                                                </>
                                            )}
                                        </select>
                                    </div>

                                    {form.category === 'Attendance' ? (
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 animate-in slide-in-from-top-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corrected Timings</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">In Time</label>
                                                    <input type="time" className="w-full border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 text-xs font-black"
                                                        value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Out Time</label>
                                                    <input type="time" className="w-full border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 text-xs font-black"
                                                        value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 animate-in slide-in-from-top-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leave Adjustment</h4>
                                            <div className="space-y-3">
                                                <input type="text" placeholder="Marked As (Original status)" className="w-full border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 text-xs font-bold"
                                                    value={form.originalLeaveType} onChange={e => setForm({ ...form, originalLeaveType: e.target.value })} />
                                                <select className="w-full border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 text-xs font-bold"
                                                    value={form.requestedLeaveType} onChange={e => setForm({ ...form, requestedLeaveType: e.target.value })}>
                                                    <option value="">-- Change To --</option>
                                                    <option value="CL">CL</option>
                                                    <option value="PL">PL</option>
                                                    <option value="SL">SL</option>
                                                    <option value="Present">Present (Working)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Reason (Mandatory)</label>
                                        <textarea required className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                                            placeholder="Please provide a valid justification..."
                                            value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}></textarea>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!form.startDate || !form.reason}
                                    className="w-full py-5 bg-slate-800 dark:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-blue-700 transition-all shadow-xl shadow-slate-200/50 dark:shadow-blue-500/20 disabled:opacity-50 active:scale-95"
                                >
                                    {form.startDate ? `Submit for ${formatDateDDMMYYYY(form.startDate)}` : 'Select Date to Continue'}
                                </button>

                                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-bold text-amber-700 dark:text-amber-500 leading-relaxed uppercase tracking-tight">
                                        Misuse of regularization may result in disciplinary action. All requests are logged.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    // HISTORY TAB
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                                    <th className="px-6 py-5 text-left">Date</th>
                                    <th className="px-6 py-5 text-center">Category</th>
                                    <th className="px-6 py-5 text-left">Issue</th>
                                    <th className="px-6 py-5 text-left">Status</th>
                                    <th className="px-6 py-5 text-left">Admin Remark</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-20">
                                                <Clock size={48} />
                                                <p className="font-black uppercase tracking-widest text-xs">No records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    requests.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(req => (
                                        <tr key={req._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-black text-slate-700 dark:text-slate-300">{formatDateDDMMYYYY(req.startDate)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-widest ${req.category === 'Attendance' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                    {req.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-500">{req.issueType}</td>
                                            <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-400 italic max-w-xs">{req.adminRemark || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {requests.length > pageSize && (
                            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <Pagination
                                    current={currentPage}
                                    pageSize={pageSize}
                                    total={requests.length}
                                    onChange={(page) => setCurrentPage(page)}
                                    showSizeChanger={false}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
