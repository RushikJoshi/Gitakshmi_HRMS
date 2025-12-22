import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getToken, isValidToken } from '../utils/token';

// Layouts
import PsaLayout from '../layouts/PsaLayout';
import ProtectedRoute from '../components/layout/ProtectedRoute';

// PSA Pages
import Dashboard from '../pages/PSA/Dashboard';
import Companies from '../pages/PSA/Companies';
import CompanyForm from '../pages/PSA/CompanyForm';
import ModuleConfig from '../pages/PSA/ModuleConfig';
import Activities from '../pages/PSA/Activities';

// Auth
import Login from '../pages/Auth/Login';
import HRLogin from '../pages/Auth/HRLogin';
import EmployeeLogin from '../pages/Auth/EmployeeLogin';

// HR
import HRDashboard from '../pages/HR/HRDashboard';
import Employees from '../pages/HR/Employees';
import Departments from '../pages/HR/Departments';
import Leaves from '../pages/HR/Leaves'; // Keep for safety or remove if unused, but we are overwriting route.
import LeavePolicies from '../pages/HR/LeavePolicies';
import LeaveApprovals from '../pages/HR/LeaveApprovals';
import RegularizationApprovals from '../pages/HR/RegularizationApprovals';
import OrgStructure from '../pages/HR/OrgStructure';
import UserManagement from '../pages/HR/UserManagement';
import CeoOrg from '../pages/HR/CeoOrg';
import AccessControl from '../pages/HR/AccessControl';
import OfferTemplates from '../pages/HR/OfferTemplates';
import RequirementPage from '../pages/HR/RequirementPage';
import Applicants from '../pages/HR/Applicants';
import AttendanceAdmin from '../pages/HR/AttendanceAdmin';
import CalendarManagement from '../pages/HR/CalendarManagement';
import HRLayout from '../layouts/HRLayout';
import EssLayout from '../layouts/EssLayout';
import EmployeeDashboard from '../pages/Employee/EmployeeDashboard';
import EntityDetail from '../pages/Global/EntityDetail';
import MyRequests from '../pages/Global/MyRequests';


// Global
import NotFound from '../pages/NotFound';
import VerifyCompany from '../pages/VerifyCompany';
import JobApplication from '../pages/JobApplication/JobApplication';
import JobsList from '../pages/JobApplication/JobsList';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AutoHome />} />

      {/* PSA ROUTES - Only accessible by PSA admin */}
      <Route path="/psa" element={<ProtectedRoute allowedRoles={['psa']}><PsaLayout /></ProtectedRoute>}>
        {/* Dashboard */}
        <Route index element={<Dashboard />} />

        {/* Companies */}
        <Route path="companies" element={<Companies />} />
        <Route path="companies/new" element={<CompanyForm />} />
        <Route path="companies/:id" element={<CompanyForm />} />

        {/* Module Configuration (FULL PAGE) */}
        <Route path="modules" element={<ModuleConfig />} />
        <Route path="modules/:id" element={<ModuleConfig />} />
        <Route path="activities" element={<Activities />} />
      </Route>

      {/* LOGIN */}
      <Route path="/login" element={<Login />} />
      <Route path="/hr-login" element={<HRLogin />} />
      <Route path="/employee-login" element={<EmployeeLogin />} />

      {/* PUBLIC JOB APPLICATION */}
      <Route path="/jobs" element={<JobsList />} />
      <Route path="/jobs/:companyCode" element={<JobsList />} />
      <Route path="/apply" element={<JobApplication />} />
      <Route path="/apply-job/:requirementId" element={<JobApplication />} />

      {/* HR area (tenant admin) */}
      <Route path="/hr" element={<HRLayout />}>
        <Route index element={<HRDashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="departments" element={<Departments />} />
        <Route path="leaves" element={<Navigate to="leave-approvals" replace />} />
        <Route path="leave-approvals" element={<LeaveApprovals />} />
        <Route path="leave-approvals/regularization" element={<RegularizationApprovals category="Leave" />} />
        <Route path="attendance" element={<AttendanceAdmin />} />
        <Route path="attendance/correction" element={<RegularizationApprovals category="Attendance" />} />
        <Route path="attendance-calendar" element={<CalendarManagement />} />
        <Route path="leave-policies" element={<LeavePolicies />} />
        <Route path="requirements" element={<RequirementPage />} />
        <Route path="applicants" element={<Applicants />} />
        <Route path="org" element={<OrgStructure />} />
        <Route path="org-tree" element={<CeoOrg />} />
        <Route path="access" element={<AccessControl />} />
        <Route path="offer-templates" element={<OfferTemplates />} />
        <Route path="details/:entityType/:entityId" element={<EntityDetail />} />
        <Route path="my-requests" element={<MyRequests />} />
      </Route>


      {/* EMPLOYEE & MANAGER DASHBOARD */}
      <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee', 'manager']}><EssLayout /></ProtectedRoute>}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="details/:entityType/:entityId" element={<EntityDetail />} />
        <Route path="my-requests" element={<MyRequests />} />
      </Route>




      {/* 404 */}
      <Route path="/verify-company/:token" element={<VerifyCompany />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AutoHome() {
  const { user, isInitialized } = useAuth();
  if (!isInitialized) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  const t = getToken();
  if (!isValidToken(t)) return <Navigate to="/login" replace />;
  if (user?.role === 'hr') return <Navigate to="/hr" replace />;
  if (user?.role === 'employee' || user?.role === 'manager') return <Navigate to="/employee" replace />;
  if (user?.role === 'psa') return <Navigate to="/psa" replace />;

  return <Navigate to="/login" replace />;
}
