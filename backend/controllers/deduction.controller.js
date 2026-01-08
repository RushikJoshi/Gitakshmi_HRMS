/**
 * Get models from tenant database
 */
function getModels(req) {
    if (!req.tenantDB) {
        throw new Error('Tenant database connection not available');
    }
    try {
        return {
            DeductionMaster: req.tenantDB.model('DeductionMaster'),
            EmployeeDeduction: req.tenantDB.model('EmployeeDeduction')
        };
    } catch (err) {
        console.error('[getModels] Error retrieving models in deduction.controller:', err.message);
        throw new Error(`Failed to retrieve models from tenant database: ${err.message}`);
    }
}

/**
 * @desc Create a new deduction master
 * @route POST /api/deductions/create
 */
exports.createDeduction = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { DeductionMaster } = getModels(req);
        const { name, category, amountType, amountValue, calculationBase, recurring } = req.body;

        if (!name || !category) {
            return res.status(400).json({ success: false, error: 'Name and category are required' });
        }

        const existing = await DeductionMaster.findOne({ tenantId, name });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Deduction with this name already exists for this tenant.' });
        }

        const deduction = new DeductionMaster({
            tenantId,
            name,
            category,
            amountType,
            amountValue,
            calculationBase,
            recurring,
            createdBy: req.user._id || req.user.id
        });

        await deduction.save();
        res.status(201).json({ success: true, data: deduction });
    } catch (err) {
        console.error('❌ [CREATE DEDUCTION] Error:', err);
        console.error('❌ [CREATE DEDUCTION] Stack:', err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc Get all deductions for a tenant
 * @route GET /api/deductions
 */
exports.getDeductions = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { DeductionMaster } = getModels(req);
        const { category, recurring } = req.query;

        const filter = { tenantId };
        if (category) filter.category = category;
        if (recurring !== undefined) filter.recurring = recurring === 'true';

        const deductions = await DeductionMaster.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: deductions });
    } catch (err) {
        console.error('❌ [GET DEDUCTIONS] Error:', err);
        console.error('❌ [GET DEDUCTIONS] Stack:', err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc Update a deduction master
 */
exports.updateDeduction = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { DeductionMaster } = getModels(req);
        const { id } = req.params;

        const deduction = await DeductionMaster.findOneAndUpdate(
            { _id: id, tenantId },
            req.body,
            { new: true, runValidators: true }
        );

        if (!deduction) {
            return res.status(404).json({ success: false, error: 'Deduction not found.' });
        }

        res.status(200).json({ success: true, data: deduction });
    } catch (err) {
        console.error('❌ [UPDATE DEDUCTION] Error:', err);
        console.error('❌ [UPDATE DEDUCTION] Stack:', err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc Update deduction status
 */
exports.updateStatus = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { DeductionMaster } = getModels(req);
        const { id } = req.params;
        const { isActive } = req.body;

        const deduction = await DeductionMaster.findOneAndUpdate(
            { _id: id, tenantId },
            { isActive },
            { new: true }
        );

        if (!deduction) {
            return res.status(404).json({ success: false, error: 'Deduction not found.' });
        }

        res.status(200).json({ success: true, data: deduction });
    } catch (err) {
        console.error('❌ [UPDATE DEDUCTION STATUS] Error:', err);
        console.error('❌ [UPDATE DEDUCTION STATUS] Stack:', err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc Assign deduction to an employee
 */
exports.assignToEmployee = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { DeductionMaster, EmployeeDeduction } = getModels(req);
        const { employeeId, deductionId, startDate, endDate, customValue } = req.body;

        const master = await DeductionMaster.findOne({ _id: deductionId, tenantId });
        if (!master) {
            return res.status(404).json({ success: false, error: 'Deduction master not found.' });
        }

        const assignment = new EmployeeDeduction({
            tenantId,
            employeeId,
            deductionId,
            startDate,
            endDate,
            customValue // Can override amountValue for this specific employee
        });

        await assignment.save();
        res.status(201).json({ success: true, data: assignment });
    } catch (err) {
        console.error('❌ [ASSIGN DEDUCTION] Error:', err);
        console.error('❌ [ASSIGN DEDUCTION] Stack:', err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc Get employee assignments
 */
exports.getEmployeeDeductions = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { EmployeeDeduction } = getModels(req);
        const { employeeId } = req.params;

        const deductions = await EmployeeDeduction.find({ tenantId, employeeId })
            .populate('deductionId')
            .sort({ startDate: -1 });

        res.status(200).json({ success: true, data: deductions });
    } catch (err) {
        console.error('❌ [GET EMPLOYEE DEDUCTIONS] Error:', err);
        console.error('❌ [GET EMPLOYEE DEDUCTIONS] Stack:', err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
};
// ... existing code ...

/**
 * @desc Delete a deduction master
 * @route DELETE /api/deductions/:id
 */
exports.deleteDeduction = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            return res.status(401).json({ success: false, error: "unauthorized", message: "User context not found" });
        }

        const tenantId = req.user.tenantId;
        if (!req.tenantDB) {
            return res.status(500).json({ success: false, error: "tenant_db_unavailable", message: "Tenant database not available" });
        }

        const { DeductionMaster } = getModels(req);
        const { id } = req.params;

        const deduction = await DeductionMaster.findOneAndDelete({ _id: id, tenantId });

        if (!deduction) {
            return res.status(404).json({ success: false, error: 'Deduction not found.' });
        }

        res.status(200).json({ success: true, message: 'Deduction deleted successfully.' });
    } catch (err) {
        console.error('❌ [DELETE DEDUCTION] Error:', err);
        console.error('❌ [DELETE DEDUCTION] Stack:', err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
};
