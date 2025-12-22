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
  const [counts, setCounts] = useState({
    employees: 0,
    departments: 0,
    managers: 0,
    pendingLeaves: 0,
    activeHRs: 0,
    topLevel: 0
  });
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
        const [tRes, eRes, dRes, lRes] = await Promise.all([
          api.get('/tenants/me').catch(() => ({ data: null })),
          api.get('/hr/employees').catch(() => ({ data: [] })),
          api.get('/hr/departments').catch(() => ({ data: [] })),
          api.get('/hr/leaves/requests').catch(() => ({ data: { data: [] } })),
        ]);

        const employees = Array.isArray(eRes.data) ? eRes.data : (eRes.data?.data || []);
        const departments = Array.isArray(dRes.data) ? dRes.data : [];
        const leavesData = lRes.data?.data || [];

        setTenant(tRes.data);
        setLeaves(leavesData);

        // Get hierarchy stats
        const hierarchyRes = await api.get('/hr/employees/hierarchy').catch(() => ({ data: { stats: {} } }));
        const hierarchyStats = hierarchyRes.data?.stats || {};

        setCounts({
          employees: employees.length,
          departments: departments.length,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
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
                  <td className="px-4 md:px-6 py-3 text-slate-600 text-xs md:text-sm">
                    {formatDateDDMMYYYY(l.startDate)} - {formatDateDDMMYYYY(l.endDate)}
                  </td>
                  <td className="px-4 md:px-6 py-3">
                    {l.status === 'Pending' && (
                      <div className="flex gap-2">
                        <Link to="/hr/leave-approvals" className="p-1 md:p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Go to Approvals">
                          <Eye size={16} />
                        </Link>
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
