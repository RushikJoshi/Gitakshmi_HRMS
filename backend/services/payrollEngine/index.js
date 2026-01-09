// Payroll Engine: Uses salary and attendance snapshots, produces payroll_run_snapshot
const PayrollRunSnapshot = require('../../models/PayrollRunSnapshot');

class PayrollEngine {
  static async runPayroll({ tenant, period, items }) {
    // items: [{ employee, salarySnapshot, attendanceSnapshot }]
    const runItems = items.map(item => {
      const grossEarnings = item.salarySnapshot.earnings.reduce((sum, e) => sum + e.amount, 0);
      const totalDeductions = item.salarySnapshot.deductions.reduce((sum, d) => sum + d.amount, 0);
      // Prorate by attendance if needed (example: presentDays/totalDays)
      // For now, assume full pay
      const netPay = grossEarnings - totalDeductions;
      return {
        employee: item.employee,
        salarySnapshot: item.salarySnapshot._id,
        attendanceSnapshot: item.attendanceSnapshot._id,
        grossEarnings,
        totalDeductions,
        netPay,
        details: {
          earnings: item.salarySnapshot.earnings,
          deductions: item.salarySnapshot.deductions,
          attendance: item.attendanceSnapshot
        }
      };
    });
    const snapshot = await PayrollRunSnapshot.create({
      tenant,
      period,
      items: runItems,
      locked: true,
      version: 1
    });
    return snapshot;
  }
}

module.exports = PayrollEngine;