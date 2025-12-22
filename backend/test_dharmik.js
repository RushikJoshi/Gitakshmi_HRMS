const mongoose = require('mongoose');
require('dotenv').config();
const getTenantDB = require('./utils/tenantDB');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
    console.log('Connected to Main DB\n');

    const Tenant = require('./models/Tenant');
    const tenants = await Tenant.find({});

    for (const tenant of tenants) {
        console.log(`\n=== Tenant: ${tenant.name} ===`);
        try {
            const db = await getTenantDB(tenant._id);

            if (!db.models['Employee']) db.model('Employee', require('./models/Employee'));
            if (!db.models['LeaveBalance']) db.model('LeaveBalance', require('./models/LeaveBalance'));

            const Employee = db.model('Employee');
            const LeaveBalance = db.model('LeaveBalance');

            // Find Dharmik
            const employee = await Employee.findOne({
                email: { $regex: /dharmik/i },
                tenant: tenant._id
            });

            if (!employee) {
                console.log('Dharmik not found');
                continue;
            }

            console.log(`\nEmployee: ${employee.firstName} ${employee.lastName}`);
            console.log(`Email: ${employee.email}`);
            console.log(`ID: ${employee._id}`);
            console.log(`Role: ${employee.role}`);
            console.log(`Policy: ${employee.leavePolicy}`);

            // Get balances
            const year = new Date().getFullYear();
            const balances = await LeaveBalance.find({
                employee: employee._id,
                tenant: tenant._id,
                year
            });

            console.log(`\nLeave Balances for ${year}:`);
            if (balances.length === 0) {
                console.log('❌ NO BALANCES FOUND!');
            } else {
                balances.forEach(b => {
                    console.log(`  ${b.leaveType}: ${b.available}/${b.total} (used: ${b.used}, pending: ${b.pending})`);
                });
            }

            // Test the API logic
            console.log('\n--- Simulating API Call ---');
            console.log(`GET /api/employee/leaves/balances`);
            console.log(`User ID: ${employee._id}`);
            console.log(`Tenant ID: ${tenant._id}`);
            console.log(`Year: ${year}`);
            console.log(`Query: { employee: "${employee._id}", tenant: "${tenant._id}", year: ${year} }`);
            console.log(`Result: ${balances.length} balances found`);

        } catch (err) {
            console.error(`Error: ${err.message}`);
            console.error(err.stack);
        }
    }

    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
