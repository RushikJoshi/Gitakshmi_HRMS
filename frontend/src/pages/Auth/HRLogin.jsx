import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function HRLogin() {
  const { loginHR } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [companyCode, setCompanyCode] = useState(location?.state?.companyCode || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // if navigated with state.companyCode, focus email or set values
    if (location?.state?.companyCode) {
      // keep it as prefill for convenience
    }
  }, [location]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await loginHR(companyCode.trim(), email.trim(), password);
    if (res.success) {
      navigate('/hr');
    } else {
      setError(res.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Tenant / HR Login</h2>

        {error && (
          <div className="p-3 mb-4 bg-red-100 text-red-600 text-sm rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">Company Code</label>
            <input value={companyCode} onChange={e => setCompanyCode(e.target.value)} required className="w-full mt-1 p-3 border rounded-lg" placeholder="e.g. pnr001" />
          </div>

          <div>
            <label className="text-sm text-slate-600">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="w-full mt-1 p-3 border rounded-lg" placeholder="admin@company.com" />
          </div>

          <div>
            <label className="text-sm text-slate-600">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required className="w-full mt-1 p-3 border rounded-lg" placeholder="Enter password" />
          </div>

          <div className="flex justify-between items-center">
              <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded">Login</button>
              <div className="flex gap-3 items-center">
                <a href="/login" className="text-sm text-slate-500 hover:underline">Super Admin Login</a>
                <button type="button" onClick={() => navigate('/employee-login')} className="text-sm text-blue-600 hover:underline">Employee Login</button>
              </div>
          </div>
        </form>
      </div>
    </div>
  );
}
