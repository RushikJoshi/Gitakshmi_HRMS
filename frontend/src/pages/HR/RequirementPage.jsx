import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import RequirementForm from '../../components/RequirementForm';

export default function RequirementPage() {
    const navigate = useNavigate();
    const [requirements, setRequirements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openForm, setOpenForm] = useState(false);
    const [currentReq, setCurrentReq] = useState(null);
    const [openView, setOpenView] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });

    // Load List of Requirements
    async function loadRequirements(page = 1) {
        setLoading(true);
        try {
            const res = await api.get(`/requirements?page=${page}&limit=${pagination.limit}`);
            // Backend now returns { requirements: [], pagination: {} }
            if (res.data.requirements) {
                setRequirements(res.data.requirements); // Already sorted by backend
                setPagination(res.data.pagination);
            } else if (Array.isArray(res.data)) {
                // Fallback for old API response (if backend update lags)
                setRequirements(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            }
        } catch (err) {
            console.error(err);
            alert('Failed to load requirements');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRequirements(pagination.page);
    }, [pagination.page]); // Reload on page change

    async function toggleStatus(id, currentStatus) {
        const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
        try {
            await api.patch(`/requirements/${id}/status`, { status: newStatus });
            loadRequirements(pagination.page);
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    }

    function openNew() {
        navigate('/hr/create-requirement');
    }

    function handleEdit(req) {
        setCurrentReq(req);
        setIsEditMode(true);
        setOpenForm(true);
    }

    function handleView(req) {
        setCurrentReq(req);
        setOpenView(true);
    }

    async function handleDelete(id) {
        if (!window.confirm('Are you sure you want to delete this job requirement?')) return;
        try {
            await api.delete(`/requirements/${id}`);
            setRequirements(prev => prev.filter(r => r._id !== id));
            // Optional: Reload if page becomes empty
        } catch (err) {
            console.error(err);
            alert('Failed to delete requirement');
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Requirement Management</h1>
                <div className="flex gap-3">
                    {/* Add button moved to Sidebar */}
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="flex-1">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading requirements...</div>
                    ) : requirements.length === 0 ? (
                        <div className="p-12 text-center">
                            <h3 className="text-lg font-semibold text-slate-700">No Requirements Found</h3>
                            <p className="text-slate-500 mt-2">Get started by creating a new job requirement.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Job ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Job Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vacancy</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {requirements.map(req => (
                                    <tr key={req._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{req.jobOpeningId || '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.jobTitle || req.title || 'Untitled'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{req.department || '-'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{req.vacancy}</td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${req.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleView(req)} className="text-slate-400 hover:text-blue-600" title="View">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                                <button onClick={() => toggleStatus(req._id, req.status)} className="text-slate-400 hover:text-green-600" title="Toggle Status">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </button>
                                                <button onClick={() => handleEdit(req)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={() => handleDelete(req._id)} className="text-red-600 hover:text-red-900" title="Delete">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-t border-slate-200">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))} disabled={pagination.page === 1} className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                                Previous
                            </button>
                            <button onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))} disabled={pagination.page === pagination.totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-slate-700">
                                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button onClick={() => setPagination(prev => ({ ...prev, page: 1 }))} disabled={pagination.page === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                                        <span className="sr-only">First</span>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                                    </button>
                                    <button onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))} disabled={pagination.page === 1} className="relative inline-flex items-center px-2 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))} disabled={pagination.page === pagination.totalPages} className="relative inline-flex items-center px-2 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                                        <span className="sr-only">Next</span>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                    <button onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))} disabled={pagination.page === pagination.totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                                        <span className="sr-only">Last</span>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {openForm && (
                <RequirementForm
                    initialData={currentReq}
                    isEdit={isEditMode}
                    isModal={true}
                    onClose={() => setOpenForm(false)}
                    onSuccess={() => loadRequirements(1)} // Reset to page 1 on new creation
                />
            )}

            {openView && currentReq && (
                <ViewRequirementModal
                    req={currentReq}
                    onClose={() => { setOpenView(false); setCurrentReq(null); }}
                />
            )}
        </div>
    );
}

function ViewRequirementModal({ req, onClose }) {
    const customFields = req.customFields || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start p-6 border-b">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-900">{req.jobTitle || 'Untitled'}</h2>
                            {req.jobOpeningId && <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">{req.jobOpeningId}</span>}
                        </div>
                        <div className="flex gap-2 text-sm mt-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{req.department}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">{req.jobType}</span>
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100">{req.workMode}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                <div className="p-6 grid grid-cols-2 gap-6 bg-slate-50 border-b">
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Experience</div>
                        <div className="text-slate-800 font-medium">{req.minExperienceMonths || 0} - {req.maxExperienceMonths || 'Any'} Months</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Salary Range</div>
                        <div className="text-slate-800 font-medium">{req.salaryMin ? `₹${req.salaryMin} - ₹${req.salaryMax}` : 'Not Disclosed'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Vacancy</div>
                        <div className="text-slate-800 font-medium">{req.vacancy} Position(s)</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Priority</div>
                        <div className="text-slate-800 font-medium">{req.priority || 'Medium'}</div>
                    </div>
                </div>

                <div className="p-6">
                    <h3 className="font-semibold text-slate-800 mb-2">Job Description</h3>
                    <p className="text-slate-600 whitespace-pre-wrap">{req.description || 'No description provided.'}</p>
                </div>

                {customFields.length > 0 && (
                    <div className="p-6 border-t border-slate-100">
                        <h3 className="font-semibold text-slate-800 mb-3">Additional Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {customFields.map((field, idx) => (
                                <div key={idx} className="bg-slate-50 p-3 rounded border border-slate-100">
                                    <span className="block text-xs text-slate-500 mb-1">{field.label}</span>
                                    <span className="block text-sm font-medium text-slate-800">{field.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-slate-50 px-6 py-4 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Close</button>
                </div>
            </div>
        </div>
    )
}
