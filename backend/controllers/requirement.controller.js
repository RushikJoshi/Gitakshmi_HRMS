const mongoose = require('mongoose');
const RequirementSchema = require('../models/Requirement');
const ApplicantSchema = require('../models/Applicant');

/* ----------------------------------------------------
   HELPER → Load model from dynamic tenant database or main DB
---------------------------------------------------- */
function getModels(req) {
  if (req.tenantDB) {
    const db = req.tenantDB;
    return {
      Requirement: db.model("Requirement", RequirementSchema),
      Applicant: db.model("Applicant", ApplicantSchema)
    };
  } else {
    // For testing without authentication, use main connection
    return {
      Requirement: mongoose.model("Requirement", RequirementSchema),
      Applicant: mongoose.model("Applicant", ApplicantSchema)
    };
  }
}

/* ----------------------------------------------------
   CREATE REQUIREMENT
---------------------------------------------------- */
exports.createRequirement = async (req, res) => {
  try {
    const { Requirement } = getModels(req);
    const tenantId = req.tenantId || 'default-tenant'; // Use default for testing
    const { jobTitle, department, vacancy, status } = req.body;

    if (!jobTitle || !department || !vacancy) {
      return res.status(400).json({ error: "Job title, department, and vacancy are required" });
    }

    const requirement = new Requirement({
      tenant: tenantId,
      jobTitle,
      department,
      vacancy,
      status: status || 'Open'
    });

    await requirement.save();
    res.status(201).json(requirement);
  } catch (err) {
    console.error("Create requirement error:", err);
    res.status(500).json({ error: "Failed to create requirement" });
  }
};

/* ----------------------------------------------------
   GET REQUIREMENTS
---------------------------------------------------- */
exports.getRequirements = async (req, res) => {
  try {
    const { Requirement } = getModels(req);
    const tenantId = req.tenantId || 'default-tenant'; // Use default for testing

    const requirements = await Requirement.find({ tenant: tenantId }).sort({ createdAt: -1 });
    res.json(requirements);
  } catch (err) {
    console.error("Get requirements error:", err);
    res.status(500).json({ error: "Failed to fetch requirements" });
  }
};

/* ----------------------------------------------------
   GET APPLICANTS FOR REQUIREMENTS
---------------------------------------------------- */
exports.getApplicants = async (req, res) => {
  try {
    const { Applicant } = getModels(req);
    const tenantId = req.tenantId || 'default-tenant'; // Use default for testing

    // Get applicants with populated requirement details
    const applicants = await Applicant.find()
      .populate('requirementId', 'jobTitle department vacancy status')
      .sort({ createdAt: -1 });

    res.json(applicants);
  } catch (err) {
    console.error("Get applicants error:", err);
    res.status(500).json({ error: "Failed to fetch applicants" });
  }
};