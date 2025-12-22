const mongoose = require('mongoose');
const EmployeeSchema = require('../models/Employee');
const AttendanceSchema = require('../models/Attendance');
const LeaveRequestSchema = require('../models/LeaveRequest');

/* ----------------------------------------------------
   HELPER → Load model from dynamic tenant database
---------------------------------------------------- */
function getModels(req) {
  if (!req.tenantDB) {
    throw new Error("Tenant database connection not available");
  }
  const db = req.tenantDB;
  return {
    Employee: db.model("Employee", EmployeeSchema),
    Attendance: db.model("Attendance", AttendanceSchema),
    LeaveRequest: db.model("LeaveRequest", LeaveRequestSchema)
  };
}

/* ----------------------------------------------------
   GET PROFILE (Self)
---------------------------------------------------- */
exports.getProfile = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const userId = req.user ? req.user.id : null;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch from single source of truth (Employee Master)
    const emp = await Employee.findOne({ _id: userId, tenant: tenantId })
      .populate('departmentId', 'name')
      .populate('manager', 'firstName lastName email profilePic employeeId')
      .populate('leavePolicy', 'name rules')
      .select('-password'); // Security: never return password

    if (!emp) return res.status(404).json({ error: "Profile not found" });

    res.json(emp);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

/* ----------------------------------------------------
   TOGGLE ATTENDANCE (Check-in / Check-out)
---------------------------------------------------- */
exports.toggleAttendance = async (req, res) => {
  try {
    const { Attendance } = getModels(req);
    const tenantId = req.tenantId;
    const userId = req.user.id; // Employee ID

    // Normalize today to start of day or use direct date comparison
    // Simple approach: find attendance for current date (ignoring time)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(startOfDay.getDate() + 1);

    let attendance = await Attendance.findOne({
      employee: userId,
      tenant: tenantId,
      date: { $gte: startOfDay, $lt: endOfDay }
    });

    let action = '';

    if (!attendance) {
      // Clock In
      attendance = new Attendance({
        tenant: tenantId,
        employee: userId,
        date: now,
        status: 'present',
        checkIn: now
      });
      await attendance.save();
      action = 'Checked In';
    } else if (!attendance.checkOut) {
      // Clock Out
      attendance.checkOut = now;
      await attendance.save();
      action = 'Checked Out';
    } else {
      // Already checked out
      return res.status(400).json({ error: "Already checked out for today" });
    }

    res.json({ success: true, message: action, data: attendance });

  } catch (err) {
    console.error("Toggle attendance error:", err);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
};

/* ----------------------------------------------------
   GET ATTENDANCE HISTORY
---------------------------------------------------- */
exports.getAttendance = async (req, res) => {
  try {
    const { Attendance } = getModels(req);
    const tenantId = req.tenantId;
    const userId = req.user.id;

    // Optional: filter by month/year via query params
    // For now, return recent 30 days
    const attendance = await Attendance.find({
      tenant: tenantId,
      employee: userId
    }).sort({ date: -1 }).limit(30);

    res.json(attendance);

  } catch (err) {
    console.error("Get attendance error:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

/* ----------------------------------------------------
   APPLY LEAVE
---------------------------------------------------- */
exports.applyLeave = async (req, res) => {
  try {
    const { LeaveRequest } = getModels(req);
    const tenantId = req.tenantId;
    const userId = req.user.id;

    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const leave = new LeaveRequest({
      tenant: tenantId,
      employee: userId,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'Pending'
    });

    await leave.save();
    res.status(201).json({ success: true, message: "Leave requested", data: leave });

  } catch (err) {
    console.error("Apply leave error:", err);
    res.status(500).json({ error: "Failed to apply for leave" });
  }
};

/* ----------------------------------------------------
   GET LEAVES
---------------------------------------------------- */
exports.getLeaves = async (req, res) => {
  try {
    const { LeaveRequest } = getModels(req);
    const tenantId = req.tenantId;
    const userId = req.user.id;

    const leaves = await LeaveRequest.find({
      tenant: tenantId,
      employee: userId
    }).sort({ createdAt: -1 });

    res.json(leaves);

  } catch (err) {
    console.error("Get leaves error:", err);
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
};

/* ----------------------------------------------------
   GET PAYSLIPS (Mock)
---------------------------------------------------- */
exports.getPayslips = async (req, res) => {
  try {
    // Return empty array or mock data
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payslips" });
  }
};
/* ----------------------------------------------------
   GET REPORTING TREE (2-level upward)
---------------------------------------------------- */
exports.getReportingTree = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const userId = req.user.id;

    const self = await Employee.findById(userId)
      .populate({
        path: 'manager',
        select: 'firstName lastName role profilePic employeeId manager departmentId',
        populate: {
          path: 'manager',
          select: 'firstName lastName role profilePic employeeId'
        }
      });

    if (!self) return res.status(404).json({ error: "Employee not found" });

    const tree = {
      level0: {
        id: self._id,
        name: `${self.firstName} ${self.lastName}`,
        designation: self.role || 'Employee',
        profilePic: self.profilePic,
        isSelf: true
      },
      level1: self.manager ? {
        id: self.manager._id,
        name: `${self.manager.firstName} ${self.manager.lastName}`,
        designation: self.manager.role || 'Manager',
        profilePic: self.manager.profilePic
      } : null,
      level2: (self.manager && self.manager.manager) ? {
        id: self.manager.manager._id,
        name: `${self.manager.manager.firstName} ${self.manager.manager.lastName}`,
        designation: self.manager.manager.role || 'Group Manager',
        profilePic: self.manager.manager.profilePic
      } : null
    };

    res.json(tree);
  } catch (err) {
    console.error("Get reporting tree error:", err);
    res.status(500).json({ error: "Failed to fetch reporting tree" });
  }
};
