const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Tenant = require('./models/Tenant');
        const tenant = await Tenant.findOne({ code: 'abc002' });

        const dbName = `company_${tenant._id}`;
        const db = mongoose.connection.useDb(dbName);
        const PayrollRun = db.model('PayrollRun', require('./models/PayrollRun'));

        const run = await PayrollRun.findOne({ month: 1, year: 2026 });
        console.log(`Run for Jan 2026:`);
        console.log(JSON.stringify(run, null, 2));

        const PayrollRunItem = db.model('PayrollRunItem', require('./models/PayrollRunItem'));
        const items = await PayrollRunItem.find({ payrollRunId: run._id });
        console.log(`Items found: ${items.length}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
