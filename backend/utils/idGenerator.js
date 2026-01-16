/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROFESSIONAL ID GENERATOR UTILITY
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Generates human-readable, unique IDs for all HRMS entities.
 * Format: PREFIX-YYYY-XXXX or PREFIX-DEPT-XXXX
 * 
 * Features:
 * - Atomic counter increments (thread-safe)
 * - Year-based reset
 * - Department-specific IDs for employees
 * - Zero-padding for consistent formatting
 * - Multi-tenant support
 * 
 * @author HRMS Architect
 * @version 2.0
 */

const mongoose = require('mongoose');

/**
 * Get or create counter model for a specific database
 * @param {mongoose.Connection} db - Database connection
 * @returns {mongoose.Model} Counter model
 */
function getCounterModel(db) {
    if (db.models.Counter) {
        return db.models.Counter;
    }

    const CounterSchema = require('../models/Counter');
    return db.model('Counter', CounterSchema);
}

/**
 * Generate unique ID with atomic counter increment
 * 
 * @param {mongoose.Connection} db - Database connection (tenant-specific)
 * @param {string} prefix - ID prefix (e.g., 'JOB', 'CAN', 'APP', 'EMP')
 * @param {number} [year] - Year for ID (defaults to current year)
 * @param {string} [department] - Department code for employee IDs
 * @param {number} [padding=4] - Number of digits for padding (default: 4)
 * @returns {Promise<string>} Generated ID (e.g., 'JOB-2026-0001')
 */
async function generateId(db, prefix, year = null, department = null, padding = 4) {
    try {
        // Validate inputs
        if (!db) {
            throw new Error('Database connection is required');
        }
        if (!prefix || typeof prefix !== 'string') {
            throw new Error('Valid prefix is required');
        }

        const Counter = getCounterModel(db);

        // Use current year if not provided
        const targetYear = year || new Date().getFullYear();

        // Build counter key
        // Format: prefix_year or prefix_dept_year
        let counterKey;
        if (department) {
            counterKey = `${prefix}_${department}_${targetYear}`;
        } else {
            counterKey = `${prefix}_${targetYear}`;
        }

        // Atomic increment using findOneAndUpdate
        const counter = await Counter.findOneAndUpdate(
            { key: counterKey },
            { $inc: { seq: 1 } },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        // Pad sequence number with zeros
        const paddedSeq = String(counter.seq).padStart(padding, '0');

        // Build final ID
        let generatedId;
        if (department) {
            // Employee format: EMP-DEPT-0001
            generatedId = `${prefix}-${department.toUpperCase()}-${paddedSeq}`;
        } else {
            // Standard format: PREFIX-YYYY-0001
            generatedId = `${prefix}-${targetYear}-${paddedSeq}`;
        }

        console.log(`✅ Generated ID: ${generatedId} (key: ${counterKey}, seq: ${counter.seq})`);

        return generatedId;

    } catch (error) {
        console.error('❌ ID Generation Error:', error);
        throw new Error(`Failed to generate ID: ${error.message}`);
    }
}

/**
 * Generate Job ID
 * Format: JOB-2026-0001
 */
async function generateJobId(db, year = null) {
    return generateId(db, 'JOB', year);
}

/**
 * Generate Candidate ID
 * Format: CAN-2026-0001
 */
async function generateCandidateId(db, year = null) {
    return generateId(db, 'CAN', year);
}

/**
 * Generate Application ID
 * Format: APP-2026-0001
 */
async function generateApplicationId(db, year = null) {
    return generateId(db, 'APP', year);
}

/**
 * Generate Interview ID
 * Format: INT-2026-0001
 */
async function generateInterviewId(db, year = null) {
    return generateId(db, 'INT', year);
}

/**
 * Generate Offer ID
 * Format: OFF-2026-0001
 */
async function generateOfferId(db, year = null) {
    return generateId(db, 'OFF', year);
}

/**
 * Generate Employee ID
 * Format: EMP-DEPT-0001 (department-specific)
 * or EMP-2026-0001 (if no department)
 */
async function generateEmployeeId(db, department = null, year = null) {
    if (department) {
        return generateId(db, 'EMP', year, department);
    }
    return generateId(db, 'EMP', year);
}

/**
 * Generate Payslip ID
 * Format: PAY-202601-EMP001
 */
async function generatePayslipId(db, employeeId, month, year) {
    const monthStr = String(month).padStart(2, '0');
    const yearMonth = `${year}${monthStr}`;

    // Extract employee number from employeeId (e.g., EMP-HR-0001 -> 0001)
    const empNumber = employeeId.split('-').pop();

    return `PAY-${yearMonth}-${empNumber}`;
}

/**
 * Get current counter value (for display/debugging)
 */
async function getCurrentCounter(db, prefix, year = null, department = null) {
    try {
        const Counter = getCounterModel(db);
        const targetYear = year || new Date().getFullYear();

        let counterKey;
        if (department) {
            counterKey = `${prefix}_${department}_${targetYear}`;
        } else {
            counterKey = `${prefix}_${targetYear}`;
        }

        const counter = await Counter.findOne({ key: counterKey });
        return counter ? counter.seq : 0;

    } catch (error) {
        console.error('Error getting counter:', error);
        return 0;
    }
}

/**
 * Reset counter (use with caution - for year rollover or testing)
 */
async function resetCounter(db, prefix, year = null, department = null) {
    try {
        const Counter = getCounterModel(db);
        const targetYear = year || new Date().getFullYear();

        let counterKey;
        if (department) {
            counterKey = `${prefix}_${department}_${targetYear}`;
        } else {
            counterKey = `${prefix}_${targetYear}`;
        }

        await Counter.findOneAndUpdate(
            { key: counterKey },
            { seq: 0 },
            { upsert: true }
        );

        console.log(`✅ Counter reset: ${counterKey}`);
        return true;

    } catch (error) {
        console.error('Error resetting counter:', error);
        return false;
    }
}

module.exports = {
    generateId,
    generateJobId,
    generateCandidateId,
    generateApplicationId,
    generateInterviewId,
    generateOfferId,
    generateEmployeeId,
    generatePayslipId,
    getCurrentCounter,
    resetCounter
};
