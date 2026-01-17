const CompanyIdConfig = require('../models/CompanyIdConfig');

const DEFAULT_CONFIGS = {
    JOB: { prefix: 'JOB', separator: '-', includeYear: true, padding: 4, startFrom: 1, resetPolicy: 'YEARLY' },
    APPLICATION: { prefix: 'APP', separator: '-', includeYear: true, padding: 5, startFrom: 1, resetPolicy: 'YEARLY' },
    OFFER: { prefix: 'OFF', separator: '-', includeYear: true, padding: 4, startFrom: 1, resetPolicy: 'YEARLY' },
    EMPLOYEE: { prefix: 'EMP', separator: '', includeYear: false, padding: 4, startFrom: 1000, resetPolicy: 'NEVER' },
    PAYSLIP: { prefix: 'PAY', separator: '-', includeYear: true, includeMonth: true, padding: 4, startFrom: 1, resetPolicy: 'MONTHLY' },
    CANDIDATE: { prefix: 'CAN', separator: '-', includeYear: true, padding: 4, startFrom: 1, resetPolicy: 'YEARLY' }
};

/**
 * Get all configurations for the company
 */
exports.getConfigurations = async (req, res) => {
    try {
        const companyId = req.tenantId;

        // Validation
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Tenant ID missing' });
        }

        let configs = await CompanyIdConfig.find({ companyId });

        // Initialize defaults if empty
        if (configs.length === 0) {
            const startConfigs = Object.keys(DEFAULT_CONFIGS).map(type => ({
                companyId,
                entityType: type,
                ...DEFAULT_CONFIGS[type],
                currentSeq: DEFAULT_CONFIGS[type].startFrom
            }));

            // Use try-catch for bulk insert to be safe
            try {
                configs = await CompanyIdConfig.insertMany(startConfigs);
            } catch (insertError) {
                console.error("Error initializing configs:", insertError);
                // Continue with empty configs or partials if insert failed
            }
        }

        // Ensure all types exist
        const existingTypes = configs.map(c => c.entityType);
        const missingTypes = Object.keys(DEFAULT_CONFIGS).filter(t => !existingTypes.includes(t));

        if (missingTypes.length > 0) {
            const newConfigs = missingTypes.map(type => ({
                companyId,
                entityType: type,
                ...DEFAULT_CONFIGS[type],
                currentSeq: DEFAULT_CONFIGS[type].startFrom
            }));

            try {
                const savedNew = await CompanyIdConfig.insertMany(newConfigs);
                configs = [...configs, ...savedNew];
            } catch (insertError) {
                console.error("Error adding missing configs:", insertError);
            }
        }

        return res.status(200).json({
            success: true,
            data: configs
        });

    } catch (error) {
        console.error("CONTROLLER ERROR (getConfigurations):", error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Save/Update configurations
 */
exports.saveConfigurations = async (req, res) => {
    try {
        const companyId = req.tenantId;
        const updates = req.body;

        if (!updates) {
            return res.status(400).json({ success: false, message: 'No data provided' });
        }

        const configsToUpdate = Array.isArray(updates) ? updates : [updates];
        const results = [];

        for (const conf of configsToUpdate) {
            if (!conf.entityType) continue;

            const updateData = {
                prefix: conf.prefix,
                separator: conf.separator,
                includeYear: conf.includeYear,
                includeMonth: conf.includeMonth,
                includeDepartment: conf.includeDepartment,
                padding: conf.padding,
                startFrom: conf.startFrom,
                resetPolicy: conf.resetPolicy,
                updatedBy: req.user?.email || 'admin'
            };

            const existing = await CompanyIdConfig.findOne({ companyId, entityType: conf.entityType });

            if (existing) {
                // Defensive logic for sequence update
                if (conf.startFrom !== existing.startFrom) {
                    if (existing.currentSeq < conf.startFrom) {
                        updateData.currentSeq = conf.startFrom;
                    }
                }
            } else {
                updateData.currentSeq = conf.startFrom;
            }

            const updated = await CompanyIdConfig.findOneAndUpdate(
                { companyId, entityType: conf.entityType },
                updateData,
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            results.push(updated);
        }

        return res.status(200).json({
            success: true,
            message: 'Configurations saved successfully',
            data: results
        });

    } catch (error) {
        console.error("CONTROLLER ERROR (saveConfigurations):", error);
        return res.status(500).json({ success: false, message: 'Failed to save configurations' });
    }
};
