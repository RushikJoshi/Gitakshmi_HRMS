import React from 'react';

export default function AccessControl(){
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Access Control</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="mb-4">
          <p className="text-sm text-slate-700 font-semibold mb-2">Manage Roles, Permissions & Access Policies</p>
          <p className="text-sm text-slate-600">Control who can access what features and manage your organization's security settings.</p>
        </div>
        
        <div className="mt-6 p-6 bg-slate-50 rounded-lg border border-slate-200 text-center">
          <div className="text-slate-500 text-sm">
            <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            This page is ready for role management UI, permission toggles, and access policy controls.
          </div>
        </div>
      </div>
    </div>
  );
}
