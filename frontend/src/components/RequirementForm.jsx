import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function RequirementForm({ onClose, onSuccess, initialData, isEdit, isModal = true }) {
    const [formData, setFormData] = useState({
        jobTitle: '',
        department: '',
        vacancy: 1,
        description: '',
        priority: 'Medium',
        workMode: 'On-site',
        jobType: 'Full Time',
        minExperienceMonths: 0,
        maxExperienceMonths: 0,
        salaryMin: '',
        salaryMax: ''
    });

    const [customFields, setCustomFields] = useState([]);
    const [step, setStep] = useState(1); // 1 = Details, 2 = Hiring Stages

    // Track which fields are visible to the public
    const [publicFields, setPublicFields] = useState(new Set([
        'jobTitle', 'department', 'vacancy', 'description',
        'workMode', 'jobType', 'experience', 'salary'
    ]));

    // Default Workflow
    const [workflow, setWorkflow] = useState(['Shortlisted', 'Interview']);

    const [saving, setSaving] = useState(false);

    // Prevent double-click save on step transition
    const [canSave, setCanSave] = useState(false);

    useEffect(() => {
        if (step === 2) {
            setCanSave(false);
            const timer = setTimeout(() => setCanSave(true), 1000); // 1-second delay
            return () => clearTimeout(timer);
        }
    }, [step]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                jobTitle: initialData.jobTitle || '',
                department: initialData.department || '',
                vacancy: initialData.vacancy || 1,
                description: initialData.description || '',
                priority: initialData.priority || 'Medium',
                workMode: initialData.workMode || 'On-site',
                jobType: initialData.jobType || 'Full Time',
                minExperienceMonths: initialData.minExperienceMonths || 0,
                maxExperienceMonths: initialData.maxExperienceMonths || 0,
                salaryMin: initialData.salaryMin || '',
                salaryMax: initialData.salaryMax || ''
            });
            if (initialData.customFields && Array.isArray(initialData.customFields)) {
                setCustomFields(initialData.customFields);
            }
            if (initialData.publicFields && Array.isArray(initialData.publicFields)) {
                setPublicFields(new Set(initialData.publicFields));
            }
            if (initialData.workflow && Array.isArray(initialData.workflow)) {
                // Filter out 'Applied' and 'Finalized' as they are fixed start/end points
                const editable = initialData.workflow.filter(s => s !== 'Applied' && s !== 'Finalized' && s !== 'Rejected' && s !== 'Selected');
                if (editable.length > 0) setWorkflow(editable);
            }
        }
    }, [initialData]);

    const addCustomField = () => {
        setCustomFields([...customFields, { label: '', value: '', type: 'text', isPublic: true }]);
    };

    const removeCustomField = (index) => {
        const newFields = [...customFields];
        newFields.splice(index, 1);
        setCustomFields(newFields);
    };

    const updateCustomField = (index, field, val) => {
        const newFields = [...customFields];
        newFields[index][field] = val;
        setCustomFields(newFields);
    };

    const togglePublic = (key) => {
        const newSet = new Set(publicFields);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setPublicFields(newSet);
    };

    // Workflow Handlers
    const addStage = () => {
        setWorkflow([...workflow, 'New Round']);
    };

    const updateStage = (index, val) => {
        const newWorkflow = [...workflow];
        newWorkflow[index] = val;
        setWorkflow(newWorkflow);
    };

    const removeStage = (index) => {
        const newWorkflow = [...workflow];
        newWorkflow.splice(index, 1);
        setWorkflow(newWorkflow);
    };

    async function submit(e) {
        e.preventDefault();

        if (step === 1) {
            // Basic validation for Step 1
            if (!formData.jobTitle || !formData.department || !formData.vacancy) {
                alert('Please fill in Job Title, Department and Vacancy');
                return;
            }
            setStep(2);
            return;
        }

        setSaving(true);

        // Filter out empty custom fields
        const validCustomFields = customFields.filter(f => f.label.trim() !== '' && f.value.trim() !== '');

        // Construct simplified workflow to save
        const fullWorkflow = ['Applied', ...workflow.filter(w => w.trim() !== ''), 'Finalized'];

        // Convert Set to Array for storage
        const payload = {
            ...formData,
            customFields: validCustomFields,
            publicFields: Array.from(publicFields),
            workflow: fullWorkflow
        };

        try {
            if (isEdit) {
                await api.put(`/requirements/${initialData._id}`, payload);
            } else {
                const res = await api.post('/requirements/create', payload);
                if (res.data && res.data.jobOpeningId) {
                    alert(`Job created successfully\nJob ID: ${res.data.jobOpeningId}`);
                } else {
                    alert('Job created successfully');
                }
            }
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Failed to save';
            alert(`Failed: ${msg}`);
        } finally {
            setSaving(false);
        }
    }

    // Helper for label with visibility toggle
    const LabelWithToggle = ({ label, fieldKey, required, id }) => (
        <div className="flex justify-between items-center mb-1">
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 cursor-pointer">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <button
                type="button"
                onClick={() => togglePublic(fieldKey)}
                className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded border transition ${publicFields.has(fieldKey) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                title={publicFields.has(fieldKey) ? "Visible on Public Page" : "Hidden from Public Page"}
            >
                {publicFields.has(fieldKey) ? (
                    <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Public
                    </>
                ) : (
                    <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        Hidden
                    </>
                )}
            </button>
        </div>
    );

    // Handle Enter key in stage inputs
    const handleStageKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            addStage(); // Add new stage instead
        }
    };

    const FormContent = (
        <form onSubmit={submit} className={isModal ? "p-6 overflow-y-auto" : "bg-white p-6 rounded-lg shadow-sm border border-slate-200"}>
            {!isModal && (
                <div className="mb-6 border-b border-slate-100 pb-4">
                    <div className='flex justify-between items-center'>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">
                                {isEdit ? 'Edit Requirement' : 'New Job Requirement'}
                                {initialData?.jobOpeningId && <span className="ml-3 text-sm font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 select-all cursor-pointer" title="Click to copy" onClick={() => navigator.clipboard.writeText(initialData.jobOpeningId)}>{initialData.jobOpeningId}</span>}
                            </h2>
                            <p className="text-slate-500 mt-1">
                                {step === 1 ? 'Step 1: Job Details' : 'Step 2: Hiring Process'}
                            </p>
                        </div>
                        {/* Step Indicator */}
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
                            <span className={`w-3 h-3 rounded-full ${step === 2 ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
                        </div>
                    </div>
                </div>
            )}

            {step === 1 ? (
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <LabelWithToggle label="Job Title" fieldKey="jobTitle" required id="jobTitle" />
                        <input
                            id="jobTitle"
                            required
                            autoFocus
                            value={formData.jobTitle}
                            onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            placeholder="e.g. Senior Developer"
                        />
                    </div>

                    <div>
                        <LabelWithToggle label="Department" fieldKey="department" required />
                        <select
                            required
                            value={formData.department}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="">Select Department</option>
                            <option value="HR">HR</option>
                            <option value="IT">IT</option>
                            <option value="Sales">Sales</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Finance">Finance</option>
                            <option value="Operations">Operations</option>
                        </select>
                    </div>

                    <div>
                        <LabelWithToggle label="Vacancy" fieldKey="vacancy" required />
                        <input
                            required
                            type="number"
                            min="1"
                            value={formData.vacancy}
                            onChange={e => setFormData({ ...formData, vacancy: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <LabelWithToggle label="Job Type" fieldKey="jobType" />
                        <select
                            value={formData.jobType}
                            onChange={e => setFormData({ ...formData, jobType: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="Full Time">Full Time</option>
                            <option value="Part Time">Part Time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                        </select>
                    </div>

                    <div>
                        <LabelWithToggle label="Work Mode" fieldKey="workMode" />
                        <select
                            value={formData.workMode}
                            onChange={e => setFormData({ ...formData, workMode: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="On-site">On-site</option>
                            <option value="Remote">Remote</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div>
                        <LabelWithToggle label="Experience (Months)" fieldKey="experience" />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Min"
                                value={formData.minExperienceMonths}
                                onChange={e => setFormData({ ...formData, minExperienceMonths: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="self-center text-slate-400">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={formData.maxExperienceMonths}
                                onChange={e => setFormData({ ...formData, maxExperienceMonths: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="">
                        <LabelWithToggle label="Priority" fieldKey="priority" />
                        <select
                            value={formData.priority}
                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>

                    <div className="col-span-2">
                        <LabelWithToggle label="Salary Range (Annual)" fieldKey="salary" />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Min Salary"
                                value={formData.salaryMin}
                                onChange={e => setFormData({ ...formData, salaryMin: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="self-center text-slate-400">-</span>
                            <input
                                type="number"
                                placeholder="Max Salary"
                                value={formData.salaryMax}
                                onChange={e => setFormData({ ...formData, salaryMax: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="col-span-2">
                        <LabelWithToggle label="Description" fieldKey="description" />
                        <textarea
                            rows="3"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Job details, key responsibilities, etc..."
                        />
                    </div>

                    <div className="col-span-2 mt-4 pt-4 border-t border-slate-100">
                        {/* Custom Fields Section */}
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-bold text-slate-700">Ad-hoc Details</label>
                            <button type="button" onClick={addCustomField} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                + Add Detail
                            </button>
                        </div>

                        <div className="space-y-2">
                            {customFields.map((field, index) => (
                                <div key={index} className="flex gap-2 items-start bg-slate-50 p-2 rounded border border-slate-100">
                                    {/* Public Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => updateCustomField(index, 'isPublic', !field.isPublic)}
                                        className={`mt-1 p-1.5 rounded border transition ${field.isPublic ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-400 border-slate-200'}`}
                                        title={field.isPublic ? "Visible Publicly" : "Hidden Publicly"}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {field.isPublic ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            )}
                                        </svg>
                                    </button>

                                    {/* Type Selector */}
                                    <div className="w-28">
                                        <select
                                            value={field.type || 'text'}
                                            onChange={(e) => updateCustomField(index, 'type', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="date">Date</option>
                                            <option value="textarea">Long Text</option>
                                            <option value="dropdown">Dropdown</option>
                                        </select>
                                    </div>

                                    {/* Label Input */}
                                    <div className="w-32">
                                        <input
                                            type="text"
                                            placeholder="Label"
                                            list="adhoc-suggestions"
                                            value={field.label}
                                            onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <datalist id="adhoc-suggestions">
                                        <option value="Shift Timing" />
                                        <option value="Notice Period" />
                                        <option value="Gender Preference" />
                                        <option value="Languages Required" />
                                        <option value="Qualification" />
                                        <option value="HR Contact Number" />
                                        <option value="Certifications" />
                                        <option value="Bond Period" />
                                        <option value="Benefits" />
                                    </datalist>

                                    {/* Dynamic Value Input */}
                                    <div className="flex-1">
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                rows="1"
                                                placeholder="Value"
                                                value={field.value}
                                                onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                            />
                                        ) : field.type === 'dropdown' ? (
                                            <input
                                                type="text"
                                                placeholder="Options (comma separated, e.g. Yes, No)"
                                                value={field.value}
                                                onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 border-dashed bg-slate-50"
                                            />
                                        ) : (
                                            <input
                                                type={field.type || 'text'}
                                                placeholder="Value"
                                                value={field.value}
                                                onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        )}
                                    </div>

                                    {/* Delete Button */}
                                    <button type="button" onClick={() => removeCustomField(index)} className="mt-1 text-red-400 hover:text-red-600 p-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                            {customFields.length === 0 && (
                                <div className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 rounded border border-dashed border-slate-200">
                                    No custom fields.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Hiring Process Configurator */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Hiring Stages</h3>
                                <p className="text-sm text-slate-500">Define the interview and selection rounds.</p>
                            </div>
                            <button type="button" onClick={addStage} className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100 font-medium flex items-center gap-1">
                                + Add Stage
                            </button>
                        </div>
                        <div className="space-y-3">
                            {/* Fixed Start */}
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm opacity-90">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold border border-green-200">S</span>
                                <div className="flex-1 font-semibold text-green-900">Applied</div>
                            </div>

                            {/* Dynamic Middle Stages */}
                            {workflow.map((stage, index) => (
                                <div key={index} className="flex gap-3 items-center p-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-blue-400 transition-colors group">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold border border-slate-200">{index + 1}</span>
                                    <input
                                        type="text"
                                        value={stage}
                                        onKeyDown={(e) => handleStageKeyDown(e, index)}
                                        autoFocus={stage === 'New Round'}
                                        onChange={(e) => updateStage(index, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Stage Name (e.g. Technical Round)"
                                    />
                                    <button type="button" onClick={() => removeStage(index)} className="text-slate-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove Stage">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}

                            {/* Fixed End */}
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm opacity-90">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-500 font-bold border border-slate-300">E</span>
                                <div className="flex-1 font-semibold text-slate-700">Finalized (Selected / Rejected)</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between gap-3 pt-6 mt-6 border-t border-slate-100">
                <button
                    type="button"
                    onClick={() => {
                        if (step === 2) setStep(1);
                        else onClose(); // Close if cancelling on step 1
                    }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200"
                >
                    {step === 1 ? 'Cancel' : 'Back'}
                </button>

                {step === 1 ? (
                    <button
                        type="button"
                        onClick={() => {
                            // Basic validation for Step 1
                            if (!formData.jobTitle || !formData.department || !formData.vacancy) {
                                alert('Please fill in Job Title, Department and Vacancy');
                                return;
                            }
                            setStep(2);
                        }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2"
                    >
                        Next Channel
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={saving || !canSave}
                        className={`px-6 py-2 rounded-lg shadow-md flex items-center gap-2 ${saving || !canSave ? 'bg-green-400 cursor-not-allowed text-slate-100' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Save & Configure
                            </>
                        )}
                    </button>
                )}
            </div>
        </form>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {isEdit ? 'Edit Requirement' : 'New Job Requirement'}
                                {initialData?.jobOpeningId && <span className="ml-3 text-sm font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 select-all cursor-pointer" title="Click to copy" onClick={() => navigator.clipboard.writeText(initialData.jobOpeningId)}>{initialData.jobOpeningId}</span>}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {step === 1 ? 'Step 1: Job Details' : 'Step 2: Hiring Process'}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    {FormContent}
                </div>
            </div>
        );
    }

    return FormContent;
}
