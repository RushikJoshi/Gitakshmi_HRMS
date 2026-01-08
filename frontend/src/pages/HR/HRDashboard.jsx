import React, { useEffect, useState } from 'react';
import { Pagination } from 'antd';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

export default function HRDashboard() {
  const { _user, _logout } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [counts, setCounts] = useState({
    employees: 0,
    departments: 0,
    managers: 0,
    pendingLeaves: 0,
    activeHRs: 0,
    topLevel: 0
  });
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [tRes, eRes, dRes, lRes, attRes] = await Promise.all([
          api.get('/tenants/me').catch(() => ({ data: null })),
          api.get('/hr/employees').catch(() => ({ data: [] })),
          api.get('/hr/departments').catch(() => ({ data: [] })),
          api.get('/hr/leaves/requests').catch(() => ({ data: { data: [] } })),
          api.get('/attendance/stats').catch(() => ({ data: null }))
        ]);

        const employees = Array.isArray(eRes.data) ? eRes.data : (eRes.data?.data || []);
        const formattedDepartments = Array.isArray(dRes.data) ? dRes.data : [];
        const leavesData = lRes.data?.data || [];

        setTenant(tRes.data);
        setDepartments(formattedDepartments);
        setLeaves(leavesData);
        setAttendanceStats(attRes?.data);

        // Get hierarchy stats
        const hierarchyRes = await api.get('/hr/employees/hierarchy').catch(() => ({ data: { stats: {} } }));
        const hierarchyStats = hierarchyRes.data?.stats || {};

        setCounts({
          employees: employees.length,
          departments: formattedDepartments.length,
          managers: employees.filter(emp => (emp.role || '').toLowerCase().includes('manager')).length,
          pendingLeaves: leavesData.filter(l => (l.status || '').toLowerCase() === 'pending').length,
          activeHRs: employees.filter(emp => (emp.role || '').toLowerCase().includes('hr')).length,
          topLevel: hierarchyStats.roots || employees.filter(emp => !emp.manager).length,
        });
      } catch (err) {
        console.error('Failed to load HR dashboard data', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-6 rounded-lg border border-blue-200">
        <div className="text-xs md:text-sm font-semibold text-blue-900 mb-2">Company</div>
        <div className="text-lg md:text-xl font-bold text-blue-950">{tenant?.name || '—'} <span className="text-xs md:text-sm text-blue-700 ml-2 font-normal">({tenant?.code})</span></div>
      </div>

      {/* Attendance Overview - NEW */}
      <h2 className="text-lg font-bold text-slate-800 mt-6">Today's Attendance Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Punched In</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{attendanceStats?.totalPunchedIn || 0}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Multiple Punches</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">{attendanceStats?.multiplePunches || 0}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Missing Out</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">{attendanceStats?.missingPunchOut || 0}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg Hours</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{attendanceStats?.avgWorkingHours || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mt-6">
        <Link to="/hr/org" className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Total Employees</div>
            <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{counts.employees}</div>
          </div>
          <div className="h-1 bg-blue-200 dark:bg-blue-900/30 rounded-full mt-3"></div>
        </Link>

        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Departments</div>
            <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{counts.departments}</div>
          </div>
          <div className="h-1 bg-green-200 dark:bg-green-900/30 rounded-full mt-3"></div>
        </div>





        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Managers</div>
            <div className="text-2xl md:text-3xl font-bold text-cyan-600 dark:text-cyan-400">{counts.managers}</div>
          </div>
          <div className="h-1 bg-cyan-200 dark:bg-cyan-900/30 rounded-full mt-3"></div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Pending Approvals</div>
            <div className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400">{counts.pendingLeaves}</div>
          </div>
          <div className="h-1 bg-amber-200 dark:bg-amber-900/30 rounded-full mt-3"></div>
        </div>
      </div>

      {/* Employees by Department */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 mt-6">Employees by Department</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {departments.map(dept => (
            <div key={dept._id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:translate-y-[-2px] transition-transform">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate" title={dept.name}>{dept.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{dept.employeeCount || 0}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Emp</span>
              </div>
            </div>
          ))}
          {departments.length === 0 && <div className="text-slate-400 text-sm col-span-full">No departments found.</div>}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white text-base md:text-lg mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/hr/org"
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition"
          >
            <div className="font-semibold text-slate-900 dark:text-white mb-1">View Org Structure</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Visualize company hierarchy</div>
          </Link>
          <Link
            to="/hr/users"
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition"
          >
            <div className="font-semibold text-slate-900 dark:text-white mb-1">Manage Users</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Add, edit, or remove employees</div>
          </Link>
          <Link
            to="/hr/employees"
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition"
          >
            <div className="font-semibold text-slate-900 dark:text-white mb-1">Employee List</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">View all employees</div>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-900 text-base md:text-lg">Leave Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 md:px-6 py-3 font-semibold text-slate-700">Employee</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-slate-700">Type</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-slate-700">Dates</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(leaves.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-4 md:px-6 py-8 text-center text-slate-500">
                    <div className="text-sm">No pending leave requests</div>
                  </td>
                </tr>
              ) : leaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(l => (
                <tr key={l._id} className="hover:bg-slate-50 transition">
                  <td className="px-4 md:px-6 py-3 font-medium text-slate-900">
                    {(() => {
                      if (!l.employee) return '—';
                      if (typeof l.employee === 'object') {
                        return `${l.employee.firstName || ''} ${l.employee.lastName || ''}`;
                      }
                      return l.employee;
                    })()}
                  </td>
                  <td className="px-4 md:px-6 py-3">
                    <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${l.leaveType?.toLowerCase().includes('sick') ? 'bg-red-100 text-red-800' :
                      l.leaveType?.toLowerCase().includes('casual') ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                      {l.leaveType}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-3 text-slate-600 text-xs md:text-sm">{new Date(l.from).toLocaleDateString()} - {new Date(l.to).toLocaleDateString()}</td>
                  <td className="px-4 md:px-6 py-3">
                    {l.status === 'pending' && (
                      <div className="flex gap-2">
                        <button className="p-1 md:p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition" title="Approve">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </button>
                        <button className="p-1 md:p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Reject">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    )}
                    {l.status !== 'Pending' && (
                      <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${l.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        l.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                        {l.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leaves.length > pageSize && (
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
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
  );
}
