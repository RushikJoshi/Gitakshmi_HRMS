import React, { useEffect, useState } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';

export default function RequirementPage() {
  const [requirements, setRequirements] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [departments] = useState([
    { _id: '1', name: 'HR' },
    { _id: '2', name: 'Tech' },
    { _id: '3', name: 'Finance' },
    { _id: '4', name: 'Marketing' }
  ]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [activeTab, setActiveTab] = useState('requirements');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function loadRequirements() {
    setLoading(true);
    try {
      const res = await api.get('/requirements/list');
      setRequirements(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load requirements');
    } finally {
      setLoading(false);
    }
  }

  async function loadApplicants() {
    setLoading(true);
    try {
      const res = await api.get('/requirements/applicants');
      setApplicants(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load applicants');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'requirements') {
      loadRequirements();
    } else {
      loadApplicants();
    }
  }, [activeTab]);

  function openNew() {
    setOpenForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Requirement Management</h1>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md">
          + Add Requirement
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading requirements...</div>
        ) : requirements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No requirements yet. Create one to get started!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vacancy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requirements.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(req => (
                  <tr key={req._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.jobTitle}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{req.department}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{req.vacancy}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${req.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      {/* Actions can be added later */}
                      -
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {requirements.length > pageSize && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={requirements.length}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {openForm && (
        <RequirementForm
          departments={departments}
          onClose={() => {
            setOpenForm(false);
            loadRequirements();
          }}
        />
      )}
    </div>
  );
}

function RequirementForm({ departments, onClose }) {
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [vacancy, setVacancy] = useState(1);
  const [status, setStatus] = useState('Open');
  const [saving, setSaving] = useState(false);

  async function submit(evt) {
    evt.preventDefault();
    if (!jobTitle.trim() || !department || vacancy < 1) {
      alert('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      await api.post('/requirements/create', {
        jobTitle: jobTitle.trim(),
        department,
        vacancy: Number(vacancy),
        status
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create requirement');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Requirement</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vacancy *</label>
            <input
              type="number"
              min="1"
              value={vacancy}
              onChange={(e) => setVacancy(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}