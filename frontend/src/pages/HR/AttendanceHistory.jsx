import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, TrendingUp, Users, Download, Filter, Search,
  ChevronLeft, ChevronRight, UserCheck, AlertCircle, MapPin,
  MoreVertical, Eye, Edit2, FileText, BarChart3, PieChart,
  Camera, CheckCircle, XCircle, Trash2, RefreshCw, Loader2
} from 'lucide-react';
import api from '../../utils/api';

export default function AttendanceHistory() {
  const [selectedMonth, setSelectedMonth] = useState('January 2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [faceStatusMap, setFaceStatusMap] = useState({}); // Track face registration status
  const [loadingFaceStatus, setLoadingFaceStatus] = useState({}); // Track loading states
  const [deletingFaceId, setDeletingFaceId] = useState(null);
  const pageSize = 10;

  //     { 
  //       id: 'EMP001', 
  //       name: 'Sarah Johnson', 
  //       department: 'Engineering', 
  //       position: 'Senior Developer',
  //       avatar: 'SJ',
  //       totalDays: 22,
  //       present: 20,
  //       absent: 1,
  //       leaves: 1,
  //       halfDays: 0,
  //       lateArrivals: 3,
  //       avgCheckIn: '09:05 AM',
  //       avgCheckOut: '06:12 PM',
  //       totalHours: 182.5,
  //       attendanceRate: 91,
  //       workLocation: 'Office'
  //     },
  //     { 
  //       id: 'EMP002', 
  //       name: 'Michael Chen', 
  //       department: 'Marketing', 
  //       position: 'Marketing Manager',
  //       avatar: 'MC',
  //       totalDays: 22,
  //       present: 22,
  //       absent: 0,
  //       leaves: 0,
  //       halfDays: 0,
  //       lateArrivals: 1,
  //       avgCheckIn: '08:58 AM',
  //       avgCheckOut: '06:05 PM',
  //       totalHours: 198.5,
  //       attendanceRate: 100,
  //       workLocation: 'Remote'
  //     },
  //     { 
  //       id: 'EMP003', 
  //       name: 'Emily Rodriguez', 
  //       department: 'Engineering', 
  //       position: 'Lead Engineer',
  //       avatar: 'ER',
  //       totalDays: 22,
  //       present: 19,
  //       absent: 2,
  //       leaves: 1,
  //       halfDays: 0,
  //       lateArrivals: 5,
  //       avgCheckIn: '09:18 AM',
  //       avgCheckOut: '06:25 PM',
  //       totalHours: 175.0,
  //       attendanceRate: 86,
  //       workLocation: 'Office'
  //     },
  //     { 
  //       id: 'EMP004', 
  //       name: 'James Williams', 
  //       department: 'Sales', 
  //       position: 'Sales Executive',
  //       avatar: 'JW',
  //       totalDays: 22,
  //       present: 18,
  //       absent: 3,
  //       leaves: 1,
  //       halfDays: 0,
  //       lateArrivals: 2,
  //       avgCheckIn: '09:10 AM',
  //       avgCheckOut: '06:00 PM',
  //       totalHours: 162.0,
  //       attendanceRate: 82,
  //       workLocation: 'Office'
  //     },
  //     { 
  //       id: 'EMP005', 
  //       name: 'Aisha Patel', 
  //       department: 'HR', 
  //       position: 'HR Specialist',
  //       avatar: 'AP',
  //       totalDays: 22,
  //       present: 21,
  //       absent: 1,
  //       leaves: 0,
  //       halfDays: 0,
  //       lateArrivals: 0,
  //       avgCheckIn: '09:00 AM',
  //       avgCheckOut: '06:15 PM',
  //       totalHours: 192.5,
  //       attendanceRate: 95,
  //       workLocation: 'Office'
  //     },
  //     { 
  //       id: 'EMP006', 
  //       name: 'David Thompson', 
  //       department: 'Engineering', 
  //       position: 'Frontend Developer',
  //       avatar: 'DT',
  //       totalDays: 22,
  //       present: 20,
  //       absent: 0,
  //       leaves: 0,
  //       halfDays: 2,
  //       lateArrivals: 4,
  //       avgCheckIn: '09:12 AM',
  //       avgCheckOut: '06:10 PM',
  //       totalHours: 180.0,
  //       attendanceRate: 91,
  //       workLocation: 'Office'
  //     },
  //     { 
  //       id: 'EMP007', 
  //       name: 'Lisa Martinez', 
  //       department: 'Finance', 
  //       position: 'Financial Analyst',
  //       avatar: 'LM',
  //       totalDays: 22,
  //       present: 22,
  //       absent: 0,
  //       leaves: 0,
  //       halfDays: 0,
  //       lateArrivals: 0,
  //       avgCheckIn: '08:55 AM',
  //       avgCheckOut: '06:10 PM',
  //       totalHours: 198.5,
  //       attendanceRate: 100,
  //       workLocation: 'Office'
  //     },
  //     { 
  //       id: 'EMP008', 
  //       name: 'Robert Brown', 
  //       department: 'Marketing', 
  //       position: 'Content Strategist',
  //       avatar: 'RB',
  //       totalDays: 22,
  //       present: 20,
  //       absent: 1,
  //       leaves: 1,
  //       halfDays: 0,
  //       lateArrivals: 2,
  //       avgCheckIn: '09:05 AM',
  //       avgCheckOut: '05:45 PM',
  //       totalHours: 176.0,
  //       attendanceRate: 91,
  //       workLocation: 'Remote'
  //     },
  //     { 
  //       id: 'EMP009', 
  //       name: 'Sophia Lee', 
  //       department: 'Design', 
  //       position: 'UI/UX Designer',
  //       avatar: 'SL',
  //       totalDays: 22,
  //       present: 17,
  //       absent: 2,
  //       leaves: 3,
  //       halfDays: 0,
  //       lateArrivals: 1,
  //       avgCheckIn: '09:08 AM',
  //       avgCheckOut: '06:00 PM',
  //       totalHours: 153.0,
  //       attendanceRate: 77,
  //       workLocation: 'Office'
  //     },
  //     { 
  //       id: 'EMP010', 
  //       name: 'Daniel Kim', 
  //       department: 'Sales', 
  //       position: 'Business Development',
  //       avatar: 'DK',
  //       totalDays: 22,
  //       present: 21,
  //       absent: 1,
  //       leaves: 0,
  //       halfDays: 0,
  //       lateArrivals: 0,
  //       avgCheckIn: '08:50 AM',
  //       avgCheckOut: '06:05 PM',
  //       totalHours: 195.5,
  //       attendanceRate: 95,
  //       workLocation: 'Office'
  //     },
  //   ];

  // const employeeAttendance = async() => {
  //   try{
  //     const response = await api.get('/attendance/all');
  //     return response.data;

  //   }
  //   catch(error){
  //     console.log("Error in the fetching the Attendance data");
  //   }
  // }
  // console.log(employeeAttendance());

  const stats = [
    { label: 'Total Employees', value: '156', icon: Users, color: 'blue', bgColor: 'bg-blue-500' },
    { label: 'Avg Attendance', value: '91%', icon: TrendingUp, color: 'green', bgColor: 'bg-green-500' },
    { label: 'Total Late Arrivals', value: '28', icon: AlertCircle, color: 'orange', bgColor: 'bg-orange-500' },
    { label: 'Avg Working Hours', value: '8.5h', icon: Clock, color: 'purple', bgColor: 'bg-purple-500' },
  ];

  const departmentStats = [
    { department: 'Engineering', present: 24, total: 28, rate: '86%', avgHours: '8.8h' },
    { department: 'Sales', present: 18, total: 22, rate: '82%', avgHours: '8.2h' },
    { department: 'Marketing', present: 14, total: 15, rate: '93%', avgHours: '8.5h' },
    { department: 'Finance', present: 12, total: 13, rate: '92%', avgHours: '8.7h' },
    { department: 'HR', present: 8, total: 9, rate: '89%', avgHours: '8.4h' },
  ];

  const getAttendanceColor = (rate) => {
    if (rate >= 95) return 'text-green-600 bg-green-50 border-green-200';
    if (rate >= 85) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (rate >= 75) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getWorkLocationColor = (location) => {
    return location === 'Office'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-purple-50 text-purple-700 border-purple-200';
  };

  const getFaceRegistrationColor = (isRegistered) => {
    return isRegistered
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : 'text-red-600 bg-red-50 border-red-200';
  };


  const getEmployeeAttendance = async () => {
    try {
      const res = await api.get('/attendance/all');
      console.log(res);
      console.log(res.data);
      return res.data;
    }
    catch (error) {
      console.log("Error occured at the time fatching the attendance data : ", error);
      throw error;
    }
  };

  const [attendance, setAttendance] = useState([]);

  // Fetch employee face registration status
  const checkFaceRegistration = async (employeeId) => {
    try {
      setLoadingFaceStatus(prev => ({ ...prev, [employeeId]: true }));
      const res = await api.get(`/attendance/face/status?employeeId=${employeeId}`);
      setFaceStatusMap(prev => ({
        ...prev,
        [employeeId]: res.data.isRegistered
      }));
      return res.data.isRegistered;
    } catch (err) {
      console.error('Error checking face status:', err);
      setFaceStatusMap(prev => ({
        ...prev,
        [employeeId]: false
      }));
      return false;
    } finally {
      setLoadingFaceStatus(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  // Delete face registration for an employee
  const handleDeleteFace = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee\'s face registration?')) {
      return;
    }

    try {
      setDeletingFaceId(employeeId);
      const res = await api.delete(`/attendance/face/delete?employeeId=${employeeId}`);
      
      if (res.data.success) {
        setFaceStatusMap(prev => ({
          ...prev,
          [employeeId]: false
        }));
        alert('Face registration deleted successfully');
      }
    } catch (err) {
      console.error('Error deleting face:', err);
      alert(err.response?.data?.message || 'Failed to delete face registration');
    } finally {
      setDeletingFaceId(null);
    }
  };

  // Refresh face registration status
  const handleRefreshFaceStatus = async (employeeId) => {
    await checkFaceRegistration(employeeId);
  };

  // Load face status for all employees when attendance data is loaded
  useEffect(() => {
    if (attendance.length > 0) {
      attendance.forEach(emp => {
        if (!faceStatusMap.hasOwnProperty(emp.employee._id)) {
          checkFaceRegistration(emp.employee._id);
        }
      });
    }
  }, [attendance]);

  useEffect(() => {
    const fetchAttendance = async () => {
      const data = await getEmployeeAttendance();
      setAttendance(data);
    };

    fetchAttendance();
  }, []);

  // const totalDays = attendance.reduce((acc,cur) => {
  //   return acc.workingHours+ cur.workingHours;
  // })

  // console.log(totalDays);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.bgColor} shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-2">{stat.label}</p>
              <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Department Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Department Overview</h2>
          </div>
          <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            View Analytics
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {departmentStats.map((dept, index) => (
            <div key={index} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:shadow-lg transition-all">
              <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-3">{dept.department}</p>
              <div className="flex items-end justify-between mb-3">
                <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{dept.present}</span>
                <span className="text-sm font-bold text-slate-400">/ {dept.total}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                  style={{ width: dept.rate }}
                ></div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-500 uppercase">{dept.rate} Present</p>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400">{dept.avgHours} avg</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition"
              />
            </div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full sm:w-48 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition"
            >
              <option>All Departments</option>
              <option>Engineering</option>
              <option>Sales</option>
              <option>Marketing</option>
              <option>Finance</option>
              <option>HR</option>
              <option>Design</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-40 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition"
            >
              <option>All Status</option>
              <option>Excellent (95%+)</option>
              <option>Good (85%+)</option>
              <option>Average (75%+)</option>
              <option>Poor (&lt;75%)</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
              <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition">
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <span className="font-black text-slate-700 dark:text-slate-300 px-2 text-xs uppercase tracking-widest">{selectedMonth}</span>
              <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition">
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
            <button className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition">
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Monthly Attendance History</h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">January 2026 - Complete Records</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, attendance.length)} of {attendance.length}
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Present Days</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Absent</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Leaves</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Late Arrivals</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Times</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Hours</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Face Registration</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {attendance.map((employee, index) => (
                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-sm shadow-lg">
                        {employee.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{employee.employee.firstName + " " + employee.employee.lastName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{employee.employee.employeeId} • {employee.employee.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-green-600 dark:text-green-400 tracking-tighter">{employee.length}</span>
                      <span className="text-xs font-bold text-slate-400">/ {employee.totalDays}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-black text-red-600 dark:text-red-400 tracking-tighter">{employee.absent}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 tracking-tighter">{employee.leaves}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-black text-orange-600 dark:text-orange-400 tracking-tighter">{employee.lateArrivals}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-green-500" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{employee.checkOut}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-red-500" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{employee.checkIn}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-black text-slate-800 dark:text-white tracking-tighter">
                      {employee.workingHours}
                      <span className="text-[10px] text-slate-400 ml-1">hrs</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border ${getAttendanceColor(employee.attendanceRate)}`}>
                      <TrendingUp size={12} />
                      {employee.attendanceRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 rounded-xl transition"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 group-hover:text-blue-600 transition"
                        title="View Report"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 group-hover:text-slate-600 transition"
                        title="More Options"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
            {/* Page {currentPage} of {totalPages} */}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              Previous
            </button>
            {/* {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })} */}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              // disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}