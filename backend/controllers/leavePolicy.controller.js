const mongoose = require('mongoose');

// Helper to get models
const getModels = (req) => {
    if (!req.tenantDB) {
        throw new Error('Tenant database not initialized. Please ensure tenant middleware is running.');
    }
    try {
        return {
            LeavePolicy: req.tenantDB.model('LeavePolicy'),
            Employee: req.tenantDB.model('Employee'),
            LeaveBalance: req.tenantDB.model('LeaveBalance')
        };
    } catch (err) {
        console.error('Error in getModels (leavePolicy):', err);
        throw new Error('Failed to get models from tenant database');
    }
};

exports.createPolicy = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            console.error("createPolicy ERROR: Missing user or tenantId in request");
            return res.status(401).json({ error: "unauthorized", message: "User context or tenant not found" });
        }

        const tenantId = req.user.tenantId || req.tenantId;
        if (!tenantId) {
            console.error("createPolicy ERROR: tenantId not available");
            return res.status(400).json({ error: "tenant_missing", message: "Tenant ID is required" });
        }

        // Ensure tenantDB is available
        if (!req.tenantDB) {
            console.error("createPolicy ERROR: Tenant database connection not available");
            return res.status(500).json({ error: "tenant_db_unavailable", message: "Tenant database connection not available" });
        }

        console.log('createPolicy called');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Tenant ID:', tenantId);

        const { LeavePolicy, Employee, LeaveBalance } = getModels(req);
        console.log('Models loaded successfully');

        const { name, applicableTo, rules, departmentIds, roles, specificEmployeeId } = req.body;

        console.log('Creating policy document...');
        const policy = new LeavePolicy({
            tenant: tenantId,
            name,
            applicableTo,
            departmentIds,
            roles,
            rules
        });

        console.log('Saving policy...');
        await policy.save();
        console.log('Policy saved:', policy._id);

        // If specific employee selected, assign immediately
        if (applicableTo === 'Specific' && specificEmployeeId) {
            console.log('Assigning to specific employee:', specificEmployeeId);
            const employee = await Employee.findOne({ _id: specificEmployeeId, tenant: tenantId });
            if (employee) {
                employee.leavePolicy = policy._id;
                await employee.save();
                console.log('Employee policy updated');

                // Init balances
                const year = new Date().getFullYear();
                await LeaveBalance.deleteMany({ employee: specificEmployeeId, year });
                console.log('Old balances deleted');

                const balancePromises = policy.rules.map(rule => {
                    console.log(`Creating balance for ${rule.leaveType}: ${rule.totalPerYear}`);
                    return new LeaveBalance({
                        tenant: tenantId,
                        employee: specificEmployeeId,
                        policy: policy._id,
                        leaveType: rule.leaveType,
                        year,
                        total: rule.totalPerYear,
                        available: rule.totalPerYear // explicit init
                    }).save();
                });
                await Promise.all(balancePromises);
                console.log(`Policy assigned to ${employee.firstName} ${employee.lastName}`);
            } else {
                console.warn(`Specific Employee not found: ${specificEmployeeId}`);
            }
        }

        // If role-based policy, assign to all employees with matching roles
        if (applicableTo === 'Role' && roles && roles.length > 0) {
            console.log('Assigning to employees with roles:', roles);
            const employees = await Employee.find({
                role: { $in: roles },
                tenant: tenantId
            });
            console.log(`Found ${employees.length} employees with matching roles`);

            const year = new Date().getFullYear();
            for (const employee of employees) {
                employee.leavePolicy = policy._id;
                await employee.save();

                // Delete old balances
                await LeaveBalance.deleteMany({ employee: employee._id, year });

                // Create new balances
                for (const rule of policy.rules) {
                    await new LeaveBalance({
                        tenant: tenantId,
                        employee: employee._id,
                        policy: policy._id,
                        leaveType: rule.leaveType,
                        year,
                        total: rule.totalPerYear,
                        used: 0,
                        pending: 0,
                        available: rule.totalPerYear
                    }).save();
                }
                console.log(`✓ Assigned to ${employee.firstName} ${employee.lastName} (${employee.role})`);
            }
        }

        // If All employees, assign to everyone
        if (applicableTo === 'All') {
            console.log('Assigning to all employees');
            const employees = await Employee.find({ tenant: tenantId });
            console.log(`Found ${employees.length} employees`);

            const year = new Date().getFullYear();
            for (const employee of employees) {
                employee.leavePolicy = policy._id;
                await employee.save();

                // Delete old balances
                await LeaveBalance.deleteMany({ employee: employee._id, year });

                // Create new balances
                for (const rule of policy.rules) {
                    await new LeaveBalance({
                        tenant: tenantId,
                        employee: employee._id,
                        policy: policy._id,
                        leaveType: rule.leaveType,
                        year,
                        total: rule.totalPerYear,
                        used: 0,
                        pending: 0,
                        available: rule.totalPerYear
                    }).save();
                }
                console.log(`✓ Assigned to ${employee.firstName} ${employee.lastName}`);
            }
        }

        res.status(201).json(policy);
    } catch (error) {
        console.error('createPolicy ERROR:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
};

exports.getPolicies = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            console.error("getPolicies ERROR: Missing user or tenantId in request");
            return res.status(401).json({ error: "unauthorized", message: "User context or tenant not found" });
        }

        const tenantId = req.user.tenantId || req.tenantId;
        if (!tenantId) {
            console.error("getPolicies ERROR: tenantId not available");
            return res.status(400).json({ error: "tenant_missing", message: "Tenant ID is required" });
        }

        // Ensure tenantDB is available
        if (!req.tenantDB) {
            console.error("getPolicies ERROR: Tenant database connection not available");
            return res.status(500).json({ error: "tenant_db_unavailable", message: "Tenant database connection not available" });
        }

        const { LeavePolicy } = getModels(req);
        const policies = await LeavePolicy.find({ tenant: tenantId }).sort({ createdAt: -1 });
        res.json(policies);
    } catch (error) {
        console.error("getPolicies ERROR:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: error.message || "Failed to fetch leave policies" });
    }
};

