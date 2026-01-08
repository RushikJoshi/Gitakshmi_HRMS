import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    TrendingDown,
    ShieldCheck,
    Calculator,
    Save,
    ArrowLeft,
    Download,
    Check,
    X,
    AlertCircle,
    Info,
    Settings,
    FileText,
    IndianRupee,
    Upload,
    Sparkles,
    Wand2
} from 'lucide-react';
import api from '../../utils/api';

export default function SalaryStructure() {
    const { candidateId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // State for data
    const [candidate, setCandidate] = useState(null);
    const [config, setConfig] = useState({ earnings: [], deductions: [], benefits: [] });
    // values stores: { [compId]: { amount: 0, isSelected: true, name, type } }
    const [values, setValues] = useState({});

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [ctcInput, setCtcInput] = useState("");
    const [calculationMode, setCalculationMode] = useState("AUTO");
    const [showSelectionModal, setShowSelectionModal] = useState(false);

    // Initial load
    useEffect(() => {
        if (candidateId) {
            fetchData();
        }
    }, [candidateId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch Candidate & Global Components
            const [candRes, earningsRes, deductionsRes, benefitsRes, structRes] = await Promise.all([
                api.get(`/requirements/applicants/${candidateId}`),
                api.get('/payroll/earnings'),
                api.get('/deductions'),
                api.get('/payroll/benefits').catch(() => ({ data: { data: [] } })),
                api.get(`/salary-structure/${candidateId}`).catch(() => ({ data: null }))
            ]);

            const candidateData = candRes.data.data || candRes.data;
            const rawEarnings = earningsRes.data.data || earningsRes.data || [];
            const rawDeductions = deductionsRes.data.data || deductionsRes.data || [];
            const rawBenefits = benefitsRes.data.data || benefitsRes.data || [];
            const existingStruct = structRes.data;

            setCandidate(candidateData);
            setCtcInput(existingStruct?.annual?.ctc?.toString() || candidateData?.salarySnapshot?.ctcYearly?.toString() || "");

            // 2. Build configuration
            const earningsList = rawEarnings.filter(i => i.isActive !== false);
            const deductionsList = rawDeductions.filter(i => i.isActive !== false);
            const benefitsList = rawBenefits.filter(i => i.isActive !== false && i.partOfSalaryStructure !== false);

            setConfig({ earnings: earningsList, deductions: deductionsList, benefits: benefitsList });

            // 3. Normalize values from single source of truth (SalaryStructure collection)
            const initialValues = {};

            const mapSet = (list, type, savedList = []) => {
                list.forEach(comp => {
                    const saved = savedList.find(s => (s.key === comp._id || s.componentId === comp._id) || (s.label === comp.name || s.name === comp.name));

                    // Pull default value from master if not saved
                    const defaultAmount = type === 'earning' ? 0 : (comp.amountValue || comp.value || 0);

                    initialValues[comp._id] = {
                        amount: saved ? (saved.monthly ?? saved.amount ?? 0) : defaultAmount,
                        isSelected: saved ? (saved.isSelected ?? true) : (
                            (type === 'earning' && ['basic', 'hra', 'medical', 'conveyance', 'education', 'special', 'other'].some(p => comp.name.toLowerCase().includes(p))) ||
                            (type === 'deduction' && ['pf', 'pt', 'tax', 'provident'].some(p => comp.name.toLowerCase().includes(p))) ||
                            (type === 'employer_contribution' && ['pf', 'provident', 'gratuity', 'insurance'].some(p => comp.name.toLowerCase().includes(p)))
                        ),
                        name: comp.name,
                        type: type,
                        showInJoiningLetter: saved ? (saved.showInJoiningLetter ?? true) : true
                    };
                });
            };

            mapSet(earningsList, 'earning', existingStruct?.earnings || []);
            mapSet(deductionsList, 'deduction', existingStruct?.deductions || []);
            mapSet(benefitsList, 'employer_contribution', existingStruct?.employerBenefits || existingStruct?.employerContributions || []);

            setValues(initialValues);
            if (existingStruct?.totals?.annualCTC) {
                setCtcInput(existingStruct.totals.annualCTC.toString());
            }
            if (existingStruct?.calculationMode) {
                setCalculationMode(existingStruct.calculationMode);
            }

            if (!existingStruct) {
                setShowSelectionModal(true);
            }

        } catch (err) {
            console.error("Fetch Error:", err);
            setError("Failed to initialize salary configurator.");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return Math.round(Number(val) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    // --- LIVE RECALCULATION ENGINE ---
    const totals = useMemo(() => {
        const enteredCTC = parseFloat(ctcInput) || 0;
        let grossEarningsMonthly = 0;
        let employeeDeductionsMonthly = 0;
        let employerContributionsMonthly = 0;

        Object.values(values).forEach(val => {
            if (!val.isSelected) return;
            const amt = parseFloat(val.amount) || 0;
            if (val.type === 'earning') grossEarningsMonthly += amt;
            else if (val.type === 'deduction') employeeDeductionsMonthly += amt;
            else if (val.type === 'employer_contribution') employerContributionsMonthly += amt;
        });

        const calculatedAnnualCTC = Math.round((grossEarningsMonthly + employerContributionsMonthly) * 12);
        const netSalaryMonthly = Math.round(grossEarningsMonthly - employeeDeductionsMonthly);
        const isMismatch = Math.abs(calculatedAnnualCTC - enteredCTC) > 12; // Allow slight rounding drift
        const mismatchAmt = Math.round(calculatedAnnualCTC - enteredCTC);

        return {
            grossMonthly: Math.round(grossEarningsMonthly),
            grossYearly: Math.round(grossEarningsMonthly * 12),
            deductionsMonthly: Math.round(employeeDeductionsMonthly),
            deductionsYearly: Math.round(employeeDeductionsMonthly * 12),
            employerMonthly: Math.round(employerContributionsMonthly),
            employerYearly: Math.round(employerContributionsMonthly * 12),
            netMonthly: netSalaryMonthly,
            netYearly: Math.round(netSalaryMonthly * 12),
            ctcMonthly: Math.round(calculatedAnnualCTC / 12),
            ctcYearly: calculatedAnnualCTC,
            isMismatch,
            mismatchAmount: mismatchAmt,
            isBalancePositive: mismatchAmt < 0
        };
    }, [values, ctcInput]);

    const balanceValues = (currentValues, currentCtc) => {
        if (calculationMode !== 'AUTO') return currentValues;

        const targetMonthly = (parseFloat(currentCtc) || 0) / 12;
        let sumOthers = 0;
        let specialId = null;

        // Find special allowance and sum everything else that affects CTC
        Object.entries(currentValues).forEach(([id, val]) => {
            if (!val.isSelected) return;
            const isSpecial = val.name.toLowerCase().includes('special') || val.name.toLowerCase().includes('other');
            if (isSpecial) {
                specialId = id;
            } else {
                if (val.type === 'earning' || val.type === 'employer_contribution') {
                    sumOthers += (parseFloat(val.amount) || 0);
                }
            }
        });

        if (specialId) {
            const newBalance = Math.max(0, Math.round(targetMonthly - sumOthers));
            return {
                ...currentValues,
                [specialId]: { ...currentValues[specialId], amount: newBalance, isSelected: true }
            };
        }
        return currentValues;
    };

    const handleInputChange = (id, value) => {
        const numVal = Math.round(parseFloat(value) || 0);
        setValues(prev => {
            const next = { ...prev, [id]: { ...prev[id], amount: numVal } };
            // If we didn't touch special allowance, auto-balance it
            const isSpecial = prev[id].name.toLowerCase().includes('special') || prev[id].name.toLowerCase().includes('other');
            if (!isSpecial) {
                return balanceValues(next, ctcInput);
            }
            return next;
        });
    };

    const toggleSelection = (id) => {
        setValues(prev => {
            const next = { ...prev, [id]: { ...prev[id], isSelected: !prev[id].isSelected } };
            return balanceValues(next, ctcInput);
        });
    };

    const handleCtcChange = (value) => {
        setCtcInput(value);
        setValues(prev => balanceValues(prev, value));
    };

    const handleBalanceDifference = () => {
        const targetMonthly = (parseFloat(ctcInput) || 0) / 12;
        let sumOthers = 0;
        let specialId = null;

        Object.entries(values).forEach(([id, val]) => {
            if (!val.isSelected) return;
            const isSpecial = val.name.toLowerCase().includes('special') || val.name.toLowerCase().includes('other');
            if (isSpecial) {
                specialId = id;
            } else {
                if (val.type === 'earning' || val.type === 'employer_contribution') {
                    sumOthers += (parseFloat(val.amount) || 0);
                }
            }
        });

        if (specialId) {
            setValues(prev => ({
                ...prev,
                [specialId]: {
                    ...prev[specialId],
                    amount: Math.max(0, Math.round(targetMonthly - sumOthers)),
                    isSelected: true
                }
            }));
        } else {
            alert("Error: Special Allowance is not selected. Please select it from the 'Components' list first to auto-balance.");
        }
    };

    const handleAutoFill = async () => {
        if (!ctcInput || isNaN(parseFloat(ctcInput))) {
            alert("Please enter a valid Target CTC first.");
            return;
        }

        try {
            setLoading(true);
            const res = await api.post('/salary-structure/suggest', { enteredCTC: Number(ctcInput) });
            const suggestion = res.data.data;

            setValues(prev => {
                const next = { ...prev };

                // Reset everything first
                Object.keys(next).forEach(id => {
                    next[id].isSelected = false;
                    next[id].amount = 0;
                });

                // Helper to match by ID or Name (fuzzy)
                const applySuggestion = (sList) => {
                    sList.forEach(s => {
                        // Priority 1: Match by ID
                        // Priority 2: Match by exact Name
                        // Priority 3: Match by lowercase Name
                        const matchId = Object.keys(next).find(id => id === s.componentId) ||
                            Object.keys(next).find(id => next[id].name.toLowerCase() === s.name.toLowerCase()) ||
                            Object.keys(next).find(id => s.name.toLowerCase().includes(next[id].name.toLowerCase()) || next[id].name.toLowerCase().includes(s.name.toLowerCase()));

                        if (matchId) {
                            next[matchId] = {
                                ...next[matchId],
                                amount: Math.round(Number(s.amount) || 0),
                                isSelected: true
                            };
                        }
                    });
                };

                applySuggestion(suggestion.earnings);
                applySuggestion(suggestion.deductions);
                applySuggestion(suggestion.employerContributions);

                // Use the precise CTC input value
                const finalCtc = parseFloat(ctcInput) || 0;
                return balanceValues(next, finalCtc);
            });
        } catch (err) {
            console.error("Autofill error:", err);
            alert("Suggestion failed: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };


    const handleSave = async () => {
        if (calculationMode === 'AUTO' && totals.isMismatch) {
            alert(`CTC Mismatch! Calculated: ₹${totals.ctcYearly.toLocaleString()}, Entered: ₹${(parseFloat(ctcInput) || 0).toLocaleString()}. Please adjust components to match.`);
            return;
        }

        try {
            setSaving(true);

            // Filter only selected for persistence as per requirement 5
            const payload = {
                candidateId,
                calculationMode,
                enteredCTC: parseFloat(ctcInput),
                earnings: Object.entries(values)
                    .filter(([id, v]) => v.isSelected)
                    .filter(([id, v]) => v.type === 'earning')
                    .map(([id, v]) => ({ componentId: id, name: v.name, amount: v.amount, isSelected: true })),
                deductions: Object.entries(values)
                    .filter(([id, v]) => v.isSelected)
                    .filter(([id, v]) => v.type === 'deduction')
                    .map(([id, v]) => ({ componentId: id, name: v.name, amount: v.amount, isSelected: true })),
                employerContributions: Object.entries(values)
                    .filter(([id, v]) => v.isSelected)
                    .filter(([id, v]) => v.type === 'employer_contribution')
                    .map(([id, v]) => ({ componentId: id, name: v.name, amount: v.amount, isSelected: true }))
            };

            await api.post('/salary-structure/create', payload);
            alert("✅ Salary Structure saved successfully. You can now generate the joining letter.");
            fetchData();
        } catch (err) {
            console.error("Save failed:", err);
            alert("Error saving: " + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center"><div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>Fetching candidate data...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/hr/applicants')} className="p-2 hover:bg-white rounded-full transition shadow-sm border">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Salary Configuration</h1>
                        <p className="text-gray-500 font-medium">{candidate?.name} • {candidate?.requirementId?.jobTitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white border rounded-xl p-1 shadow-sm flex items-center gap-1">
                        <button
                            onClick={() => setCalculationMode('AUTO')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${calculationMode === 'AUTO' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            AUTO
                        </button>
                        <button
                            onClick={() => setCalculationMode('MANUAL')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${calculationMode === 'MANUAL' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            MANUAL
                        </button>
                    </div>

                    <div className="bg-white border rounded-xl p-1 shadow-sm flex items-center">
                        <div className="px-3 py-1 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-400 uppercase mr-2 flex items-center gap-1">
                            <IndianRupee size={12} /> Target CTC
                        </div>
                        <input
                            type="number"
                            className="w-32 outline-none p-2 font-bold text-gray-800"
                            value={ctcInput}
                            onChange={(e) => handleCtcChange(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={handleAutoFill}
                        type="button"
                        className="px-4 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all font-bold text-sm flex items-center gap-2 shadow-sm"
                    >
                        <Calculator size={18} className="text-indigo-500" /> Autofill
                    </button>

                    <button
                        onClick={() => setShowSelectionModal(true)}
                        className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm flex items-center gap-2 shadow-sm"
                    >
                        <Settings size={18} className="text-gray-400" /> Components
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg font-bold"
                    >
                        {saving ? "Saving..." : <><Save size={20} /> Save Structure</>}
                    </button>
                </div>
            </div>

            {totals.isMismatch && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-amber-500" size={24} />
                        <div>
                            <p className="font-bold text-amber-900 text-sm">CTC Mismatch Detected</p>
                            <p className="text-xs text-amber-700">
                                The sum of components (₹{formatCurrency(totals.ctcYearly)}) does not match Target CTC (₹{formatCurrency(parseFloat(ctcInput) || 0)})
                            </p>
                            <button
                                onClick={handleBalanceDifference}
                                className="mt-2 text-[10px] font-black uppercase text-amber-600 flex items-center gap-1.5 hover:text-amber-700 transition"
                            >
                                <Wand2 size={12} /> Auto-balance into Special Allowance
                            </button>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Difference</p>
                        <p className="text-xl font-black text-amber-900">₹{formatCurrency(totals.mismatchAmount)}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CONFIGURATION AREA */}
                <div className="lg:col-span-2 space-y-6">
                    {/* EARNINGS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-white border-b border-green-100 flex justify-between items-center">
                            <h3 className="font-bold text-green-800 flex items-center gap-2"><TrendingUp size={18} /> Monthly Earnings</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {config.earnings.filter(c => values[c._id]?.isSelected).map(comp => (
                                <div key={comp._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800">{comp.name}</span>
                                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Monthly Amount</span>
                                    </div>
                                    <input
                                        type="number"
                                        className="w-40 bg-white border border-gray-200 rounded-lg p-2 font-mono font-bold text-right focus:border-blue-500 outline-none"
                                        value={values[comp._id]?.amount}
                                        onChange={(e) => handleInputChange(comp._id, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DEDUCTIONS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white border-b border-red-100 flex justify-between items-center">
                            <h3 className="font-bold text-red-800 flex items-center gap-2"><TrendingDown size={18} /> Employee Deductions</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {config.deductions.filter(c => values[c._id]?.isSelected).map(comp => (
                                <div key={comp._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800">{comp.name}</span>
                                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Monthly Deduction</span>
                                    </div>
                                    <input
                                        type="number"
                                        className="w-40 bg-white border border-gray-200 rounded-lg p-2 font-mono font-bold text-right"
                                        value={values[comp._id]?.amount}
                                        onChange={(e) => handleInputChange(comp._id, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* EMPLOYER CONTRIBUTIONS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
                            <h3 className="font-bold text-blue-800 flex items-center gap-2"><ShieldCheck size={18} /> Employer Benefits</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {config.benefits.filter(c => values[c._id]?.isSelected).map(comp => (
                                <div key={comp._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800">{comp.name}</span>
                                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Monthly Benefit</span>
                                    </div>
                                    <input
                                        type="number"
                                        className="w-40 bg-white border border-gray-200 rounded-lg p-2 font-mono font-bold text-right"
                                        value={values[comp._id]?.amount}
                                        onChange={(e) => handleInputChange(comp._id, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center pt-6 pb-12">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-3 px-12 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl font-black text-lg"
                            >
                                {saving ? "Saving..." : <><Save size={24} /> Save Configuration</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* SNAPSHOT SIDEBAR */}
                <div className="space-y-6">
                    <div className="bg-[#0f172a] text-white p-8 rounded-3xl shadow-xl space-y-8 sticky top-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="font-bold uppercase tracking-widest text-xs text-blue-400">Salary Summary</h3>
                            <Calculator size={20} className="text-blue-400" />
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Net Take-Home</p>
                                    <p className="text-4xl font-black text-white">₹{formatCurrency(totals.netMonthly)}</p>
                                </div>
                                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-1 rounded uppercase">Monthly</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Gross Earnings</p>
                                    <p className="font-bold text-lg">₹{formatCurrency(totals.grossMonthly)}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Deductions</p>
                                    <p className="font-bold text-lg text-red-400">₹{formatCurrency(totals.deductionsMonthly)}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl shadow-lg border border-white/20">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] uppercase font-bold text-blue-100 tracking-widest">Projected Annual CTC</p>
                                    <Check size={16} className="text-blue-200" />
                                </div>
                                <p className="text-3xl font-black">₹{formatCurrency(totals.ctcYearly)}</p>
                                <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white transition-all duration-500" style={{ width: `${Math.min(100, (totals.ctcYearly / (parseFloat(ctcInput) || 1)) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between text-sm py-2 border-b border-white/5">
                            <span className="text-gray-400">Monthly Benefits</span>
                            <span className="font-mono text-blue-300">+ ₹{formatCurrency(totals.employerMonthly)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 italic mb-4">Annualized CTC = (Sum of Earnings + Employer Contrib) × 12</p>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all disabled:opacity-50 shadow-xl shadow-blue-900/20 font-black text-sm uppercase tracking-widest"
                        >
                            {saving ? "Saving..." : <><Save size={20} /> Save Structure</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* SELECTION MODAL */}
            {showSelectionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                        <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800">Select Components</h2>
                                <p className="text-sm text-gray-500 font-medium">Choose which earnings and deductions apply to this candidate</p>
                            </div>
                            <button onClick={() => setShowSelectionModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { title: 'Earnings', data: config.earnings, color: 'green' },
                                { title: 'Deductions', data: config.deductions, color: 'red' },
                                { title: 'Employer Benefits', data: config.benefits, color: 'blue' }
                            ].map(section => (
                                <div key={section.title}>
                                    <h3 className={`font-black text-${section.color}-700 border-b pb-3 mb-4 uppercase tracking-tighter flex items-center gap-2`}>
                                        <div className={`w-2 h-2 rounded-full bg-${section.color}-500`}></div> {section.title}
                                    </h3>
                                    <div className="space-y-2">
                                        {section.data.map(comp => (
                                            <label key={comp._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${values[comp._id]?.isSelected ? `bg-${section.color}-50 border-${section.color}-200` : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={values[comp._id]?.isSelected}
                                                    onChange={() => toggleSelection(comp._id)}
                                                    className={`w-5 h-5 text-${section.color}-600 rounded border-gray-300 focus:ring-${section.color}-500`}
                                                />
                                                <span className={`text-sm font-bold ${values[comp._id]?.isSelected ? `text-${section.color}-900` : 'text-gray-600 group-hover:text-gray-900'}`}>{comp.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-8 py-6 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setShowSelectionModal(false)}
                                className="px-10 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-black shadow-lg shadow-blue-200"
                            >
                                Apply Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
