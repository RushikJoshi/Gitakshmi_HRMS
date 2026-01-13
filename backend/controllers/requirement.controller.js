const RecruitmentService = require('../services/Recruitment.service');

exports.createRequirement = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        console.log('[DEBUG] createRequirement - User:', req.user);
        console.log('[DEBUG] createRequirement - TenantID:', tenantId);
        console.log("REQ BODY:", req.body);

        if (!tenantId) {
            console.error('[DEBUG] Missing Tenant ID');
            return res.status(400).json({ message: 'Tenant information missing from session.' });
        }

        // Validate Experience Months & Vacancy
        const { minExperienceMonths, maxExperienceMonths, vacancy } = req.body;

        if (vacancy && Number(vacancy) < 1) {
            return res.status(400).json({ message: "Vacancy must be at least 1" });
        }

        if (minExperienceMonths !== undefined && maxExperienceMonths !== undefined) {
            if (Number(minExperienceMonths) > Number(maxExperienceMonths)) {
                return res.status(400).json({
                    message: "Minimum experience cannot be greater than maximum experience"
                });
            }
        }

        // Enforce Open Status
        const payload = { ...req.body, status: 'Open' };

        const result = await RecruitmentService.createRequirement(tenantId, payload, req.user.id);
        res.status(201).json(result);
    } catch (error) {
        console.error('[DEBUG] createRequirement Error:', error.message);
        if (error.errors) {
            console.error('[DEBUG] Validation Errors:', JSON.stringify(error.errors, null, 2));
        }
        res.status(400).json({
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            details: error.errors
        });
    }
};

exports.getRequirements = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.getRequirements(tenantId, req.query);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getRequirementById = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const requirement = await RecruitmentService.getRequirementById(tenantId, req.params.id);
        if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
        res.json(requirement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getInternalJobs = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        // Fetch Internal/Both jobs that are Open
        const query = {
            status: 'Open',
            visibility: { $in: ['Internal', 'Both'] }
        };
        const requirements = await RecruitmentService.getRequirements(tenantId, query);
        res.json(requirements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.applyInternal = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { id } = req.params; // Requirement ID
        const user = req.user; // Token payload: { id, employeeId, role, ... }

        if (!user || (!user.id && !user.employeeId)) {
            return res.status(400).json({ message: "User information missing" });
        }

        // Pass full user context to service. 
        // Service will fetch details from DB if email/name is missing in token.
        const result = await RecruitmentService.applyInternal(tenantId, id, user);
        res.status(201).json({ message: "Successfully applied internally", applicationId: result._id });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getMyApplications = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const user = req.user;

        if (!user || (!user.id && !user.employeeId)) {
            return res.status(400).json({ message: "User information missing" });
        }

        const applications = await RecruitmentService.getApplicantApplications(tenantId, user);
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateRequirement = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;

        // Validation for Experience Months Update
        const { minExperienceMonths, maxExperienceMonths } = req.body;
        if (minExperienceMonths !== undefined && maxExperienceMonths !== undefined) {
            if (Number(minExperienceMonths) > Number(maxExperienceMonths)) {
                return res.status(400).json({
                    message: "Minimum experience cannot be greater than maximum experience"
                });
            }
        }

        const result = await RecruitmentService.updateRequirement(tenantId, req.params.id, req.body, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.submitForApproval = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.submitForApproval(tenantId, req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.approveReject = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { status, remarks } = req.body; // status: 'Approved' or 'Rejected'
        const result = await RecruitmentService.approveReject(tenantId, req.params.id, status, remarks, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.publish = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.publish(tenantId, req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.close = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.close(tenantId, req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { status } = req.body;

        if (!['Open', 'Closed'].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Use 'Open' or 'Closed'." });
        }

        if (status === 'Closed') {
            await RecruitmentService.close(tenantId, req.params.id, req.user.id);
        } else {
            await RecruitmentService.publish(tenantId, req.params.id, req.user.id); // Reusing publish for 'Open'
        }

        res.json({ message: `Job status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteRequirement = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        await RecruitmentService.deleteRequirement(tenantId, req.params.id);
        res.json({ message: 'Requirement deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Applicants ---

exports.getApplicants = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const applicants = await RecruitmentService.getTenantApplications(tenantId);
        res.json(applicants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Public / Candidate ---

exports.applyJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const candidateId = req.user.id; // From auth token
        const applicationData = req.body;

        const result = await RecruitmentService.applyForJob(jobId, candidateId, applicationData);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
