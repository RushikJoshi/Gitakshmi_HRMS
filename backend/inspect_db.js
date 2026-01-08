const mongoose = require('mongoose');
require('dotenv').config();

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:', dbs.databases.map(d => d.name).join(', '));

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in main DB:', collections.map(c => c.name).join(', '));

        // Check for users
        const UserSchema = require('./models/User');
        const User = mongoose.model('User', UserSchema);
        const userCount = await User.countDocuments();
        console.log('User count:', userCount);

        const TenantSchema = require('./models/Tenant');
        const Tenant = mongoose.model('Tenant', TenantSchema);
        const tenantCount = await Tenant.countDocuments();
        console.log('Tenant count:', tenantCount);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Inspect failed:', err);
    }
}

inspect();
