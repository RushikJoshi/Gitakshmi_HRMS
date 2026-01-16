import React, { useState, useEffect, useContext } from 'react';
import { Pagination, message } from 'antd';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';
import { FileText, Calendar as CalendarIcon, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

import RegularizationRequest from '../Leaves/RegularizationRequest';
import ApplyLeaveForm from '../../components/ApplyLeaveForm';
import AttendanceClock from '../../components/AttendanceClock';
import LeaveApprovals from '../HR/LeaveApprovals';
import RegularizationApprovals from '../HR/RegularizationApprovals';
import EmployeeProfileView from '../../components/EmployeeProfileView';
import MyAttendanceView from '../../components/MyAttendanceView';
import TeamAttendanceView from '../../components/TeamAttendanceView';
import ReportingTree from '../../components/ReportingTree';

import InternalJobs from './InternalJobs';
import MyApplications from './MyApplications';
import FaceAttendance from './FaceAttendance';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { activeTab, setActiveTab } = useOutletContext();
  const [loading, setLoading] = useState(true);

  // Data States
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [stats, setStats] = useState({
    presentDays: 0,
    leavesTaken: 0,
    pendingRequests: 0,
    nextHoliday: null
  });

  // Attendance States
  const [clocking, setClocking] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [attendanceSettings, setAttendanceSettings] = useState(null);
  const [editLeave, setEditLeave] = useState(null);
  const [clockError, setClockError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const handleCancelLeave = async (id) => {
    // ... no change needed here yet
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      await api.post(`/employee/leaves/cancel/${id}`);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel leave');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const t = new Date().getTime(); // Anti-cache
      const [profileRes, attRes, leaveRes, balanceRes, holidayRes, settingsRes, summaryRes] = await Promise.all([
        api.get(`/employee/profile?t=${t}`),
        api.get(`/attendance/my?t=${t}`), // Use unified attendance history
        api.get(`/employee/leaves/history?t=${t}`),
        api.get(`/employee/leaves/balances?t=${t}`),
        api.get(`/holidays?t=${t}`).catch(() => ({ data: [] })),
        api.get(`/attendance/settings?t=${t}`).catch(() => ({ data: null })),
        api.get(`/attendance/today-summary?t=${t}`).catch(() => ({ data: null }))
      ]);

      setProfile(profileRes.data);
      setAttendance(attRes.data);
      setLeaves(leaveRes.data);
      setBalances(balanceRes.data || []);
      setAttendanceSettings(settingsRes?.data);
      setTodaySummary(summaryRes?.data); // New Stats Data

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const presentDays = attRes.data.filter(a => {
        const d = new Date(a.date);
        const status = (a.status || '').toLowerCase();
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear &&
          ['present', 'half_day'].includes(status);
      }).length;

      // Calculate YTD leaves taken from approved leave requests of the current year
      const leavesTaken = leaveRes.data
        .filter(l => l.status === 'Approved')
        .filter(l => {
          const startYear = new Date(l.startDate).getFullYear();
          const endYear = new Date(l.endDate).getFullYear();
          const currentYear = new Date().getFullYear();
          return startYear === currentYear || endYear === currentYear;
        })
        .reduce((sum, l) => sum + (l.daysCount || 0), 0);
      const pendingRequests = leaveRes.data.filter(l => l.status === 'Pending').length;

      // Find next holiday (string based comparison to avoid timezone issues)
      const todayStr = new Date().toISOString().split('T')[0];
      const upcomingHolidays = (holidayRes.data || [])
        .map(h => ({ ...h, dateObj: new Date(h.date) }))
        .filter(h => {
          const hStr = h.dateObj.toISOString().split('T')[0];
          return hStr >= todayStr;
        })
        .sort((a, b) => a.dateObj - b.dateObj);

      const nextHoliday = upcomingHolidays[0] || null;

      setStats({
        presentDays,
        leavesTaken,
        pendingRequests,
        nextHoliday
      });

      const todayLocalStr = formatDateDDMMYYYY(new Date());
      const todayEntry = attRes.data.find(a =>
        formatDateDDMMYYYY(a.date) === todayLocalStr
      );

      setTodayRecord(todayEntry);
      if (todayEntry) {
        setIsCheckedIn(!!todayEntry.checkIn);

        // Logical check for checked out
        // In multiple punch mode, "checked out" is true only if the LAST punch was an OUT
        if (settingsRes?.data?.punchMode === 'multiple') {
          const lastLog = todayEntry.logs?.[todayEntry.logs.length - 1];
          setIsCheckedOut(lastLog?.type === 'OUT');
        } else {
          setIsCheckedOut(!!todayEntry.checkOut);
        }
      } else {
        setIsCheckedIn(false);
        setIsCheckedOut(false);
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockInOut = async () => {
    try {
      setClocking(true);
      setClockError(null);

      // Helper to get location
      const getLocation = () => {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
          } else {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                });
              },
              (error) => {
                console.warn("Location access denied or failed", error);
                // Don't block, just resolve null (Remote)
                resolve(null);
              },
              { timeout: 8000 }
            );
          }
        });
      };

      const locationData = await getLocation();
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const payload = locationData
        ? { ...locationData, location: 'Office/Remote', device: 'Web', dateStr }
        : { location: 'Remote', device: 'Web', dateStr };

      // Use unified punch endpoint
      const res = await api.post('/attendance/punch', payload);
      message.success(res.data?.message || 'Attendance Updated');

      await fetchDashboardData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to punch in/out. Please try again.";
      setClockError(errorMsg);
      message.error(errorMsg);
    } finally {
      setClocking(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Establishing Secure Session...</div>;

  const StatCard = ({ title, value, color, icon: Icon }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/30 dark:shadow-none hover:translate-y-[-2px] transition-all duration-300">
      <div className="flex justify-between items-start mb-2">
        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</div>
        {Icon && <Icon className={`${color} opacity-20`} size={20} />}
      </div>
      <div className={`text-4xl font-black ${color} tracking-tighter`}>{value}</div>
      <div className={`h-1 w-10 rounded-full mt-3 bg-current ${color} opacity-20`}></div>
    </div>
  );

  return (
    <div className="w-full space-y-3 pb-4">

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCard
              title="Presence (MTD)"
              value={stats.presentDays}
              color="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              title="Leaves (YTD)"
              value={stats.leavesTaken}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              title="Pending Requests"
              value={stats.pendingRequests}
              color="text-amber-600 dark:text-amber-400"
            />
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-4 rounded-xl shadow-xl shadow-blue-500/20 text-white flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-[-10px] right-[-10px] opacity-10 transform rotate-12">
                <CalendarIcon size={100} />
              </div>
              <div className="relative z-10">
                <div className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-2">Upcoming Holiday</div>
                {stats.nextHoliday ? (
                  <>
                    <div className="text-lg font-black leading-tight truncate">{stats.nextHoliday.name}</div>
                    <div className="text-xs font-bold opacity-80 mt-1">
                      {formatDateDDMMYYYY(stats.nextHoliday.date)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs font-bold">No upcoming holidays</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Left Column: Clock + Stats */}
            <div className="space-y-3">
              <AttendanceClock
                isCheckedIn={isCheckedIn}
                isCheckedOut={isCheckedOut}
                checkInTime={todayRecord?.checkIn}
                onAction={handleClockInOut}
                isLoading={clocking}
                location={profile?.meta?.location || "Headquarters"}
                settings={attendanceSettings}
                error={clockError}
              />

              {/* Today's Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Punches</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{todaySummary?.totalPunches || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Punches In</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{todaySummary?.totalIn || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                  <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Punches Out</p>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400">{todaySummary?.totalOut || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                  <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">Working Hours</p>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{todaySummary?.workingHours || 0}h</p>
                </div>
              </div>
            </div>

            {/* Policy Summary & Recent Log */}
            <div className="space-y-3">
              {/* Applied Policy Summary (Read-only) */}
              <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl overflow-hidden relative border border-slate-800">
                <div className="absolute top-[-20%] right-[-10%] opacity-10">
                  <Clock size={140} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <CheckCircle size={12} className="text-emerald-500" />
                    Applied Attendance Policy
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Shift Timings</p>
                      <p className="text-xs font-black text-indigo-400">{attendanceSettings?.shiftStartTime} - {attendanceSettings?.shiftEndTime}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Punch Mode</p>
                      <p className="text-xs font-black text-blue-400 uppercase tracking-tight">{attendanceSettings?.punchMode} Punch</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Late Threshold</p>
                      <p className="text-xs font-black text-emerald-400">{attendanceSettings?.lateMarkThresholdMinutes} Minutes</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Working Target</p>
                      <p className="text-xs font-black text-amber-400">{attendanceSettings?.fullDayThresholdHours} Hours / Day</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Location Restriction</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${attendanceSettings?.locationRestrictionMode === 'none' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-500'}`}>
                      {attendanceSettings?.locationRestrictionMode === 'none' ? 'Disabled' : attendanceSettings?.locationRestrictionMode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Attendance Log */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={12} className="text-blue-500" />
                    Recent Activity
                  </h3>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">Last 5 Days</span>
                </div>

                <div className="space-y-2">
                  {attendance.slice(0, 5).map(att => (
                    <div key={att._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{formatDateDDMMYYYY(att.date)}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {att.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'} · {att.checkOut ? new Date(att.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {att.isLate && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1 rounded">LATE</span>}
                            {att.isEarlyOut && <span className="text-[8px] font-black text-orange-600 bg-orange-100 px-1 rounded">EARLY</span>}
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-tighter">{att.workingHours || 0}h</span>
                          </div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Calculated</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${att.status === 'present' || att.status === 'Present'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-500/5'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}>
                          {att.status || 'present'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {attendance.length === 0 && (
                    <div className="text-center py-8 text-slate-400 uppercase text-[10px] font-black tracking-widest border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">No History Found</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <ReportingTree />
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col justify-center items-center text-center">
              <Users className="text-blue-500 opacity-20 mb-3" size={40} />
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Connect with your Team</h4>
            </div>
          </div>
        </div>
      )}

      {/* MY LEAVES TAB */}
      {activeTab === 'leaves' && (
        <div className="space-y-3">

          {/* Leave Balance Cards */}
          {balances.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {balances.map(b => {
                const isPaid = b.leaveType.toLowerCase().includes('paid');
                const isSick = b.leaveType.toLowerCase().includes('sick');
                const isCasual = b.leaveType.toLowerCase().includes('casual');

                let gradient = 'from-blue-500 to-indigo-600';
                if (isPaid) gradient = 'from-emerald-500 to-teal-600';
                if (isSick) gradient = 'from-amber-500 to-orange-600';
                if (isCasual) gradient = 'from-sky-400 to-blue-500';

                return (
                  <div key={b._id} className="relative overflow-hidden group">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10 dark:opacity-20`}></div>
                    <div className="relative bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{b.leaveType}</div>
                        <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${gradient}`}></div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{b.available || 0}</span>
                        <span className="text-xs font-bold text-slate-400">/ {b.total || 0}</span>
                      </div>
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Available Days</div>

                      <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Used</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{b.used || 0}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Pending</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{b.pending || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {balances.length === 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-xl text-center">
              <p className="text-amber-700 dark:text-amber-400 font-medium">No leave policy assigned yet. Please contact HR.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Apply Form */}
            <ApplyLeaveForm
              balances={balances}
              existingLeaves={leaves}
              editData={editLeave}
              onCancelEdit={() => setEditLeave(null)}
              onSuccess={() => {
                setEditLeave(null);
                fetchDashboardData();
              }}
            />

            {/* Leave History */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Leave History</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700">
                      <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                      <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase">Dates</th>
                      <th className="text-center py-3 text-xs font-semibold text-slate-500 uppercase">Days</th>
                      <th className="text-center py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                    {leaves.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-8 text-slate-400">No leave history</td></tr>
                    ) : (
                      leaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(l => (
                        <tr key={l._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">{l.leaveType}</td>
                          <td className="py-3 text-slate-600 dark:text-slate-400">
                            <div className="flex flex-col">
                              <span>{formatDateDDMMYYYY(l.startDate)} - {formatDateDDMMYYYY(l.endDate)}</span>
                              {l.isHalfDay && (
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-tight mt-0.5">
                                  Half-day on {l.halfDayTarget || 'Start'} ({l.halfDaySession})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-center text-slate-600 dark:text-slate-400">{l.daysCount}</td>
                          <td className="py-3 text-center">
                            <span className={`px-2.5 py-1 rounded text-xs font-medium ${l.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                              l.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                                l.status === 'Cancelled' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                              }`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {l.status === 'Pending' && (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditLeave(l);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleCancelLeave(l._id)}
                                  className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            {l.status === 'Approved' && (
                              <button
                                onClick={() => handleCancelLeave(l._id)}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {leaves.length > pageSize && (
                <div className="mt-4 flex justify-end">
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={leaves.length}
                    onChange={(page) => setCurrentPage(page)}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MY PROFILE TAB */}
      {activeTab === 'profile' && (
        <EmployeeProfileView profile={profile} balances={balances} />
      )}

      {/* PAYSLIPS TAB */}
      {activeTab === 'payslips' && (
        <div className="flex flex-col items-center justify-center h-96 text-slate-400">
          <FileText size={64} className="mb-4 opacity-30" />
          <p className="text-lg">Payslips module coming soon...</p>
        </div>
      )}

      {/* REGULARIZATION TAB */}
      {activeTab === 'regularization' && (
        <RegularizationRequest />
      )}

            {/* FaceAttendance Tab */}
      {activeTab === 'face-attendance' && (
        <FaceAttendance />
      )}

      {/* TEAM LEAVES TAB */}
      {activeTab === 'team-leaves' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <LeaveApprovals isManagerView={true} endpoint="/employee/leaves/team-requests" actionEndpoint="/employee/leaves/requests" />
        </div>
      )}

      {/* TEAM REGULARIZATION TAB */}
      {activeTab === 'team-regularization' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-6">Team Attendance Correction</h3>
            <RegularizationApprovals
              isManagerView={true}
              category="Attendance"
              endpoint="/employee/regularization/team-requests"
              actionEndpoint="/employee/regularization/requests"
            />
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-6">Team Leave Adjustment</h3>
            <RegularizationApprovals
              isManagerView={true}
              category="Leave"
              endpoint="/employee/regularization/team-requests"
              actionEndpoint="/employee/regularization/requests"
            />
          </div>
        </div>
      )}

      {/* MY ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <MyAttendanceView />
      )}

      {/* TEAM ATTENDANCE TAB */}
      {activeTab === 'team-attendance' && (
        <TeamAttendanceView />
      )}

      {/* INTERNAL JOBS TAB */}
      {activeTab === 'internal-jobs' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <InternalJobs />
        </div>
      )}

      {/* MY APPLICATIONS TAB */}
      {activeTab === 'my-applications' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <MyApplications />
        </div>
      )}

    </div>
  );
}
