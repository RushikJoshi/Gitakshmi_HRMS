import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getToken, isValidToken } from '../../utils/token';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginHR, loginEmployee, user, isInitialized } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [companyCode, setCompanyCode] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [activeTab, setActiveTab] = useState('psa'); // psa | hr | employee

  useEffect(() => {
    // Wait until auth has initialized to avoid navigation loops
    if (!isInitialized) return;

    const t = getToken();
    if (!isValidToken(t)) return;

    // If user is present, redirect to role-appropriate panel
    if (user && user.role) {
      if (user.role === 'psa') navigate('/psa', { replace: true });
      else if (user.role === 'hr') navigate('/hr', { replace: true });
      else if (user.role === 'employee') navigate('/employee', { replace: true });
    }
    // otherwise, token exists but user not parsed correctly — do nothing here
  }, [isInitialized, user, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (activeTab === 'psa') {
      const res = await login(email, password);
      if (res.success) navigate('/psa'); else setError(res.message);
      return;
    }

    if (activeTab === 'hr') {
      const res = await loginHR(companyCode, email, password);
      if (res.success) navigate('/hr'); else setError(res.message);
      return;
    }

    if (activeTab === 'employee') {
      const res = await loginEmployee(companyCode, employeeId, password);
      if (res.success) navigate('/employee'); else setError(res.message);
      return;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="relative w-full max-w-md mx-auto">
        <div className="absolute -left-20 -top-16 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute -right-16 -bottom-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-40" />
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-10 w-full">
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-slate-100 rounded-full p-1 shadow-sm">
                <button type="button" onClick={() => setActiveTab('psa')} className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab==='psa' ? 'bg-white shadow' : 'text-slate-600'}`}>Super Admin</button>
                <button type="button" onClick={() => setActiveTab('hr')} className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab==='hr' ? 'bg-white shadow' : 'text-slate-600'}`}>Tenant</button>
                <button type="button" onClick={() => setActiveTab('employee')} className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab==='employee' ? 'bg-white shadow' : 'text-slate-600'}`}>Employee</button>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">{activeTab === 'psa' ? 'Super Admin Login' : activeTab === 'hr' ? 'Tenant Login' : 'Employee Login'}</h2>

            {error && (
              <div className="p-3 mb-4 bg-red-50 text-red-700 text-sm rounded border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {activeTab === 'hr' && (
                <div>
                  <label className="text-sm text-slate-600">Company Code</label>
                  <input type="text" value={companyCode} onChange={e => setCompanyCode(e.target.value)} className="w-full mt-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm" placeholder="e.g. pnr001" required />
                </div>
              )}

              {activeTab === 'employee' && (
                <>
                  <div>
                    <label className="text-sm text-slate-600">Company Code</label>
                    <input
                      type="text"
                      value={companyCode}
                      onChange={e => setCompanyCode(e.target.value)}
                      className="w-full mt-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm"
                      placeholder="e.g. pnr001"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Employee ID</label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      className="w-full mt-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm"
                      placeholder="e.g. TCS003-TL-001"
                      required
                    />
                  </div>
                </>
              )}

              {activeTab !== 'employee' && (
                <div>
                  <label className="text-sm text-slate-600">Email</label>
                  <input
                    type="email"
                    className="w-full mt-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-slate-600">Password</label>
                <input
                  type="password"
                  className="w-full mt-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-150 shadow"
              >
                Login
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
