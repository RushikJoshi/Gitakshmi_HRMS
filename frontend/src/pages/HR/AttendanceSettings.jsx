import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Save, Clock, Calendar, ToggleLeft, ToggleRight, ShieldCheck, MapPin, Globe, Lock, Plus, X } from 'lucide-react';

export default function AttendanceSettings() {
    const [settings, setSettings] = useState({
        shiftStartTime: "09:00",
        shiftEndTime: "18:00",
        graceTimeMinutes: 15,
        lateMarkThresholdMinutes: 30,
        halfDayThresholdHours: 4,
        fullDayThresholdHours: 7,
        weeklyOffDays: [0],
        sandwichLeave: false,
        autoAbsent: true,
        attendanceLockDay: 25,
        // Punch Policy
        punchMode: 'single',
        maxPunchesPerDay: 10,
        maxPunchAction: 'block',
        breakTrackingEnabled: false,
        overtimeAllowed: false,
        overtimeAfterShiftHours: true,
        overtimeToPayroll: false,
        geoFencingEnabled: false,
        officeLatitude: null,
        officeLongitude: null,
        allowedRadiusMeters: 100,
        ipRestrictionEnabled: false,
        allowedIPs: [],
        allowedIPRanges: [],
        locationRestrictionMode: 'none'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/attendance/settings');
            if (res.data) setSettings(res.data);
        } catch (err) {
            console.error("Failed to load settings", err);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put('/attendance/settings', settings);
            alert("Settings saved successfully!");
        } catch (err) {
            alert("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 duration-500">
            {/* Shift Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 h-32 w-32 bg-slate-50 dark:bg-slate-800/50 rounded-bl-full -mr-16 -mt-16 opacity-20"></div>

                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <Clock className="text-blue-500" />
                    Shift & Grace Time
                </h3>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Shift Start" type="time" value={settings.shiftStartTime} onChange={(e) => setSettings({ ...settings, shiftStartTime: e.target.value })} />
                        <InputGroup label="Shift End" type="time" value={settings.shiftEndTime} onChange={(e) => setSettings({ ...settings, shiftEndTime: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Grace Minutes" type="number" value={settings.graceTimeMinutes} onChange={(e) => setSettings({ ...settings, graceTimeMinutes: parseInt(e.target.value) })} />
                        <InputGroup label="Late Threshold" type="number" value={settings.lateMarkThresholdMinutes} onChange={(e) => setSettings({ ...settings, lateMarkThresholdMinutes: parseInt(e.target.value) })} />
                    </div>
                </div>
            </div>

            {/* Threshold Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <ShieldCheck className="text-emerald-500" />
                    Presence Thresholds
                </h3>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="HD Threshold (Hrs)" type="number" value={settings.halfDayThresholdHours} onChange={(e) => setSettings({ ...settings, halfDayThresholdHours: parseInt(e.target.value) })} />
                        <InputGroup label="P Threshold (Hrs)" type="number" value={settings.fullDayThresholdHours} onChange={(e) => setSettings({ ...settings, fullDayThresholdHours: parseInt(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Monthly Lock Day" type="number" value={settings.attendanceLockDay} onChange={(e) => setSettings({ ...settings, attendanceLockDay: parseInt(e.target.value) })} />
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block px-1">Leave Cycle Start</label>
                            <select
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white"
                                value={settings.leaveCycleStartMonth || 0}
                                onChange={(e) => setSettings({ ...settings, leaveCycleStartMonth: parseInt(e.target.value) })}
                            >
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, idx) => (
                                    <option key={month} value={idx}>{month}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Punch Mode Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl col-span-1 md:col-span-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <Lock className="text-purple-500" />
                    Punch Mode Configuration
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Punch Mode</label>
                        <select
                            value={settings.punchMode}
                            onChange={(e) => setSettings({ ...settings, punchMode: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                        >
                            <option value="single">Single Punch Mode (1 IN, 1 OUT per day)</option>
                            <option value="multiple">Multiple Punch Mode (Multiple IN/OUT for breaks)</option>
                        </select>
                    </div>

                    {settings.punchMode === 'multiple' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup
                                    label="Max Punches Per Day"
                                    type="number"
                                    value={settings.maxPunchesPerDay}
                                    onChange={(e) => setSettings({ ...settings, maxPunchesPerDay: parseInt(e.target.value) })}
                                />
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Action on Limit</label>
                                    <select
                                        value={settings.maxPunchAction}
                                        onChange={(e) => setSettings({ ...settings, maxPunchAction: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                                    >
                                        <option value="block">Block Further Punches</option>
                                        <option value="warn">Show Warning (Allow)</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <ToggleItem
                        label="Break Tracking"
                        description="Deduct break time from working hours calculation"
                        active={settings.breakTrackingEnabled}
                        onClick={() => setSettings({ ...settings, breakTrackingEnabled: !settings.breakTrackingEnabled })}
                    />
                </div>
            </div>

            {/* Overtime Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl col-span-1 md:col-span-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <Clock className="text-orange-500" />
                    Overtime Configuration
                </h3>

                <div className="space-y-6">
                    <ToggleItem
                        label="Overtime Allowed"
                        description="Enable overtime tracking and calculation"
                        active={settings.overtimeAllowed}
                        onClick={() => setSettings({ ...settings, overtimeAllowed: !settings.overtimeAllowed })}
                    />

                    {settings.overtimeAllowed && (
                        <>
                            <ToggleItem
                                label="Overtime After Shift Hours Only"
                                description="Only count overtime after scheduled shift hours"
                                active={settings.overtimeAfterShiftHours}
                                onClick={() => setSettings({ ...settings, overtimeAfterShiftHours: !settings.overtimeAfterShiftHours })}
                            />
                            <ToggleItem
                                label="Send Overtime to Payroll"
                                description="Export overtime hours to payroll system"
                                active={settings.overtimeToPayroll}
                                onClick={() => setSettings({ ...settings, overtimeToPayroll: !settings.overtimeToPayroll })}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Location Restrictions */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl col-span-1 md:col-span-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                    <MapPin className="text-red-500" />
                    Location Restrictions
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Restriction Mode</label>
                        <select
                            value={settings.locationRestrictionMode}
                            onChange={(e) => {
                                const mode = e.target.value;
                                setSettings({
                                    ...settings,
                                    locationRestrictionMode: mode,
                                    geoFencingEnabled: mode === 'geo' || mode === 'both',
                                    ipRestrictionEnabled: mode === 'ip' || mode === 'both'
                                });
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                        >
                            <option value="none">No Restriction (WFH / Field Employees)</option>
                            <option value="geo">Geo-fencing Only</option>
                            <option value="ip">IP Restriction Only</option>
                            <option value="both">Both Geo-fencing and IP</option>
                        </select>
                    </div>

                    {(settings.locationRestrictionMode === 'geo' || settings.locationRestrictionMode === 'both') && (
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 space-y-4">
                            <div className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Geo-fencing Settings</div>
                            <div className="grid grid-cols-3 gap-4">
                                <InputGroup
                                    label="Office Latitude"
                                    type="number"
                                    step="any"
                                    value={settings.officeLatitude || ''}
                                    onChange={(e) => setSettings({ ...settings, officeLatitude: parseFloat(e.target.value) })}
                                />
                                <InputGroup
                                    label="Office Longitude"
                                    type="number"
                                    step="any"
                                    value={settings.officeLongitude || ''}
                                    onChange={(e) => setSettings({ ...settings, officeLongitude: parseFloat(e.target.value) })}
                                />
                                <InputGroup
                                    label="Allowed Radius (meters)"
                                    type="number"
                                    value={settings.allowedRadiusMeters}
                                    onChange={(e) => setSettings({ ...settings, allowedRadiusMeters: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    )}

                    {(settings.locationRestrictionMode === 'ip' || settings.locationRestrictionMode === 'both') && (
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 space-y-4">
                            <div className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">IP Restriction Settings</div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Allowed IP Addresses</label>
                                <div className="space-y-2">
                                    {(settings.allowedIPs || []).map((ip, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={ip}
                                                onChange={(e) => {
                                                    const newIPs = [...(settings.allowedIPs || [])];
                                                    newIPs[idx] = e.target.value;
                                                    setSettings({ ...settings, allowedIPs: newIPs });
                                                }}
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-sm font-bold outline-none focus:border-blue-500 transition"
                                                placeholder="192.168.1.1"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newIPs = (settings.allowedIPs || []).filter((_, i) => i !== idx);
                                                    setSettings({ ...settings, allowedIPs: newIPs });
                                                }}
                                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            setSettings({ ...settings, allowedIPs: [...(settings.allowedIPs || []), ''] });
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black uppercase hover:bg-blue-100 dark:hover:bg-blue-950/30 transition"
                                    >
                                        <Plus size={14} />
                                        Add IP Address
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Allowed IP Ranges (CIDR format)</label>
                                <div className="space-y-2">
                                    {(settings.allowedIPRanges || []).map((range, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={range}
                                                onChange={(e) => {
                                                    const newRanges = [...(settings.allowedIPRanges || [])];
                                                    newRanges[idx] = e.target.value;
                                                    setSettings({ ...settings, allowedIPRanges: newRanges });
                                                }}
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-sm font-bold outline-none focus:border-blue-500 transition"
                                                placeholder="192.168.1.0/24"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newRanges = (settings.allowedIPRanges || []).filter((_, i) => i !== idx);
                                                    setSettings({ ...settings, allowedIPRanges: newRanges });
                                                }}
                                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            setSettings({ ...settings, allowedIPRanges: [...(settings.allowedIPRanges || []), ''] });
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black uppercase hover:bg-blue-100 dark:hover:bg-blue-950/30 transition"
                                    >
                                        <Plus size={14} />
                                        Add IP Range
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Policy Toggles */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl col-span-1 md:col-span-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex gap-12">
                        <ToggleItem
                            label="Sandwich Leave Rules"
                            description="Apply leave to weekends between absences"
                            active={settings.sandwichLeave}
                            onClick={() => setSettings({ ...settings, sandwichLeave: !settings.sandwichLeave })}
                        />
                        <ToggleItem
                            label="Auto-Mark Absent"
                            description="Mark absent if no punch log exists"
                            active={settings.autoAbsent}
                            onClick={() => setSettings({ ...settings, autoAbsent: !settings.autoAbsent })}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-slate-500/20 hover:bg-slate-900 hover:-translate-y-1 transition disabled:opacity-50 disabled:translate-y-0"
                    >
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function InputGroup({ label, ...props }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
            <input {...props} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition" />
        </div>
    );
}

function ToggleItem({ label, description, active, onClick }) {
    return (
        <div className="flex items-center gap-4 cursor-pointer group" onClick={onClick}>
            <div className={`transition-colors duration-300 ${active ? 'text-blue-500' : 'text-slate-300'}`}>
                {active ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
            </div>
            <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">{description}</div>
            </div>
        </div>
    );
}
