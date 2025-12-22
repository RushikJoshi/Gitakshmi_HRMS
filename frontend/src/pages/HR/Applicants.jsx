import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import OfferLetterPreview from '../../components/OfferLetterPreview';
import { DatePicker, Pagination } from 'antd';
import dayjs from 'dayjs';

export default function Applicants() {
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [offerData, setOfferData] = useState({
        joiningDate: '',
        dob: '',
        location: '',
        templateId: '',
        position: '',
        probationPeriod: '3 months'
    });
    const [generating, setGenerating] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [templates, setTemplates] = useState([]);
    const [companyInfo, setCompanyInfo] = useState({
        name: 'Gitakshmi Technologies',
        tagline: 'TECHNOLOGIES',
        address: 'Ahmedabad, Gujarat - 380051',
        phone: '+91 1234567890',
        email: 'hr@gitakshmi.com',
        website: 'www.gitakshmi.com',
        refPrefix: 'GITK',
        signatoryName: 'HR Manager',
        logo: 'https://via.placeholder.com/150x60/4F46E5/FFFFFF?text=COMPANY+LOGO' // Placeholder logo
    });

    async function loadApplicants() {
        setLoading(true);
        try {
            const res = await api.get('/requirements/applicants');
            setApplicants(res.data || []);
        } catch (err) {
            console.error(err);
            alert('Failed to load applicants');
        } finally {
            setLoading(false);
        }
    }

    async function fetchTemplates() {
        try {
            const res = await api.get('/hr/offer-templates');
            setTemplates(res.data || []);
        } catch (err) {
            console.error("Failed to load templates", err);
        }
    }

    useEffect(() => {
        loadApplicants();
        fetchTemplates();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Applied': return 'bg-blue-100 text-blue-800';
            case 'Shortlisted': return 'bg-yellow-100 text-yellow-800';
            case 'Selected': return 'bg-green-100 text-green-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const openOfferModal = (applicant) => {
        setSelectedApplicant(applicant);
        setOfferData({
            joiningDate: '',
            dob: applicant.dob ? new Date(applicant.dob).toISOString().split('T')[0] : '',
            location: applicant.workLocation || 'Ahmedabad',
            templateId: '',
            position: applicant.requirementId?.jobTitle || '',
            probationPeriod: '3 months'
        });
        setShowModal(true);
        setShowPreview(false);
    };

    const handleOfferChange = (e) => {
        const { name, value } = e.target;
        setOfferData(prev => ({ ...prev, [name]: value }));
    };

    const submitOffer = async (e) => {
        e.preventDefault();
        if (!selectedApplicant) return;

        setGenerating(true);
        try {
            const res = await api.post(`/requirements/offer-letter/${selectedApplicant._id}`, offerData);

            if (res.data.downloadUrl) {
                const url = import.meta.env.VITE_API_URL
                    ? `${import.meta.env.VITE_API_URL}${res.data.downloadUrl}`
                    : `http://localhost:5000${res.data.downloadUrl}`;
                window.open(url, '_blank');

                setShowModal(false);
                loadApplicants(); // Refresh to show status change
            }
        } catch (err) {
            console.error(err);
            alert('Failed to generate offer letter');
        } finally {
            setGenerating(false);
        }
    };

    const downloadOffer = (path) => {
        const url = import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/uploads/offers/${path}`
            : `http://localhost:5000/uploads/offers/${path}`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">Applicants</h1>
                <button onClick={loadApplicants} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading applicants...</div>
                ) : applicants.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No applicants found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Job Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Experience</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Resume</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {applicants.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(app => (
                                    <tr key={app._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">{app.name}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900">{app.email}</div>
                                            <div className="text-xs text-slate-500">{app.mobile}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {app.requirementId?.jobTitle || 'N/A'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {app.experience}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">
                                            {app.resume ? (
                                                <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${app.resume}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                    View Resume
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">No Resume</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {app.offerLetterPath ? (
                                                <button
                                                    onClick={() => downloadOffer(app.offerLetterPath)}
                                                    className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 px-2 py-1 rounded hover:bg-green-50 transition"
                                                >
                                                    Download Offer
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openOfferModal(app)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 px-2 py-1 rounded hover:bg-blue-50 transition"
                                                >
                                                    Generate Offer
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                            <Pagination
                                current={currentPage}
                                pageSize={pageSize}
                                total={applicants.length}
                                onChange={(page) => setCurrentPage(page)}
                                showSizeChanger={false}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Offer Generation Modal */}
            {showModal && selectedApplicant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Offer Letter</h2>
                        <div className="mb-4 text-sm text-gray-600">
                            <p><strong>Candidate:</strong> {selectedApplicant.name}</p>
                            <p><strong>Role:</strong> {selectedApplicant.requirementId?.jobTitle}</p>
                        </div>

                        <form onSubmit={submitOffer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Offer Template</label>
                                <select
                                    name="templateId"
                                    value={offerData.templateId}
                                    onChange={handleOfferChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                >
                                    <option value="">-- Default (Hardcoded) --</option>
                                    {templates.map(t => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Joining Date *</label>
                                <DatePicker
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-[42px]"
                                    format="DD-MM-YYYY"
                                    placeholder="DD-MM-YYYY"
                                    value={offerData.joiningDate ? dayjs(offerData.joiningDate) : null}
                                    onChange={(date) => setOfferData(prev => ({ ...prev, joiningDate: date ? date.format('YYYY-MM-DD') : '' }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                <DatePicker
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-[42px]"
                                    format="DD-MM-YYYY"
                                    placeholder="DD-MM-YYYY"
                                    value={offerData.dob ? dayjs(offerData.dob) : null}
                                    onChange={(date) => setOfferData(prev => ({ ...prev, dob: date ? date.format('YYYY-MM-DD') : '' }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Work Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={offerData.location}
                                    onChange={handleOfferChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    placeholder="e.g. New York, Remote"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!offerData.joiningDate) {
                                            alert('Please select a joining date first');
                                            return;
                                        }
                                        setShowPreview(true);
                                    }}
                                    className="px-4 py-2 border border-blue-600 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50"
                                >
                                    Preview
                                </button>
                                <button
                                    type="submit"
                                    disabled={generating}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {generating ? 'Generating...' : 'Generate & Download'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Offer Letter Preview Modal */}
            {showPreview && selectedApplicant && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 overflow-y-auto">
                    <div className="min-h-screen py-8 px-4">
                        {/* Sticky Header with Buttons */}
                        <div className="sticky top-0 z-10 bg-gradient-to-b from-black via-black to-transparent pb-6 mb-4">
                            <div className="max-w-5xl mx-auto flex justify-between items-center gap-3">
                                <h2 className="text-xl font-bold text-white">Offer Letter Preview</h2>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 shadow-lg font-medium transition"
                                    >
                                        ✕ Close Preview
                                    </button>
                                    <button
                                        onClick={submitOffer}
                                        disabled={generating}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg font-medium disabled:opacity-50 transition"
                                    >
                                        {generating ? 'Generating PDF...' : '✓ Generate & Download PDF'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Preview Content */}
                        <div className="max-w-5xl mx-auto">
                            <OfferLetterPreview
                                applicant={selectedApplicant}
                                offerData={offerData}
                                companyInfo={companyInfo}
                            />
                        </div>

                        {/* Bottom Padding */}
                        <div className="h-8"></div>
                    </div>
                </div>
            )}
        </div>
    );
}
