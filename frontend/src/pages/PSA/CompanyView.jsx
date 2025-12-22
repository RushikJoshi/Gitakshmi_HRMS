import React from 'react';

export default function CompanyView({ company, onClose }) {
  if (!company) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white p-6 rounded w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Company Details</h3>
          <button onClick={onClose} className="text-sm px-2 py-1 border rounded">Close</button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="text-xs text-slate-500">Name</div>
            <div className="font-medium">{company.name}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Domain</div>
            <div className="font-medium">{company.domain || '-'}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Email Domain</div>
            <div className="font-medium">{company.emailDomain || '-'}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Status</div>
            <div className="font-medium">{company.status || '-'}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Modules</div>
            <div className="font-medium">{(company.modules || []).join(', ') || '(none)'}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Created At</div>
            <div className="font-medium">{company.createdAt ? new Date(company.createdAt).toLocaleString() : '-'}</div>
          </div>

        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded">Close</button>
        </div>
      </div>
    </div>
  );
}
