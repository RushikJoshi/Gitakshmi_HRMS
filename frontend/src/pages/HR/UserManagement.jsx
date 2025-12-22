import React, { useEffect, useState, useContext } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';
import { UIContext } from '../../context/UIContext';

export default function UserManagement() {
  const uiContext = useContext(UIContext);
  const setToast = uiContext?.setToast || (() => { });
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: '',
    managerId: '',
    contactNo: '',
    jobType: 'Full-Time'
  });
  const [filter, setFilter] = useState({ search: '', department: '', role: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [employeesRes, deptRes] = await Promise.all([
        api.get('/hr/employees').catch(() => ({ data: [] })),
        api.get('/hr/departments').catch(() => ({ data: [] }))
      ]);
      const empList =
        (Array.isArray(employeesRes.data?.data) && employeesRes.data.data) ||
        (Array.isArray(employeesRes.data) && employeesRes.data) ||
        [];
      const deptList =
        (Array.isArray(deptRes.data?.data) && deptRes.data.data) ||
        (Array.isArray(deptRes.data) && deptRes.data) ||
        [];
      setEmployees(empList);
      setDepartments(deptList);
    } catch (err) {
      console.error('Failed to load data', err);
      setToast({ message: 'Failed to load employees', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    try {
      if (editingEmployee) {
        await api.put(`/hr/employees/${editingEmployee._id}`, formData);
        if (formData.managerId !== undefined) {
          // Ensure we only send a raw ObjectId string (24 hex chars) or null
          const raw = (formData.managerId || '').toString();
          const match = raw.match(/[a-fA-F0-9]{24}/);
          const sendManagerId = match ? match[0] : null;
          await api.post(`/hr/employees/${editingEmployee._id}/set-manager`, {
            managerId: sendManagerId
          });
        }
        setToast({ message: 'Employee updated successfully', type: 'success' });
      } else {
        await api.post('/hr/employees', formData);
        setToast({ message: 'Employee created successfully', type: 'success' });
      }
      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save employee', err);
      setToast({
        message: err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save employee',
        type: 'error'
      });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/hr/employees/${id}`);
      setToast({ message: 'Employee deleted successfully', type: 'success' });
      loadData();
    } catch (err) {
      console.error('Failed to delete employee', err);
      setToast({ message: 'Failed to delete employee', type: 'error' });
    }
  }

  function openEditModal(emp) {
    setEditingEmployee(emp);
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      role: emp.role || '',
      department: emp.department || '',
      managerId: emp.manager ? String(emp.manager._id || emp.manager) : '',
      contactNo: emp.contactNo || '',
      jobType: emp.jobType || 'Full-Time'
    });
    setShowModal(true);
  }

  function openCreateModal() {
    setEditingEmployee(null);
    resetForm();
    setShowModal(true);
  }

  function resetForm() {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      department: '',
      managerId: '',
      contactNo: '',
      jobType: 'Full-Time'
    });
  }

  const employeesList = Array.isArray(employees) ? employees : [];
  const filteredEmployees = employeesList.filter(emp => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const searchMatch = !filter.search || name.includes(filter.search.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(filter.search.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(filter.search.toLowerCase());
    const deptMatch = !filter.department || emp.department === filter.department;
    const roleMatch = !filter.role || emp.role === filter.role;
    return searchMatch && deptMatch && roleMatch;
  });

  const uniqueRoles = [...new Set(employeesList.map(e => e.role).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // View Toggle Logic
  // View Toggle Logic

  // View Toggle Logic
  if (showModal) {
    // ... (Existing Edit/Create Form Logic - unchanged) ...
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => { setShowModal(false); setEditingEmployee(null); }}
            className="p-2 hover:bg-slate-100 rounded-full transition text-slate-600"
            title="Back to List"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h1>
            <p className="text-sm text-slate-500">Enter the details below</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 w-full">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., CEO, HR Manager, Team Lead"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Number</label>
              <input
                type="tel"
                value={formData.contactNo}
                onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job Type</label>
              <select
                value={formData.jobType}
                onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reports To</label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">— No Manager (Top Level) —</option>
              {employeesList
                .filter(e => !editingEmployee || String(e._id) !== String(editingEmployee._id))
                .filter(e => !formData.department || String(e.department) === String(formData.department))
                .map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId}) - {emp.role || 'Employee'}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setShowModal(false);
                setEditingEmployee(null);
              }}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {editingEmployee ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profile View Logic
  if (viewingEmployee) {
    const managerName = viewingEmployee.manager
      ? `${viewingEmployee.manager.firstName} ${viewingEmployee.manager.lastName}`
      : '—';

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setViewingEmployee(null)}
            className="p-2 hover:bg-slate-100 rounded-full transition text-slate-600"
            title="Back to List"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Employee Profile</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-full max-w-4xl mx-auto mt-8">
          <div className="px-8 py-8">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-8 border-b border-slate-100 dark:border-slate-700 pb-8">
              <div className="w-32 h-32 rounded-full border-4 border-slate-50 dark:border-slate-700 bg-slate-100 flex items-center justify-center text-slate-400 text-4xl font-bold shadow-sm overflow-hidden">
                {viewingEmployee.profilePic ? (
                  <img
                    src={viewingEmployee.profilePic}
                    alt={`${viewingEmployee.firstName} ${viewingEmployee.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{viewingEmployee.firstName[0]}{viewingEmployee.lastName[0]}</span>
                )}
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {viewingEmployee.firstName} {viewingEmployee.lastName}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-1">
                  {viewingEmployee.role || 'No Role Assigned'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                  Contact Information
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-y-3">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Email</span>
                  <span className="text-slate-900 dark:text-white font-medium">{viewingEmployee.email}</span>

                  <span className="text-slate-500 dark:text-slate-400 text-sm">Phone</span>
                  <span className="text-slate-900 dark:text-white font-medium">{viewingEmployee.contactNo || '—'}</span>
                </div>
              </div>

              {/* Work Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                  Work Details
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-y-3">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Employee ID</span>
                  <span className="text-slate-900 dark:text-white font-medium">{viewingEmployee.employeeId}</span>

                  <span className="text-slate-500 dark:text-slate-400 text-sm">Department</span>
                  <span className="text-slate-900 dark:text-white font-medium">{viewingEmployee.department || '—'}</span>

                  <span className="text-slate-500 dark:text-slate-400 text-sm">Job Type</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs">
                      {viewingEmployee.jobType || 'Full-Time'}
                    </span>
                  </span>

                  <span className="text-slate-500 dark:text-slate-400 text-sm">Manager</span>
                  <span className="text-slate-900 dark:text-white font-medium">{managerName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage all employees in your organization</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        {/* ... (Previous Filter Code Unchanged - relying on original file content if not explicit here) ... */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
            <select
              value={filter.department}
              onChange={(e) => setFilter({ ...filter, department: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
            <select
              value={filter.role}
              onChange={(e) => setFilter({ ...filter, role: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Employees ({filteredEmployees.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Manager</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(emp => {
                  const manager = employees.find(e => String(e._id) === String(emp.manager));
                  return (
                    <tr key={emp._id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{emp.employeeId}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{emp.email || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{emp.role || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{emp.department || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {manager ? `${manager.firstName} ${manager.lastName}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(emp._id)}
                          className="px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredEmployees.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      </div>
    </div>
  );
}

