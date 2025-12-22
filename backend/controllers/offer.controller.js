const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const RequirementSchema = require('../models/Requirement');
const ApplicantSchema = require('../models/Applicant');
const OfferLetterTemplateSchema = require('../models/OfferLetterTemplate');

/* ----------------------------------------------------
   HELPER → Load model from dynamic tenant database or main DB
---------------------------------------------------- */
function getModels(req) {
    if (req.tenantDB) {
        const db = req.tenantDB;
        return {
            Requirement: db.model("Requirement", RequirementSchema),
            Applicant: db.model("Applicant", ApplicantSchema),
            OfferLetterTemplate: db.model("OfferLetterTemplate", OfferLetterTemplateSchema)
        };
    } else {
        return {
            Requirement: mongoose.model("Requirement", RequirementSchema),
            Applicant: mongoose.model("Applicant", ApplicantSchema),
            OfferLetterTemplate: mongoose.model("OfferLetterTemplate", OfferLetterTemplateSchema)
        };
    }
}

exports.generateOfferLetter = async (req, res) => {
    try {
        const { applicantId } = req.params;
        const { joiningDate, dob, location, templateId, position, probationPeriod } = req.body;
        const { Applicant, Requirement } = getModels(req);

        const applicant = await Applicant.findById(applicantId).populate('requirementId');
        if (!applicant) {
            return res.status(404).json({ error: "Applicant not found" });
        }

        const requirement = applicant.requirementId;
        if (!requirement) {
            return res.status(404).json({ error: "Job requirement details missing" });
        }

        // Ensure uploads/offers directory exists
        const offersDir = path.join(__dirname, '../uploads/offers');
        if (!fs.existsSync(offersDir)) {
            fs.mkdirSync(offersDir, { recursive: true });
        }

        const filename = `Offer_${applicant.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
        const filePath = path.join(offersDir, filename);

        // Company info (you can fetch from tenant or database)
        const companyInfo = {
            name: 'Gitakshmi Technologies',
            tagline: 'TECHNOLOGIES',
            address: 'Ahmedabad, Gujarat - 380051',
            phone: '+91 1234567890',
            email: 'hr@gitakshmi.com',
            website: 'www.gitakshmi.com',
            refPrefix: 'GITK',
            signatoryName: 'HR Manager',
            logo: 'https://via.placeholder.com/150x60/4F46E5/FFFFFF?text=COMPANY+LOGO'
        };

        const offerData = {
            joiningDate,
            location: location || applicant.workLocation || 'Ahmedabad',
            position: position || requirement.jobTitle,
            probationPeriod: probationPeriod || '3 months'
        };

        // Generate HTML
        const { generateOfferLetterHTML } = require('../utils/offerLetterTemplate');
        const html = generateOfferLetterHTML(applicant, offerData, companyInfo);

        // Use puppeteer to generate PDF
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });

        await browser.close();

        const downloadUrl = `/uploads/offers/${filename}`;

        // Update applicant status
        applicant.status = 'Selected';
        applicant.offerLetterPath = filename;
        if (joiningDate) applicant.joiningDate = joiningDate;
        if (dob) applicant.dob = dob;
        if (location) applicant.workLocation = location;

        await applicant.save();

        res.json({
            message: "Offer letter generated successfully",
            downloadUrl
        });

    } catch (err) {
        console.error("Generate offer letter error:", err);
        res.status(500).json({ error: "Failed to generate offer letter", details: err.message });
    }
};
