import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from 'react-router-dom';
import api from "../../utils/api";

/**
 * ModuleConfig UI
 *
 * Props:
 *  - company: company object { _id, name, modules: [...] }
 *  - onClose: function() called after save or cancel
 *
 * Place this file at: frontend/src/pages/PSA/ModuleConfig.jsx
 */

const AVAILABLE_MODULES = [
  { code: "hr", label: "HR", description: "Employee management, roles, policies" },
  { code: "payroll", label: "Payroll", description: "Salary processing & payslips" },
  { code: "attendance", label: "Attendance", description: "Punch in/out & timesheets" },
  { code: "ess", label: "ESS", description: "Employee self service portal" },
  { code: "recruitment", label: "Recruitment", description: "Job posting & hiring workflows" },
  { code: "analytics", label: "Analytics", description: "Reports & dashboards" },
];

export default function ModuleConfig({ company, onClose }) {
  const [modules, setModules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(company || null);

  useEffect(() => {
    setModules(company?.modules ? [...company.modules] : []);
    setError(null);
    if (!company) {
      // load companies for inline selection when opened directly
      loadCompanies();
    } else {
      setSelectedCompany(company);
    }
  }, [company]);

  async function loadCompanies() {
    try {
      const res = await api.get('/tenants');
      // Normalize response to an array. API may return array or object { data: [...] } or { tenants: [...] }
      const payload = res.data;
      const list = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.tenants) ? payload.tenants : (Array.isArray(payload?.data) ? payload.data : []));
      setCompanies(list || []);
      if (Array.isArray(list) && list.length > 0) {
        setSelectedCompany(list[0]);
        setModules(list[0].modules ? [...list[0].modules] : []);
      }
    } catch (err) {
      console.error('Failed to load companies', err);
    }
  }

  function toggle(code) {
    setModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleSave() {
    const target = selectedCompany || company;
    if (!target?._id) return alert("No company selected");
    setSaving(true);
    setError(null);
    try {
      await api.put(`/tenants/${target._id}/modules`, { modules });
      // simple success feedback
      alert("Modules saved successfully");
      if (typeof onClose === 'function') onClose();
      else navigate('/psa');
    } catch (err) {
      console.error(err);
      setError("Failed to save modules. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const navigate = useNavigate();
  const isModal = typeof onClose === 'function';

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/30">
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <div className="text-lg font-semibold text-slate-800">Module Configuration</div>
              <div className="text-sm text-slate-500">{selectedCompany?.name || company?.name}</div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => (typeof onClose === 'function' ? onClose() : navigate(-1))}
                className="px-3 py-2 rounded border text-sm text-slate-600 hover:bg-slate-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* body */}
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">Toggle modules to enable or disable them for this company.</p>

            {!company && (
              <div className="mb-4">
                <label className="text-sm text-slate-600 mr-2">Select company:</label>
                <select
                  className="p-2 border rounded"
                  value={selectedCompany?._id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const c = companies.find((x) => x._id === id) || null;
                    setSelectedCompany(c);
                    setModules(c?.modules ? [...c.modules] : []);
                  }}
                >
                  <option value="">-- Select company --</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AVAILABLE_MODULES.map((m) => {
                const active = modules.includes(m.code);
                return (
                  <div
                    key={m.code}
                    className={`flex items-center justify-between p-4 rounded-lg border ${active ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'
                      }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{m.label}</div>
                      <div className="text-xs text-slate-500">{m.description}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-500">{active ? 'Enabled' : 'Disabled'}</div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={active}
                          onChange={() => toggle(m.code)}
                          disabled={saving}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 transition" />
                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition peer-checked:translate-x-5`} />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* hint */}
            <div className="mt-5 text-xs text-slate-500">Changes are applied immediately after you click <span className="font-medium">Save</span>.</div>
          </div>
        </div>
      </div>
    );
  }

  // Full page layout (non-modal) — matches photo #2 design
  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Company Module Configuration</h2>
          <p className="text-sm text-slate-500">Select a company to configure its modules.</p>
        </div>
        <div>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <label className="block mb-3 text-sm font-medium">Select Company</label>
        <select
          className="w-full p-3 border rounded"
          value={selectedCompany?._id || ''}
          onChange={(e) => {
            const id = e.target.value;
            const c = companies.find((x) => x._id === id) || null;
            setSelectedCompany(c);
            setModules(c?.modules ? [...c.modules] : []);
          }}
        >
          <option value="">Choose a company...</option>
          {companies.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        {/* when company selected, show modules grid */}
        {selectedCompany && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AVAILABLE_MODULES.map((m) => {
              const active = modules.includes(m.code);
              return (
                <div key={m.code} className={`flex items-center justify-between p-4 rounded-lg border ${active ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{m.label}</div>
                    <div className="text-xs text-slate-500">{m.description}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={active} onChange={() => toggle(m.code)} disabled={saving} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 transition" />
                    <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition peer-checked:translate-x-5`} />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

ModuleConfig.propTypes = {
  company: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
    modules: PropTypes.arrayOf(PropTypes.string),
  }),
  onClose: PropTypes.func.isRequired,
};
