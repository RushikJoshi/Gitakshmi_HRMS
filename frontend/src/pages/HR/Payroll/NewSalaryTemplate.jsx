import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Save, Loader2 } from 'lucide-react';
import api from '../../../utils/api';

export default function NewSalaryTemplate() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        annualCTC: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setError(null); // Clear error on change
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!form.name.trim()) {
            setError('Template name is required');
            return;
        }
        if (!form.annualCTC || Number(form.annualCTC) <= 0) {
            setError('Valid Annual CTC is required');
            return;
        }

        try {
            setLoading(true);

            // Prepare payload - Backend requires earnings array with at least Basic component
            // For now, we'll create a default structure with Basic = 50% of CTC
            // The backend will recalculate and add Fixed Allowance automatically
            const annualCTC = Number(form.annualCTC);
            const basicPercentage = 50; // Default: 50% of CTC as Basic

            const payload = {
                templateName: form.name.trim(),
                description: form.description.trim() || '',
                annualCTC: annualCTC,
                earnings: [
                    {
                        name: 'Basic',
                        calculationType: 'PERCENT_CTC',
                        percentage: basicPercentage
                    }
                ],
                employeeDeductions: [],
                settings: {
                    pfWageRestriction: true,
                    pfWageLimit: 15000,
                    includeESI: true
                }
            };

            const response = await api.post('/payroll/salary-templates', payload);
            
            if (response.data.success) {
                // Navigate back to salary templates list
                navigate('/hr/payroll/salary-components');
            } else {
                setError(response.data.error || 'Failed to create template');
            }
        } catch (err) {
            console.error('Create template error:', err);
            setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create template. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-xl font-bold text-slate-900">
                                New Salary Template
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                        <h2 className="text-lg font-semibold text-slate-800">Template Details</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Template Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. Senior Developer Structure"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Brief description of this template"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Annual CTC <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="annualCTC"
                                    value={form.annualCTC}
                                    onChange={handleChange}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="0.00"
                                    min="0"
                                    step="1"
                                    required
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Note: A default Basic salary (50% of CTC) will be created. You can edit the structure later.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 border border-transparent transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                            Save Template
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
