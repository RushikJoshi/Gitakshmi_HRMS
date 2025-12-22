import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeLogin(){
  const { loginEmployee } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handle(e){
    e.preventDefault();
    setError('');
    const res = await loginEmployee(employeeId.trim(), password);
    if (res.success) {
      navigate('/employee');
    } else {
      setError(res.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Employee Login</h2>
        {error && <div className="p-3 mb-4 bg-red-100 text-red-600 text-sm rounded">{error}</div>}

        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">Employee ID</label>
            <input value={employeeId} onChange={e=>setEmployeeId(e.target.value)} required className="w-full mt-1 p-3 border rounded-lg" placeholder="e.g. pnrhim01" />
          </div>

          <div>
            <label className="text-sm text-slate-600">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full mt-1 p-3 border rounded-lg" placeholder="Enter password" />
          </div>

          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Login</button>
        </form>
      </div>
    </div>
  );
}
