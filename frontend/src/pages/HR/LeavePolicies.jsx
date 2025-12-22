import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2, Save, X, Check, AlertTriangle } from 'lucide-react';

export default function LeavePolicies() {
    const [policies, setPolicies] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Edit mode
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        name: '',
        applicableTo: 'All', // All, Department, Role, Specific
        specificEmployeeId: '',
        roles: [],
        departmentIds: [],
        rules: []
    });

    const [ruleForm, setRuleForm] = useState({
        leaveType: '',
        totalPerYear: 0,
        monthlyAccrual: false,
        carryForwardAllowed: false,
        maxCarryForward: 0,
        requiresApproval: true,
        color: '#3b82f6'
    });

    useEffect(() => {
        fetchPolicies();
        fetchEmployees();
    }, []);

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const res = await api.get('/hr/leave-policies');
            setPolicies(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/hr/employees');
            if (res.data.success && Array.isArray(res.data.data)) {
                setEmployees(res.data.data);
            } else if (Array.isArray(res.data)) {
                setEmployees(res.data);
            } else {
                setEmployees([]);
            }
        } catch (err) {
            console.error("Failed to fetch employees", err);
        }
    };

    const handleEdit = (policy) => {
        setEditingId(policy._id);
        setForm({
            ...policy,
            specificEmployeeId: policy.specificEmployeeId || '',
        });
        setShowModal(true);
    };

    const handleCreateNew = () => {
        setEditingId(null);
        setForm({ name: '', applicableTo: 'All', specificEmployeeId: '', roles: [], departmentIds: [], rules: [] });
        setShowModal(true);
    };

    const addRule = () => {
        if (!ruleForm.leaveType) return alert("Leave Type required");
        setForm(prev => ({
            ...prev,
            rules: [...prev.rules, { ...ruleForm }]
        }));
        setRuleForm({
            leaveType: '',
            totalPerYear: 0,
            monthlyAccrual: false,
            carryForwardAllowed: false,
            maxCarryForward: 0,
            requiresApproval: true,
            color: '#3b82f6'
        });
    };

    const removeRule = (idx) => {
        setForm(prev => ({
            ...prev,
            rules: prev.rules.filter((_, i) => i !== idx)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update
                if (!confirm("Update this policy? Requires careful review.")) return;
                await api.put(`/hr/leave-policies/${editingId}`, form);
                alert("Policy updated successfully.");
            } else {
                // Create
                await api.post('/hr/leave-policies', form);
                alert("Policy created successfully.");
            }
            setShowModal(false);
            fetchPolicies();
        } catch (err) {
            console.error('Submit error:', err);
            const errorMsg = err.response?.data?.error || "Failed to save policy";
            alert(`Error: ${errorMsg}`);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this policy? This will remove policies from employees.")) return;
        try {
            await api.delete(`/hr/leave-policies/${id}`);
            fetchPolicies();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await api.patch(`/hr/leave-policies/${id}/status`, { isActive: !currentStatus });
            setPolicies(prev => prev.map(p => p._id === id ? { ...p, isActive: !currentStatus } : p));
        } catch (err) {
            alert("Failed to update status");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Leave Policies</h1>
                <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition">
                    <Plus size={18} /> New Policy
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500">Loading policies...</div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {policies.map(p => (
                        <div key={p._id} className={`bg-white rounded-xl shadow-sm border ${p.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-75'} relative overflow-hidden transition hover:shadow-md`}>
                            {/* Status Indicator Bar */}
                            <div className={`h-1.5 w-full ${p.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>

                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            {p.name}
                                            {!p.isActive && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Inactive</span>}
                                        </h3>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide mt-1 font-semibold">
                                            {p.applicableTo === 'Specific' ? 'Specific Employee' : `To: ${p.applicableTo}`}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {/* Status Toggle */}
                                        <button
                                            onClick={() => toggleStatus(p._id, p.isActive)}
                                            className={`p-1.5 rounded-md transition ${p.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                            title={p.isActive ? "Deactivate" : "Activate"}
                                        >
                                            <Check size={16} className={!p.isActive ? "opacity-50" : ""} />
                                        </button>

                                        <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(p._id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4">
                                    {p.rules.map((r, i) => (
                                        <div key={i} className="flex justify-between text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color || '#3b82f6' }}></div>
                                                <span className="font-bold text-slate-700 w-8">{r.leaveType}</span>
                                                <span className="text-xs text-slate-400">|</span>
                                                <span className="text-slate-600 font-medium">{r.totalPerYear} / yr</span>
                                            </div>
                                            <div className="flex gap-1">
                                                {r.monthlyAccrual && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Monthly</span>}
                                                {r.carryForwardAllowed && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">CF</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Leave Policy' : 'Create Leave Policy'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition"><X /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-8">
                            {/* Section 1: Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    1. Basic Configuration
                                </h3>
                                <div className="grid md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Policy Name</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" required
                                            placeholder="e.g. Standard Leave Policy"
                                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Applicable To</label>
                                        <select className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                                            value={form.applicableTo}
                                            onChange={e => {
                                                setForm({ ...form, applicableTo: e.target.value, specificEmployeeId: '', roles: [], departmentIds: [] });
                                            }}>
                                            <option value="All">All Employees</option>
                                            <option value="Role">By Role</option>
                                            <option value="Department">By Department</option>
                                            <option value="Specific">Specific Employee</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Dynamic Logic */}
                                {form.applicableTo === 'Role' && (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Roles</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Employee', 'Manager', 'HR', 'Intern', 'Admin'].map(role => (
                                                <label key={role} className={`flex items-center gap-2 border px-3 py-1.5 rounded-full cursor-pointer transition text-sm select-none ${form.roles?.includes(role) ? 'bg-blue-100 border-blue-200 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="check-accent"
                                                        hidden
                                                        checked={form.roles?.includes(role) || false}
                                                        onChange={e => {
                                                            const roles = form.roles || [];
                                                            if (e.target.checked) setForm({ ...form, roles: [...roles, role] });
                                                            else setForm({ ...form, roles: roles.filter(r => r !== role) });
                                                        }}
                                                    />
                                                    {role}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {form.applicableTo === 'Specific' && (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Employee</label>
                                        <select className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            value={form.specificEmployeeId}
                                            onChange={e => setForm({ ...form, specificEmployeeId: e.target.value })}>
                                            <option value="">-- Choose Employee --</option>
                                            {employees.map(emp => (
                                                <option key={emp._id} value={emp._id}>
                                                    {emp.firstName} {emp.lastName} ({emp.employeeId || 'No ID'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <hr className="border-slate-100" />

                            {/* Section 2: Rules */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    2. Leave Rules Configuration
                                </h3>

                                {/* Rule Builder */}
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                    <div className="grid md:grid-cols-7 gap-4 items-end">
                                        <div className="md:col-span-1">
                                            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Leave Type</label>
                                            <input list="leaveTypes" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="Select or Type"
                                                value={ruleForm.leaveType}
                                                onChange={e => setRuleForm({ ...ruleForm, leaveType: e.target.value })}
                                            />
                                            <datalist id="leaveTypes">
                                                <option value="CL" />
                                                <option value="PL" />
                                                <option value="SL" />
                                                <option value="EL" />
                                                <option value="LWP" />
                                            </datalist>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Total / Year</label>
                                            <input type="number" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:border-blue-500 outline-none"
                                                min="0"
                                                value={ruleForm.totalPerYear} onChange={e => setRuleForm({ ...ruleForm, totalPerYear: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="md:col-span-1 flex flex-col items-center">
                                            <label className="text-xs font-bold text-slate-600 mb-2 block cursor-pointer" title="Add 1/12th every month">Monthly Accrual</label>
                                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                checked={ruleForm.monthlyAccrual} onChange={e => setRuleForm({ ...ruleForm, monthlyAccrual: e.target.checked })} />
                                        </div>
                                        <div className="md:col-span-1 flex flex-col items-center">
                                            <label className="text-xs font-bold text-slate-600 mb-2 block cursor-pointer">Carry Forward</label>
                                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                checked={ruleForm.carryForwardAllowed} onChange={e => setRuleForm({ ...ruleForm, carryForwardAllowed: e.target.checked })} />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Max CF</label>
                                            <input type="number" className="w-full border border-slate-300 rounded-md p-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                min="0" disabled={!ruleForm.carryForwardAllowed}
                                                value={ruleForm.maxCarryForward} onChange={e => setRuleForm({ ...ruleForm, maxCarryForward: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Color</label>
                                            <input type="color" className="w-full h-9 border border-slate-300 rounded-md p-1 cursor-pointer"
                                                value={ruleForm.color} onChange={e => setRuleForm({ ...ruleForm, color: e.target.value })} />
                                        </div>
                                        <div className="md:col-span-1">
                                            <button type="button" onClick={addRule} className="w-full bg-slate-800 text-white p-2 rounded-md text-sm font-medium hover:bg-slate-700 transition shadow-sm">
                                                Add Rule
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Rule List */}
                                <div className="space-y-2">
                                    {form.rules.length === 0 && <p className="text-sm text-slate-400 italic">No rules added yet.</p>}
                                    {form.rules.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between border border-slate-200 p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition">
                                            <div className="flex items-center gap-6 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: `${r.color}20`, color: r.color }}>{r.leaveType}</span>
                                                    <span className="font-semibold text-slate-700">{r.leaveType}</span>
                                                </div>
                                                <span className="text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">{r.totalPerYear} days/yr</span>
                                                {r.monthlyAccrual && <span className="px-2 bg-blue-50 text-blue-700 rounded text-xs py-0.5 border border-blue-100 font-medium">Monthly Accrual</span>}
                                                {r.carryForwardAllowed && <span className="px-2 bg-amber-50 text-amber-700 rounded text-xs py-0.5 border border-amber-100 font-medium">Carry Fwd (Max: {r.maxCarryForward})</span>}
                                            </div>
                                            <button type="button" onClick={() => removeRule(i)} className="text-rose-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded transition">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-slate-100 sticky bottom-0 bg-white pb-0">
                                <button type="submit" className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 font-medium transition flex items-center gap-2">
                                    <Save size={18} />
                                    {editingId ? 'Update Policy' : 'Create Policy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
