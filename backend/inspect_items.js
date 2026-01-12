const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Tenant = require('./models/Tenant');
        const tenant = await Tenant.findOne({ code: 'abc002' });

        const dbName = `company_${tenant._id}`;
        const db = mongoose.connection.useDb(dbName);
        const PayrollRunItem = db.model('PayrollRunItem', require('./models/PayrollRunItem'));

        const items = await PayrollRunItem.find({});
        console.log(`PayrollRunItems:`);
        console.log(JSON.stringify(items, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
