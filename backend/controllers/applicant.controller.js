const mongoose = require('mongoose');
const EmailService = require('../services/email.service');
const path = require('path');
const fs = require('fs');

/**
 * Helper to get models from tenant database
 */
function getModels(req) {
    if (!req.tenantDB) {
        throw new Error("Tenant database connection not available");
    }
    const db = req.tenantDB;
    try {
        return {
            Applicant: db.model("Applicant"),
            SalaryTemplate: db.model("SalaryTemplate"),
            SalaryStructure: db.model("SalaryStructure"),
            CompanyProfile: db.model("CompanyProfile"), // Ensure this is available
        };
    } catch (err) {
        console.error("[applicant.controller] Error retrieving models:", err.message);
        throw new Error(`Failed to retrieve models from tenant database: ${err.message}`);
    }
}

// Reuse logToDebug helper
function logToDebug(message) {
    try {
        const logPath = path.join(__dirname, '../debug_email.log');
        const timestamp = new Date().toISOString();
        if (fs.existsSync(path.dirname(logPath))) {
            fs.appendFileSync(logPath, `[${timestamp}] [APPLICANT] ${message}\n`);
        }
    } catch (e) { console.error("Log failed", e); }
}

/**
 * SCHEDULE INTERVIEW
 * POST /api/applicants/:id/interview/schedule
 */
