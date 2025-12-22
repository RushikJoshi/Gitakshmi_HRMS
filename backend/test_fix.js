const mongoose = require('mongoose');
require('dotenv').config();
const getTenantDB = require('./utils/tenantDB');

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const tenantId = "69413321fe81e30719940dfc";
        const entityId = "6942ae0402c656caf0e63951";
        const entityType = "LeaveRequest";

        const tenantDB = await getTenantDB(tenantId);
        const Model = tenantDB.model(entityType);

        console.log("Fetching entity...");
        const entity = await Model.findById(entityId);
        console.log("Entity found:", !!entity);

        if (entity) {
            console.log("Dynamic population...");
            if (Model.schema.paths.employee) {
                console.log("Populating employee...");
                await entity.populate({ path: 'employee', select: 'firstName lastName email profilePic' });
            }
            if (Model.schema.paths.user) {
                console.log("Populating user...");
                await entity.populate({ path: 'user', select: 'name email' });
            }
            console.log("Population done.");
            console.log("Result:", entity);
        }

        process.exit(0);
    } catch (err) {
        console.error("TEST FAILED:", err);
        process.exit(1);
    }
}

test();
