import React, { useState, useEffect, useContext } from 'react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';

export default function CompanyForm({ company, onClose }) {
  const { user } = useContext(AuthContext);

  // BASIC FIELDS
  const [name, setName] = useState(company?.name || '');
  const [primaryEmail, setPrimaryEmail] = useState(company?.meta?.primaryEmail || '');
  const [ownerName, setOwnerName] = useState(company?.meta?.ownerName || '');
  const [adminPassword, setAdminPassword] = useState(company?.meta?.adminPassword || '');
  const [phone, setPhone] = useState(company?.meta?.phone || '');
  const [address, setAddress] = useState(company?.meta?.address || '');
  const [logo, setLogo] = useState(company?.meta?.logo || '');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // =============================
  // NEW EMPLOYEE CODE SETTINGS
  // =============================
  const [companyCode, setCompanyCode] = useState(company?.code || '');
  const [empFormat, setEmpFormat] = useState(company?.meta?.empCodeFormat || 'COMP_DEPT_NUM');
  const [empDigits, setEmpDigits] = useState(company?.meta?.empCodeDigits || 3);
  const [empAllowOverride, setEmpAllowOverride] = useState(company?.meta?.empCodeAllowOverride || false);

  // LOAD COMPANY INTO FORM
  useEffect(() => {
    setName(company?.name || '');
    setPrimaryEmail(company?.meta?.primaryEmail || '');
    setOwnerName(company?.meta?.ownerName || '');
    setAdminPassword(company?.meta?.adminPassword || '');
    setPhone(company?.meta?.phone || '');
    setAddress(company?.meta?.address || '');
    setLogo(company?.meta?.logo || '');

    // new fields
    setCompanyCode(company?.code || '');
    setEmpFormat(company?.meta?.empCodeFormat || 'COMP_DEPT_NUM');
    setEmpDigits(company?.meta?.empCodeDigits || 3);
    setEmpAllowOverride(company?.meta?.empCodeAllowOverride || false);

  }, [company]);

  // PREFILL ON CREATE
  useEffect(() => {
    if (!company) {
      if (user?.email) setPrimaryEmail(user.email);

      if (!company?.meta?.adminPassword) {
        const gen = () => Math.random().toString(36).slice(-8);
        setAdminPassword(gen());
      }
    }
  }, [company, user]);

  // =============================
  // SUBMIT FORM
  // =============================
  async function submit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name,
        code: companyCode || undefined, // NEW → company prefix (undefined if empty)
        meta: {
          primaryEmail,
          ownerName,
          adminPassword,
          phone,
          address,
          logo,

          // EMPLOYEE CODE SETTINGS
          empCodeFormat: empFormat,
          empCodeDigits: empDigits,
          empCodeAllowOverride: empAllowOverride
        }
      };

      let _res;
      if (company) {
        _res = await api.put(`/tenants/${company._id}`, payload);
      } else {
        _res = await api.post('/tenants', payload);
      }

      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      const msg = err?.response?.data?.error || err.message;
      alert("Save failed: " + msg);
    } finally {
      setSaving(false);
    }
  }

  // =============================
  // UI FORM START
  // =============================

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 p-4 overflow-auto">
      <form
        onSubmit={submit}
        className="bg-white p-6 rounded w-full max-w-3xl max-h-[90vh] overflow-auto"
      >
        <h3 className="text-lg font-bold mb-4">
          {company ? 'Edit Company' : 'Create Company'}
        </h3>

        {/* COMPANY NAME */}
        <div className="mb-3">
          <label className="text-sm block mb-1">Company Name</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* COMPANY EMAIL + OWNER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="mb-3">
            <label className="text-sm block mb-1">Company Email</label>
            <input
              required
              value={primaryEmail}
              onChange={e => setPrimaryEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div className="mb-3">
            <label className="text-sm block mb-1">Owner Name</label>
            <input
              required
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        {/* PASSWORD + PHONE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="mb-3">
            <label className="text-sm block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                className="w-full border px-3 py-2 rounded pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-sm block mb-1">Phone</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        {/* ADDRESS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="mb-3">
            <label className="text-sm block mb-1">Address</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div />
        </div>

        {/* COMPANY LOGO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="mb-3">
            <label className="text-sm block mb-1">Company Logo</label>

            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setUploading(true);
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  const res = await api.post('/uploads/logo', fd);
                  if (res.data?.url) setLogo(res.data.url);
                } catch {
                  alert('Logo upload failed');
                } finally {
                  setUploading(false);
                }
              }}
            />

            {uploading && <div className="text-sm text-slate-500 mt-1">Uploading...</div>}

            {logo && (
              <img
                src={logo.startsWith('/') ? logo : logo}
                alt="logo"
                className="h-16 mt-2 object-contain"
              />
            )}
          </div>
        </div>



        {/* SAVE BUTTONS */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded w-full sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

