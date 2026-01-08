import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api'; // Centralized axios instance with auth & tenant headers
import { useAuth } from '../../context/AuthContext';
import OfferLetterPreview from '../../components/OfferLetterPreview';
import AssignSalaryModal from '../../components/AssignSalaryModal';
import { DatePicker, Pagination } from 'antd';
import dayjs from 'dayjs';
import { Eye, Download, Edit2, RefreshCw, DollarSign, IndianRupee, Upload, FileText, CheckCircle } from 'lucide-react';

export default function Applicants() {
    const navigate = useNavigate();
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(false);

    // Tab State: 'new' | 'interview' | 'final'
    const [activeTab, setActiveTab] = useState('new');

    const getFilteredApplicants = () => {
        if (activeTab === 'new') {
            return applicants.filter(a => a.status === 'Applied');
        } else if (activeTab === 'interview') {
            return applicants.filter(a => ['Shortlisted', 'Interview Scheduled', 'Interview Rescheduled', 'Interview Completed'].includes(a.status));
        } else if (activeTab === 'final') {
            return applicants.filter(a => ['Selected', 'Rejected'].includes(a.status));
        }
        return [];
    };

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // File Upload State
    const fileInputRef = React.useRef(null);
    const [uploading, setUploading] = useState(false);

    const triggerFileUpload = (applicant) => {
        setSelectedApplicant(applicant);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedApplicant) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await api.post(`/requirements/applicants/${selectedApplicant._id}/upload-salary-excel`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Excel uploaded successfully! Variables are now available for Letter Templates.");
            loadApplicants(); // Refresh incase we show status
        } catch (error) {
            console.error(error);
            alert("Upload failed: " + (error.response?.data?.error || error.message));
        } finally {
            setUploading(false);
        }
    };
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [offerData, setOfferData] = useState({
        joiningDate: '',
        location: '',
        templateId: '',
        position: '',
        probationPeriod: '3 months',
        templateContent: '',
        isWordTemplate: false,
        refNo: '',
        fatherName: ''
    });
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);

    // Joining Letter State
    const [showJoiningModal, setShowJoiningModal] = useState(false);
    const [joiningTemplateId, setJoiningTemplateId] = useState('');
    const [joiningTemplates, setJoiningTemplates] = useState([]);
    const [joiningPreviewUrl, setJoiningPreviewUrl] = useState(null);
    const [showJoiningPreview, setShowJoiningPreview] = useState(false);

    // Salary Assignment State
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [showSalaryPreview, setShowSalaryPreview] = useState(false);

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

    // Interview State
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [isReschedule, setIsReschedule] = useState(false);
    const [interviewData, setInterviewData] = useState({
        date: '',
        time: '',
        mode: 'Online',
        location: '',
        interviewerName: '',
        notes: ''
    });

    const openScheduleModal = (applicant, reschedule = false) => {
        setSelectedApplicant(applicant);
        setIsReschedule(reschedule);
        // Pre-fill if rescheduling
        if (reschedule && applicant.interview) {
            setInterviewData({
                date: applicant.interview.date ? dayjs(applicant.interview.date).format('YYYY-MM-DD') : '',
                time: applicant.interview.time || '',
                mode: applicant.interview.mode || 'Online',
                location: applicant.interview.location || '',
                interviewerName: applicant.interview.interviewerName || '',
                notes: applicant.interview.notes || ''
            });
        } else {
            setInterviewData({ date: '', time: '', mode: 'Online', location: '', interviewerName: '', notes: '' });
        }
        setShowInterviewModal(true);
    };

    const handleInterviewSubmit = async () => {
        if (!selectedApplicant) return;
        setLoading(true);
        try {
            const url = isReschedule
                ? `/requirements/applicants/${selectedApplicant._id}/interview/reschedule`
                : `/requirements/applicants/${selectedApplicant._id}/interview/schedule`;

            const method = isReschedule ? 'put' : 'post';

            await api[method](url, interviewData);

            alert(isReschedule ? 'Interview Rescheduled Successfully!' : 'Interview Scheduled Successfully!');
            setShowInterviewModal(false);
            loadApplicants();
        } catch (error) {
            console.error(error);
            alert("Operation failed: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const markInterviewCompleted = async (applicant) => {
        if (!confirm("Mark interview as completed?")) return;
        try {
            await api.put(`/requirements/applicants/${applicant._id}/interview/complete`);
            loadApplicants();
        } catch (error) {
            alert("Failed: " + error.message);
        }
    };

    const updateStatus = async (applicant, status) => {
        if (!confirm(`Update status to ${status}? This will trigger an email.`)) return;
        try {
            await api.patch(`/requirements/applicants/${applicant._id}/status`, { status });
            loadApplicants();
        } catch (error) {
            alert("Failed: " + error.message);
        }
    };

    async function loadApplicants() {
        setLoading(true);
        try {
            // Uses centralized api instance - automatically includes Authorization & X-Tenant-ID headers
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
        // Fetch Offer Templates
        try {
            const offerRes = await api.get('/letters/templates?type=offer');
            setTemplates(offerRes.data || []);
        } catch (err) {
            console.error("Failed to load offer templates", err);
        }

        // Fetch Joining Templates (independently)
        try {
            const joiningRes = await api.get('/letters/templates?type=joining');
            setJoiningTemplates(joiningRes.data || []);
        } catch (err) {
            // Non-critical, just log
            console.warn("Failed to load joining templates (might be empty or missing permission)", err.message);
        }
    }

    // Auth check for loading data
    const { user } = useAuth(); // Ensure useAuth is imported if not already, or use context if available in scope. 
    // Wait, useAuth hook is not imported in this file. I need to add it first.

    // Unified data refresh function
    const refreshData = async () => {
        setLoading(true);
        await Promise.all([
            loadApplicants(),
            fetchTemplates()
        ]);
        setLoading(false);
    };

    useEffect(() => {
        // Load data on mount if user is authenticated
        // We check if user exists (context) OR if we have a token in local storage to avoid waiting for context if unnecessary
        const token = localStorage.getItem('token');
        if (user || token) {
            refreshData();
        }
    }, [user]); // Keep user as dependency to re-run if auth state changes

    // Ensure templates are fresh when opening the modal
    useEffect(() => {
        if (showModal) {
            fetchTemplates();
        }
    }, [showModal]);

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

        // Auto-generate a default reference number
        const currentYear = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const refNo = `${companyInfo.refPrefix || 'OFFER'}/${currentYear}/${randomNum}`;

        setOfferData({
            joiningDate: '',
            location: applicant.workLocation || 'Ahmedabad',
            templateId: '',
            position: applicant.requirementId?.jobTitle || '',
            probationPeriod: '3 months',
            templateContent: '',
            isWordTemplate: false,
            refNo: refNo
        });
        setPreviewPdfUrl(null);
        setShowModal(true);
        setShowPreview(false);
    };

    const handleOfferChange = (e) => {
        const { name, value } = e.target;
        setOfferData(prev => {
            const updates = { ...prev, [name]: value };

            // If template selected, save its content for preview
            if (name === 'templateId') {
                const selectedTemplate = templates.find(t => t._id === value);
                if (selectedTemplate) {
                    updates.templateContent = selectedTemplate.bodyContent;
                    updates.isWordTemplate = (selectedTemplate.templateType === 'WORD');
                    setPreviewPdfUrl(null); // Reset when template changes
                }
            }
            return updates;
        });
    };

    const handlePreview = async () => {
        if (!offerData.joiningDate) {
            alert('Please select a joining date first');
            return;
        }

        if (offerData.isWordTemplate) {
            setGenerating(true);
            try {
                const payload = {
                    applicantId: selectedApplicant._id,
                    templateId: offerData.templateId,
                    joiningDate: offerData.joiningDate,
                    location: offerData.location,
                    refNo: offerData.refNo // Pass the user-edited Ref No
                };

                const res = await api.post('/letters/generate-offer', payload, { timeout: 30000 });

                if (res.data.downloadUrl) {
                    const url = import.meta.env.VITE_API_URL
                        ? `${import.meta.env.VITE_API_URL}${res.data.downloadUrl}`
                        : `http://localhost:5000${res.data.downloadUrl}`;
                    setPreviewPdfUrl(url);
                    setShowPreview(true);
                }
            } catch (err) {
                console.error("Preview generation failed", err);
                const msg = err.response?.data?.message || err.message || "Failed to generate preview";

                if (err.response?.status === 404 && !err.response?.data?.message) {
                    alert(`Preview failed: Server endpoint not found (404). Please ensure the backend server is running and the route '/api/letters/generate-offer' exists.`);
                } else {
                    alert(`Preview failed: ${msg}`);
                }
            } finally {
                setGenerating(false);
            }
        } else {
            setShowPreview(true);
        }
    };

    const submitOffer = async (e) => {
        if (e) e.preventDefault();
        if (!selectedApplicant) return;

        // If simple download of already generated preview
        if (offerData.isWordTemplate && previewPdfUrl) {
            window.open(previewPdfUrl, '_blank');
            setShowModal(false);
            setShowPreview(false);
            loadApplicants();
            return;
        }

        setGenerating(true);
        try {
            // Use unified letter generation endpoint
            const payload = {
                applicantId: selectedApplicant._id,
                templateId: offerData.templateId,
                joiningDate: offerData.joiningDate,
                location: offerData.location,
                refNo: offerData.refNo, // Pass user-edited Ref No
                // Pass other fields if needed for specific templates
            };

            const res = await api.post('/letters/generate-offer', payload, { timeout: 30000 });

            if (res.data.downloadUrl) {
                const url = import.meta.env.VITE_API_URL
                    ? `${import.meta.env.VITE_API_URL}${res.data.downloadUrl}`
                    : `http://localhost:5000${res.data.downloadUrl}`;
                window.open(url, '_blank');

                setShowModal(false);
                setShowPreview(false); // Close preview if open
                loadApplicants(); // Refresh to show status change
            }
        } catch (err) {
            console.error(err);
            alert('Failed to generate offer letter');
        } finally {
            setGenerating(false);
        }
    };

    const downloadOffer = (filePath) => {
        // Handle both cases: just filename or full path
        let cleanPath = filePath;
        if (filePath && filePath.includes('/')) {
            // If path contains slashes, extract just the filename
            cleanPath = filePath.split('/').pop();
        }
        const url = import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/uploads/offers/${cleanPath}`
            : `http://localhost:5000/uploads/offers/${cleanPath}`;
        window.open(url, '_blank');
    };

    const viewOfferLetter = (filePath) => {
        // Handle both cases: just filename or full path
        let cleanPath = filePath;
        if (filePath && filePath.includes('/')) {
            // If path contains slashes, extract just the filename
            cleanPath = filePath.split('/').pop();
        }
        const url = import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/uploads/offers/${cleanPath}`
            : `http://localhost:5000/uploads/offers/${cleanPath}`;
        window.open(url, '_blank');
    };

    const viewJoiningLetter = async (applicantId) => {
        try {
            const response = await api.get(`/requirements/joining-letter/${applicantId}/preview`);
            if (response.data.downloadUrl) {
                const url = import.meta.env.VITE_API_URL
                    ? `${import.meta.env.VITE_API_URL}${response.data.downloadUrl}`
                    : `http://localhost:5000${response.data.downloadUrl}`;
                window.open(url, '_blank');
            }
        } catch (err) {
            console.error('Failed to view joining letter:', err);
            alert('Failed to view joining letter');
        }
    };

    const downloadJoiningLetter = async (applicantId) => {
        try {
            const response = await api.get(`/requirements/joining-letter/${applicantId}/download`);
            if (response.data.downloadUrl) {
                const url = import.meta.env.VITE_API_URL
                    ? `${import.meta.env.VITE_API_URL}${response.data.downloadUrl}`
                    : `http://localhost:5000${response.data.downloadUrl}`;
                const link = document.createElement('a');
                link.href = url;
                link.download = `Joining_Letter_${applicantId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error('Failed to download joining letter:', err);
            alert('Failed to download joining letter');
        }
    };

    const openJoiningModal = (applicant) => {
        if (!applicant.offerLetterPath) {
            alert("Please generate an Offer Letter first.");
            return;
        }
        // Check if salary is assigned (either via snapshot or flat ctc field)
        const isSalaryAssigned = applicant.salarySnapshot || (applicant.ctc && applicant.ctc > 0);
        if (!isSalaryAssigned) {
            alert("Please assign salary before generating joining letter.");
            return;
        }
        setSelectedApplicant(applicant);
        setJoiningTemplateId('');
        setShowJoiningModal(true);
        setJoiningPreviewUrl(null);
        setShowJoiningPreview(false);
    };

    const openSalaryModal = (applicant) => {
        navigate(`/hr/salary-structure/${applicant._id}`);
    };

    const openSalaryPreview = (applicant) => {
        setSelectedApplicant(applicant);
        setShowSalaryPreview(true);
    };

    const handleSalaryAssigned = () => {
        loadApplicants(); // Refresh list to show updated salary status
    };

    const handleJoiningPreview = async () => {
        if (!joiningTemplateId) {
            alert('Please select a Joining Letter Template');
            return;
        }

        setGenerating(true);
        try {
            const res = await api.post('/letters/preview-joining', {
                applicantId: selectedApplicant._id,
                templateId: joiningTemplateId
            }, { timeout: 90000 }); // 90 second timeout for PDF conversion

            if (res.data.previewUrl) {
                const url = import.meta.env.VITE_API_URL
                    ? `${import.meta.env.VITE_API_URL}${res.data.previewUrl}`
                    : `http://localhost:5000${res.data.previewUrl}`;

                setJoiningPreviewUrl(url);
                setShowJoiningPreview(true);
            }
        } catch (err) {
            console.error("Failed to preview joining letter", err);

            // Extract error message from response
            const errorMessage = err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                'Failed to preview joining letter';

            // Check if it's a file not found error
            if (err.response?.data?.code === 'FILE_NOT_FOUND' ||
                errorMessage.toLowerCase().includes('file not found') ||
                errorMessage.toLowerCase().includes('template file')) {
                alert(`Template file not found. Please re-upload the joining letter template.\n\nError: ${errorMessage}`);
            } else {
                alert(`Failed to preview joining letter: ${errorMessage}`);
            }
        } finally {
            setGenerating(false);
        }
    };

    const handleJoiningGenerate = async () => {
        if (!joiningTemplateId) {
            alert('Please select a Joining Letter Template');
            return;
        }

        setGenerating(true);
        try {
            const res = await api.post('/letters/generate-joining', {
                applicantId: selectedApplicant._id,
                templateId: joiningTemplateId
            });

            if (res.data.downloadUrl) {
                const url = import.meta.env.VITE_API_URL
                    ? `${import.meta.env.VITE_API_URL}${res.data.downloadUrl}`
                    : `http://localhost:5000${res.data.downloadUrl}`;

                // Download the PDF
                const link = document.createElement('a');
                link.href = url;
                link.download = `Joining_Letter_${selectedApplicant._id}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setShowJoiningModal(false);
                setShowJoiningPreview(false);
                loadApplicants();
            }
        } catch (err) {
            console.error("Failed to generate joining letter", err);
            const errorMsg = err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to generate joining letter';

            // Check if it's a salary not assigned error
            if (errorMsg.toLowerCase().includes('salary not assigned') ||
                err.response?.data?.code === 'SALARY_NOT_ASSIGNED') {
                alert('Please assign salary before generating joining letter.');
            } else {
                alert(errorMsg);
            }
        } finally {
            setGenerating(false);
        }
    };



    return (
        <div className="space-y-4 sm:space-y-6 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Applicants</h1>
                    <p className="text-sm sm:text-base text-slate-500 mt-1">Manage candidates and generate letters.</p>
                </div>
                <button
                    onClick={loadApplicants}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm sm:text-base w-full sm:w-auto justify-center"
                >
                    <RefreshCw size={18} />
                    Refresh List
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500 mb-3"></div>
                        Loading applicants...
                    </div>
                ) : applicants.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-slate-50/50">
                        <p>No applicants found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full align-middle">
                            <div className="flex gap-4 mb-6 border-b border-slate-200">
                                <button
                                    onClick={() => setActiveTab('new')}
                                    className={`pb-2 px-4 font-medium text-sm transition-colors relative ${activeTab === 'new'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    New Applications
                                    <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">
                                        {applicants.filter(a => a.status === 'Applied').length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('interview')}
                                    className={`pb-2 px-4 font-medium text-sm transition-colors relative ${activeTab === 'interview'
                                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Interviews
                                    <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">
                                        {applicants.filter(a => ['Shortlisted', 'Interview Scheduled', 'Interview Rescheduled', 'Interview Completed'].includes(a.status)).length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('final')}
                                    className={`pb-2 px-4 font-medium text-sm transition-colors relative ${activeTab === 'final'
                                        ? 'text-emerald-600 border-b-2 border-emerald-600'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Finalized
                                    <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">
                                        {applicants.filter(a => ['Selected', 'Rejected'].includes(a.status)).length}
                                    </span>
                                </button>
                            </div>

                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 z-10 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Candidate</th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Role</th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            {activeTab === 'interview' ? 'Interview Status' : 'Status'}
                                        </th>
                                        {activeTab === 'new' && (
                                            <th className="px-6 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                                        )}
                                        {activeTab === 'interview' && (
                                            <th className="px-6 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Schedule Detail</th>
                                        )}
                                        {activeTab === 'final' && (
                                            <>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Offer Letter</th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Salary</th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Joining Letter</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {getFilteredApplicants().slice((currentPage - 1) * pageSize, currentPage * pageSize).map(app => (
                                        <tr key={app._id} className="hover:bg-slate-50 transition-colors">
                                            {/* CANDIDATE Column */}
                                            <td className="px-4 sm:px-6 py-4">
                                                <div className="text-sm font-medium text-slate-900">{app.name}</div>
                                                <div className="text-xs text-slate-500 mt-1">{app.email}</div>
                                                <div className="text-xs text-slate-500">{app.mobile || 'N/A'}</div>
                                                <div className="text-xs text-slate-600 mt-1 md:hidden">
                                                    <span className="font-medium">{app.requirementId?.jobTitle || 'N/A'}</span> • {app.experience || '0 Years Exp'}
                                                </div>
                                            </td>
                                            {/* ROLE Column */}
                                            <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                                                <div className="text-sm font-medium text-slate-900">{app.requirementId?.jobTitle || 'N/A'}</div>
                                                <div className="text-xs text-slate-500 mt-1">{app.experience || '0 Years Exp'}</div>
                                            </td>
                                            {/* STATUS Column */}
                                            <td className="px-4 sm:px-6 py-4">
                                                <span className={`inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status)}`}>
                                                    {app.status || 'Applied'}
                                                </span>
                                            </td>

                                            {/* TAB SPECIFIC COLUMNS */}

                                            {/* 1. NEW APPLICATIONS TAB - Actions */}
                                            {activeTab === 'new' && (
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                if (confirm("Shortlist this candidate for interview?")) {
                                                                    updateStatus(app, 'Shortlisted');
                                                                    setActiveTab('interview'); // Move to next tab
                                                                }
                                                            }}
                                                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition"
                                                        >
                                                            Shortlist
                                                        </button>
                                                        <button
                                                            onClick={() => updateStatus(app, 'Rejected')}
                                                            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition border border-red-200"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            )}

                                            {/* 2. INTERVIEW TAB - Schedule Details & Actions */}
                                            {activeTab === 'interview' && (
                                                <td className="px-4 sm:px-6 py-4">
                                                    {app.interview && app.interview.date ? (
                                                        <div className="text-xs text-slate-700 mb-2">
                                                            <div className="font-semibold">{dayjs(app.interview.date).format('DD MMM YYYY')} @ {app.interview.time}</div>
                                                            <div>{app.interview.mode} - {app.interview.interviewerName}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-400 italic mb-2">No schedule yet</div>
                                                    )}

                                                    <div className="flex flex-wrap gap-2">
                                                        {app.status === 'Shortlisted' && (
                                                            <button onClick={() => openScheduleModal(app, false)} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded">Schedule</button>
                                                        )}
                                                        {['Interview Scheduled', 'Interview Rescheduled'].includes(app.status) && (
                                                            <>
                                                                <button onClick={() => openScheduleModal(app, true)} className="text-[10px] bg-orange-500 text-white px-2 py-1 rounded">Reschedule</button>
                                                                <button onClick={() => markInterviewCompleted(app)} className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded">Complete</button>
                                                            </>
                                                        )}
                                                        {app.status === 'Interview Completed' && (
                                                            <>
                                                                <button onClick={() => { updateStatus(app, 'Selected'); setActiveTab('final'); }} className="text-[10px] bg-green-600 text-white px-2 py-1 rounded">Select</button>
                                                                <button onClick={() => { updateStatus(app, 'Rejected'); setActiveTab('final'); }} className="text-[10px] bg-red-600 text-white px-2 py-1 rounded">Reject</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            {/* 3. FINALIZED TAB - Offer/Salary/Joining */}
                                            {activeTab === 'final' && (
                                                <>
                                                    {/* OFFER LETTER Column */}
                                                    <td className="px-4 sm:px-6 py-4">
                                                        {app.offerLetterPath ? (
                                                            <div className="flex items-center gap-1 sm:gap-2">
                                                                <button
                                                                    onClick={() => viewOfferLetter(app.offerLetterPath)}
                                                                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                                    title="View Offer Letter"
                                                                >
                                                                    <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />
                                                                </button>
                                                                <button
                                                                    onClick={() => downloadOffer(app.offerLetterPath)}
                                                                    className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition"
                                                                    title="Download Offer Letter"
                                                                >
                                                                    <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                {app.status === 'Selected' ? (
                                                                    <button
                                                                        onClick={() => openOfferModal(app)}
                                                                        className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition whitespace-nowrap"
                                                                    >
                                                                        Generate Offer
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs text-red-400">Rejected</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* SALARY Column */}
                                                    <td className="px-6 py-4">
                                                        {/* If Excel is uploaded, show info */}
                                                        {app.salaryExcelData && (
                                                            <div className="mb-2 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 w-fit">
                                                                <FileText size={12} />
                                                                <span className="font-medium truncate max-w-[120px]" title={app.salaryExcelFileName || "Excel Data Uploaded"}>
                                                                    {app.salaryExcelFileName || "Excel Uploaded"}
                                                                </span>
                                                                <CheckCircle size={10} className="text-emerald-500" />
                                                            </div>
                                                        )}

                                                        {app.salarySnapshot && app.salarySnapshot.ctc?.yearly > 0 ? (
                                                            <div className="flex items-center justify-start gap-2">
                                                                <button
                                                                    onClick={() => openSalaryModal(app)}
                                                                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-full transition-all shadow-sm border border-blue-100 group"
                                                                    title="Edit Salary Structure"
                                                                >
                                                                    <Edit2 size={16} className="group-hover:scale-110 transition-transform" />
                                                                </button>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                                                        <IndianRupee size={10} />
                                                                        {app.salarySnapshot.ctc?.yearly?.toLocaleString('en-IN') || '0'}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">CTC / Year</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-2">
                                                                {app.status === 'Selected' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => openSalaryModal(app)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm w-fit"
                                                                        >
                                                                            <DollarSign size={14} />
                                                                            Assign CTC
                                                                        </button>
                                                                        <button
                                                                            onClick={() => triggerFileUpload(app)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors w-fit"
                                                                            disabled={uploading}
                                                                        >
                                                                            <Upload size={14} />
                                                                            {uploading && selectedApplicant?._id === app._id ? 'Uploading...' : 'Upload Excel'}
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* JOINING LETTER Column */}
                                                    <td className="px-6 py-4">
                                                        {/* Only show if offer letter is generated */}
                                                        {!app.offerLetterPath ? (
                                                            <span className="text-xs text-slate-400 italic">Generate Offer First</span>
                                                        ) : app.joiningLetterPath ? (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => viewJoiningLetter(app._id)}
                                                                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                                    title="View Joining Letter"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => downloadJoiningLetter(app._id)}
                                                                    className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded transition"
                                                                    title="Download Joining Letter"
                                                                >
                                                                    <Download size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => openJoiningModal(app)}
                                                                className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition whitespace-nowrap border border-purple-200"
                                                            >
                                                                Generate
                                                            </button>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-center sm:justify-end">
                            <Pagination
                                current={currentPage}
                                pageSize={pageSize}
                                total={applicants.length}
                                onChange={(page) => setCurrentPage(page)}
                                showSizeChanger={false}
                                responsive={true}
                                size="small"
                                className="text-xs sm:text-sm"
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

                        <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Offer Template</label>
                                <select
                                    name="templateId"
                                    value={offerData.templateId}
                                    onChange={handleOfferChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                >
                                    <option value="">-- Select Template --</option>
                                    {templates.map(t => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                                <input
                                    type="text"
                                    name="refNo"
                                    value={offerData.refNo || ''}
                                    onChange={handleOfferChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    placeholder="e.g. OFFER/2025/001"
                                />
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
                                    onClick={handlePreview}
                                    className="px-4 py-2 border border-blue-600 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50"
                                >
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => submitOffer(e)}
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

            {/* Joining Letter Generation Modal */}
            {showJoiningModal && selectedApplicant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Joining Letter</h2>
                        <div className="mb-4 text-sm text-gray-600 space-y-2">
                            <p><strong>Candidate:</strong> {selectedApplicant.name}</p>
                            <p><strong>Joining Date:</strong> {selectedApplicant.joiningDate ? new Date(selectedApplicant.joiningDate).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Location:</strong> {selectedApplicant.location || selectedApplicant.workLocation || 'N/A'}</p>
                            <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded">
                                Note: Joining Date and Location are pulled from the Offer Letter data.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Select Template</label>
                                <select
                                    value={joiningTemplateId}
                                    onChange={(e) => setJoiningTemplateId(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                >
                                    <option value="">-- Select Template --</option>
                                    {joiningTemplates.map(t => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowJoiningModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleJoiningPreview}
                                    disabled={generating}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                >
                                    {generating ? 'Loading...' : 'Preview'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Joining Letter Preview Modal */}
            {showJoiningPreview && selectedApplicant && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 overflow-y-auto">
                    <div className="min-h-screen py-8 px-4">
                        {/* Sticky Header with Buttons */}
                        <div className="sticky top-0 z-10 bg-gradient-to-b from-black via-black to-transparent pb-6 mb-4">
                            <div className="max-w-5xl mx-auto flex justify-between items-center gap-3">
                                <h2 className="text-xl font-bold text-white">Joining Letter Preview</h2>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowJoiningPreview(false)}
                                        className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 shadow-lg font-medium transition"
                                    >
                                        ✕ Close Preview
                                    </button>
                                    <button
                                        onClick={handleJoiningGenerate}
                                        disabled={generating}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg font-medium disabled:opacity-50 transition"
                                    >
                                        {generating ? 'Generating...' : '✓ Generate & Download'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Preview Content */}
                        <div className="max-w-5xl mx-auto">
                            {joiningPreviewUrl ? (
                                <iframe
                                    src={joiningPreviewUrl}
                                    className="w-full h-[80vh] rounded-lg shadow-xl bg-white"
                                    title="Joining Letter PDF Preview"
                                />
                            ) : (
                                <div className="w-full h-[80vh] rounded-lg shadow-xl bg-white flex items-center justify-center">
                                    <p className="text-gray-500">Loading preview...</p>
                                </div>
                            )}
                        </div>

                        {/* Bottom Padding */}
                        <div className="h-8"></div>
                    </div>
                </div>
            )}

            {/* Offer Letter Preview Modal (Unified for both Offer & Joining) */}
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
                                        onClick={(e) => submitOffer(e)}
                                        disabled={generating}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg font-medium disabled:opacity-50 transition"
                                    >
                                        {generating ? 'Downloading...' : '✓ Download PDF'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Preview Content */}
                        <div className="max-w-5xl mx-auto">
                            {offerData.isWordTemplate && previewPdfUrl ? (
                                <iframe
                                    src={previewPdfUrl}
                                    className="w-full h-[80vh] rounded-lg shadow-xl bg-white"
                                    title="PDF Preview"
                                />
                            ) : (
                                <OfferLetterPreview
                                    applicant={selectedApplicant}
                                    offerData={offerData}
                                    companyInfo={companyInfo}
                                />
                            )}
                        </div>

                        {/* Bottom Padding */}
                        <div className="h-8"></div>
                    </div>
                </div>
            )}

            {/* Assign Salary Modal */}
            {showSalaryModal && selectedApplicant && (
                <AssignSalaryModal
                    isOpen={showSalaryModal}
                    onClose={() => {
                        setShowSalaryModal(false);
                        setSelectedApplicant(null);
                    }}
                    applicant={selectedApplicant}
                    onSuccess={handleSalaryAssigned}
                />
            )}

            {/* Salary Preview Modal */}
            {showSalaryPreview && selectedApplicant && selectedApplicant.salarySnapshot && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Salary Structure</h3>
                                <p className="text-sm text-slate-500">{selectedApplicant.name} • {selectedApplicant.requirementId?.jobTitle}</p>
                            </div>
                            <button onClick={() => setShowSalaryPreview(false)} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
                                ✕
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Earnings */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-100 pb-2">Earnings (Monthly)</h4>
                                    <div className="space-y-2">
                                        {selectedApplicant.salarySnapshot.earnings.map((e, i) => (
                                            <div key={i} className="flex justify-between text-sm group border-b border-dashed border-slate-100 pb-1 last:border-0">
                                                <span className="text-slate-600 group-hover:text-slate-900">{e.name}</span>
                                                <span className="font-medium text-slate-800">₹{e.monthlyAmount?.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-800 mt-2">
                                        <span>Gross Earnings</span>
                                        <span>₹{(selectedApplicant.salarySnapshot.grossA?.monthly ?? selectedApplicant.salarySnapshot.grossA)?.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider border-b border-rose-100 pb-2">Deductions (Monthly)</h4>
                                    <div className="space-y-2">
                                        {selectedApplicant.salarySnapshot.employeeDeductions.length > 0 ? (
                                            selectedApplicant.salarySnapshot.employeeDeductions.map((d, i) => (
                                                <div key={i} className="flex justify-between text-sm group border-b border-dashed border-slate-100 pb-1 last:border-0">
                                                    <span className="text-slate-600 group-hover:text-slate-900">{d.name}</span>
                                                    <span className="font-medium text-rose-600">-₹{d.monthlyAmount?.toLocaleString()}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">No deductions</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg ring-1 ring-white/10">
                                <div className="grid grid-cols-2 gap-4 text-center divide-x divide-slate-700/50">
                                    <div>
                                        <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Monthly Net Pay</div>
                                        <div className="text-2xl font-bold text-emerald-400">₹{(selectedApplicant.salarySnapshot.takeHome?.monthly ?? selectedApplicant.salarySnapshot.takeHome)?.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Annual CTC</div>
                                        <div className="text-xl font-bold text-white">₹{(selectedApplicant.salarySnapshot.ctc?.yearly ?? selectedApplicant.salarySnapshot.ctc)?.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowSalaryPreview(false); openSalaryModal(selectedApplicant); }}
                                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                                Edit Structure
                            </button>
                            <button
                                onClick={() => setShowSalaryPreview(false)}
                                className="px-6 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INTERVIEW MODAL */}
            {showInterviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            {isReschedule ? 'Reschedule Interview' : 'Schedule Interview'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Date</label>
                                <input
                                    type="date"
                                    value={interviewData.date}
                                    onChange={(e) => setInterviewData({ ...interviewData, date: e.target.value })}
                                    className="w-full mt-1 p-2 border rounded"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Time</label>
                                    <input
                                        type="time"
                                        value={interviewData.time}
                                        onChange={(e) => setInterviewData({ ...interviewData, time: e.target.value })}
                                        className="w-full mt-1 p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Mode</label>
                                    <select
                                        value={interviewData.mode}
                                        onChange={(e) => setInterviewData({ ...interviewData, mode: e.target.value })}
                                        className="w-full mt-1 p-2 border rounded"
                                    >
                                        <option value="Online">Online</option>
                                        <option value="Offline">Offline</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    {interviewData.mode === 'Online' ? 'Meeting Link' : 'Office/Location Address'}
                                </label>
                                <input
                                    type="text"
                                    value={interviewData.location}
                                    onChange={(e) => setInterviewData({ ...interviewData, location: e.target.value })}
                                    placeholder={interviewData.mode === 'Online' ? 'Zoom/Teams/Meet Link' : 'Enter work location address'}
                                    className="w-full mt-1 p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Interviewer Name</label>
                                <input
                                    type="text"
                                    value={interviewData.interviewerName}
                                    onChange={(e) => setInterviewData({ ...interviewData, interviewerName: e.target.value })}
                                    className="w-full mt-1 p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Notes (Optional)</label>
                                <textarea
                                    value={interviewData.notes}
                                    onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                                    className="w-full mt-1 p-2 border rounded"
                                    rows="2"
                                />
                            </div>

                            <div className="flex gap-2 justify-end mt-4">
                                <button
                                    onClick={() => setShowInterviewModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleInterviewSubmit}
                                    disabled={loading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? 'Sending...' : (isReschedule ? 'Reschedule & Notify' : 'Schedule & Notify')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
