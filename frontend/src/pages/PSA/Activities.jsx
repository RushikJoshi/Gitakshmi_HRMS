import React, { useEffect, useState } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function load() {
    try {
      setLoading(true);
      // Use PSA endpoint to get activities from all tenants
      // Increase timeout because this aggregates from all tenants
      const res = await api.get('/activities/psa/all', { timeout: 60000 });
      setActivities(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load activities', err);
      // Fallback: try regular endpoint if PSA endpoint fails
      try {
        const res = await api.get('/activities');
        setActivities(res.data?.data || []);
      } catch (fallbackErr) {
        console.error('Failed to load activities (fallback):', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function removeActivity(id) {
    if (!id) return;
    const ok = window.confirm('Remove this activity?');
    if (!ok) return;
    try {
      // Note: For PSA view, deletion might not work if tenant context is required
      // This is a limitation - activities are stored in tenant DBs
      await api.delete(`/activities/${id}`);
      load();
    } catch (err) {
      console.error('Failed to remove activity', err);
      alert('Failed to remove activity. Note: Activities are stored per tenant and may require tenant context to delete.');
    }
  }

  function formatAction(action, meta) {
    if (!action) return '-';

    // If it's a module update, show detailed info
    if (meta?.enabled || meta?.disabled) {
      const parts = [];
      if (meta.enabled && meta.enabled.length > 0) {
        parts.push(`Enabled: ${meta.enabled.join(', ')}`);
      }
      if (meta.disabled && meta.disabled.length > 0) {
        parts.push(`Disabled: ${meta.disabled.join(', ')}`);
      }
      return parts.length > 0 ? parts.join(' | ') : action;
    }

    return action;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recent Activity</h1>
        <button
          onClick={load}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && activities.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading activities...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-slate-500">No activities found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((a, i) => (
                <tr key={a._id || i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-slate-500">
                    {a.time ? new Date(a.time).toLocaleString() : (a.createdAt ? new Date(a.createdAt).toLocaleString() : '')}
                  </td>
                  <td className="px-6 py-4 font-medium">{formatAction(a.action, a.meta)}</td>
                  <td className="px-6 py-4 font-medium">
                    {a.company || a.tenantInfo?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {a.meta?.enabled || a.meta?.disabled ? (
                      <div className="text-xs">
                        {a.meta.enabled && a.meta.enabled.length > 0 && (
                          <div className="mb-1">
                            <span className="text-green-600 font-semibold">✓ Enabled:</span>
                            <span className="ml-1">{a.meta.enabled.join(', ')}</span>
                          </div>
                        )}
                        {a.meta.disabled && a.meta.disabled.length > 0 && (
                          <div>
                            <span className="text-red-600 font-semibold">✗ Disabled:</span>
                            <span className="ml-1">{a.meta.disabled.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {a._id && (
                      <button
                        onClick={() => removeActivity(a._id)}
                        className="text-sm px-2 py-1 bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activities.length > pageSize && (
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={activities.length}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
