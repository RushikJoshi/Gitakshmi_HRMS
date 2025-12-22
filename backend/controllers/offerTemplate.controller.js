const OfferLetterTemplateSchema = require('../models/OfferLetterTemplate');

// Helper to get model
const getTemplateModel = (req) => {
    if (req.tenantDB) {
        return req.tenantDB.model('OfferLetterTemplate', OfferLetterTemplateSchema);
    }
    // Fallback or error if not using tenantDB
    throw new Error("Tenant Database context missing");
};

exports.getTemplates = async (req, res) => {
    try {
        const Template = getTemplateModel(req);
        const templates = await Template.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(templates);
    } catch (err) {
        console.error("Get templates error:", err);
        res.status(500).json({ error: "Failed to fetch templates" });
    }
};

exports.getTemplateById = async (req, res) => {
    try {
        const Template = getTemplateModel(req);
        const template = await Template.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        res.json(template);
    } catch (err) {
        console.error("Get template error:", err);
        res.status(500).json({ error: "Failed to fetch template" });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const Template = getTemplateModel(req);
        const { name, header, body, footer } = req.body;

        const newTemplate = new Template({
            tenant: req.tenantId,
            name,
            header,
            body,
            footer
        });

        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (err) {
        console.error("Create template error:", err);
        res.status(500).json({ error: "Failed to create template" });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const Template = getTemplateModel(req);
        const { id } = req.params;
        const { name, header, body, footer, isActive } = req.body;

        const updatedTemplate = await Template.findByIdAndUpdate(
            id,
            { name, header, body, footer, isActive },
            { new: true }
        );

        if (!updatedTemplate) {
            return res.status(404).json({ error: "Template not found" });
        }

        res.json(updatedTemplate);
    } catch (err) {
        console.error("Update template error:", err);
        res.status(500).json({ error: "Failed to update template" });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const Template = getTemplateModel(req);
        const { id } = req.params;

        // Soft delete or hard delete? User said "Delete", usually soft delete is safer but let's do hard delete for now or set isActive=false
        // Let's do hard delete as requested
        const deleted = await Template.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ error: "Template not found" });
        }

        res.json({ message: "Template deleted successfully" });
    } catch (err) {
        console.error("Delete template error:", err);
        res.status(500).json({ error: "Failed to delete template" });
    }
};
