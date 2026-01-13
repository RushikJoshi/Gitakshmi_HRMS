const mongoose = require('mongoose');
const getTenantDB = require('../utils/tenantDB');

class RecruitmentService {

    // Helper to resolve Tenant DB models dynamically
    async getModels(tenantId) {
        if (!tenantId) throw new Error("Tenant ID is required for Recruitment Service");
        const db = await getTenantDB(tenantId);
        return {
            Requirement: db.model('Requirement'),
            Applicant: db.model('Applicant'),
            // Interview: db.model('Interview'),
            // Candidate: db.model('Candidate')
        };
    }

    async createRequirement(tenantId, data, userId) {
        try {
            console.log('[DEBUG] createRequirement START', { tenantId, userId });
            const { Requirement } = await this.getModels(tenantId);

            // Auto-generate Job ID
            const db = await getTenantDB(tenantId);
            let Counter;

            console.log('[DEBUG] Retrieving Counter model...');
            // Check if model exists safely
            if (db.models.Counter) {
                Counter = db.model('Counter');
            } else {
                console.log('[DEBUG] Counter model not found on DB, registering manually...');
                const CounterSchema = require('../models/Counter');
                Counter = db.model('Counter', CounterSchema);
            }

            console.log('[DEBUG] Incrementing Counter for Tenant:', tenantId);
            const counter = await Counter.findOneAndUpdate(
                { key: `job_opening_id_${tenantId}` }, // Tenant-scoped key
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            console.log('[DEBUG] Counter Result:', counter);

            const jobOpeningId = `JOB-${counter.seq.toString().padStart(4, '0')}`;
            console.log('[DEBUG] Generated Job ID:', jobOpeningId);

            const requirement = new Requirement({
                ...data,
                tenant: tenantId,
                jobOpeningId,
                createdBy: userId
            });
            return await requirement.save();
        } catch (err) {
            console.error('[CRITICAL ERROR] createRequirement failed:', err);
            throw err; // Re-throw to controller
        }
    }

    async getRequirements(tenantId, query) {
        const { Requirement } = await this.getModels(tenantId);
        const filter = { tenant: tenantId };

        // Enhance safe filtering logic...
        if (query.status) filter.status = query.status;
        if (query.visibility) filter.visibility = query.visibility;

        if (query && (query.$or || query.visibility || query.status)) {
            Object.assign(filter, query);
        }

        // Pagination Logic
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Requirement.countDocuments(filter);
        const requirements = await Requirement.find(filter)
            .sort({ updatedAt: -1 }) // Sort by last updated, newest first
            .skip(skip)
            .limit(limit);

        return {
            requirements,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getRequirementById(tenantId, id) {
        const { Requirement } = await this.getModels(tenantId);
        return await Requirement.findOne({ _id: id, tenant: tenantId });
    }

    async updateRequirement(tenantId, id, data, userId) {
        const { Requirement } = await this.getModels(tenantId);
        const reqDoc = await Requirement.findOne({ _id: id, tenant: tenantId });

        if (!reqDoc) {
            throw new Error("Requirement not found");
        }

        // Merge updates
        Object.keys(data).forEach(key => {
            // Prevent updating immutable fields if necessary, or let Mongoose handle it
            // For now allow flexible updates but audit who updated
            if (key !== '_id' && key !== 'tenant' && key !== 'jobCode' && key !== 'createdAt') {
                reqDoc[key] = data[key];
            }
        });

        reqDoc.updatedBy = userId;

        // This will trigger pre('save') validation hooks
        return await reqDoc.save();
    }

    async submitForApproval(tenantId, id, userId) {
        const { Requirement } = await this.getModels(tenantId);
        const req = await Requirement.findOne({ _id: id, tenant: tenantId });
        if (!req) throw new Error("Requirement not found");

        req.approvalStatus = 'Pending';
        req.status = 'PendingApproval';
        return await req.save();
    }

    async approveReject(tenantId, id, status, remarks, userId) {
        const { Requirement } = await this.getModels(tenantId);
        const req = await Requirement.findOne({ _id: id, tenant: tenantId });
        if (!req) throw new Error("Requirement not found");

        if (status === 'Approved') {
            req.approvalStatus = 'Approved';
            req.approvedBy = userId;
            // Do we auto-open? Maybe not.
        } else if (status === 'Rejected') {
            req.approvalStatus = 'Rejected';
            // req.remarks = remarks;
        }
        return await req.save();
    }

    async publish(tenantId, id, userId) {
        const { Requirement } = await this.getModels(tenantId);
        const req = await Requirement.findOne({ _id: id, tenant: tenantId });
        if (!req) throw new Error("Requirement not found");
        // if (req.approvalStatus !== 'Approved') throw new Error("Job must be approved before publishing");

        req.status = 'Open';
        req.publishedAt = new Date();
        return await req.save();
    }

    async close(tenantId, id, userId) {
        const { Requirement } = await this.getModels(tenantId);
        const req = await Requirement.findOne({ _id: id, tenant: tenantId });
        if (!req) throw new Error("Requirement not found");

        req.status = 'Closed';
        req.closedAt = new Date();
        req.closedBy = userId;
        return await req.save();
    }

    async deleteRequirement(tenantId, id) {
        const { Requirement } = await this.getModels(tenantId);
        return await Requirement.deleteOne({ _id: id, tenant: tenantId });
    }

    // --- Applicants ---

    async getTenantApplications(tenantId) {
        const { Applicant } = await this.getModels(tenantId);
        // Need to populate correctly
        return await Applicant.find({ tenant: tenantId })
            .populate('requirementId', 'jobTitle jobOpeningId')
            .populate('candidateId', 'name email mobile')
            .sort({ createdAt: -1 });
    }

    async applyForJob(jobId, candidateId, data) {
        // ... existing legacy code ...
        throw new Error("applyForJob in Service requires tenantId refactoring. Use public controller logic.");
    }

    async applyInternal(tenantId, requirementId, userTokenPayload) {
        const db = await getTenantDB(tenantId);
        const Applicant = db.model('Applicant');
        const Requirement = db.model('Requirement');

        let employeeData = null;

        // 1. Fetch Employee Details if Role is Employee
        if (userTokenPayload.role === 'employee' || userTokenPayload.employeeId) {
            const Employee = db.model('Employee');
            const emp = await Employee.findById(userTokenPayload.id);
            if (!emp) throw new Error("Employee profile not found");

            employeeData = {
                name: `${emp.firstName} ${emp.lastName}`,
                email: emp.email,
                mobile: emp.mobile || 'N/A',
                employeeId: emp.employeeId
            };
        } else {
            // Fallback for non-employees (e.g. Admin testing) - requires email in token
            if (!userTokenPayload.email) throw new Error("User email not found for application");
            employeeData = {
                name: userTokenPayload.name || 'Unknown User',
                email: userTokenPayload.email,
                mobile: 'N/A',
                employeeId: null
            };
        }

        // 2. Check Requirement
        const job = await Requirement.findOne({ _id: requirementId, tenant: tenantId });
        if (!job) throw new Error("Job not found");
        if (job.status !== 'Open') throw new Error("Job is not open");
        if (!['Internal', 'Both'].includes(job.visibility)) throw new Error("This job is not open for internal application");

        // 3. Check Duplicate
        const existing = await Applicant.findOne({
            requirementId: requirementId,
            email: employeeData.email
        });
        if (existing) throw new Error("You have already applied for this position");

        // 4. Create Applicant
        const applicant = new Applicant({
            tenant: tenantId,
            requirementId: requirementId,
            name: employeeData.name,
            email: employeeData.email,
            mobile: employeeData.mobile,
            status: 'Applied',
            intro: `Internal Application (ID: ${employeeData.employeeId || 'N/A'})`,
            source: 'Internal'
        });

        return await applicant.save();
    }

    async getApplicantApplications(tenantId, userTokenPayload) {
        const db = await getTenantDB(tenantId);
        const Applicant = db.model('Applicant');

        // Resolve Email
        let emailToSearch = userTokenPayload.email;

        // If no email in token (employee case), fetch from DB
        if (!emailToSearch && (userTokenPayload.role === 'employee' || userTokenPayload.employeeId)) {
            const Employee = db.model('Employee');
            const emp = await Employee.findById(userTokenPayload.id);
            if (emp) emailToSearch = emp.email;
        }

        if (!emailToSearch) {
            // If still no email found, return empty or throw
            return [];
        }

        return await Applicant.find({ email: emailToSearch })
            .populate('requirementId', 'jobTitle department location status jobOpeningId')
            .sort({ createdAt: -1 });
    }
}

module.exports = new RecruitmentService();
