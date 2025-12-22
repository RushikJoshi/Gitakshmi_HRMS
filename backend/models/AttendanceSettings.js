const mongoose = require('mongoose');

const AttendanceSettingsSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },

    // Shift Configuration
    shiftStartTime: { type: String, default: "09:00" }, // 24hr format
    shiftEndTime: { type: String, default: "18:00" },

    // Grace & Thresholds
    graceTimeMinutes: { type: Number, default: 15 },
    lateMarkThresholdMinutes: { type: Number, default: 30 },
    halfDayThresholdHours: { type: Number, default: 4 },
    fullDayThresholdHours: { type: Number, default: 7 },

    // Weekly Off (0 = Sunday, 1 = Monday ...)
    weeklyOffDays: { type: [Number], default: [0] },

    // Policy Switches
    sandwichLeave: { type: Boolean, default: false },
    autoAbsent: { type: Boolean, default: true },
    attendanceLockDay: { type: Number, default: 25 }, // Day of month after which attendance is locked

    // Leave Policy Quota Configuration
    leaveCycleStartMonth: { type: Number, default: 0 }, // 0 = Jan, 3 = April etc.

    // ========== PUNCH POLICY CONFIGURATION ==========

    // Punch Mode: 'single' or 'multiple'
    punchMode: { type: String, enum: ['single', 'multiple'], default: 'single' },

    // Max punches per day (only applies if punchMode is 'multiple')
    maxPunchesPerDay: { type: Number, default: 10, min: 2 },

    // Action when max punches exceeded: 'block' or 'warn'
    maxPunchAction: { type: String, enum: ['block', 'warn'], default: 'block' },

    // Break Tracking
    breakTrackingEnabled: { type: Boolean, default: false },

    // Overtime Configuration
    overtimeAllowed: { type: Boolean, default: false },
    overtimeAfterShiftHours: { type: Boolean, default: true }, // Only count overtime after shift hours
    overtimeToPayroll: { type: Boolean, default: false }, // Send overtime to payroll

    // Geo-fencing Configuration
    geoFencingEnabled: { type: Boolean, default: false },
    officeLatitude: { type: Number }, // Office location latitude
    officeLongitude: { type: Number }, // Office location longitude
    allowedRadiusMeters: { type: Number, default: 100 }, // Allowed radius in meters

    // IP Restriction Configuration
    ipRestrictionEnabled: { type: Boolean, default: false },
    allowedIPRanges: [{ type: String }], // Array of IP addresses or CIDR ranges (e.g., "192.168.1.0/24")
    allowedIPs: [{ type: String }], // Array of specific allowed IP addresses

    // Location Restriction Mode: 'none', 'geo', 'ip', 'both'
    locationRestrictionMode: { type: String, enum: ['none', 'geo', 'ip', 'both'], default: 'none' },

    // Audit Details
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

module.exports = AttendanceSettingsSchema;