exports.getPolicyById = async (req, res) => {
    try {
        const { LeavePolicy } = getModels(req);
        const policy = await LeavePolicy.findOne({ _id: req.params.id, tenant: req.tenantId });
        if (!policy) return res.status(404).json({ error: 'Policy not found' });
        res.json(policy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updatePolicy = async (req, res) => {
    try {
        const { LeavePolicy } = getModels(req);

        // Ensure that if we activate this policy, others of same type/applicability might need checking?
        // Business rule: Only one ACTIVE policy per employee. 
        // But since policy assignment is direct reference (employee.leavePolicy), 
        // we don't need complex overlapping checks unless we change how assignment works.
        // For now, simple update.

        const policy = await LeavePolicy.findOneAndUpdate(
            { _id: req.params.id, tenant: req.tenantId },
            req.body,
            { new: true }
        );
        res.json(policy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.togglePolicyStatus = async (req, res) => {
    try {
        const { LeavePolicy } = getModels(req);
        const { id } = req.params;
        const { isActive } = req.body;

        const policy = await LeavePolicy.findOneAndUpdate(
            { _id: id, tenant: req.tenantId },
            { isActive },
            { new: true }
        );
        res.json(policy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.deletePolicy = async (req, res) => {
    try {
        const { LeavePolicy, Employee, LeaveBalance } = getModels(req);
        const policyId = req.params.id;

        console.log(`Deleting policy: ${policyId}`);

        // Find the policy first
        const policy = await LeavePolicy.findOne({ _id: policyId, tenant: req.tenantId });
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        // 1. Remove policy reference from all employees
        const employeesUpdated = await Employee.updateMany(
            { leavePolicy: policyId, tenant: req.tenantId },
            { $unset: { leavePolicy: "" } }
        );
        console.log(`Removed policy from ${employeesUpdated.modifiedCount} employees`);

        // 2. Delete all leave balances associated with this policy
        const balancesDeleted = await LeaveBalance.deleteMany({
            policy: policyId,
            tenant: req.tenantId
        });
        console.log(`Deleted ${balancesDeleted.deletedCount} leave balances`);

        // 3. Delete the policy itself
        await LeavePolicy.findOneAndDelete({ _id: policyId, tenant: req.tenantId });
        console.log('Policy deleted successfully');

        res.json({
            message: 'Policy deleted successfully',
            employeesAffected: employeesUpdated.modifiedCount,
            balancesDeleted: balancesDeleted.deletedCount
        });
    } catch (error) {
        console.error('Delete policy error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Assign policy to employee and initialize balances
exports.assignPolicyToEmployee = async (req, res) => {
    try {
        const { Employee, LeavePolicy, LeaveBalance } = getModels(req);
        const { employeeId, policyId } = req.body;

        const employee = await Employee.findOne({ _id: employeeId, tenant: req.tenantId });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const policy = await LeavePolicy.findOne({ _id: policyId, tenant: req.tenantId });
        if (!policy) return res.status(404).json({ error: 'Policy not found' });

        employee.leavePolicy = policy._id;
        await employee.save();

        // Init balances
        const year = new Date().getFullYear();

        // Remove old balances for this year if re-assigning?
        await LeaveBalance.deleteMany({ employee: employeeId, year });

        const balancePromises = policy.rules.map(rule => {
            console.log(`Assigning balance for ${rule.leaveType}: ${rule.totalPerYear} to ${employeeId}`);
            return new LeaveBalance({
                tenant: req.tenantId,
                employee: employeeId,
                policy: policyId,
                leaveType: rule.leaveType,
                year,
                total: rule.totalPerYear,
                available: rule.totalPerYear // explicit init
            }).save();
        });

        await Promise.all(balancePromises);

        res.json({ message: 'Policy assigned and balances initialized', policy });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