exports.scheduleInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time, mode, location, interviewerName, notes } = req.body;

        const { Applicant } = getModels(req);

        // Find Applicant
        const applicant = await Applicant.findById(id).populate('requirementId', 'jobTitle');
        if (!applicant) return res.status(404).json({ message: "Applicant not found" });

        // Update Interview Details
        applicant.interview = { date, time, mode, location, interviewerName, notes, completed: false };
        // applicant.status = 'Interview Scheduled'; // STAIR CASE: Keep in current stage

        await applicant.save();

        // Send Email
        try {
            await EmailService.sendInterviewScheduledEmail(
                applicant.email,
                applicant.name,
                applicant.requirementId?.jobTitle || 'Job Role',
                applicant.interview
            );
            logToDebug(`✅ Interview Scheduled Email sent to ${applicant.email}`);
        } catch (emailErr) {
            console.error("Failed to send interview email", emailErr);
            logToDebug(`❌ Failed to send interview email: ${emailErr.message}`);
        }

        res.json({ success: true, message: "Interview scheduled successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * RESCHEDULE INTERVIEW
 * PUT /api/applicants/:id/interview/reschedule
 */
exports.rescheduleInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time, mode, location, interviewerName, notes } = req.body;

        const { Applicant } = getModels(req);

        const applicant = await Applicant.findById(id).populate('requirementId', 'jobTitle');
        if (!applicant) return res.status(404).json({ message: "Applicant not found" });

        // Update
        applicant.interview = { date, time, mode, location, interviewerName, notes, completed: false };
        // applicant.status = 'Interview Rescheduled'; // STAIR CASE: Keep in current stage

        await applicant.save();

        // Email
        try {
            await EmailService.sendInterviewRescheduledEmail(
                applicant.email,
                applicant.name,
                applicant.requirementId?.jobTitle || 'Job Role',
                applicant.interview
            );
            logToDebug(`✅ Interview Rescheduled Email sent to ${applicant.email}`);
        } catch (emailErr) {
            logToDebug(`❌ Failed to send reschedule email: ${emailErr.message}`);
        }

        res.json({ success: true, message: "Interview rescheduled successfully" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * MARK INTERVIEW COMPLETED
 * PUT /api/applicants/:id/interview/complete
 */
exports.markInterviewCompleted = async (req, res) => {
    try {
        const { id } = req.params;
        const { Applicant } = getModels(req);

        const applicant = await Applicant.findById(id);
        if (!applicant) return res.status(404).json({ message: "Applicant not found" });

        if (applicant.interview) {
            applicant.interview.completed = true;
            // Mark the model as modified for the nested object
            applicant.markModified('interview');
        }
        // applicant.status = 'Interview Completed'; // STAIR CASE: Keep in current stage
        await applicant.save();

        // NO EMAIL required

        res.json({ success: true, message: "Interview marked as completed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * ASSIGN SALARY TO APPLICANT (LEGACY - REDIRECTED)
 */
exports.assignSalary = async (req, res) => {
    res.status(410).json({ message: "This endpoint is deprecated. Use SalaryController.assign instead." });
};

/**
 * GET APPLICANT SALARY SNAPSHOT
 * GET /api/applicants/:id/salary
 */
exports.getSalary = async (req, res) => {
    try {
        const { Applicant } = getModels(req);
        const applicantId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(applicantId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid applicant ID format'
            });
        }

        const applicant = await Applicant.findById(applicantId).select('salaryTemplateId salarySnapshot name');

        if (!applicant) {
            return res.status(404).json({
                success: false,
                error: 'Applicant not found'
            });
        }

        if (!applicant.salarySnapshot) {
            return res.status(404).json({
                success: false,
                error: 'Salary not assigned to this applicant'
            });
        }

        res.json({
            success: true,
            data: {
                applicantId: applicant._id,
                applicantName: applicant.name,
                salaryTemplateId: applicant.salaryTemplateId,
                salarySnapshot: applicant.salarySnapshot
            }
        });

    } catch (error) {
        console.error('❌ [GET SALARY] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get salary'
        });
    }
};

/**
 * GET SINGLE APPLICANT BY ID
 * GET /api/applicants/:id
 */
exports.getApplicantById = async (req, res) => {
    try {
        const { Applicant } = getModels(req);
        const applicantId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(applicantId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid applicant ID format'
            });
        }

        const applicant = await Applicant.findById(applicantId)
            .populate('requirementId', 'jobTitle department')
            .populate('salaryTemplateId');

        if (!applicant) {
            return res.status(404).json({
                success: false,
                error: 'Applicant not found'
            });
        }

        res.json({
            success: true,
            data: applicant
        });

    } catch (error) {
        console.error('❌ [GET APPLICANT] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch applicant'
        });
    }
};

/**
 * UPLOAD SALARY EXCEL (LEGACY - REDIRECTED)
 */
exports.uploadSalaryExcel = async (req, res) => {
    res.status(410).json({ message: "This endpoint is deprecated. Use the new Salary Configuration tool." });
};




/**
 * UPDATE APPLICANT STATUS
 * PATCH /api/requirements/applicants/:id/status
 */
exports.updateApplicantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rating, feedback, stageName } = req.body;

        logToDebug(`🔥 [STATUS UPDATE REQUEST] ID: ${id}, Status: ${status}`);

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        const { Applicant } = getModels(req);

        // Find Applicant
        const applicant = await Applicant.findById(id).populate('requirementId', 'jobTitle');
        if (!applicant) {
            logToDebug(`❌ Applicant ${id} NOT FOUND`);
            return res.status(404).json({ message: "Applicant not found" });
        }

        const oldStatus = applicant.status;
        logToDebug(`ℹ️ Current Status: ${oldStatus}, New Status: ${status}`);

        // Update Status
        applicant.status = status;

        // --- SAVE REVIEW / FEEDBACK ---
        if (rating || feedback) {
            applicant.reviews.push({
                stage: stageName || status,
                rating: rating,
                feedback: feedback,
                interviewerName: req.user?.name || 'HR Team',
                createdAt: new Date()
            });
        }

        await applicant.save();

        logToDebug(`✅ DB Updated. Checking email trigger...`);

        // --- SEND EMAIL NOTIFICATION ---
        if (oldStatus !== status) {
            try {
                logToDebug(`📧 Attempting to send email to ${applicant.email}...`);

                await EmailService.sendApplicationStatusEmail(
                    applicant.email,
                    applicant.name,
                    applicant.requirementId?.jobTitle || 'Job Application',
                    applicant._id,
                    status,
                    feedback,
                    rating
                );

                logToDebug("✅ Email Sent Successfully (Service returned)");

            } catch (emailErr) {
                logToDebug(`❌ EMAIL FAILURE: ${emailErr.message}`);
                console.error(`❌ [EMAIL FAILURE] Failed to send status email: ${emailErr.message}`);
            }
        } else {
            logToDebug("ℹ️ Status unchanged. Skipping email.");
        }

        res.json({
            success: true,
            message: `Applicant status updated to ${status}`,
            data: {
                status: applicant.status,
                oldStatus: oldStatus
            }
        });

    } catch (error) {
        if (typeof logToDebug === 'function') logToDebug(`❌ CRITICAL ERROR: ${error.message}`);
        console.error("❌ [UPDATE ERROR] Update Applicant Status Error:", error);
        res.status(500).json({ message: error.message });
    }
};
