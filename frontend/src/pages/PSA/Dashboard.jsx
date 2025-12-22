import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function Dashboard() {
  const [stats, setStats] = useState({
    companies: 0,
    activeTenants: 0,
    activeModules: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/tenants/psa/stats");
        // Log API response for debugging
        console.log('PSA stats API response:', res.data);
        // Normalize numeric fields and provide safe defaults
        const d = res.data || {};
        const total = Number(d.total ?? d.companies ?? 0) || 0;
        const active = Number(d.active ?? d.activeTenants ?? 0) || 0;
        const inactive = Number(d.inactive ?? d.deactiveTenants ?? (total - active)) || (total - active);
        setStats({ ...d, total, active, inactive });
      } catch (err) {
        console.log(err);
        // Fallback: try to fetch raw tenants and compute counts locally
        try {
          const r2 = await api.get('/tenants');
          const list = Array.isArray(r2.data) ? r2.data : (r2.data?.tenants || r2.data?.data || []);
          const total = Array.isArray(list) ? list.length : 0;
          const active = Array.isArray(list) ? list.filter(t => t.status === 'active').length : 0;
          const inactive = total - active;
          const fallback = { total, active, inactive, companies: total, activeTenants: active, deactiveTenants: inactive };
          console.log('PSA stats fallback computed from /tenants:', fallback);
          setStats(fallback);
        } catch (err2) {
          console.log('Failed fallback tenants fetch', err2);
        }
      }
    }
    load();
  }, []);
  // recent activity moved to dedicated page (removed from dashboard)

  return (
    <div className="fade-in">

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition relative overflow-hidden">
          <p className="text-sm font-medium text-slate-500">Total Companies</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{(stats.total ?? stats.companies ?? 0)}</p>
          <div className="absolute left-0 bottom-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400" />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition relative overflow-hidden">
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{(stats.active ?? stats.activeTenants ?? 0)}</p>
          <div className="absolute left-0 bottom-0 w-full h-1 bg-gradient-to-r from-green-300 to-green-500" />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition relative overflow-hidden">
          <p className="text-sm font-medium text-slate-500">Deactive</p>
          {/* Compute inactive safely to avoid NaN */}
          {(() => {
            const total = Number(stats.total ?? stats.companies ?? 0) || 0;
            const active = Number(stats.active ?? stats.activeTenants ?? 0) || 0;
            const inactiveFromApi = stats.inactive ?? stats.deactiveTenants;
            const inactive = (typeof inactiveFromApi === 'number') ? inactiveFromApi : (total - active);
            return <p className="text-3xl font-bold text-rose-600 mt-2">{inactive}</p>;
          })()}
          <div className="absolute left-0 bottom-0 w-full h-1 bg-gradient-to-r from-rose-300 to-rose-500" />
        </div>
      </div>

      {/* Placeholder / empty state */}
      <div className="mt-6 text-sm text-slate-500">Use the left menu to manage companies, view activity, or configure modules.</div>
    </div>
  );
}
