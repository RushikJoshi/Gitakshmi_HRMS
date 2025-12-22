const mongoose = require('mongoose');
require('dotenv').config();
const getTenantDB = require('./utils/tenantDB');
const { checkEntityAccess } = require('./utils/accessControl');

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const tenantId = "69413321fe81e30719940dfc"; // The one with leaves
        const entityId = "6942ae0402c656caf0e63951";
        const entityType = "LeaveRequest";

        const tenantDB = await getTenantDB(tenantId);

        console.log("Testing model access...");
        let Model;
        try {
            Model = tenantDB.model(entityType);
            console.log("Model found directly");
        } catch (e) {
            console.log("Model not found directly, trying normalization...");
            const normalizedType = entityType.charAt(0).toUpperCase() + entityType.slice(1);
            Model = tenantDB.model(normalizedType);
            console.log("Model found via normalization");
        }

        console.log("Testing populate...");
        const entity = await Model.findById(entityId)
            .populate('employee', 'firstName lastName email profilePic')
            .populate('user', 'name email');

        console.log("Entity found:", !!entity);
        if (entity) console.log("Employee populated:", !!entity.employee);

        process.exit(0);
    } catch (err) {
        console.error("TEST FAILED:", err);
        process.exit(1);
    }
}

test();
