require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME || undefined });
    const Tenant = require('../models/Tenant');
    const tenants = await Tenant.find().lean();
    console.log('Tenants:', tenants.map(t => ({ id: t._id.toString(), name: t.name, code: t.code })) );
    await mongoose.connection.close();
  } catch (e) {
    console.error('Error listing tenants:', e.message);
    process.exit(1);
  }
})();
