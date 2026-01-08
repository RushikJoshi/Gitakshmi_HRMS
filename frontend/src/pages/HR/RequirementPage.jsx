import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function RequirementPage() {
  const [requirements, setRequirements] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [departments] = useState([
    { _id: '1', name: 'HR' },
    { _id: '2', name: 'Tech' },
    { _id: '3', name: 'Finance' },
    { _id: '4', name: 'Marketing' }
  ]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [activeTab] = useState('requirements');

  async function loadRequirements() {
    setLoading(true);
    try {
      const res = await api.get('/requirements/list');
      setRequirements(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load requirements');
    } finally {
      setLoading(false);
    }
  }

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

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
    try {
      await api.patch(`/requirements/${id}/status`, { status: newStatus });
      loadRequirements(); // Refresh list
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  }

  function copyPublicLink(requirementId) {
    // Assuming tenantId is available in session or user context, 
    // but for now we might need to fetch it or use a default if running locally.
    // In a real scenario, we'd get this from the auth context.
    const tenantId = 'default-tenant'; // Ideally invoke from auth context
    const link = `${window.location.origin}/apply-job/${requirementId}?tenantId=${tenantId}`;
    navigator.clipboard.writeText(link);
    alert('Public Job Link Copied to Clipboard!');
  }

  useEffect(() => {
    if (activeTab === 'requirements') {
      loadRequirements();
    } else {
      loadApplicants();
    }
  }, [activeTab]);

  const [currentReq, setCurrentReq] = useState(null);
  const [openView, setOpenView] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  function openNew() {
    setCurrentReq(null);
    setIsEditMode(false);
    setOpenForm(true);
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
      loadRequirements();
    } catch (err) {
      console.error(err);
      alert('Failed to delete requirement');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Requirement Management</h1>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md">
          + Add Requirement
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading requirements...</div>
        ) : requirements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No requirements yet. Create one to get started!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vacancy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Visibility</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requirements.map(req => (
                  <tr key={req._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.jobTitle}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{req.department}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{req.vacancy}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${req.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {req.jobVisibility || 'External'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        {/* Toggle Status Button */}
                        <button
                          onClick={() => toggleStatus(req._id, req.status)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${req.status === 'Open'
                            ? 'border-red-500 text-red-600 hover:bg-red-50'
                            : 'border-green-500 text-green-600 hover:bg-green-50'
                            }`}
                        >
                          {req.status === 'Open' ? 'Close Job' : 'Re-open'}
                        </button>

                        {/* View Button */}
                        <button
                          onClick={() => handleView(req)}
                          title="View Details"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleEdit(req)}
                          title="Edit Job"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(req._id)}
                          title="Delete Job"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openForm && (
        <RequirementForm
          departments={departments}
          initialData={currentReq}
          isEdit={isEditMode}
          onClose={() => {
            setOpenForm(false);
            setCurrentReq(null);
            loadRequirements();
          }}
        />
      )}

      {openView && currentReq && (
        <ViewRequirementModal
          req={currentReq}
          onClose={() => {
            setOpenView(false);
            setCurrentReq(null);
          }}
        />
      )}
    </div>
  );
}

// Helper to format months to years (e.g., 18 -> "1.5 Years")
function formatExperience(months) {
  if (months === 0) return 'Fresher';
  if (!months) return 'Not specified';
  if (months < 12) return `${months} Months`;
  const years = months / 12;
  return `${Number.isInteger(years) ? years : years.toFixed(1)} Year${years > 1 ? 's' : ''}`;
}

function RequirementForm({ departments, onClose, initialData, isEdit }) {
  // Helper to parse location safe
  const initLoc = initialData?.location || {};
  const initSal = initialData?.salaryRange || {};

  const [formData, setFormData] = useState({
    jobTitle: initialData?.jobTitle || '',
    department: initialData?.department || '',
    vacancy: initialData?.vacancy || 1,
    status: initialData?.status || 'Draft',
    jobVisibility: initialData?.jobVisibility || 'External',
    description: initialData?.description || initialData?.jobDescription || '', // Handle both legacy and new field names if needed

    // New Fields
    employmentType: initialData?.employmentType || 'Full-Time',
    workMode: initialData?.workMode || 'Onsite',
    shift: initialData?.shift || 'Day',

    // Location
    city: initLoc.city || '',
    state: initLoc.state || '',
    country: initLoc.country || 'India',

    // Experience & Skills (Using Months now)
    minExperienceMonths: initialData?.minExperienceMonths || 0,
    maxExperienceMonths: initialData?.maxExperienceMonths || 0,
    education: initialData?.education || '',
    mandatorySkills: initialData?.mandatorySkills?.join(', ') || '',
    goodToHaveSkills: initialData?.goodToHaveSkills?.join(', ') || '',

    // Salary
    salaryMin: initSal.min || '',
    salaryMax: initSal.max || '',
    salaryCurrency: initSal.currency || 'INR',
    salaryVisibleToCandidate: initialData?.salaryVisibleToCandidate || false,
  });

  const [showSalary, setShowSalary] = useState(
    !!(initialData?.salaryRange?.min || initialData?.salaryRange?.max)
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.jobTitle.trim()) newErrors.jobTitle = "Job Title is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (Number(formData.vacancy) < 1) newErrors.vacancy = "Vacancy must be at least 1";

    // Experience Validation (Months)
    if (Number(formData.minExperienceMonths) > Number(formData.maxExperienceMonths)) {
      newErrors.minExperienceMonths = "Min Exp cannot be greater than Max Exp";
    }

    // Salary Validation
    if (showSalary && Number(formData.salaryMin) > Number(formData.salaryMax)) {
      newErrors.salaryMin = "Min Salary cannot be greater than Max Salary";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function submit(evt) {
    evt.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      // Prepare payload match backend schema
      // Prepare payload match backend schema
      const payload = {
        jobTitle: formData.jobTitle.trim(),
        department: formData.department,
        vacancy: Number(formData.vacancy) || 1,
        // status: formData.status, // REMOVED - System controlled
        visibility: formData.jobVisibility, // Mapped to visibility
        jobDescription: formData.description, // Mapped to jobDescription

        employmentType: formData.employmentType,
        workMode: formData.workMode,
        shift: formData.shift,

        location: {
          city: formData.city,
          state: formData.state,
          country: formData.country
        },

        // Experience in Months
        minExperienceMonths: Number(formData.minExperienceMonths) || 0,
        maxExperienceMonths: Number(formData.maxExperienceMonths) || 0,
        education: formData.education,

        // Convert comma strings to arrays and clean whitespace
        mandatorySkills: formData.mandatorySkills.split(',').map(s => s.trim()).filter(Boolean),
        goodToHaveSkills: formData.goodToHaveSkills.split(',').map(s => s.trim()).filter(Boolean),

        // Flatten Salary Structure
        salaryMin: showSalary ? Number(formData.salaryMin) : undefined,
        salaryMax: showSalary ? Number(formData.salaryMax) : undefined,
        salaryCurrency: showSalary ? formData.salaryCurrency : 'INR',
        salaryVisibleToCandidate: formData.salaryVisibleToCandidate
      };

      console.log("FRONTEND PAYLOAD:", payload);

      if (isEdit) {
        await api.put(`/requirements/${initialData._id}`, payload);
      } else {
        await api.post('/requirements/create', payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.message || err.message;
      alert(`Failed to save requirement: ${serverMsg}`);
    } finally {
      setSaving(false);
    }
  }

  // Approval Check Logic
  const canPublish = isEdit && initialData?.approvalStatus === 'Approved';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-xl font-bold text-slate-800">
            {isEdit ? 'Edit Requirement' : 'Add New Requirement'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="req-form" onSubmit={submit} className="space-y-8">

            {/* Section 1: Basic Info */}
            <div>
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Basic Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                  <input
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${errors.jobTitle ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                  {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${errors.department ? 'border-red-500' : 'border-slate-300'}`}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vacancy <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="vacancy"
                    min="1"
                    value={formData.vacancy}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${errors.vacancy ? 'border-red-500' : 'border-slate-300'}`}
                  />
                  {errors.vacancy && <p className="text-red-500 text-xs mt-1">{errors.vacancy}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type</label>
                  <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Work Mode</label>
                  <select name="workMode" value={formData.workMode} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                    <option value="Onsite">Onsite</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Shift</label>
                  <select name="shift" value={formData.shift} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg">
                    <option value="Day">Day</option>
                    <option value="Night">Night</option>
                    <option value="Rotational">Rotational</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Location */}
            <div>
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Job Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input name="city" value={formData.city} onChange={handleChange} placeholder="City (e.g. Mumbai)" className="px-4 py-2 border border-slate-300 rounded-lg" />
                <input name="state" value={formData.state} onChange={handleChange} placeholder="State (e.g. MH)" className="px-4 py-2 border border-slate-300 rounded-lg" />
                <input name="country" value={formData.country} onChange={handleChange} placeholder="Country (e.g. India)" className="px-4 py-2 border border-slate-300 rounded-lg" />
              </div>
            </div>

            {/* Section 3: Experience & Skills */}
            <div>
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                Experience & Skills
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Experience (Months)</label>
                  <input type="number" name="minExperienceMonths" min="0" step="1" value={formData.minExperienceMonths} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${errors.minExperienceMonths ? 'border-red-500' : 'border-slate-300'}`} />
                  <p className="text-xs text-slate-500 mt-1">0 = Fresher, 12 = 1 Year</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Experience (Months)</label>
                  <input type="number" name="maxExperienceMonths" min="0" step="1" value={formData.maxExperienceMonths} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                  <p className="text-xs text-slate-500 mt-1">e.g. 24 = 2 Years</p>
                  {errors.minExperienceMonths && <p className="text-red-500 text-xs mt-1">{errors.minExperienceMonths}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Education</label>
                  <input name="education" value={formData.education} onChange={handleChange} placeholder="e.g. B.Tech / MBA" className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mandatory Skills <span className="text-xs text-slate-500">(Comma separated)</span></label>
                  <input name="mandatorySkills" value={formData.mandatorySkills} onChange={handleChange} placeholder="e.g. React, Node.js, MongoDB" className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Good-to-have Skills <span className="text-xs text-slate-500">(Comma separated)</span></label>
                  <input name="goodToHaveSkills" value={formData.goodToHaveSkills} onChange={handleChange} placeholder="e.g. AWS, Docker" className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Section 4: Salary */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Salary Details
                </h3>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={showSalary} onChange={(e) => setShowSalary(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                  Specify Salary Range
                </label>
              </div>

              {showSalary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Currency</label>
                    <select name="salaryCurrency" value={formData.salaryCurrency} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Min Salary</label>
                    <input type="number" name="salaryMin" value={formData.salaryMin} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md text-sm ${errors.salaryMin ? 'border-red-500' : 'border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Max Salary</label>
                    <input type="number" name="salaryMax" value={formData.salaryMax} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" name="salaryVisibleToCandidate" checked={formData.salaryVisibleToCandidate} onChange={handleChange} className="rounded text-blue-600" />
                      Visible to candidates
                    </label>
                    {errors.salaryMin && <p className="text-red-500 text-xs mt-1">{errors.salaryMin}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Section 5: Description & Status */}
            <div>
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-4">Job Description & Publishing</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Description</label>
                  <textarea
                    name="description"
                    rows={6}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Detailed job description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
                    <select
                      name="jobVisibility"
                      value={formData.jobVisibility}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="External">External (Public)</option>
                      <option value="Internal">Internal (Employees Only)</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-white hover:shadow-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="req-form"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {isEdit ? 'Update Requirement' : 'Create Requirement'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewRequirementModal({ req, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{req.jobTitle}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-slate-500">{req.department}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${req.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {req.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-md">
              <span className="block text-xs text-slate-500 uppercase tracking-wide">Vacancy</span>
              <span className="block text-lg font-medium text-slate-900">{req.vacancy}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-md">
              <span className="block text-xs text-slate-500 uppercase tracking-wide">Visibility</span>
              <span className="block text-lg font-medium text-slate-900">{req.jobVisibility}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Experience</h3>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-100">
              {formatExperience(req.minExperienceMonths)} - {formatExperience(req.maxExperienceMonths)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Job Description</h3>
            <div className="text-slate-700 bg-slate-50 p-4 rounded-md border border-slate-100 whitespace-pre-line text-sm leading-relaxed">
              {req.description || req.jobDescription || 'No description provided.'}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}