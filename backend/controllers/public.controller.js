const ApplicantSchema = require('../models/Applicant');
const multer = require('multer');
const path = require('path');
const Tenant = require('../models/Tenant');

// Configure multer for resume upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'));
    }
  }
});

/* ----------------------------------------------------
   GET PUBLIC JOBS
---------------------------------------------------- */
exports.getPublicJobs = async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID is required" });
    }

    // Resolve tenant DB
    const getTenantDB = require('../utils/tenantDB');
    const tenantDB = await getTenantDB(tenantId);

    // Register Requirement model if not already
    let Requirement;
    try {
      Requirement = tenantDB.model("Requirement");
    } catch (e) {
      Requirement = tenantDB.model("Requirement", require('../models/Requirement'));
    }

    // Fetch jobs
    const jobs = await Requirement.find({ tenant: tenantId, status: 'Open' })
      .select('jobTitle department vacancy createdAt')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    console.error("Get public jobs error:", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

/* ----------------------------------------------------
   GET PUBLIC JOBS BY COMPANY CODE
---------------------------------------------------- */
exports.getPublicJobsByCompanyCode = async (req, res) => {
  try {
    const { companyCode } = req.params;
    if (!companyCode) {
      return res.status(400).json({ error: "Company code is required" });
    }

    // Find tenant by human-readable code
    const tenant = await Tenant.findOne({ code: companyCode });

    if (!tenant) {
      return res.status(404).json({ error: "Company not found" });
    }

    const tenantId = tenant._id;

    // Resolve tenant DB
    const getTenantDB = require('../utils/tenantDB');
    const tenantDB = await getTenantDB(tenantId);

    // Register Requirement model if not already
    let Requirement;
    try {
      Requirement = tenantDB.model("Requirement");
    } catch (e) {
      Requirement = tenantDB.model("Requirement", require('../models/Requirement'));
    }

    // Fetch jobs
    const jobs = await Requirement.find({ tenant: tenantId, status: 'Open' })
      .select('jobTitle department vacancy createdAt tenant')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    console.error("Get public jobs by code error:", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

/* ----------------------------------------------------
   APPLY FOR JOB (PUBLIC)
---------------------------------------------------- */
exports.applyJob = [
  upload.single('resume'),
  async (req, res) => {
    try {
      const {
        requirementId, name, email, mobile, emergencyContact, dob, workLocation,
        intro, experience, relevantExperience, currentCompany, currentDesignation,
        currentlyWorking, noticePeriod, currentCTC, takeHome, expectedCTC,
        isFlexible, hasOtherOffer, relocate, reasonForChange, linkedin
      } = req.body;

      if (!requirementId || !name || !email || !mobile || !experience) {
        return res.status(400).json({
          error: "Required fields missing: requirementId, name, email, mobile, experience"
        });
      }

      // Resolve tenant DB if not present (because we moved route before middleware)
      let tenantDB = req.tenantDB;
      if (!tenantDB) {
        const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.body.tenantId;
        if (!tenantId) {
          return res.status(400).json({ error: "Tenant ID is required (header or query)" });
        }
        const getTenantDB = require('../utils/tenantDB');
        tenantDB = await getTenantDB(tenantId);
      }

      // Get Applicant model for this tenant
      const Applicant = tenantDB.model("Applicant", ApplicantSchema);

      // Verify requirement exists
      const Requirement = tenantDB.model("Requirement", require('../models/Requirement'));
      const requirement = await Requirement.findById(requirementId);
      if (!requirement) {
        return res.status(404).json({ error: "Requirement not found" });
      }

      // Check if applicant already exists for this requirement
      const existingApplicant = await Applicant.findOne({
        requirementId: requirementId,
        email: email.toLowerCase()
      });

      if (existingApplicant) {
        return res.status(409).json({
          error: "You have already applied for this position"
        });
      }

      // Create new applicant
      const applicant = new Applicant({
        requirementId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        mobile: mobile.trim(),
        emergencyContact: emergencyContact ? emergencyContact.trim() : undefined,
        dob: dob || undefined,
        workLocation: workLocation ? workLocation.trim() : undefined,

        intro: intro ? intro.trim() : undefined,
        experience: experience.trim(),
        relevantExperience: relevantExperience ? relevantExperience.trim() : undefined,
        currentCompany: currentCompany ? currentCompany.trim() : undefined,
        currentDesignation: currentDesignation ? currentDesignation.trim() : undefined,
        currentlyWorking: currentlyWorking === 'true' || currentlyWorking === true,
        noticePeriod: noticePeriod === 'true' || noticePeriod === true,
        currentCTC: currentCTC ? currentCTC.trim() : undefined,
        takeHome: takeHome ? takeHome.trim() : undefined,
        expectedCTC: expectedCTC ? expectedCTC.trim() : undefined,
        isFlexible: isFlexible === 'true' || isFlexible === true,
        hasOtherOffer: hasOtherOffer === 'true' || hasOtherOffer === true,
        relocate: relocate === 'true' || relocate === true,
        reasonForChange: reasonForChange ? reasonForChange.trim() : undefined,
        linkedin: linkedin ? linkedin.trim() : undefined,

        resume: req.file ? req.file.filename : null,
        status: 'Applied'
      });

      await applicant.save();

      res.status(201).json({
        message: "Application submitted successfully",
        applicantId: applicant._id
      });
    } catch (err) {
      console.error("Apply job error:", err);
      res.status(500).json({ error: "Failed to submit application" });
    }
  }
];