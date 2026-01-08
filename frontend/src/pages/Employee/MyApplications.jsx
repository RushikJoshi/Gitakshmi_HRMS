import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

export default function MyApplications() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyApplications();
    }, []);

    async function fetchMyApplications() {
        try {
            const res = await api.get('/requirements/my-applications');
            setApps(res.data);
        } catch (error) {
            console.error("Failed to load applications", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Applications...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">My Applications</h2>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Job Title</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Department</th>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Applied On</th>
                            <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {apps.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-medium">
                                    You haven't applied to any internal jobs yet.
                                </td>
                            </tr>
                        ) : (
                            apps.map(app => (
                                <tr key={app._id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 font-bold text-slate-700">
                                        {app.requirementId?.jobTitle || 'Unknown Job'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {app.requirementId?.department}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {formatDateDDMMYYYY(app.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${app.status === 'Selected' ? 'bg-emerald-100 text-emerald-700' :
                                                app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {app.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
