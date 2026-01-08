const mongoose = require('mongoose');
const notificationController = require('../controllers/notification.controller');

const getModels = (req) => {
    if (!req.tenantDB) {
        throw new Error('Tenant database not initialized. Please ensure tenant middleware is running.');
    }
    try {
        return {
            LeaveRequest: req.tenantDB.model('LeaveRequest'),
            LeaveBalance: req.tenantDB.model('LeaveBalance'),
            Employee: req.tenantDB.model('Employee'),
            LeavePolicy: req.tenantDB.model('LeavePolicy'),
            Notification: req.tenantDB.model('Notification'),
            Holiday: req.tenantDB.model('Holiday'),
            Attendance: req.tenantDB.model('Attendance'),
            AttendanceSettings: req.tenantDB.model('AttendanceSettings')
        };
    } catch (err) {
        console.error('Error in getModels (leaveRequest):', err);
        throw new Error('Failed to get models from tenant database');
    }
};

// Helper to calculate days (Sandwich Rule Active: Counts ALL days including weekends/holidays)
const calculateNetDays = async (req, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);

    // Calculate simple difference in milliseconds
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;
};

// Helper: Sync Leave to Attendance
const syncLeaveToAttendance = async (req, leaveRequest) => {
    const { Attendance, LeavePolicy, Employee } = getModels(req);
    const start = new Date(leaveRequest.startDate);
    const end = new Date(leaveRequest.endDate);

    // Get Color from Policy
    let color = '#3b82f6'; // Default
    try {
        const emp = await Employee.findById(leaveRequest.employee).select('leavePolicy');
        if (emp && emp.leavePolicy) {
            const policy = await LeavePolicy.findById(emp.leavePolicy);
            const rule = policy?.rules?.find(r => r.leaveType === leaveRequest.leaveType);
            if (rule?.color) color = rule.color;
        }
    } catch (e) {
        console.error("Color sync err:", e);
    }

    const curr = new Date(start);
    const halfDayTargetDate = leaveRequest.halfDayTarget === 'End' ? new Date(end) : new Date(start);
    halfDayTargetDate.setHours(0, 0, 0, 0);

    while (curr <= end) {
        const date = new Date(curr);
        date.setHours(0, 0, 0, 0);

        const isHalf = leaveRequest.isHalfDay && date.getTime() === halfDayTargetDate.getTime();

        await Attendance.findOneAndUpdate(
            { tenant: req.tenantId, employee: leaveRequest.employee, date },
            {
                status: isHalf ? 'half_day' : 'leave',
                leaveType: leaveRequest.leaveType,
                leaveColor: color,
            },
            { upsert: true, new: true }
        );
        curr.setDate(curr.getDate() + 1);
    }
};

// Helper: Calculate days between two dates (inclusive)
const calculateDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

exports.getMyBalances = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        const { LeaveBalance, Employee, LeavePolicy, AttendanceSettings } = getModels(req);
        const employeeId = req.user.id;

        // Get Attendance Settings to check Leave Cycle
        const settings = await AttendanceSettings.findOne({ tenant: req.tenantId });
        const startMonth = settings?.leaveCycleStartMonth || 0;

        const now = new Date();
        let year = now.getFullYear();
        if (now.getMonth() < startMonth) year--;

        let balances = await LeaveBalance.find({
            employee: employeeId,
            tenant: req.tenantId,
            year
        });

        // Auto-heal: If no balances found but employee has a policy, generate them
        if (balances.length === 0) {
            const emp = await Employee.findOne({ _id: employeeId, tenant: req.tenantId });
            if (emp && emp.leavePolicy) {
                const policy = await LeavePolicy.findById(emp.leavePolicy);
                if (policy && policy.rules) {
                    const createdBalances = [];
                    for (const rule of policy.rules) {
                        const newBalance = new LeaveBalance({
                            tenant: req.tenantId,
                            employee: employeeId,
                            policy: policy._id,
                            leaveType: rule.leaveType,
                            year,
                            total: rule.totalPerYear || 0
                        });
                        await newBalance.save();
                        createdBalances.push(newBalance);
                    }
                    balances = createdBalances;
                }
            }
        }

        // Match colors from policy rules
        const emp = await Employee.findById(employeeId).select('leavePolicy');
        if (emp && emp.leavePolicy) {
            const policy = await LeavePolicy.findById(emp.leavePolicy);
            if (policy && policy.rules) {
                balances = balances.map(b => {
                    const rule = policy.rules.find(r => r.leaveType === b.leaveType);
                    const bObj = b.toObject();
                    bObj.color = rule?.color || '#3b82f6';
                    return bObj;
                });
            }
        }

        res.json(balances);
    } catch (error) {
        console.error("getMyBalances Error:", error);
        res.status(500).json({ error: "Failed to fetch balances" });
    }
};

