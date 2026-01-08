const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getTenantDB = require('../utils/tenantDB');

/* ----------------------------------------------------
   CANDIDATE REGISTRATION
---------------------------------------------------- */
exports.registerCandidate = async (req, res) => {
    try {
        const { tenantId, name, email, password, mobile } = req.body;

        if (!tenantId || !name || !email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const tenantDB = await getTenantDB(tenantId);
        const Candidate = tenantDB.model("Candidate");

        const existing = await Candidate.findOne({ email, tenant: tenantId });
        if (existing) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const candidate = new Candidate({
            tenant: tenantId,
            name,
            email,
            password: hashedPassword,
            mobile
        });

        await candidate.save();

        res.status(201).json({ message: "Registration successful. Please login." });
    } catch (err) {
        console.error("Candidate register error:", err);
        res.status(500).json({ error: "Registration failed" });
    }
};

/* ----------------------------------------------------
   CANDIDATE LOGIN
---------------------------------------------------- */
exports.loginCandidate = async (req, res) => {
    try {
        const { tenantId, email, password } = req.body;

        if (!tenantId || !email || !password) {
            return res.status(400).json({ error: "Tenant ID, Email, and Password required" });
        }

        const tenantDB = await getTenantDB(tenantId);
        const Candidate = tenantDB.model("Candidate");

        const candidate = await Candidate.findOne({ email, tenant: tenantId });
        if (!candidate) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, candidate.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: candidate._id, tenantId: tenantId, role: 'candidate' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            candidate: {
                id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                mobile: candidate.mobile
            }
        });
    } catch (err) {
        console.error("Candidate login error:", err);
        res.status(500).json({ error: "Login failed" });
    }
};

/* ----------------------------------------------------
   GET CANDIDATE PROFILE & APPLICATIONS
---------------------------------------------------- */
exports.getCandidateDashboard = async (req, res) => {
    try {
        const { tenantId, id } = req.user; // From middleware

        const tenantDB = await getTenantDB(tenantId);
        const Candidate = tenantDB.model("Candidate");
        const Applicant = tenantDB.model("Applicant");
        const Requirement = tenantDB.model("Requirement"); // Ensure Requirement model is loaded

        const candidate = await Candidate.findById(id).select('-password');
        if (!candidate) return res.status(404).json({ error: "Candidate not found" });

        // Fetch applications linked to this candidate
        const applications = await Applicant.find({ candidateId: id })
            .populate('requirementId', 'jobTitle department status') // Populate job details
            .sort({ createdAt: -1 });

        res.json({
            profile: candidate,
            applications
        });
    } catch (err) {
        console.error("Get dashboard error:", err);
        res.status(500).json({ error: "Failed to load dashboard" });
    }
};

/* ----------------------------------------------------
   CHECK APPLICATION STATUS
---------------------------------------------------- */
exports.checkApplicationStatus = async (req, res) => {
    try {
        const { tenantId, id } = req.user;
        const { requirementId } = req.params;

        if (!requirementId) return res.status(400).json({ error: "Requirement ID required" });

        const tenantDB = await getTenantDB(tenantId);
        const Applicant = tenantDB.model("Applicant");

        // Check for existing application by this candidate for this job
        // Sort by latest first to check cooldown
        const application = await Applicant.findOne({
            candidateId: id,
            requirementId
        }).sort({ createdAt: -1 });

        if (!application) {
            return res.json({ applied: false });
        }

        // Determine if re-apply is allowed (e.g., > 30 days)
        const lastAppliedDate = new Date(application.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - lastAppliedDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // User requested "1 month" warning. 
        // We will return `applied: true` and payload with date info so frontend can show message.

        res.json({
            applied: true,
            applicationId: application._id,
            status: application.status,
            appliedAt: application.createdAt,
            daysSinceApplied: diffDays,
            cooldownOver: diffDays > 30
        });

    } catch (err) {
        console.error("Check status error:", err);
        res.status(500).json({ error: "Failed to check status" });
    }
};
