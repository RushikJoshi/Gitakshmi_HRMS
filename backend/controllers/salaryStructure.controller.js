const { calculateSalaryBreakup, suggestSalaryBreakup } = require('../services/salaryBreakupCalculator');

// Helper to get models from tenant database
function getModels(req) {
    if (!req.tenantDB) {
        throw new Error("Tenant database connection not available");
    }
    const db = req.tenantDB;
    return {
        Applicant: db.model("Applicant"),
        SalaryStructure: db.model("SalaryStructure"),
        SalaryComponent: db.model("SalaryComponent"),
        DeductionMaster: db.model("DeductionMaster"),
        BenefitComponent: db.model("BenefitComponent")
    };
}

exports.suggestSalaryStructure = async (req, res) => {
    try {
        const { enteredCTC } = req.body;

        if (!enteredCTC) {
            return res.status(400).json({ message: "Annual CTC is required for suggestion." });
        }

        const models = getModels(req);

        // Fetch ALL available components in parallel
        const [earnings, deductions, benefits] = await Promise.all([
            models.SalaryComponent.find({ isActive: true }).lean(),
            models.DeductionMaster.find({ isActive: true }).lean(),
            models.BenefitComponent.find({ isActive: true }).lean()
        ]);

        console.log(`[SUGGEST_CONTROLLER] DB Fetch Results:`, {
            earningsNames: earnings.map(e => e.name),
            deductionsNames: deductions.map(d => d.name),
            benefitsNames: benefits.map(b => b.name)
        });

        const suggestion = suggestSalaryBreakup({
            enteredCTC: Number(enteredCTC),
            availableEarnings: earnings,
            availableDeductions: deductions,
            availableEmployerContributions: benefits
        });

        console.log(`[SUGGEST_CONTROLLER] Suggestion generated for CTC ${enteredCTC}:`, {
            eCount: suggestion.earnings.length,
            dCount: suggestion.deductions.length,
            bCount: suggestion.employerContributions.length
        });

        res.json({
            success: true,
            data: suggestion
        });

    } catch (error) {
        console.error("Suggest Salary Structure Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.createSalaryStructure = async (req, res) => {
    try {
        const { candidateId, calculationMode, enteredCTC, earnings, deductions, employerContributions } = req.body;

        if (!candidateId) {
            return res.status(400).json({ message: "Candidate ID is required" });
        }

        if (!enteredCTC || isNaN(Number(enteredCTC))) {
            return res.status(400).json({ message: "Annual CTC (Source of Truth) is required." });
        }

        const { Applicant, SalaryStructure } = getModels(req);

        // --- PERFORM AGGREGATION & VALIDATION ---
        const result = calculateSalaryBreakup({
            enteredCTC: Number(enteredCTC),
            earnings: Array.isArray(earnings) ? earnings : [],
            deductions: Array.isArray(deductions) ? deductions : [],
            employerContributions: Array.isArray(employerContributions) ? employerContributions : []
        });

        // REJECT if mismatch only in AUTO mode (Optional: you might want to allow it in MANUAL)
        // User said: "In MANUAL mode, mismatch is allowed but highlighted"
        // So we only reject if mode is AUTO.
        if (calculationMode === 'AUTO' && !result.isValid) {
            return res.status(400).json({
                error: "CTC_MISMATCH",
                message: `Calculated CTC (₹${result.receivedCTC.toLocaleString()}) does not match Entered CTC (₹${result.expectedCTC.toLocaleString()}). Difference: ₹${result.mismatchAmount.toLocaleString()}`,
                expectedCTC: result.expectedCTC,
                receivedCTC: result.receivedCTC
            });
        }

        // --- PERSIST TO SINGLE SOURCE OF TRUTH (SalaryStructure Collection) ---
        const structureData = {
            candidateId,
            tenantId: req.tenantId,
            calculationMode: calculationMode || 'AUTO',
            earnings: result.earnings.map(e => ({
                key: e.componentId || e._id,
                label: e.name,
                monthly: e.amount,
                yearly: Number(e.amount) * 12,
                type: 'earning'
            })),
            deductions: result.deductions.map(d => ({
                key: d.componentId || d._id,
                label: d.name,
                monthly: d.amount,
                yearly: Number(d.amount) * 12,
                type: 'deduction'
            })),
            employerBenefits: result.employerContributions.map(b => ({
                key: b.componentId || b._id,
                label: b.name,
                monthly: b.amount,
                yearly: Number(b.amount) * 12,
                type: 'employer_benefit'
            })),
            totals: {
                grossEarnings: result.monthly.grossEarnings,
                totalDeductions: result.monthly.totalDeductions,
                netSalary: result.monthly.netSalary,
                employerBenefits: result.monthly.employerContributions,
                monthlyCTC: Math.round((result.annual.ctc / 12) * 100) / 100,
                annualCTC: result.annual.ctc
            },
            updatedAt: new Date()
        };

        const updatedStructure = await SalaryStructure.findOneAndUpdate(
            { candidateId },
            { $set: structureData },
            { new: true, upsert: true }
        );

        // Also update the Applicant's flat CTC and FULL SNAPSHOT for immediate fetch in list views/letters
        // We populate a detailed salarySnapshot so the Applicants list view and letter generation have access to all fields.
        const snapshot = {
            earnings: structureData.earnings.map(e => ({
                name: e.label,
                monthlyAmount: e.monthly,
                annualAmount: e.yearly
            })),
            employeeDeductions: structureData.deductions.map(d => ({
                name: d.label,
                monthlyAmount: d.monthly,
                annualAmount: d.yearly
            })),
            employerContributions: structureData.employerBenefits.map(b => ({
                name: b.label,
                monthlyAmount: b.monthly,
                annualAmount: b.yearly
            })),
            grossA: {
                monthly: result.monthly.grossEarnings,
                yearly: result.monthly.grossEarnings * 12
            },
            takeHome: {
                monthly: result.monthly.netSalary,
                yearly: result.monthly.netSalary * 12
            },
            ctc: {
                monthly: Math.round(result.annual.ctc / 12),
                yearly: result.annual.ctc
            },
            totals: {
                grossEarnings: result.monthly.grossEarnings,
                totalDeductions: result.monthly.totalDeductions,
                netSalary: result.monthly.netSalary,
                employerBenefits: result.monthly.employerContributions,
                monthlyCTC: Math.round(result.annual.ctc / 12),
                annualCTC: result.annual.ctc
            },
            calculatedAt: new Date()
        };

        await Applicant.findByIdAndUpdate(candidateId, {
            $set: {
                ctc: result.receivedCTC,
                salarySnapshot: snapshot,
                salaryStructureId: updatedStructure._id
            }
        });

        res.json({
            success: true,
            message: "Salary structure persisted to single source of truth.",
            data: updatedStructure
        });

    } catch (error) {
        console.error("Create Salary Structure Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getSalaryStructure = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const { SalaryStructure } = getModels(req);

        const structure = await SalaryStructure.findOne({ candidateId });

        if (!structure) {
            return res.status(404).json({ message: "Salary structure not found for this candidate." });
        }

        res.json(structure);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
