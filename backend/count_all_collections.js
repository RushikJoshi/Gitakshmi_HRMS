const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();

        console.log(`Total Databases: ${dbs.databases.length}`);

        let totalCollections = 0;
        for (const dbInfo of dbs.databases) {
            const db = mongoose.connection.useDb(dbInfo.name);
            const collections = await db.db.listCollections().toArray();
            totalCollections += collections.length;
            console.log(`DB: ${dbInfo.name}, Collections: ${collections.length}`);
        }

        console.log(`\nTOTAL COLLECTIONS ACROSS ALL DBS: ${totalCollections}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

cleanup();
