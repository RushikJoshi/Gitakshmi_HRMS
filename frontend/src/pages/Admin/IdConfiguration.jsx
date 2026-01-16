/**
 * ═══════════════════════════════════════════════════════════════════════
 * COMPANY ID CONFIGURATION PAGE
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Professional admin UI for configuring custom ID formats.
 * Allows company admins to customize ID patterns for all HRMS entities.
 * 
 * Features:
 * - Real-time preview
 * - Locked configuration warning
 * - Validation
 * - Reset to defaults
 * 
 * @version 2.0
 */

import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import './IdConfiguration.css';

const IdConfiguration = () => {
    const [configurations, setConfigurations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [previewId, setPreviewId] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Entity type labels
    const entityLabels = {
        job: 'Job Opening',
        candidate: 'Candidate',
        application: 'Application',
        interview: 'Interview',
        offer: 'Offer Letter',
        employee: 'Employee',
        payslip: 'Payslip'
    };

    // Entity type icons
    const entityIcons = {
        job: '💼',
        candidate: '👤',
        application: '📝',
        interview: '🎤',
        offer: '📄',
        employee: '👨‍💼',
        payslip: '💰'
    };

    // Load configuration on mount
    useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            const res = await api.get('/id-config');
            setConfigurations(res.data.data.configurations);
            setError(null);
        } catch (err) {
            console.error('Error loading configuration:', err);
            setError('Failed to load ID configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (entityType, field, value) => {
        setConfigurations(prev =>
            prev.map(config =>
                config.entityType === entityType
                    ? { ...config, [field]: value }
                    : config
            )
        );

        // Update preview
        updatePreview(entityType);
    };

    const updatePreview = async (entityType) => {
        try {
            const config = configurations.find(c => c.entityType === entityType);
            if (!config) return;

            const params = new URLSearchParams();
            if (config.includeDepartment) params.append('department', 'HR');
            if (config.includeYear) params.append('year', new Date().getFullYear());
            if (config.includeMonth) params.append('month', new Date().getMonth() + 1);

            const res = await api.get(`/id-config/${entityType}/preview?${params.toString()}`);
            setPreviewId(res.data.data.format);
        } catch (err) {
            console.error('Error updating preview:', err);
        }
    };

    const handleSave = async (entityType) => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const config = configurations.find(c => c.entityType === entityType);
            if (!config) return;

            const updates = {
                prefix: config.prefix,
                separator: config.separator,
                includeYear: config.includeYear,
                yearFormat: config.yearFormat,
                includeMonth: config.includeMonth,
                monthFormat: config.monthFormat,
                includeDepartment: config.includeDepartment,
                departmentFormat: config.departmentFormat,
                paddingLength: config.paddingLength,
                resetPolicy: config.resetPolicy,
                startingNumber: config.startingNumber
            };

            await api.patch(`/id-config/${entityType}`, updates);

            setSuccess(`Configuration saved successfully for ${entityLabels[entityType]}`);

            // Reload to get updated lock status
            await loadConfiguration();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error saving configuration:', err);

            if (err.response?.data?.code === 'CONFIGURATION_LOCKED') {
                setError(`Cannot modify configuration. IDs have already been generated for ${entityLabels[entityType]}.`);
            } else {
                setError(err.response?.data?.message || 'Failed to save configuration');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async (entityType) => {
        if (!window.confirm(`Reset ${entityLabels[entityType]} ID configuration to defaults?`)) {
            return;
        }

        try {
            setSaving(true);
            await api.post(`/id-config/${entityType}/reset`);
            setSuccess(`Configuration reset to defaults for ${entityLabels[entityType]}`);
            await loadConfiguration();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error resetting configuration:', err);
            setError(err.response?.data?.message || 'Failed to reset configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="id-config-loading">
                <div className="spinner"></div>
                <p>Loading ID Configuration...</p>
            </div>
        );
    }

    return (
        <div className="id-configuration-page">
            <div className="page-header">
                <div>
                    <h1>🔧 ID Configuration</h1>
                    <p className="page-subtitle">
                        Customize ID formats for all HRMS entities. Changes apply to new IDs only.
                    </p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span className="alert-icon">⚠️</span>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="alert-close">×</button>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <span className="alert-icon">✅</span>
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="alert-close">×</button>
                </div>
            )}

            <div className="config-grid">
                {configurations.map(config => (
                    <ConfigurationCard
                        key={config.entityType}
                        config={config}
                        label={entityLabels[config.entityType]}
                        icon={entityIcons[config.entityType]}
                        onChange={(field, value) => handleConfigChange(config.entityType, field, value)}
                        onSave={() => handleSave(config.entityType)}
                        onReset={() => handleReset(config.entityType)}
                        saving={saving}
                        onPreview={() => updatePreview(config.entityType)}
                    />
                ))}
            </div>
        </div>
    );
};

// Configuration Card Component
const ConfigurationCard = ({ config, label, icon, onChange, onSave, onReset, saving, onPreview }) => {
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (expanded) {
            onPreview();
        }
    }, [expanded, config]);

    return (
        <div className={`config-card ${config.isLocked ? 'locked' : ''}`}>
            <div className="config-card-header" onClick={() => setExpanded(!expanded)}>
                <div className="config-card-title">
                    <span className="config-icon">{icon}</span>
                    <div>
                        <h3>{label}</h3>
                        <p className="config-example">{config.exampleFormat}</p>
                    </div>
                </div>
                <div className="config-card-actions">
                    {config.isLocked && (
                        <span className="lock-badge" title="Configuration locked - IDs already generated">
                            🔒 Locked
                        </span>
                    )}
                    <button className="expand-btn">
                        {expanded ? '▼' : '▶'}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="config-card-body">
                    {config.isLocked && (
                        <div className="lock-warning">
                            <span className="warning-icon">⚠️</span>
                            <div>
                                <strong>Configuration Locked</strong>
                                <p>
                                    {config.generatedCount} {label} ID(s) have been generated.
                                    Configuration cannot be modified to maintain data integrity.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="config-form">
                        {/* Prefix */}
                        <div className="form-group">
                            <label>Prefix</label>
                            <input
                                type="text"
                                value={config.prefix}
                                onChange={(e) => onChange('prefix', e.target.value.toUpperCase())}
                                disabled={config.isLocked}
                                maxLength={10}
                                className="form-control"
                                placeholder="e.g., JOB, EMP"
                            />
                            <small>Uppercase letters only, max 10 characters</small>
                        </div>

                        {/* Separator */}
                        <div className="form-group">
                            <label>Separator</label>
                            <select
                                value={config.separator}
                                onChange={(e) => onChange('separator', e.target.value)}
                                disabled={config.isLocked}
                                className="form-control"
                            >
                                <option value="-">Hyphen (-)</option>
                                <option value="_">Underscore (_)</option>
                                <option value="">None</option>
                                <option value="/">Slash (/)</option>
                            </select>
                        </div>

                        {/* Include Year */}
                        <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={config.includeYear}
                                    onChange={(e) => onChange('includeYear', e.target.checked)}
                                    disabled={config.isLocked}
                                />
                                <span>Include Year</span>
                            </label>
                            {config.includeYear && (
                                <select
                                    value={config.yearFormat}
                                    onChange={(e) => onChange('yearFormat', e.target.value)}
                                    disabled={config.isLocked}
                                    className="form-control inline-select"
                                >
                                    <option value="YYYY">Full Year (2026)</option>
                                    <option value="YY">Short Year (26)</option>
                                </select>
                            )}
                        </div>

                        {/* Include Month (Payslip only) */}
                        {config.entityType === 'payslip' && (
                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={config.includeMonth}
                                        onChange={(e) => onChange('includeMonth', e.target.checked)}
                                        disabled={config.isLocked}
                                    />
                                    <span>Include Month</span>
                                </label>
                                {config.includeMonth && (
                                    <select
                                        value={config.monthFormat}
                                        onChange={(e) => onChange('monthFormat', e.target.value)}
                                        disabled={config.isLocked}
                                        className="form-control inline-select"
                                    >
                                        <option value="MM">2-digit (01, 02)</option>
                                        <option value="M">1-digit (1, 2)</option>
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Include Department (Employee only) */}
                        {config.entityType === 'employee' && (
                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={config.includeDepartment}
                                        onChange={(e) => onChange('includeDepartment', e.target.checked)}
                                        disabled={config.isLocked}
                                    />
                                    <span>Include Department</span>
                                </label>
                                {config.includeDepartment && (
                                    <select
                                        value={config.departmentFormat}
                                        onChange={(e) => onChange('departmentFormat', e.target.value)}
                                        disabled={config.isLocked}
                                        className="form-control inline-select"
                                    >
                                        <option value="CODE">Code (HR, IT)</option>
                                        <option value="FULL">Full Name</option>
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Padding Length */}
                        <div className="form-group">
                            <label>Sequence Padding</label>
                            <select
                                value={config.paddingLength}
                                onChange={(e) => onChange('paddingLength', parseInt(e.target.value))}
                                disabled={config.isLocked}
                                className="form-control"
                            >
                                <option value="2">2 digits (01, 02)</option>
                                <option value="3">3 digits (001, 002)</option>
                                <option value="4">4 digits (0001, 0002)</option>
                                <option value="5">5 digits (00001, 00002)</option>
                                <option value="6">6 digits (000001, 000002)</option>
                            </select>
                        </div>

                        {/* Reset Policy */}
                        <div className="form-group">
                            <label>Reset Policy</label>
                            <select
                                value={config.resetPolicy}
                                onChange={(e) => onChange('resetPolicy', e.target.value)}
                                disabled={config.isLocked}
                                className="form-control"
                            >
                                <option value="YEARLY">Reset Yearly</option>
                                <option value="MONTHLY">Reset Monthly</option>
                                <option value="NEVER">Never Reset</option>
                            </select>
                            <small>
                                {config.resetPolicy === 'YEARLY' && 'Counter resets every year'}
                                {config.resetPolicy === 'MONTHLY' && 'Counter resets every month'}
                                {config.resetPolicy === 'NEVER' && 'Counter never resets'}
                            </small>
                        </div>

                        {/* Preview */}
                        <div className="preview-section">
                            <h4>Preview</h4>
                            <div className="preview-box">
                                <code>{config.exampleFormat}</code>
                            </div>
                            <small className="preview-note">
                                This is how new IDs will look. Existing IDs will not change.
                            </small>
                        </div>

                        {/* Actions */}
                        <div className="config-actions">
                            <button
                                onClick={onSave}
                                disabled={config.isLocked || saving}
                                className="btn btn-primary"
                            >
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                            <button
                                onClick={onReset}
                                disabled={config.isLocked || saving}
                                className="btn btn-secondary"
                            >
                                Reset to Default
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IdConfiguration;
