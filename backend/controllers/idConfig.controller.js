/**
 * ═══════════════════════════════════════════════════════════════════════
 * COMPANY ID CONFIGURATION CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Manages company-specific ID format configurations.
 * Allows admins to customize ID formats for their company.
 * 
 * @version 2.0
 */

const { previewIdFormat, getCompanyConfig } = require('../utils/configurableIdGenerator');

/**
 * Get models for database
 */
function getModels(db) {
    const CompanyIdConfig = db.models.CompanyIdConfig || db.model('CompanyIdConfig', require('../models/CompanyIdConfig'));
    return { CompanyIdConfig };
}

// ═══════════════════════════════════════════════════════════════════
// GET CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Get company ID configuration
 */
exports.getIdConfiguration = async (req, res) => {
    try {
        const { tenantId, db } = req;

        const config = await getCompanyConfig(db, tenantId);

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'ID configuration not found'
            });
        }

        // Format response
        const formattedConfig = {
            configurations: config.configurations.map(c => ({
                entityType: c.entityType,
                prefix: c.prefix,
                separator: c.separator,
                includeYear: c.includeYear,
                yearFormat: c.yearFormat,
                includeMonth: c.includeMonth,
                monthFormat: c.monthFormat,
                includeDepartment: c.includeDepartment,
                departmentFormat: c.departmentFormat,
                paddingLength: c.paddingLength,
                resetPolicy: c.resetPolicy,
                startingNumber: c.startingNumber,
                exampleFormat: c.exampleFormat,
                isLocked: c.isLocked,
                generatedCount: c.generatedCount
            })),
            globalSettings: config.globalSettings,
            lastModified: config.lastModified
        };

        res.json({
            success: true,
            data: formattedConfig
        });

    } catch (error) {
        console.error('Get ID Configuration Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ID configuration',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════════
// UPDATE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Update ID configuration for specific entity type
 */
exports.updateIdConfiguration = async (req, res) => {
    try {
        const { tenantId, db, user } = req;
        const { entityType } = req.params;
        const updates = req.body;

        const { CompanyIdConfig } = getModels(db);

        // Get existing configuration
        let config = await CompanyIdConfig.findOne({ tenant: tenantId });

        if (!config) {
            // Initialize if not exists
            config = await CompanyIdConfig.initializeDefaults(tenantId, user._id);
        }

        // Validate entity type
        const validEntityTypes = ['job', 'application', 'interview', 'offer', 'candidate', 'employee', 'payslip'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid entity type: ${entityType}`,
                code: 'INVALID_ENTITY_TYPE'
            });
        }

        // Update configuration
        try {
            config.updateConfig(entityType, updates);
            config.updatedBy = user.email || user.name;
            config.lastModified = new Date();

            await config.save();

            // Get updated configuration
            const updatedConfig = config.getConfig(entityType);

            res.json({
                success: true,
                message: `ID configuration updated for ${entityType}`,
                data: {
                    entityType: updatedConfig.entityType,
                    prefix: updatedConfig.prefix,
                    separator: updatedConfig.separator,
                    includeYear: updatedConfig.includeYear,
                    yearFormat: updatedConfig.yearFormat,
                    includeMonth: updatedConfig.includeMonth,
                    monthFormat: updatedConfig.monthFormat,
                    includeDepartment: updatedConfig.includeDepartment,
                    departmentFormat: updatedConfig.departmentFormat,
                    paddingLength: updatedConfig.paddingLength,
                    resetPolicy: updatedConfig.resetPolicy,
                    startingNumber: updatedConfig.startingNumber,
                    exampleFormat: updatedConfig.exampleFormat,
                    isLocked: updatedConfig.isLocked
                }
            });

        } catch (updateError) {
            // Handle locked configuration error
            if (updateError.message.includes('locked')) {
                return res.status(403).json({
                    success: false,
                    message: updateError.message,
                    code: 'CONFIGURATION_LOCKED'
                });
            }
            throw updateError;
        }

    } catch (error) {
        console.error('Update ID Configuration Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ID configuration',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════════
// PREVIEW ID FORMAT
// ═══════════════════════════════════════════════════════════════════

/**
 * Preview ID format without generating
 */
exports.previewIdFormat = async (req, res) => {
    try {
        const { tenantId, db } = req;
        const { entityType } = req.params;
        const { department, year, month } = req.query;

        const options = {};
        if (department) options.department = department;
        if (year) options.year = parseInt(year);
        if (month) options.month = parseInt(month);

        const preview = await previewIdFormat(db, tenantId, entityType, options);

        res.json({
            success: true,
            data: preview
        });

    } catch (error) {
        console.error('Preview ID Format Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to preview ID format',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════════
// RESET CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Reset configuration to defaults (only if not locked)
 */
exports.resetIdConfiguration = async (req, res) => {
    try {
        const { tenantId, db, user } = req;
        const { entityType } = req.params;

        const { CompanyIdConfig } = getModels(db);

        const config = await CompanyIdConfig.findOne({ tenant: tenantId });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Configuration not found'
            });
        }

        const entityConfig = config.getConfig(entityType);

        if (!entityConfig) {
            return res.status(404).json({
                success: false,
                message: `Configuration not found for ${entityType}`
            });
        }

        if (entityConfig.isLocked) {
            return res.status(403).json({
                success: false,
                message: `Cannot reset configuration. IDs have already been generated for ${entityType}.`,
                code: 'CONFIGURATION_LOCKED'
            });
        }

        // Reset to defaults
        const defaults = {
            job: { prefix: 'JOB', separator: '-', includeYear: true, yearFormat: 'YYYY', paddingLength: 4, resetPolicy: 'YEARLY' },
            candidate: { prefix: 'CAN', separator: '-', includeYear: true, yearFormat: 'YYYY', paddingLength: 4, resetPolicy: 'YEARLY' },
            application: { prefix: 'APP', separator: '-', includeYear: true, yearFormat: 'YYYY', paddingLength: 4, resetPolicy: 'YEARLY' },
            interview: { prefix: 'INT', separator: '-', includeYear: true, yearFormat: 'YYYY', paddingLength: 4, resetPolicy: 'YEARLY' },
            offer: { prefix: 'OFF', separator: '-', includeYear: true, yearFormat: 'YYYY', paddingLength: 4, resetPolicy: 'YEARLY' },
            employee: { prefix: 'EMP', separator: '-', includeYear: false, includeDepartment: true, departmentFormat: 'CODE', paddingLength: 4, resetPolicy: 'NEVER' },
            payslip: { prefix: 'PAY', separator: '-', includeYear: true, includeMonth: true, yearFormat: 'YYYY', monthFormat: 'MM', paddingLength: 4, resetPolicy: 'MONTHLY' }
        };

        const defaultConfig = defaults[entityType];

        if (defaultConfig) {
            config.updateConfig(entityType, defaultConfig);
            config.updatedBy = user.email || user.name;
            await config.save();

            const updatedConfig = config.getConfig(entityType);

            res.json({
                success: true,
                message: `Configuration reset to defaults for ${entityType}`,
                data: {
                    entityType: updatedConfig.entityType,
                    exampleFormat: updatedConfig.exampleFormat
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: `No default configuration available for ${entityType}`
            });
        }

    } catch (error) {
        console.error('Reset ID Configuration Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset ID configuration',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════════
// GET CONFIGURATION STATUS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get configuration status (locked/unlocked, generated count)
 */
exports.getConfigurationStatus = async (req, res) => {
    try {
        const { tenantId, db } = req;

        const config = await getCompanyConfig(db, tenantId);

        const status = config.configurations.map(c => ({
            entityType: c.entityType,
            isLocked: c.isLocked,
            generatedCount: c.generatedCount,
            canModify: !c.isLocked,
            exampleFormat: c.exampleFormat
        }));

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('Get Configuration Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch configuration status',
            error: error.message
        });
    }
};

module.exports = exports;
