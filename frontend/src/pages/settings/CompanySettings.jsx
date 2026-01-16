import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { message } from 'antd'; // Use Ant Design for notifications

const ENTITY_TYPES = ['EMPLOYEE', 'JOB', 'OFFER', 'APPLICATION', 'PAYSLIP', 'CANDIDATE'];

const CompanySettings = () => {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(ENTITY_TYPES[0]);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await api.get('/company-id-config');
            if (res.data.success) {
                setConfigs(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching configs:', error);
            message.error('Failed to load configurations');
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (entityType, field, value) => {
        setConfigs(prev => prev.map(c =>
            c.entityType === entityType ? { ...c, [field]: value } : c
        ));
    };

    const saveConfigurations = async () => {
        try {
            setSaving(true);
            const res = await api.post('/company-id-config', configs);
            if (res.data.success) {
                message.success('Configurations saved successfully');
                setConfigs(res.data.data);
            }
        } catch (error) {
            console.error('Save error:', error);
            message.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const calculatePreview = (config) => {
        if (!config) return '';

        let parts = [];
        if (config.prefix) parts.push(config.prefix);

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        if (config.includeYear) parts.push(year);
        if (config.includeMonth) parts.push(month);
        if (config.includeDepartment && config.entityType === 'EMPLOYEE') parts.push('IT');

        const seqNum = config.startFrom || 1;
        const seqStr = String(seqNum).padStart(config.padding, '0');

        const separator = config.separator || '';
        let prefixPart = parts.join(separator);

        if (prefixPart) {
            return `${prefixPart}${separator}${seqStr}`;
        }
        return seqStr;
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    const currentConfig = configs.find(c => c.entityType === activeTab) || {};

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Custom ID Configuration</h1>
                    <p className="text-gray-500">Customize how system IDs are generated for your company.</p>
                </div>
                <button
                    onClick={saveConfigurations}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {ENTITY_TYPES.map(type => (
                        <button
                            key={type}
                            onClick={() => setActiveTab(type)}
                            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2
                                ${activeTab === type
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {type.charAt(0) + type.slice(1).toLowerCase()} Defaults
                        </button>
                    ))}
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Format Settings</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                                    <input
                                        type="text"
                                        value={currentConfig.prefix || ''}
                                        onChange={(e) => handleConfigChange(activeTab, 'prefix', e.target.value.toUpperCase())}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. EMP"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Short identifier code</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Separator</label>
                                    <select
                                        value={currentConfig.separator || ''}
                                        onChange={(e) => handleConfigChange(activeTab, 'separator', e.target.value)}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                        <option value="-">Dash (-)</option>
                                        <option value="_">Underscore (_)</option>
                                        <option value="/">Slash (/)</option>
                                        <option value="">None</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={currentConfig.includeYear || false}
                                        onChange={(e) => handleConfigChange(activeTab, 'includeYear', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded"
                                    />
                                    <div>
                                        <span className="font-medium text-gray-700">Include Year</span>
                                        <p className="text-xs text-gray-500">Adds current year (e.g. 2026)</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={currentConfig.includeMonth || false}
                                        onChange={(e) => handleConfigChange(activeTab, 'includeMonth', e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded"
                                    />
                                    <div>
                                        <span className="font-medium text-gray-700">Include Month</span>
                                        <p className="text-xs text-gray-500">Adds current month (e.g. 01)</p>
                                    </div>
                                </label>
                                {activeTab === 'EMPLOYEE' && (
                                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={currentConfig.includeDepartment || false}
                                            onChange={(e) => handleConfigChange(activeTab, 'includeDepartment', e.target.checked)}
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-700">Include Department</span>
                                            <p className="text-xs text-gray-500">Adds Dept Code (e.g. IT, HR)</p>
                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Counter Configuration</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start From</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={currentConfig.startFrom || 1}
                                        onChange={(e) => handleConfigChange(activeTab, 'startFrom', parseInt(e.target.value) || 1)}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Starting number</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Padding Digits</label>
                                    <input
                                        type="number"
                                        min="2" max="10"
                                        value={currentConfig.padding || 4}
                                        onChange={(e) => handleConfigChange(activeTab, 'padding', parseInt(e.target.value) || 4)}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Zeros length (e.g. 0001)</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reset Policy</label>
                                <select
                                    value={currentConfig.resetPolicy || 'NEVER'}
                                    onChange={(e) => handleConfigChange(activeTab, 'resetPolicy', e.target.value)}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="NEVER">Never Reset (Continuous)</option>
                                    <option value="YEARLY">Reset Every Year (1st Jan)</option>
                                    <option value="MONTHLY">Reset Every Month (1st)</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-1">When should the counter restart?</p>
                            </div>
                            <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg transform transition-all hover:scale-[1.02]">
                                <div className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Live ID Preview</div>
                                <div className="text-3xl font-mono tracking-widest text-emerald-400 font-bold overflow-hidden text-ellipsis">
                                    {calculatePreview(currentConfig)}
                                </div>
                                <div className="mt-4 flex gap-4 text-xs text-gray-400 border-t border-gray-700 pt-3">
                                    <div>Current Seq: <span className="text-white">{currentConfig.currentSeq || 1}</span></div>
                                    <div>Status: <span className="text-emerald-400">Active</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanySettings;
