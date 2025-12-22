import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import {
    Calendar as CalendarIcon,
    AlertCircle,
    CheckCircle,
    Clock,
    ChevronLeft,
    ChevronRight,
    Info,
    Lock
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

// --- Static configs for fallback if no category/color provided ---
const FALLBACK_CONFIG = {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    main: '#3b82f6',
    light: '#dbeafe',
    active: 'bg-blue-600'
};

const LOP_CONFIG = {
    id: 'LOP',
    label: 'Unpaid / Personal',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    main: '#ef4444',
    light: '#fee2e2',
    active: 'bg-rose-600'
};

const HOLIDAY_ICONS = {
    diwali: '🪔',
    christmas: '🎄',
    holidays: '🎉',
    independence: '🇮🇳',
    republic: '🇮🇳',
    gandhi: '👓',
    eid: '🌙',
    holi: '🎨',
    default: '🎉'
};

const getHolidayIcon = (name = '') => {
    const n = name.toLowerCase();
    for (const key in HOLIDAY_ICONS) {
        if (n.includes(key)) return HOLIDAY_ICONS[key];
    }
    return HOLIDAY_ICONS.default;
};

export default function ApplyLeaveForm({ balances = [], existingLeaves = [], editData = null, isHR = false, targetEmployeeId = null, onCancelEdit, onSuccess }) {
    const [form, setForm] = useState({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        isHalfDay: false,
        halfDayTarget: 'Start', // 'Start' or 'End'
        halfDaySession: 'First Half',
        employeeId: targetEmployeeId || ''
    });

    const [employees, setEmployees] = useState([]); // For HR to select employee
    const [internalBalances, setInternalBalances] = useState([]);

    // Fetch Balances Effect
    useEffect(() => {
        const fetchBalances = async () => {
            const empId = isHR ? (targetEmployeeId || form.employeeId) : null;
            if (!empId && isHR) return;

            try {
                const endpoint = isHR ? `/hr/leaves/balances/${empId}` : '/employee/leaves/balances';
                const res = await api.get(endpoint);
                setInternalBalances(res.data || []);
            } catch (err) {
                console.error("Failed to fetch balances", err);
            }
        };

        if (isHR && (targetEmployeeId || form.employeeId)) {
            fetchBalances();
        } else if (!isHR && balances.length === 0) {
            fetchBalances();
        }
    }, [isHR, targetEmployeeId, form.employeeId, balances.length]);

    // Use internalBalances if balances prop is empty
    const effectiveBalances = useMemo(() => {
        return balances && balances.length > 0 ? balances : internalBalances;
    }, [balances, internalBalances]);

    // Generate dynamic LEAVE_CONFIG from effectiveBalances
    const dynamicLeaveConfig = useMemo(() => {
        const config = {};
        effectiveBalances.forEach(b => {
            const mainColor = b.color || '#3b82f6';
            config[b.leaveType] = {
                id: b.leaveType,
                label: b.leaveType,
                main: mainColor,
                light: `${mainColor}20`, // 20% opacity
                bg: 'bg-white',
                border: 'border-slate-200',
                text: 'text-slate-700'
            };
        });
        // Always add Unpaid/Personal Leave
        config['Personal Leave'] = LOP_CONFIG;
        return config;
    }, [effectiveBalances]);

    const [currentCalDate, setCurrentCalDate] = useState(new Date());
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(null);
    const [infoMessage, setInfoMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [holidays, setHolidays] = useState([]);
    const [hoverDate, setHoverDate] = useState(null);
    const [settings, setSettings] = useState({});

    // Fetch Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/attendance/settings');
                setSettings(res.data || {});
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };
        fetchSettings();
    }, []);

    // Fetch Employees if HR
    useEffect(() => {
        if (isHR && !targetEmployeeId) {
            const fetchEmployees = async () => {
                try {
                    const res = await api.get('/hr/employees');
                    setEmployees(res.data.data || []);
                } catch (err) {
                    console.error("Failed to fetch employees", err);
                }
            };
            fetchEmployees();
        }
    }, [isHR, targetEmployeeId]);



    // Fetch Holidays
    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const res = await api.get('/holidays');
                setHolidays(res.data || []);
            } catch (err) {
                console.error("Failed to fetch holidays", err);
            }
        };
        fetchHolidays();
    }, []);

    // Populate form if editing
    useEffect(() => {
        if (editData) {
            setForm({
                leaveType: editData.leaveType,
                startDate: editData.startDate.split('T')[0],
                endDate: editData.endDate.split('T')[0],
                reason: editData.reason,
                isHalfDay: editData.isHalfDay || false,
                halfDayTarget: editData.halfDayTarget || 'Start',
                halfDaySession: editData.halfDaySession || 'First Half'
            });
            setCurrentCalDate(new Date(editData.startDate));
        }
    }, [editData]);

    const holidayMap = useMemo(() => {
        const map = {};
        holidays.forEach(h => {
            const dStr = new Date(h.date).toISOString().split('T')[0];
            map[dStr] = h;
        });
        return map;
    }, [holidays]);

    const isDateSelectable = (dateStr) => {
        if (!dateStr) return false;

        const [y, m, dPart] = dateStr.split('-').map(Number);
        const d = new Date(y, m - 1, dPart);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weeklyOffDays = settings.weeklyOffDays || [0];

        // 1. Future Dates Only
        if (d < today) return false;

        // 2. No Weekly Offs
        if (weeklyOffDays.includes(d.getDay())) return false;

        // 3. No Holidays
        if (holidayMap[dateStr]) return false;

        return true;
    };

    const getDisabledReason = (dateStr) => {
        if (!dateStr) return null;
        const [y, m, dPart] = dateStr.split('-').map(Number);
        const d = new Date(y, m - 1, dPart);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weeklyOffDays = settings.weeklyOffDays || [0];

        if (d < today) return "Past dates are locked";
        if (weeklyOffDays.includes(d.getDay())) return "Selection blocked on Weekly Offs";
        if (holidayMap[dateStr]) return `Holiday: ${holidayMap[dateStr].name}`;
        return null;
    };

    // Validation
    useEffect(() => {
        setError(null);
        setDuration(0);
        setInfoMessage(null);

        if (!form.startDate) return;

        const start = new Date(form.startDate);
        const end = new Date(form.endDate || form.startDate);

        if (end < start) {
            setError('To Date cannot be earlier than From Date.');
            return;
        }

        let count = 0;
        let loop = new Date(start);
        while (loop <= end) {
            const dStr = loop.toISOString().split('T')[0];

            // Sandwich Rule: Count ALL days in the range, including Sundays and Holidays.
            // If the user selects Sat to Mon, it should count Sat, Sun, Mon = 3 Days.
            count++;
            loop.setDate(loop.getDate() + 1);
        }

        if (form.isHalfDay && count > 0) count -= 0.5;

        if (count <= 0) {
            setError('Range contains no working days.');
            return;
        }

        setDuration(count);

        if (form.leaveType) {
            const bal = balances.find(b => b.leaveType === form.leaveType);
            const rawAvailable = bal ? (bal.total - bal.used - bal.pending) : 0;
            const currentlyBlocked = (editData && editData.leaveType === form.leaveType) ? editData.daysCount : 0;
            const availableToThisAction = rawAvailable + currentlyBlocked;

            if (count > availableToThisAction) {
                // Allow submission but warn about LOP
                setInfoMessage(`Note: You have ${availableToThisAction} ${form.leaveType} balance. Remaining ${count - availableToThisAction} days will be marked as Unpaid / Loss of Pay.`);
            }
        }
    }, [form.startDate, form.endDate, form.leaveType, form.isHalfDay, holidayMap, balances, editData]);

    // Calendar Grid
    const calendarArray = useMemo(() => {
        const month = currentCalDate.getMonth();
        const year = currentCalDate.getFullYear();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        const arr = [];
        for (let i = 0; i < firstDay; i++) arr.push(null);
        for (let d = 1; d <= lastDate; d++) {
            // Generates YYYY-MM-DD
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            arr.push(dateStr);
        }
        return arr;
    }, [currentCalDate]);

    const handleDateClick = (dateStr) => {
        if (!isDateSelectable(dateStr)) return;

        if (!form.startDate || (form.startDate && form.endDate)) {
            setForm(prev => ({ ...prev, startDate: dateStr, endDate: '', isHalfDay: false }));
        } else {
            if (new Date(dateStr) < new Date(form.startDate)) {
                setForm(prev => ({ ...prev, startDate: dateStr, endDate: '', isHalfDay: false }));
            } else {
                setForm(prev => ({ ...prev, endDate: dateStr }));
            }
        }
    };

    const isInRange = (dateStr) => {
        if (!form.startDate) return false;
        if (dateStr === form.startDate) return true;
        if (form.endDate && dateStr >= form.startDate && dateStr <= form.endDate) return true;
        return false;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (error || isSubmitting || !form.leaveType || duration <= 0) return;

        try {
            setIsSubmitting(true);
            const payload = { ...form, daysCount: duration };
            if (editData) {
                await api.put(`/employee/leaves/edit/${editData._id}`, payload);
                alert('Success: Request Updated.');
            } else {
                await api.post('/employee/leaves/apply', payload);
                alert('Success: Leave Applied.');
            }
            onSuccess();
        } catch (err) {
            alert(err.response?.data?.error || "Failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                            {editData ? 'Edit Request' : 'Time Off'}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Leave Application Form</p>
                    </div>
                </div>
                <div className="hidden lg:block bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 max-w-xs transition-all hover:shadow-sm">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-relaxed text-center">
                        “Select the start and end dates of your leave. You may optionally apply a half-day on the first or last day. The system will calculate the total leave automatically.”
                    </p>
                </div>
                {editData && (
                    <button onClick={onCancelEdit} className="text-xs font-black text-rose-500 hover:text-rose-600 uppercase tracking-tighter border-b-2 border-rose-100 dark:border-rose-900/30">Cancel Edit</button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Employee Selection (HR only) */}
                {isHR && !targetEmployeeId && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block px-1">Select Employee</label>
                        <select
                            required
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white"
                            value={form.employeeId}
                            onChange={e => setForm({ ...form, employeeId: e.target.value })}
                        >
                            <option value="">-- Choose Employee --</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Leave Type Grid */}
                <div>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Category</label>
                        {form.leaveType && (
                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                                {form.leaveType === 'Personal Leave' ? 'UNPAID / LOP' : `BAL: ${balances.find(b => b.leaveType === form.leaveType)?.available || 0}`}
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(dynamicLeaveConfig).map(([key, config]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, leaveType: key }))}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${form.leaveType === key
                                    ? `shadow-lg scale-105 ring-2 ring-blue-500/10`
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                                    }`}
                                style={form.leaveType === key ? { borderColor: config.main, backgroundColor: config.light || '#f8fafc' } : {}}
                            >
                                <div className="h-3 w-3 rounded-full mb-1" style={{ backgroundColor: config.main }}></div>
                                <span className={`text-[10px] font-black uppercase text-center ${form.leaveType === key ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                    {key}
                                </span>
                            </button>
                        ))}
                    </div>
                    {form.leaveType === 'Personal Leave' && (
                        <p className="mt-3 text-[10px] font-bold text-rose-500 uppercase bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
                            Note: This leave will be treated as unpaid personal leave.
                        </p>
                    )}
                </div>

                {/* Calendar View */}
                <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                            {currentCalDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h4>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setCurrentCalDate(new Date(currentCalDate.setMonth(currentCalDate.getMonth() - 1)))} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition shadow-sm"><ChevronLeft size={20} /></button>
                            <button type="button" onClick={() => setCurrentCalDate(new Date(currentCalDate.setMonth(currentCalDate.getMonth() + 1)))} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition shadow-sm"><ChevronRight size={20} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center py-2 text-[10px] font-black text-slate-400 uppercase">{day}</div>
                        ))}
                        {calendarArray.map((d, i) => {
                            if (!d) return <div key={`empty-${i}`} className="p-1"></div>;

                            const selectable = isDateSelectable(d);
                            const selected = isInRange(d);
                            const holiday = holidayMap[d];

                            // Visual index matches Day Of Week because we start with empty 'Su' slots if needed
                            const dayOfWeek = i % 7;
                            const sunday = dayOfWeek === 0;

                            const isStart = d === form.startDate;
                            const isEnd = d === form.endDate;

                            const config = dynamicLeaveConfig[form.leaveType] || { main: '#334145', light: '#f1f5f9' };

                            return (
                                <div
                                    key={d}
                                    onMouseEnter={() => setHoverDate(d)}
                                    onMouseLeave={() => setHoverDate(null)}
                                    onClick={() => handleDateClick(d)}
                                    className={`relative h-12 flex items-center justify-center rounded-xl text-sm transition-all
                                        ${!selectable ? 'opacity-20 grayscale cursor-not-allowed' : 'cursor-pointer hover:bg-white dark:hover:bg-slate-800'}
                                        ${sunday ? 'text-rose-500 font-bold' : ''}
                                    `}
                                    style={selected ? {
                                        backgroundColor: (isStart || isEnd) ? config.main : config.light,
                                        color: (isStart || isEnd) ? 'white' : (form.leaveType ? getComputedStyle(document.documentElement).getPropertyValue(`--leave-${config.id.toLowerCase()}-text`) || 'inherit' : 'inherit'),
                                        fontWeight: 800
                                    } : {}}
                                >
                                    {new Date(d).getDate()}

                                    {holiday && (
                                        <div className="absolute top-1 right-1 text-[8px]" title={holiday.name}>{getHolidayIcon(holiday.name)}</div>
                                    )}

                                    {hoverDate === d && (getDisabledReason(d) || holiday) && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 px-3 py-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl pointer-events-none w-max max-w-[150px] animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex items-center gap-2">
                                                {holiday ? <Info size={10} className="text-blue-400" /> : <Lock size={10} className="text-rose-400" />}
                                                <span className="font-bold">{getDisabledReason(d) || holiday?.name}</span>
                                            </div>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                                                <div className="w-2 h-2 bg-slate-800 rotate-45"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </div>

                {/* Range Info */}
                {form.startDate && (
                    <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl gap-4">
                        <div className="flex items-center gap-6">
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Period</p>
                                <h5 className="text-sm font-black text-slate-800 dark:text-white">
                                    {formatDateDDMMYYYY(form.startDate)}
                                    {form.endDate && ` — ${formatDateDDMMYYYY(form.endDate)}`}
                                </h5>
                            </div>
                            <div className="h-8 w-px bg-blue-200 dark:bg-blue-800"></div>
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Net Days</p>
                                <h5 className="text-xl font-black text-blue-700 dark:text-blue-400">{duration} <span className="text-[10px]">DAYS</span></h5>
                            </div>
                        </div>

                        {/* Half Day Variant */}
                        {form.startDate && duration > 0 && (
                            <div className="flex flex-col gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/50 transition-all">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${form.isHalfDay ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-slate-300 group-hover:border-blue-400'}`}>
                                        {form.isHalfDay && <CheckCircle size={14} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={form.isHalfDay} onChange={e => setForm({ ...form, isHalfDay: e.target.checked, halfDayTarget: form.endDate ? 'End' : 'Start', halfDaySession: 'First Half' })} />
                                    <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Enable Half Day</span>
                                </label>

                                {form.isHalfDay && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {/* If Range selection, choose WHICH day is half-day */}
                                        {form.endDate && form.startDate !== form.endDate && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm({ ...form, halfDayTarget: 'Start' })}
                                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${form.halfDayTarget === 'Start'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    On Start Day
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setForm({ ...form, halfDayTarget: 'End' })}
                                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${form.halfDayTarget === 'End'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    On End Day
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, halfDaySession: 'First Half' })}
                                                className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${form.halfDaySession === 'First Half'
                                                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                First Half
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, halfDaySession: 'Second Half' })}
                                                className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${form.halfDaySession === 'Second Half'
                                                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                Second Half
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Alerts */}
                {error && (
                    <div className="flex items-center gap-4 p-5 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/50 animate-pulse">
                        <AlertCircle size={20} />
                        <p className="text-sm font-bold tracking-tight">{error}</p>
                    </div>
                )}

                {infoMessage && (
                    <div className="flex items-center gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-900/50">
                        <Info size={20} />
                        <p className="text-sm font-bold tracking-tight">{infoMessage}</p>
                    </div>
                )}

                {/* Reason */}
                <div>
                    <label className="flex items-center justify-between px-1 mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reason / Justification</span>
                        <span className="text-[10px] text-rose-500 font-bold uppercase">Required</span>
                    </label>
                    <textarea
                        required
                        rows="3"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white resize-none"
                        placeholder="Why do you need this time off?..."
                        value={form.reason}
                        onChange={e => setForm({ ...form, reason: e.target.value })}
                    ></textarea>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting || !!error || duration <= 0 || !form.leaveType}
                    className={`w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:grayscale disabled:opacity-50
                        ${form.leaveType ? 'shadow-blue-500/20' : 'shadow-slate-500/20'}
                    `}
                    style={{ backgroundColor: form.leaveType ? dynamicLeaveConfig[form.leaveType]?.main : '#334155' }}
                >
                    {isSubmitting ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span>
                                {!form.leaveType ? 'Select Leave Category' :
                                    !form.startDate ? 'Select Dates' :
                                        duration <= 0 ? 'Invalid Dates' :
                                            editData ? 'Update Application' : 'Request Time Off'}
                            </span>
                            {(form.leaveType && duration > 0) && <CheckCircle size={20} />}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
