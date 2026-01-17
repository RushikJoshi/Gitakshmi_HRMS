import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import AttendanceCalendar from './AttendanceCalendar';
import { ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';


export default function MyAttendanceView() {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [summary, setSummary] = useState({ present: 0, absent: 0, leave: 0, late: 0, hours: 0 });
    const [statusFilter, setStatusFilter] = useState('all');
    const [holidays, setHolidays] = useState([]);
    const [settings, setSettings] = useState({});

    useEffect(() => {
        fetchAttendance();
    }, [currentMonth, currentYear]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const t = new Date().getTime();
            // Fetch Attendance, Leaves, Holidays, and Settings in parallel
            const [attRes, leaveRes, holidayRes, settingsRes] = await Promise.all([
                api.get(`/attendance/my?month=${currentMonth + 1}&year=${currentYear}&t=${t}`),
                api.get(`/employee/leaves/history?t=${t}`),
                api.get(`/holidays?t=${t}`),
                api.get(`/attendance/settings?t=${t}`)
            ]); 

            const rawAttendance = attRes.data || [];
            const leaves = leaveRes.data || [];

            // --- Merge Leaves into Attendance Data (Client-Side Patch) ---
            // This ensures "On Leave" shows up even if backend sync failed or for Pending leaves

            // 1. Create a map of existing attendance dates
            const attendanceMap = new Set(rawAttendance.map(a => new Date(a.date).toDateString()));

            // 2. Identify view range
            const viewStart = new Date(currentYear, currentMonth, 1);
            const viewEnd = new Date(currentYear, currentMonth + 1, 0);

            const mergedAttendance = [...rawAttendance];

            leaves.forEach(leave => {
                // Only consider Active leaves
                if (!['Approved', 'Pending'].includes(leave.status)) return;

                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);

                // Iterate through leave days
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    // Check if date is within current view month
                    if (d < viewStart || d > viewEnd) continue;

                    // If no attendance record exists for this date, create a synthetic one
                    if (!attendanceMap.has(d.toDateString())) {
                        mergedAttendance.push({
                            _id: `synthetic-leave-${d.getTime()}`,
                            date: d.toISOString(),
                            status: 'leave', // Force status to leave for visualization
                            leaveType: leave.leaveType,
                            isSynthetic: true, // Marker
                            checkIn: null,
                            checkOut: null,
                            workingHours: 0,
                            isLate: false
                        });
                        attendanceMap.add(d.toDateString()); // Prevent dupes if overlapping leaves exist (rare)
                    }
                }
            });

            // Sort by date again after merge
            mergedAttendance.sort((a, b) => new Date(a.date) - new Date(b.date));

            setAttendance(mergedAttendance);
            setHolidays(holidayRes.data || []);
            setSettings(settingsRes.data || {});

            // Calculate Summary
            const stats = mergedAttendance.reduce((acc, item) => {
                const s = (item.status || '').toLowerCase();

                if (s === 'present' || s === 'half_day') acc.present++;
                if (s === 'absent') acc.absent++;
                // "On Leave" count now includes synthetic leaves (Applied/Approved but not synced)
                if (s === 'leave') acc.leave++;
                if (item.isLate) acc.late++;
                acc.hours += (item.workingHours || 0);
                return acc;
            }, { present: 0, absent: 0, leave: 0, late: 0, hours: 0 });

            setSummary(stats);
        } catch (err) {
            console.error("Failed to fetch attendance", err);
        } finally {
            setLoading(false);
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

    const handleExport = async () => {
        if (!attendance.length) return alert("No data to export");

        const headers = ["Employee_id", "Employee_Name", "Date", "Status", "Check In", "Check Out", "Working Hours", "Is Late"];
        const tenant = localStorage.getItem("tenantId");
        console.log(tenant);

        // const attandanceData = await attendance.find({}).lean();
        // console.log(attandanceData);
        // const employee = employee.find({tenant: tenant });
        // console.log(attendance);

        const rows = attendance.map(item => [
            item.employee.employeeId,
            (item.employee.firstName + " " +item.employee.lastName),
            formatDateDDMMYYYY(item.date),
            (item.leaveType ? `${item.status} (${item.leaveType})` : item.status).toUpperCase(),
            item.checkIn ? new Date(item.checkIn).toLocaleTimeString() : '-',
            item.checkOut ? new Date(item.checkOut).toLocaleTimeString() : '-',
            item.workingHours || 0,
            item.isLate ? "YES" : "NO"
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_${currentMonth + 1}_${currentYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredAttendance = attendance.filter(item => {
        if (statusFilter === 'all') return true;
        return (item.status || '').toLowerCase() === statusFilter.toLowerCase();
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">My Attendance</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Track your presence and working hours</p>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"><ChevronLeft size={20} /></button>
                    <div className="px-4 text-sm font-black text-slate-700 dark:text-slate-300 min-w-[140px] text-center uppercase tracking-tighter">
                        {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"><ChevronRight size={20} /></button>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <SummaryCard label="Present" value={summary.present} color="text-emerald-500" bg="bg-emerald-500" />
                <SummaryCard label="Absent" value={summary.absent} color="text-rose-500" bg="bg-rose-500" />
                <SummaryCard label="On Leave" value={summary.leave} color="text-blue-500" bg="bg-blue-500" />
                <SummaryCard label="Late Marks" value={summary.late} color="text-amber-500" bg="bg-amber-500" />
                <SummaryCard label="Total Hours" value={summary.hours.toFixed(1)} color="text-indigo-500" bg="bg-indigo-500" unit="HRS" />
            </div>

            {/* Calendar Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Attendance Register</h3>
                    <div className="flex gap-2">
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="appearance-none flex items-center gap-2 pl-4 pr-10 py-2 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 text-slate-500 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition shadow-sm outline-none"
                            >
                                <option value="all">All Records</option>
                                <option value="present">Present Only</option>
                                <option value="absent">Absent Only</option>
                                <option value="leave">On Leave</option>
                                <option value="half_day">Half Day</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <Filter size={12} />
                            </div>
                        </div>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                <AttendanceCalendar
                    data={filteredAttendance}
                    holidays={holidays}
                    settings={settings}
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                />
            </div>
        </div>
    );
}

function SummaryCard({ label, value, color, bg, unit }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</div>
            <div className={`text-4xl font-black ${color} tracking-tighter flex items-baseline gap-1`}>
                {value}
                {unit && <span className="text-[10px] opacity-50">{unit}</span>}
            </div>
            <div className={`h-1 w-8 rounded-full mt-4 ${bg} opacity-20`}></div>
        </div>
    );
}
