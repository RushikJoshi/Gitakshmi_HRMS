const mongoose = require('mongoose');
const PayrollCalculator = require('../services/payrollCalculator');

// Helper to get models from tenant database
function getModels(req) {
    if (!req.tenantDB) {
        throw new Error("Tenant database connection not available");
    }
    const db = req.tenantDB;
    return {
        // Use db.models if already registered, otherwise fallback to schema
        // CompanyPayrollRule is a NEW model, needs schema
        CompanyPayrollRule: db.models.CompanyPayrollRule || db.model("CompanyPayrollRule", require('../models/CompanyPayrollRule'))
    };
}

/**
 * Get Company Payroll Rules
 */
exports.getRules = async (req, res) => {
    try {
        const { CompanyPayrollRule } = getModels(req);
        let rules = await CompanyPayrollRule.findOne({ tenantId: req.user.tenantId });

        if (!rules) {
            // Return defaults if not found
            rules = new CompanyPayrollRule({ tenantId: req.user.tenantId });
            await rules.save();
        }

        res.json(rules);
    } catch (error) {
        console.error("Get Payroll Rules Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update Company Payroll Rules
 */
exports.updateRules = async (req, res) => {
    try {
        const { CompanyPayrollRule } = getModels(req);
        const updates = req.body;

        // Find and update or create
        const rules = await CompanyPayrollRule.findOneAndUpdate(
            { tenantId: req.user.tenantId },
            { $set: updates },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json(rules);
    } catch (error) {
        console.error("Update Payroll Rules Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Calculate Salary Breakup (Preview)
 * Use this for the Salary Structure UI to auto-populate
 */
exports.calculateBreakup = async (req, res) => {
    try {
        const { annualCTC } = req.body;
        if (!annualCTC) {
            return res.status(400).json({ message: "Annual CTC is required" });
        }
        const ctc = Number(annualCTC);
        const tenantId = req.user.tenantId || req.tenantId;

        // 1. Fetch Dynamic Components
        // Earnings from SalaryComponent
        const SalaryComponent = req.tenantDB.model('SalaryComponent');
        const earningsComps = await SalaryComponent.find({ tenantId, type: 'EARNING', isActive: true });

        // Deductions from DeductionMaster
        // Check if model registered, else use safe get
        const DeductionMaster = req.tenantDB.models.DeductionMaster || req.tenantDB.model('DeductionMaster');
        const deductionsComps = await DeductionMaster.find({ tenantId, isActive: true });

        // DEBUG LOGS
        console.log("CTC:", ctc);
        console.log("Earnings:", earningsComps.map(c => ({ name: c.name, type: c.calculationType, pct: c.percentage, amt: c.amount })));
        console.log("Deductions:", deductionsComps.map(c => ({ name: c.name, val: c.amountValue, type: c.amountType })));

        // Result Container
        const breakdown = {
            earnings: {},
            deductions: {},
            employerContributions: {}
        };
        const calculatedList = []; // Array for robust frontend mapping

        // Helper: Add rounded value
        const addVal = (bucket, key, yearly, compId = null, type = 'earning') => {
            const m = Math.round(yearly / 12);
            const y = Math.round(yearly);
            bucket[key] = { monthly: m, yearly: y };
            if (compId) {
                calculatedList.push({ id: compId, monthly: m, yearly: y, type });
            }
        };

        // --- STEP 1: CALCULATE BASIC (Base for others) ---
        // Find 'Basic' component
        const basicComp = earningsComps.find(c => c.name.toLowerCase().includes('basic'));
        let basicYearly = 0;

        if (basicComp) {
            if (basicComp.calculationType === 'PERCENTAGE_OF_CTC') {
                basicYearly = ctc * (basicComp.percentage / 100);
            } else if (basicComp.calculationType === 'FLAT_AMOUNT') {
                basicYearly = basicComp.amount * 12;
            } else if (basicComp.calculationType === 'PERCENTAGE_OF_BASIC') {
                // If mistakenly set to % of Basic, fallback to 50% CTC
                basicYearly = ctc * 0.5;
            } else {
                basicYearly = ctc * 0.5;
            }
            addVal(breakdown.earnings, 'basic', basicYearly, basicComp._id, 'earning');
        } else {
            basicYearly = ctc * 0.5; // Default Rule
            addVal(breakdown.earnings, 'basic', basicYearly); // No ID if default
        }

        // --- STEP 2: EARNINGS ---
        earningsComps.forEach(comp => {
            const nameLower = comp.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (nameLower.includes('basic')) return; // Skip Basic

            let valYearly = 0;
            const pct = comp.percentage || 0;
            const amt = comp.amount || 0;

            if (comp.calculationType === 'FLAT_AMOUNT') {
                valYearly = amt * 12;
            } else if (comp.calculationType === 'PERCENTAGE_OF_CTC') {
                valYearly = ctc * (pct / 100);
            } else if (comp.calculationType === 'PERCENTAGE_OF_BASIC') {
                valYearly = basicYearly * (pct / 100);
            }

            // Map to keys expected by SalaryStructure.jsx
            let key = nameLower;
            if (nameLower.includes('hra') || nameLower.includes('house')) key = 'hra';
            else if (nameLower.includes('conveyance')) key = 'conveyance';
            else if (nameLower.includes('medical')) key = 'medical';
            else if (nameLower.includes('special')) key = 'specialAllowance';

            addVal(breakdown.earnings, key, valYearly, comp._id, 'earning');
        });

        // --- STEP 3: DEDUCTIONS ---
        deductionsComps.forEach(comp => {
            const nameLower = comp.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            let valYearly = 0;
            const amt = comp.amountValue || 0;

            if (comp.amountType === 'FIXED') {
                valYearly = amt * 12;
            } else {
                // Percentage Based
                if (comp.calculationBase === 'BASIC') valYearly = basicYearly * (amt / 100);
                else if (comp.calculationBase === 'CTC') valYearly = ctc * (amt / 100);
                else if (comp.calculationBase === 'GROSS') valYearly = ctc * (amt / 100);
            }

            // Map to keys
            let key = nameLower; // default key for unknown deductions

            if (nameLower.includes('pf') && (nameLower.includes('employer') || nameLower.includes('company'))) {
                key = 'pfEmployer';
                addVal(breakdown.employerContributions, key, valYearly, comp._id, 'deduction');
                return;
            }
            else if (nameLower.includes('pf') || nameLower.includes('provident')) key = 'pfEmployee';
            else if (nameLower.includes('esic') && (nameLower.includes('employer') || nameLower.includes('company'))) {
                key = 'esicEmployer';
                addVal(breakdown.employerContributions, key, valYearly, comp._id, 'deduction');
                return;
            }
            else if (nameLower.includes('esic') || nameLower.includes('insurance')) key = 'esicEmployee';
            else if (nameLower.includes('professional') || nameLower.includes('tax')) key = 'professionalTax';

            addVal(breakdown.deductions, key, valYearly, comp._id, 'deduction');
        });

        res.json({
            success: true,
            breakup: breakdown,
            calculatedList // Return the robust list
        });
    } catch (error) {
        console.error("Calculate Breakup Error:", error);
        res.status(500).json({ message: error.message });
    }
};
