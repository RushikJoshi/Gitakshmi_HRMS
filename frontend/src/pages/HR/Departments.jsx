const PRESET_DEPARTMENTS = ['HR', 'Tech', 'Accounts', 'Admin'];
import React, { useEffect, useState } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';

export default function Departments() {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/hr/departments');
      setDepts(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setOpenForm(true); }
  function openEdit(d) { setEditing(d); setOpenForm(true); }
  function openView(d) { setViewing(d); }

  async function remove(id) {
    if (!confirm('Delete department?')) return;
    try { await api.delete(`/hr/departments/${id}`); load(); }
    catch (err) { console.error(err); alert('Delete failed'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Departments</h1>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md">+ Add Dept</button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading departments...</div>
        ) : depts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No departments yet. Create one to get started!</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {depts.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(d => (
              <div key={d._id} className="p-4 hover:bg-slate-50 transition flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{d.name}</span>
                    {d.code && <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded border">{d.code}</span>}
                    {d.status === 'Inactive' && <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded border">Inactive</span>}
                  </div>
                  {d.description && <div className="text-sm text-slate-600 mt-1">{d.description}</div>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openView(d)} className="p-1 rounded hover:bg-sky-50" title="View" aria-label="View department">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button onClick={() => openEdit(d)} className="p-1 rounded hover:bg-blue-50" title="Edit" aria-label="Edit department">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={() => remove(d._id)} className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {depts.length > pageSize && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={depts.length}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {openForm && <DeptForm dept={editing} depts={depts} onClose={() => { setOpenForm(false); load(); }} />}
      {viewing && <DeptView dept={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function DeptForm({ dept, depts = [], onClose }) {
  const [name, setName] = useState(dept?.name || '');
  const [code, setCode] = useState(dept?.code || '');
  const [status, setStatus] = useState(dept?.status || 'Active');
  const [description, setDescription] = useState(dept?.description || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!name || name.trim().length < 2 || name.trim().length > 50) e.name = 'Name must be 2-50 characters';
    if (!code || code.trim().length < 1) e.code = 'Code is required';
    if (description && description.length > 250) e.description = 'Description must be at most 250 characters';

    // uniqueness: compare against existing depts
    const dupName = depts.find(d => d.name && d.name.toLowerCase() === name.trim().toLowerCase() && (!dept || d._id !== dept._id));
    if (dupName) e.name = 'Department name already exists';

    const dupCode = depts.find(d => d.code && d.code.toUpperCase() === code.trim().toUpperCase() && (!dept || d._id !== dept._id));
    if (dupCode) e.code = 'Department code already exists';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function submit(evt) {
    evt.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        status: status,
        description: description || ''
      };

      if (dept) await api.put(`/hr/departments/${dept._id}`, payload);
      else await api.post('/hr/departments', payload);
      onClose();
    } catch (err) {
      console.error(err);
      console.error(err);
      let msg = err?.response?.data?.error || err?.response?.data?.message;

      // Fallback for non-standard structure or network errors
      if (!msg) {
        if (err.message === "Network Error") {
          msg = "Unable to connect to server. Please check if backend is running.";
        } else if (err.response) {
          msg = `Server Error (${err.response.status}): ${err.response.statusText}`;
        } else {
          msg = err.message || 'Save failed';
        }
      }

      alert(msg);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 p-4">
      <form onSubmit={submit} className="bg-white p-6 rounded w-full max-w-2xl">
        <h3 className="font-bold mb-4">{dept ? 'Edit' : 'Add'} Department</h3>

        <div className="mb-3">
          <label className="text-sm font-medium">Department Name <span className="text-red-500">*</span></label>
          <input required value={name} onChange={e => { const v = e.target.value; setName(v.charAt(0).toUpperCase() + v.slice(1)); }} className={`w-full border px-2 py-2 rounded ${errors.name ? 'border-red-500' : ''}`} placeholder="Enter Department Name" />
          {errors.name && <div className="text-xs text-red-600 mt-1">{errors.name}</div>}
        </div>

        <div className="mb-3">
          <label className="text-sm font-medium">Department Code <span className="text-red-500">*</span></label>
          <input required value={code} onChange={e => setCode(e.target.value)} className={`w-full border px-2 py-2 rounded ${errors.code ? 'border-red-500' : ''}`} placeholder="e.g. IT-01" />
          {errors.code && <div className="text-xs text-red-600 mt-1">{errors.code}</div>}
        </div>

        <div className="mb-3">
          <label className="text-sm font-medium">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border px-2 py-2 rounded">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className={`w-full border px-2 py-2 rounded ${errors.description ? 'border-red-500' : ''}`} maxLength={250} placeholder="Brief description..." />
          {errors.description && <div className="text-xs text-red-600 mt-1">{errors.description}</div>}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 border rounded hover:bg-slate-50 transition">Cancel</button>
          <button disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function DeptView({ dept, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 p-4">
      <div className="bg-white p-6 rounded w-full max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Department Details</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Name</label>
            <p className="text-slate-900 font-semibold text-lg">{dept.name}</p>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Code</label>
            <p className="text-slate-900 font-mono bg-slate-100 rounded px-2 py-1 inline-block mt-1">{dept.code || 'N/A'}</p>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Status</label>
            <div className="mt-1">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${dept.status === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {dept.status || 'Active'}
              </span>
            </div>
          </div>

          {dept.description && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide">Description</label>
              <p className="text-slate-700">{dept.description}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-900 rounded hover:bg-slate-200 transition">Close</button>
        </div>
      </div>
    </div>
  );
}
