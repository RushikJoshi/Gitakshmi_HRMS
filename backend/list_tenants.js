const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Tenant = require('./models/Tenant');

async function listTenants() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const tenants = await Tenant.find({});
        console.log('Tenants:', tenants.map(t => ({ id: t._id, code: t.code, name: t.companyName })));
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

listTenants();
