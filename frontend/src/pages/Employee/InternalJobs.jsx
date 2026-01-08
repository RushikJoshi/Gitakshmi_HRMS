import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function InternalJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [appliedJobIds, setAppliedJobIds] = useState(new Set());

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchInternalJobs(), fetchAppliedJobs()]);
            setLoading(false);
        };
        loadData();
    }, []);

    async function fetchInternalJobs() {
        try {
            const res = await api.get('/requirements/internal-jobs');
            setJobs(res.data);
        } catch (error) {
            console.error("Failed to load internal jobs", error);
        }
    }

    async function fetchAppliedJobs() {
        try {
            const res = await api.get('/requirements/my-applications');
            const ids = new Set(res.data.map(app => app.requirementId ? app.requirementId._id : null).filter(id => id));
            setAppliedJobIds(ids);
        } catch (error) {
            console.error("Failed to load applications", error);
        }
    }

    const [selectedJob, setSelectedJob] = useState(null);

    // Handle Internal Apply
    const handleApply = async (jobId) => {
        if (!window.confirm("Are you sure you want to apply for this position internally? HR will be notified.")) return;

        try {
            await api.post(`/requirements/internal-apply/${jobId}`);
            // Update local state to reflect change immediately
            setAppliedJobIds(prev => new Set(prev).add(jobId));

            alert("Successfully applied! HR has been notified.");
            if (selectedJob) setSelectedJob(null); // Close modal if open
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Application failed";
            alert(msg);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Internal Opportunities...</div>;

    const isJobApplied = (jobId) => appliedJobIds.has(jobId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Internal Job Openings</h2>
                    <p className="text-slate-500 text-sm mt-1">Exclusive opportunities for current employees.</p>
                </div>
            </div>

            {jobs.length === 0 ? (
                <div className="p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                    No internal positions open at the moment.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {jobs.map(job => (
                        <div key={job._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div className="space-y-2 mb-4 md:mb-0">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-slate-900">{job.jobTitle}</h3>
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                                        {job.employmentType || 'Full-Time'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700">Dept:</span> {job.department}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700">Exp:</span> {job.minExperienceMonths ? `${(job.minExperienceMonths / 12).toFixed(1)} - ${(job.maxExperienceMonths / 12).toFixed(1)} Yrs` : 'Fresher'}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700">Loc:</span> {job.location?.city || 'Onsite'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => setSelectedJob(job)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold text-xs uppercase hover:bg-slate-50 transition"
                                >
                                    View Details
                                </button>
                                {isJobApplied(job._id) ? (
                                    <button
                                        disabled
                                        className="px-6 py-2 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs uppercase cursor-not-allowed flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        Applied
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleApply(job._id)}
                                        className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
                                    >
                                        Apply Now
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* JOB DETAILS MODAL */}
            {selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedJob.jobTitle}</h3>
                                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 font-medium">
                                    <span>{selectedJob.department}</span>
                                    <span>•</span>
                                    <span>{selectedJob.location?.city || 'Onsite'}, {selectedJob.location?.state}</span>
                                    <span>•</span>
                                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">{selectedJob.employmentType || 'Full-Time'}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* Description */}
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Job Description</h4>
                                <div className="prose prose-sm prose-slate max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {selectedJob.jobDescription || "No detailed description provided."}
                                </div>
                            </div>

                            {/* Skills */}
                            {(selectedJob.mandatorySkills?.length > 0 || selectedJob.goodToHaveSkills?.length > 0) && (
                                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                    {selectedJob.mandatorySkills?.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Mandatory Skills</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedJob.mandatorySkills.map((skill, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {selectedJob.goodToHaveSkills?.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Good to Have</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedJob.goodToHaveSkills.map((skill, i) => (
                                                    <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Additional Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-xl">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Experience</p>
                                    <p className="text-sm font-bold text-slate-700 mt-1">
                                        {selectedJob.minExperienceMonths ? `${(selectedJob.minExperienceMonths / 12).toFixed(1)} - ${(selectedJob.maxExperienceMonths / 12).toFixed(1)} Yrs` : 'Fresher'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vacancy</p>
                                    <p className="text-sm font-bold text-slate-700 mt-1">{selectedJob.vacancy} Openings</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Mode</p>
                                    <p className="text-sm font-bold text-slate-700 mt-1">{selectedJob.workMode || 'Onsite'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift</p>
                                    <p className="text-sm font-bold text-slate-700 mt-1">{selectedJob.shift || 'Day'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition"
                            >
                                Close
                            </button>
                            {isJobApplied(selectedJob._id) ? (
                                <button
                                    disabled
                                    className="px-5 py-2.5 bg-emerald-100 text-emerald-700 font-bold text-sm rounded-lg cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Already Applied
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleApply(selectedJob._id)}
                                    className="px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
                                >
                                    Apply for this Role
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
