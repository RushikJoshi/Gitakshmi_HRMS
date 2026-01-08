import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

const PayrollRules = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rules, setRules] = useState({
        basicSalary: { percentageOfCTC: 40, enabled: true },
        hra: { percentageOfBasic: 40, enabled: true },
        conveyance: { type: 'FIXED', value: 1600, enabled: true },
        medical: { type: 'FIXED', value: 1250, enabled: true },
        pf: { enabled: true, employeeRate: 12, employerRate: 12, wageCeiling: 15000, capContribution: true },
        esic: { enabled: true, employeeRate: 0.75, employerRate: 3.25, wageCeiling: 21000 },
        professionalTax: { enabled: true, defaultAmount: 200 }
    });
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const res = await api.get('/payroll-rules/rules');
            if (res.data) setRules(res.data);
        } catch (error) {
            console.error("Failed to fetch rules", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (section, field, value) => {
        setRules(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.put('/payroll-rules/rules', rules);
            setMessage({ type: 'success', text: 'Payroll rules updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update rules' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Configuration...</div>;

    const Section = ({ title, children, enabled, onToggle }) => (
        <div className={`bg-white rounded-lg shadow-sm border p-6 mb-6 ${!enabled ? 'opacity-70' : ''}`}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{enabled ? 'Enabled' : 'Disabled'}</span>
                    <button
                        onClick={onToggle}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${enabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
            </div>
            <div className={!enabled ? 'pointer-events-none grayscale' : ''}>
                {children}
            </div>
        </div>
    );

    const InputGroup = ({ label, value, onChange, suffix, type = "number", step = "0.01" }) => (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-600">{label}</label>
            <div className="flex rounded-md shadow-sm">
                <input
                    type={type}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {suffix && (
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payroll Rule Configuration</h1>
                    <p className="text-gray-500 mt-1">Configure global salary calculation rules for your company.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : <><Save size={18} className="mr-2" /> Save Changes</>}
                </button>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-md flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle className="mr-2" size={20} /> : <AlertCircle className="mr-2" size={20} />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Basic Salary */}
                <Section
                    title="Basic Salary Rules"
                    enabled={rules.basicSalary.enabled}
                    onToggle={() => handleChange('basicSalary', 'enabled', !rules.basicSalary.enabled)}
                >
                    <InputGroup
                        label="Basic Salary Percentage"
                        value={rules.basicSalary.percentageOfCTC}
                        onChange={(val) => handleChange('basicSalary', 'percentageOfCTC', val)}
                        suffix="% of CTC"
                    />
                    <p className="text-xs text-gray-500 mt-2">Typically 40-50% of CTC.</p>
                </Section>

                {/* 2. HRA Rules */}
                <Section
                    title="House Rent Allowance (HRA)"
                    enabled={rules.hra.enabled}
                    onToggle={() => handleChange('hra', 'enabled', !rules.hra.enabled)}
                >
                    <InputGroup
                        label="HRA Percentage"
                        value={rules.hra.percentageOfBasic}
                        onChange={(val) => handleChange('hra', 'percentageOfBasic', val)}
                        suffix="% of Basic"
                    />
                    <p className="text-xs text-gray-500 mt-2">Typically 40% (Non-Metro) or 50% (Metro).</p>
                </Section>

                {/* 3. PF Rules */}
                <Section
                    title="Provident Fund (PF)"
                    enabled={rules.pf.enabled}
                    onToggle={() => handleChange('pf', 'enabled', !rules.pf.enabled)}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup
                            label="Employee Contribution"
                            value={rules.pf.employeeRate}
                            onChange={(val) => handleChange('pf', 'employeeRate', val)}
                            suffix="%"
                        />
                        <InputGroup
                            label="Employer Contribution"
                            value={rules.pf.employerRate}
                            onChange={(val) => handleChange('pf', 'employerRate', val)}
                            suffix="%"
                        />
                        <InputGroup
                            label="Wage Ceiling (Cap)"
                            value={rules.pf.wageCeiling}
                            onChange={(val) => handleChange('pf', 'wageCeiling', val)}
                            suffix="INR"
                        />
                        <div className="flex items-center h-full pt-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rules.pf.capContribution}
                                    onChange={(e) => handleChange('pf', 'capContribution', e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                <span className="text-sm text-gray-700">Cap Calculation at Ceiling</span>
                            </label>
                        </div>
                    </div>
                </Section>

                {/* 4. ESIC Rules */}
                <Section
                    title="ESIC Scheme"
                    enabled={rules.esic.enabled}
                    onToggle={() => handleChange('esic', 'enabled', !rules.esic.enabled)}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup
                            label="Employee Contribution"
                            value={rules.esic.employeeRate}
                            onChange={(val) => handleChange('esic', 'employeeRate', val)}
                            suffix="%"
                        />
                        <InputGroup
                            label="Employer Contribution"
                            value={rules.esic.employerRate}
                            onChange={(val) => handleChange('esic', 'employerRate', val)}
                            suffix="%"
                        />
                        <InputGroup
                            label="Gross Salary Ceiling"
                            value={rules.esic.wageCeiling}
                            onChange={(val) => handleChange('esic', 'wageCeiling', val)}
                            suffix="INR"
                        />
                        <div className="flex items-center h-full pt-6 text-xs text-gray-500">
                            Applicable if Gross ≤ Ceiling
                        </div>
                    </div>
                </Section>

                {/* 5. Fixed Allowances */}
                <Section
                    title="Fixed / Percentage Allowances"
                    enabled={true}
                    onToggle={() => { }}
                >
                    <div className="space-y-4">
                        {['conveyance', 'medical'].map(key => (
                            <div key={key}>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">{key} Allowance</h4>
                                <div className="flex items-start space-x-2">
                                    <div className="w-1/3">
                                        <label className="text-sm font-medium text-gray-600 mb-1 block">Type</label>
                                        <select
                                            value={rules[key].type || 'FIXED'}
                                            onChange={(e) => handleChange(key, 'type', e.target.value)}
                                            className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        >
                                            <option value="FIXED">Fixed Amount</option>
                                            <option value="PERCENTAGE">% of Basic</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <InputGroup
                                            label={rules[key].type === 'PERCENTAGE' ? "Percentage" : "Monthly Amount"}
                                            value={rules[key].value}
                                            onChange={(val) => handleChange(key, 'value', val)}
                                            suffix={rules[key].type === 'PERCENTAGE' ? "%" : "INR"}
                                        />
                                    </div>
                                    <div className="flex items-center pt-8">
                                        <input
                                            type="checkbox"
                                            checked={rules[key].enabled}
                                            onChange={(e) => handleChange(key, 'enabled', e.target.checked)}
                                            className="rounded text-blue-600 h-4 w-4 mr-2"
                                        /> <span className="text-sm">Active</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 6. Professional Tax */}
                <Section
                    title="Professional Tax (PT)"
                    enabled={rules.professionalTax.enabled}
                    onToggle={() => handleChange('professionalTax', 'enabled', !rules.professionalTax.enabled)}
                >
                    <InputGroup
                        label="Default Monthly Deduction"
                        value={rules.professionalTax.defaultAmount}
                        onChange={(val) => handleChange('professionalTax', 'defaultAmount', val)}
                        suffix="INR"
                    />
                </Section>
            </div>
        </div>
    );
};

export default PayrollRules;