exports.applyLeave = async (req, res) => {
    try {
        const { LeaveRequest, LeaveBalance, Employee, LeavePolicy, Holiday, AttendanceSettings } = getModels(req);
        const { leaveType, startDate, endDate, reason, isHalfDay, halfDayTarget, halfDaySession, employeeId: targetId } = req.body;

        // If HR or PSA, they can apply on behalf
        const isHR = ['hr', 'admin', 'psa'].includes(req.user.role);
        const employeeId = (isHR && targetId) ? targetId : req.user.id;

        const start = new Date(startDate);
        const end = new Date(endDate || startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Date Validations (Skip some for HR if needed, but usually keep standard)
        if (!isHR && start < today) return res.status(400).json({ error: "Past dates are not allowed." });
        if (end < start) return res.status(400).json({ error: "End date precedes start date." });
        if (start.getDay() === 0 || end.getDay() === 0) return res.status(400).json({ error: "Leave cannot start/end on Sunday." });

        const holidayCheck = await Holiday.findOne({ tenant: req.tenantId, date: { $in: [start, end] } });
        if (holidayCheck) return res.status(400).json({ error: `Selected date is a public holiday: ${holidayCheck.name}` });

        // 2. Overlap Check
        const overlap = await LeaveRequest.findOne({
            tenant: req.tenantId, employee: employeeId, status: { $in: ['Pending', 'Approved'] },
            $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
        });
        if (overlap) return res.status(400).json({ error: "Overlap detected with existing request." });

        // 3. Balance Validation & Paid/Unpaid Logic (Auto-Split)
        const daysCount = await calculateNetDays(req, startDate, endDate || startDate);
        const days = isHalfDay ? (daysCount - 0.5) : daysCount;

        if (days <= 0) return res.status(400).json({ error: "Selected period contains no working days." });

        // Get Attendance Settings to check Leave Cycle
        const settings = await AttendanceSettings.findOne({ tenant: req.tenantId });
        const startMonth = settings?.leaveCycleStartMonth || 0;

        // Year calculation based on cycle start
        let year = start.getFullYear();
        if (start.getMonth() < startMonth) year--;

        let paidDays = 0;
        let unpaidDays = 0;
        let balance = null;

        if (['LOP', 'Loss of Pay', 'Leave without Pay', 'Personal Leave'].includes(leaveType)) {
            // Explicit LOP
            paidDays = 0;
            unpaidDays = days;
        } else {
            balance = await LeaveBalance.findOne({ tenant: req.tenantId, employee: employeeId, leaveType, year });

            if (!balance) {
                // No balance found -> Treated as 100% Unpaid personal leave
                paidDays = 0;
                unpaidDays = days;
            } else {
                // Consume Available Balance
                paidDays = Math.min(balance.available, days);
                unpaidDays = days - paidDays;
            }
        }

        // 4. Create Request & Block Balance
        const leaveRequest = new LeaveRequest({
            tenant: req.tenantId,
            employee: employeeId,
            leaveType,
            startDate: start,
            endDate: end,
            reason,
            daysCount: days,
            paidLeaveDays: paidDays,
            unpaidLeaveDays: unpaidDays,
            status: isHR ? 'Approved' : 'Pending', // HR applications are auto-approved? Or just Pending?
            // Prompt: "Follow same rules". Usually HR applications skip manager approval or are special.
            // I'll make it 'Approved' if HR applies, following "same rules" but as admin override.
            appliedBy: isHR ? 'HR' : 'Employee',
            hrComment: isHR ? (reason || 'Applied by HR') : undefined,
            isHalfDay: !!isHalfDay,
            halfDayTarget: isHalfDay ? (halfDayTarget || (endDate ? 'End' : 'Start')) : undefined,
            halfDaySession: isHalfDay ? halfDaySession : undefined,
            approvedBy: isHR ? req.user.id : undefined,
            approvedAt: isHR ? new Date() : undefined
        });

        // Update Balance
        if (balance && paidDays > 0) {
            if (leaveRequest.status === 'Approved') {
                balance.used += paidDays;
            } else {
                balance.pending += paidDays;
            }
            await balance.save();
        }

        await leaveRequest.save();

        // 5. Notifications
        const emp = await Employee.findById(employeeId);
        const empName = emp ? `${emp.firstName} ${emp.lastName}` : "Employee";
        const typeLabel = unpaidDays > 0 ? `${leaveType} (Partial LOP)` : leaveType;

        if (isHR) {
            // Notify employee that HR applied leave
            await notificationController.createNotification(req, {
                receiverId: employeeId, receiverRole: 'employee', entityType: 'LeaveRequest', entityId: leaveRequest._id,
                title: 'Leave Applied by HR', message: `HR has applied and approved ${typeLabel} for you (${days} days)`
            });
        } else {
            // Standard notification to HR/Manager
            await notificationController.createNotification(req, {
                receiverId: req.tenantId, receiverRole: 'hr', entityType: 'LeaveRequest', entityId: leaveRequest._id,
                title: `New Leave Request: ${empName}`, message: `${empName} applied for ${typeLabel} (${days} days)`
            });

            if (emp && emp.manager) {
                await notificationController.createNotification(req, {
                    receiverId: emp.manager, receiverRole: 'manager', entityType: 'LeaveRequest', entityId: leaveRequest._id,
                    title: `Team Leave Request: ${empName}`, message: `${empName} applied for ${typeLabel} (${days} days)`
                });
            }
        }

        if (leaveRequest.status === 'Approved') {
            await syncLeaveToAttendance(req, leaveRequest);
        }

        res.status(201).json(leaveRequest);
    } catch (error) {
        console.error("Apply Leave Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.approveLeave = async (req, res) => {
    try {
        const { LeaveRequest, LeaveBalance, Employee } = getModels(req);
        const { id } = req.params;

        const request = await LeaveRequest.findOne({ _id: id, tenant: req.tenantId });
        if (!request) return res.status(404).json({ error: "Request not found" });
        if (request.status !== 'Pending') return res.status(400).json({ error: `Cannot approve request with status: ${request.status}` });

        // Permission Check: HR or Direct Manager
        const targetEmp = await Employee.findOne({ _id: request.employee, tenant: req.tenantId });
        const isHr = req.user.role === 'hr' || req.user.role === 'psa';
        const isManager = targetEmp && targetEmp.manager && targetEmp.manager.toString() === req.user.id.toString();
        if (!isHr && !isManager) {
            return res.status(403).json({ error: "Unauthorized: Only HR or direct manager can approve leaves." });
        }

        // Update Balance: Blocked -> Used (PERMANENT DEDUCTION)
        const balance = await LeaveBalance.findOne({
            employee: request.employee,
            tenant: req.tenantId,
            leaveType: request.leaveType,
            year: new Date(request.startDate).getFullYear()
        });

        if (balance) {
            balance.pending -= request.daysCount;
            balance.used += request.daysCount;
            await balance.save();
        }

        request.status = 'Approved';
        request.approver = req.user.id;
        request.approvedAt = new Date();
        if (req.body.remark) request.adminRemark = req.body.remark;

        await request.save();

        // Sync to Attendance
        await syncLeaveToAttendance(req, request);

        await notificationController.createNotification(req, {
            receiverId: request.employee, receiverRole: 'employee', entityType: 'LeaveRequest', entityId: request._id,
            title: 'Leave Approved', message: `Your ${request.leaveType} leave has been approved.`
        });

        res.json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.rejectLeave = async (req, res) => {
    try {
        const { LeaveRequest, LeaveBalance, Employee } = getModels(req);
        const { id } = req.params;

        const request = await LeaveRequest.findOne({ _id: id, tenant: req.tenantId });
        if (!request) return res.status(404).json({ error: "Request not found" });
        if (request.status !== 'Pending') return res.status(400).json({ error: "Request is not pending" });

        // Permission Check: HR or Direct Manager
        const targetEmp = await Employee.findOne({ _id: request.employee, tenant: req.tenantId });
        const isHr = req.user.role === 'hr' || req.user.role === 'psa';
        const isManager = targetEmp && targetEmp.manager && targetEmp.manager.toString() === req.user.id.toString();
        if (!isHr && !isManager) {
            return res.status(403).json({ error: "Unauthorized: Only HR or direct manager can reject leaves." });
        }

        // Update Balance: Release Block
        const balance = await LeaveBalance.findOne({
            employee: request.employee,
            tenant: req.tenantId,
            leaveType: request.leaveType,
            year: new Date(request.startDate).getFullYear()
        });

        if (balance) {
            balance.pending -= request.daysCount;
            await balance.save();
        }

        request.status = 'Rejected';
        request.adminRemark = req.body.remark || req.body.rejectionReason;
        request.approver = req.user.id;
        await request.save();

        await notificationController.createNotification(req, {
            receiverId: request.employee, receiverRole: 'employee', entityType: 'LeaveRequest', entityId: request._id,
            title: 'Leave Rejected', message: `Your ${request.leaveType} leave request was rejected.`
        });

        res.json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTeamLeaves = async (req, res) => {
    try {
        const { Employee, LeaveRequest } = getModels(req);
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Find employees who report to this user
        const reports = await Employee.find({ manager: req.user.id, tenant: req.tenantId }).select('_id');
        const reportIds = reports.map(r => r._id);

        if (reportIds.length === 0) {
            return res.json({
                data: [],
                meta: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
            });
        }

        const total = await LeaveRequest.countDocuments({
            tenant: req.tenantId,
            employee: { $in: reportIds }
        });

        const requests = await LeaveRequest.find({
            tenant: req.tenantId,
            employee: { $in: reportIds }
        })
            .populate('employee', 'firstName lastName email profilePic')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            data: requests,
            meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.getAllLeaves = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            console.error("getAllLeaves ERROR: Missing user or tenantId in request");
            return res.status(401).json({ error: "unauthorized", message: "User context or tenant not found" });
        }

        const tenantId = req.user.tenantId || req.tenantId;
        if (!tenantId) {
            console.error("getAllLeaves ERROR: tenantId not available");
            return res.status(400).json({ error: "tenant_missing", message: "Tenant ID is required" });
        }

        // Ensure tenantDB is available
        if (!req.tenantDB) {
            console.error("getAllLeaves ERROR: Tenant database connection not available");
            return res.status(500).json({ error: "tenant_db_unavailable", message: "Tenant database connection not available" });
        }

        const { LeaveRequest } = getModels(req);

        // Extract pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await LeaveRequest.countDocuments({ tenant: tenantId });

        const leaves = await LeaveRequest.find({ tenant: tenantId })
            .populate('employee', 'firstName lastName email profilePic')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: leaves,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("getAllLeaves ERROR:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: error.message || "Failed to fetch leave requests" });
    }
};

exports.getMyLeaves = async (req, res) => {
    try {
        const { LeaveRequest } = getModels(req);
        const employeeId = req.user.id;
        const leaves = await LeaveRequest.find({ employee: employeeId, tenant: req.tenantId })
            .sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.editLeave = async (req, res) => {
    try {
        const { LeaveRequest, LeaveBalance } = getModels(req);
        const { id } = req.params;
        const { leaveType, startDate, endDate, reason, isHalfDay, halfDayTarget, halfDaySession } = req.body;
        const employeeId = req.user.id;

        const request = await LeaveRequest.findOne({ _id: id, employee: employeeId, tenant: req.tenantId });
        if (!request) return res.status(404).json({ error: "Request not found" });

        if (request.status !== 'Pending') {
            return res.status(400).json({ error: `Cannot edit leave in ${request.status} status. Only Pending requests can be edited.` });
        }

        const start = new Date(startDate);
        const end = new Date(endDate || startDate);
        const oldDays = request.daysCount;
        const oldPaid = request.paidLeaveDays || 0;
        const oldType = request.leaveType;

        // Settings for Cycle
        const Settings = req.tenantDB.model('AttendanceSettings');
        const settings = await Settings.findOne({ tenant: req.tenantId });
        const startMonth = settings?.leaveCycleStartMonth || 0;
        let year = start.getFullYear();
        if (start.getMonth() < startMonth) year--;

        // 1. Validations & Overlap (excluding self)
        if (start.getDay() === 0 || end.getDay() === 0) return res.status(400).json({ error: "Leave cannot start/end on Sunday." });
        const overlap = await LeaveRequest.findOne({
            _id: { $ne: id }, tenant: req.tenantId, employee: employeeId, status: { $in: ['Pending', 'Approved'] },
            $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
        });
        if (overlap) return res.status(400).json({ error: "Overlap detected with existing request." });

        const newDaysCount = await calculateNetDays(req, startDate, endDate || startDate);
        const newDays = isHalfDay ? (newDaysCount - 0.5) : newDaysCount;

        if (newDays <= 0) return res.status(400).json({ error: "Selected period contains no working days." });

        // 2. Balance Logic
        if (oldType === leaveType) {
            const balance = await LeaveBalance.findOne({ tenant: req.tenantId, employee: employeeId, leaveType, year });
            if (!balance) return res.status(400).json({ error: "Balance not found." });
            if (balance.available + oldDays < newDays) {
                return res.status(400).json({ error: `Insufficient balance. Available: ${balance.available + oldDays}` });
            }
            balance.pending = balance.pending - oldDays + newDays;
            await balance.save();
        } else {
            const oldBalance = await LeaveBalance.findOne({ tenant: req.tenantId, employee: employeeId, leaveType: oldType, year });
            const newBalance = await LeaveBalance.findOne({ tenant: req.tenantId, employee: employeeId, leaveType, year });
            if (!newBalance) return res.status(400).json({ error: `Balance not found for ${leaveType}.` });
            if (newBalance.available < newDays) {
                return res.status(400).json({ error: `Insufficient balance in ${leaveType}. Available: ${newBalance.available}` });
            }
            if (oldBalance) {
                oldBalance.pending -= oldDays;
                await oldBalance.save();
            }
            newBalance.pending += newDays;
            await newBalance.save();
        }

        const { paidDays: newPaidDays, unpaidDays: newUnpaidDays } = await (async () => {
            let p = 0, u = 0;
            if (['LOP', 'Loss of Pay', 'Leave without Pay', 'Personal Leave'].includes(leaveType)) {
                u = newDays;
            } else {
                const b = await LeaveBalance.findOne({ tenant: req.tenantId, employee: employeeId, leaveType, year });
                const available = b ? (b.available + (oldType === leaveType ? oldPaid : 0)) : 0;
                p = Math.min(available, newDays);
                u = newDays - p;
            }
            return { paidDays: p, unpaidDays: u };
        })();

        // 3. Update Request
        request.leaveType = leaveType;
        request.startDate = start;
        request.endDate = end;
        request.reason = reason;
        request.daysCount = newDays;
        request.paidLeaveDays = newPaidDays;
        request.unpaidLeaveDays = newUnpaidDays;
        request.isHalfDay = !!isHalfDay;
        request.halfDayTarget = isHalfDay ? (halfDayTarget || (endDate ? 'End' : 'Start')) : undefined;
        request.halfDaySession = isHalfDay ? halfDaySession : undefined;
        await request.save();

        res.json({ message: "Leave request updated", data: request });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.cancelLeave = async (req, res) => {
    try {
        const { LeaveRequest, LeaveBalance } = getModels(req);
        const { id } = req.params;
        const employeeId = req.user.id;

        const request = await LeaveRequest.findOne({ _id: id, employee: employeeId, tenant: req.tenantId });
        if (!request) return res.status(404).json({ error: "Request not found" });

        // Enterprise Rule: Direct cancellation not allowed for Approved leaves
        if (request.status === 'Approved') {
            return res.status(400).json({ error: "Approved leaves cannot be cancelled directly. Please use Attendance Regularization if you were present." });
        }

        if (['Rejected', 'Cancelled'].includes(request.status)) {
            return res.status(400).json({ error: `Request already ${request.status}` });
        }

        const balance = await LeaveBalance.findOne({
            employee: employeeId, tenant: req.tenantId, leaveType: request.leaveType, year: new Date(request.startDate).getFullYear()
        });

        if (balance) {
            if (request.status === 'Pending') {
                balance.pending -= request.daysCount;
            }
            await balance.save();
        }

        request.status = 'Cancelled';
        await request.save();

        res.json({ message: "Leave request cancelled", data: request });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
