const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();

        const currentTenantId = '69413321fe81e30719940dfc'; // abc002
        const mainDb = 'hrms-test'; // Assuming this is the main metadata DB

        let droppedCount = 0;
        for (const dbInfo of dbs.databases) {
            const name = dbInfo.name;

            // Logic: Drop 'tenant_...' databases and 'company_...' databases that are NOT the current one and have < 15 collections
            // This is a heuristic to find unused test data.
            if (name.startsWith('tenant_')) {
                console.log(`Dropping legacy database: ${name}`);
                const db = mongoose.connection.useDb(name);
                await db.db.dropDatabase();
                droppedCount++;
            } else if (name.startsWith('company_') && !name.includes(currentTenantId)) {
                const db = mongoose.connection.useDb(name);
                const collections = await db.db.listCollections().toArray();
                if (collections.length < 15) {
                    console.log(`Dropping small/unused tenant database: ${name} (${collections.length} collections)`);
                    await db.db.dropDatabase();
                    droppedCount++;
                }
            }
        }

        console.log(`\nSuccessfully dropped ${droppedCount} unused databases.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

cleanup();
