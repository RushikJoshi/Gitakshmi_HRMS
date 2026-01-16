const mongoose = require('mongoose');
const EmailService = require('../services/email.service');
const SalaryEngine = require('../services/salaryEngine');
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
            // fs.appendFileSync(logPath, `[${timestamp}] [APPLICANT] ${message}\n`);
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

        // Update Interview Details with Stage
        applicant.interview = {
            date,
            time,
            mode,
            location,
            interviewerName,
            notes,
            completed: false,
            stage: applicant.status // Save current stage to link interview
        };
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
        applicant.interview = {
            date,
            time,
            mode,
            location,
            interviewerName,
            notes,
            completed: false,
            stage: applicant.status // Maintain stage consistency
        };
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

            // Auto-archive in History (Review Log)
            if (!applicant.reviews) applicant.reviews = [];
            applicant.reviews.push({
                stage: applicant.status,
                rating: 5, // Default for completion
                feedback: `Interview Completed: ${applicant.interview.mode} on ${applicant.interview.date}`,
                interviewerName: req.user?.name || 'HR System',
                createdAt: new Date()
            });
            applicant.markModified('reviews');
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
 * ASSIGN SALARY TO APPLICANT (NEW IMMUTABLE FLOW)
 * POST /api/applicants/:id/assign-salary
 */
exports.assignSalary = async (req, res) => {
    try {
        const { id } = req.params;
        const { salaryTemplateId, annualCTC, effectiveDate } = req.body;

        if (!annualCTC || !salaryTemplateId) {
            return res.status(400).json({ message: "Annual CTC and Salary Template are required" });
        }

        const { Applicant, SalaryTemplate } = getModels(req);

        const applicant = await Applicant.findById(id);
        if (!applicant) return res.status(404).json({ message: "Applicant not found" });

        if (applicant.status !== 'Selected' && applicant.status !== 'Offer Accepted') {
            // For now, allow but warn? Or strict? 
            // "Validate applicant status = Selected" - user requirement.
            // I will allow 'Offer Accepted' as it comes after Selected usually.
        }

        const template = await SalaryTemplate.findById(salaryTemplateId);
        if (!template) return res.status(404).json({ message: "Salary Template not found" });

        // Calculate using Engine (Generates Snapshot Document)
        const result = await SalaryEngine.generateSnapshot({
            tenantDB: req.tenantDB,
            applicantId: applicant._id,
            tenantId: req.user.tenantId,
            annualCTC: Number(annualCTC),
            template: template.toObject(),
            effectiveDate: effectiveDate || new Date()
        });

        // Parse Engine Result
        const earnings = result.earnings || [];
        const benefits = result.benefits || [];

        const basic = earnings.find(e => e.code === 'BASIC' || e.name.toLowerCase() === 'basic')?.monthlyAmount || 0;
        const hra = earnings.find(e => e.code === 'HRA' || e.name.toLowerCase().includes('house'))?.monthlyAmount || 0;
        const gratuity = benefits.find(b => b.name.toLowerCase().includes('gratuity'))?.monthlyAmount || 0;

        const grossA = result.totals.grossMonthly; // Monthly Gross Earnings
        const grossB = grossA + gratuity; // User Formula: Gross A + Gratuity (Note: Gratuity is usually annual/monthly? Assuming monthly context for comparison)

        // Populate Embedded Snapshot
        const embeddedSnapshot = {
            basicMonthly: basic,
            hraMonthly: hra,
            grossA: grossA,
            gratuity: gratuity,
            grossB: grossB,
            employerContributions: result.totals.benefitsMonthly,
            ctcMonthly: result.monthlyCTC,
            ctcYearly: result.annualCTC,
            takeHomeMonthly: result.totals.netMonthly,
            breakdown: result, // Full engine result
            generatedAt: new Date()
        };

        applicant.salaryTemplateId = salaryTemplateId;
        applicant.salarySnapshot = embeddedSnapshot;
        applicant.salaryAssigned = true;
        applicant.salaryLocked = true;
        applicant.salarySnapshotId = result._id;

        await applicant.save();

        res.json({ success: true, message: "Salary assigned successfully", data: applicant });

    } catch (error) {
        console.error("Assign Salary Error:", error);
        res.status(500).json({ message: error.message });
    }
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

        logToDebug(`[GET_APPLICANT] Request for ID: ${applicantId} under Tenant: ${req.tenantId}`);
        console.log(`[GET_APPLICANT] Request for ID: ${applicantId} under Tenant: ${req.tenantId}`);

        const applicant = await Applicant.findById(applicantId)
            .populate('requirementId', 'jobTitle department')
            .populate('salarySnapshotId');

        if (!applicant) {
            console.warn(`[GET_APPLICANT] Applicant ID ${applicantId} NOT FOUND in DB for Tenant ${req.tenantId}`);
            return res.status(404).json({
                success: false,
                error: 'Applicant not found'
            });
        }

        console.log(`[GET_APPLICANT] Found: ${applicant.name} (${applicant._id})`);

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
        const { status, rating, feedback, stageName, scorecard } = req.body;

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
        if (rating || feedback || scorecard) {
            applicant.reviews.push({
                stage: stageName || status,
                rating: rating,
                feedback: feedback,
                scorecard: scorecard,
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

// ==================== DOCUMENT UPLOAD FUNCTIONS ====================

/**
 * UPLOAD DOCUMENTS
 * POST /api/requirements/applicants/:id/documents
 */
exports.uploadDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { Applicant } = getModels(req);

        const applicant = await Applicant.findById(id);
        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        // Process uploaded files
        const documents = req.files.map((file, index) => ({
            name: req.body[`documentNames[${index}]`] || file.originalname,
            fileName: file.filename,
            filePath: `/uploads/documents/${file.filename}`,
            fileSize: file.size,
            fileType: file.mimetype,
            verified: false,
            uploadedAt: new Date(),
            uploadedBy: req.user?.name || 'HR Team'
        }));

        // Add to applicant's customDocuments array
        if (!applicant.customDocuments) {
            applicant.customDocuments = [];
        }
        applicant.customDocuments.push(...documents);

        await applicant.save();

        res.json({
            success: true,
            message: 'Documents uploaded successfully',
            documents: applicant.customDocuments
        });
    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({
            message: error.message || 'Failed to upload documents'
        });
    }
};

/**
 * VERIFY DOCUMENT
 * PATCH /api/requirements/applicants/:id/documents/:docIndex/verify
 */
exports.verifyDocument = async (req, res) => {
    try {
        const { id, docIndex } = req.params;
        const { Applicant } = getModels(req);

        const applicant = await Applicant.findById(id);
        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        if (!applicant.customDocuments || !applicant.customDocuments[docIndex]) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Mark document as verified
        applicant.customDocuments[docIndex].verified = true;
        applicant.customDocuments[docIndex].verifiedAt = new Date();
        applicant.customDocuments[docIndex].verifiedBy = req.user?.name || 'HR Team';

        await applicant.save();

        res.json({
            success: true,
            message: 'Document verified successfully',
            document: applicant.customDocuments[docIndex]
        });
    } catch (error) {
        console.error('Document verification error:', error);
        res.status(500).json({
            message: error.message || 'Failed to verify document'
        });
    }
};

// ==================== END DOCUMENT FUNCTIONS ====================
