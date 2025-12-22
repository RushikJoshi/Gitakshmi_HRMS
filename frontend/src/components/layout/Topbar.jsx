import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="w-full bg-white shadow p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div>Topbar</div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.name || user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
